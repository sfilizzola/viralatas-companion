# Non-destructive lineup sync — Design

**Date:** 2026-05-20
**Author:** sfilizzola (with Claude Opus 4.7)
**Status:** Approved — awaiting implementation plan

---

## Problem statement

Today `supabase/seed/bands.ts` is the only way to update the festival lineup in Supabase. It is fully destructive: every run `DELETE`s all rows in `public.bands`, which CASCADE-deletes every row in `public.user_picks` and `public.user_missed_bands`, then re-inserts the 187-row lineup. Each insert generates a fresh `bands.id` UUID, so even byte-identical re-seeds break every foreign key.

This is the right behavior for a one-shot festival reset (and it is already wired into `festival-reset.ts --with-bands`). But it is the wrong behavior for incremental, in-festival edits — e.g.:

- Wacken announces the real band for a `TDB MTB` Metal Battle slot.
- A slot's `start_time` shifts by 30 minutes.
- An `image_url` or `genre` field needs correction.
- A brand-new slot is added (e.g., Welcome to the Jungle finally publishes JUN1).
- A canceled band needs to be removed.
- A band is genuinely relocated to a different stage's slot.

Today, applying any of these requires re-running the destructive seed, which wipes every vira-lata's picks across all 187 bands. That's unacceptable mid-festival.

We need a non-destructive path for small lineup changes that survives FK integrity — picks and missed-band records should remain attached to their respective bands across edits.

---

## Goals

1. Preserve `user_picks` and `user_missed_bands` rows across edits to name, time window, image URL, genre, stage, and category.
2. Support adding brand-new slots without affecting existing picks.
3. Support removing canceled slots with deliberate, previewed pick loss (only the canceled band's picks die).
4. Support genuine band-relocates-to-different-slot moves with explicit pick transfer.
5. Default to dry-run for the new tool. Operator must explicitly opt into writes.
6. Keep the existing destructive `bands.ts` contract unchanged — it remains the implementation of `festival-reset --with-bands` and the right tool for catastrophic refresh.
7. Keep the existing client architecture unchanged. UI keeps reading from IndexedDB; cache invalidation flows through the existing `cache_version` mechanism.

## Non-goals

- Real-time band updates pushed to connected clients. `public.bands` stays non-realtime; clients catch up on next app load via `cache_version`.
- An audit log of lineup edits.
- A godlike-only UI button to run sync from inside the app. The `service_role` key gate (i.e., running from a laptop with `.env.local`) is the right authorization model.
- Allowing non-godlike operators to run sync.
- Versioned/historical bands (no `band_history` table).

---

## Design overview

Three changes, in order:

1. **Schema:** add `slot_id text NOT NULL UNIQUE` to `public.bands`. This becomes the stable identity that survives edits to every other field.
2. **Source-of-truth update:** promote the existing `// FAS1`-style end-of-line slot codes in `bands.ts` into a real `slot_id` field on each `BandSeed` row. The destructive script now writes `slot_id` on insert.
3. **New tools:**
   - `npm run seed:bands:sync` — diff seed against DB by `slot_id`, print 3-bucket plan (UPDATE / INSERT / DELETE), `--apply` to write, `--json` for machine output.
   - `npm run seed:bands:move -- --from FAS1 --to LOU3 [--apply]` — re-point picks and missed-band rows from one slot's band to another's, then delete the old slot. Narrow, single-purpose.

The destructive `seed:bands` script keeps its current contract (5s countdown, `--force` flag, full replace). It is unchanged except for the `slot_id` field being written on insert.

### Architectural invariants preserved

- **IndexedDB is primary.** No change to client reads.
- **UI never touches Supabase directly.** No change to repositories.
- **Service-role key never on the client.** All new scripts run from operator's laptop with `.env.local`.
- **Cache invalidation by `cache_version` bump.** Sync and move both bump `public.app_config.cache_version` at the end (when run standalone). `festival-reset` already bumps it; chained reseeds do not need a second bump.

---

## Schema migration

Two migration files for safety. The split lets us backfill `slot_id` via the existing destructive seed without needing a hardcoded slot-to-row data migration in SQL.

### Migration 1 — Add column (NULLable)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_bands_slot_id_add.sql

ALTER TABLE public.bands ADD COLUMN slot_id text;
CREATE INDEX idx_bands_slot_id ON public.bands(slot_id);
```

Apply → run `npm run seed:bands -- --force` once → every row has `slot_id` populated.

### Migration 2 — Lock the column

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_bands_slot_id_lock.sql

ALTER TABLE public.bands ALTER COLUMN slot_id SET NOT NULL;
ALTER TABLE public.bands ADD CONSTRAINT bands_slot_id_unique UNIQUE (slot_id);
ALTER TABLE public.bands DROP CONSTRAINT IF EXISTS bands_stage_start_time_name_key;
```

The old composite `UNIQUE(stage, start_time, name)` is dropped. With `slot_id` as the canonical identity, the composite key is redundant; keeping it would also block edge cases like two slots intentionally sharing a name on the same stage at the same start (none today, but the future shouldn't be blocked by a constraint the new identity makes unnecessary).

### TypeScript types

`src/types/` — `Band` gains `slot_id: string` (optional during Phase A, required from Phase C onward). If we regenerate types via Supabase CLI, the change comes through automatically. Otherwise edit by hand.

The frontend does **not** need to consume `slot_id` in the UI. It is internal database identity. Components keep using `id` for FK relationships.

---

## Seed file change (`supabase/seed/bands.ts`)

### Type update

```typescript
export type BandSeed = {
  slot_id: string;        // NEW — stable identity across reseeds
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  genre: string | null;
  image_url: string | null;
  category?: 'band' | 'ceremony';
};
```

### Row example

Before:

```typescript
{ name: 'Lovebites', stage: STAGES.FASTER, start_time: t(D1,16, 0), end_time: t(D1,17, 0), genre: 'Heavy Metal', image_url: `${WOA}/...` }, // FAS1
```

After:

```typescript
{ slot_id: 'FAS1', name: 'Lovebites', stage: STAGES.FASTER, start_time: t(D1,16, 0), end_time: t(D1,17, 0), genre: 'Heavy Metal', image_url: `${WOA}/...` },
```

The end-of-line comment becomes redundant (the field carries the info).

### Pre-flight assertion (added to both `bands.ts` and `bands-sync.ts`)

At script startup, before any DB call:

1. All rows have non-empty `slot_id`.
2. All `slot_id`s are unique within the seed.
3. Every `slot_id` matches `/^(HAR|FAS|LOU|WET|HBA|WAS|WAK|JUN)\d+$/`.
4. The number of rows still equals the expected total (currently 187).

Any failure aborts before touching the database.

---

## Tool 1: `seed:bands:sync`

**Path:** `supabase/seed/bands-sync.ts`
**npm script:** `"seed:bands:sync": "tsx supabase/seed/bands-sync.ts"`

### Flags

| Flag | Effect |
|---|---|
| (none) | Dry-run. Prints the plan. Writes nothing. |
| `--apply` | Execute the plan. |
| `--json` | Print the plan as JSON to stdout (for piping/logging). Combinable with `--apply`. |

### Flow

1. **Load env.** Same `.env.local` reader pattern as `bands.ts`. Require `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Hard-fail if either is missing.
2. **Load seed.** `import { bands } from './bands';`. Run pre-flight assertions (see above).
3. **Load DB state.** `SELECT id, slot_id, name, stage, start_time, end_time, genre, image_url, category FROM public.bands`.
4. **Detect rows with NULL `slot_id`** (possible only if Phase B backfill was skipped). Print a clear error listing them; abort. The operator's remediation is to run `npm run seed:bands -- --force` once.
5. **Build the plan.** Index seed by `slot_id`, index DB by `slot_id`, walk both:
   - In seed, not in DB → `INSERT` bucket.
   - In DB, not in seed → `DELETE` bucket.
   - In both → field-by-field comparison; if any of {`name`, `stage`, `start_time`, `end_time`, `genre`, `image_url`, `category`} differ → `UPDATE` bucket with per-field before→after diff.
6. **Compute pick impact:** for each row in the `DELETE` bucket, `SELECT count(*) FROM public.user_picks WHERE band_id = ?` and `SELECT count(*) FROM public.user_missed_bands WHERE band_id = ?`. Sum and surface in the plan output.
7. **Print the plan.**
8. **If `--apply` is set:**
   - Execute `UPDATE`s first (one statement per row, by `slot_id`). After: post-condition check that no row's diff remains.
   - Execute `INSERT`s. After: post-condition check that row count grew by exactly the expected number.
   - Execute `DELETE`s (CASCADE handles `user_picks` / `user_missed_bands`; `live_band_test_config.band_id` becomes NULL if referenced). After: post-condition check.
   - Bump `public.app_config.cache_version` to a fresh ISO timestamp.
9. **Print summary.** Exit 0 on full success; non-zero on any post-condition failure.

### Plan output format (illustrative)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lineup sync plan — DRY RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:        https://<project>.supabase.co
DB rows:       187   Seed rows: 188

UPDATE  (3 slots)
  WET3   name: 'TDB MTB' → 'Thy Catafalque'
         image_url: PLACEHOLDER → https://www.wacken.com/.../csm_thy_catafalque.jpg
  FAS1   start_time: 2026-07-29T16:00+02:00 → 2026-07-29T16:30+02:00
         end_time:   2026-07-29T17:00+02:00 → 2026-07-29T17:30+02:00
  LOU6   genre: 'Gothic Metal' → 'Symphonic Gothic Metal'

INSERT  (1 slot)
  JUN1   'Some New Band' · Welcome to the Jungle · 2026-07-29 14:00 → 14:45

DELETE  (0 slots)

Pick impact:
  · UPDATE bucket: 0 picks affected (band ids preserved)
  · DELETE bucket: 0 picks affected
  · INSERT bucket: n/a (new bands have no picks yet)

Run with --apply to execute.
```

### Safety properties

- **Default is dry-run.** Operator must explicitly type `--apply`. There is no countdown — the dry-run output IS the safety review.
- **Idempotent.** Running `--apply` twice in a row leaves the database in the same state. Second run shows an empty plan.
- **Bucket order minimizes risk.** UPDATE before INSERT before DELETE means:
  - The "no FK changes" operations happen first (UPDATE).
  - The "additive" operations happen next (INSERT) — failures here don't damage existing data.
  - The "destructive" operations happen last (DELETE) — and only after the operator confirmed the plan listed exactly which picks would die.
- **Post-condition checks** abort the run on row-count mismatch. Partial-state on abort is acceptable because the script is idempotent — re-running picks up where it left off.
- **Cache version bump at the end** forces a clean client refresh on next app load. Without it, IndexedDB would serve stale band data.

### What sync does NOT do

- Does not change `slot_id` of an existing row. A `slot_id` change in `bands.ts` (vs. DB) shows up as one `DELETE` + one `INSERT` in the plan. If the operator's intent was a band move, they should run `seed:bands:move` first instead.
- Does not touch `bands.created_at`.
- Does not touch any table other than `public.bands` (UPDATE/INSERT/DELETE) and `public.app_config` (cache_version bump). Cascades into `user_picks` / `user_missed_bands` are passive consequences of DELETEs only.

---

## Tool 2: `seed:bands:move`

**Path:** `supabase/seed/bands-move.ts`
**npm script:** `"seed:bands:move": "tsx supabase/seed/bands-move.ts"`

### Purpose

Used **only** when Wacken relocates an already-confirmed band to a different slot, AND the operator wants existing picks for that band to follow it to the new slot.

This is intentionally narrow. The common "band has a new image URL" or "slot has a new start time" cases are handled by `seed:bands:sync`. Move is for the rare case where the slot itself changes.

### Flags

| Flag | Effect |
|---|---|
| `--from <slot_id>` (required) | Source slot ID (e.g., `FAS1`) |
| `--to <slot_id>` (required) | Destination slot ID (e.g., `LOU3`) |
| (no `--apply`) | Dry-run. Prints what would change. |
| `--apply` | Execute the move. |

### Flow

1. **Load env.** Same pattern.
2. **Pre-conditions** (each aborts on failure):
   - `--from` slot exists in DB.
   - `--to` slot exists in DB.
   - `--from != --to`.
3. **Print side-by-side context** for the operator: name + stage + time of each slot, plus pick counts on each.
4. **If `--apply`:**
   - Capture `from_band_id` and `to_band_id`.
   - **Re-point `user_picks`:** deduplicate first — any user who already has both `(user_id, from_band_id)` AND `(user_id, to_band_id)` would collide on the PK after the update. For each such collision: delete the `from_band_id` row (the user already has a pick on the destination, so the move is a no-op for them). Log the affected user IDs. Then `UPDATE user_picks SET band_id = <to_band_id> WHERE band_id = <from_band_id>`.
   - **Re-point `user_missed_bands`:** identical pattern (same composite PK).
   - **Re-point `live_band_test_config.band_id`** if it equals `from_band_id`.
   - **Delete the source slot row:** `DELETE FROM public.bands WHERE slot_id = <--from>`. Nothing cascades — all references already moved.
   - **Bump `cache_version`.**
5. **Print summary.** Exit 0 on success.

### Important: move is purely picks-transfer

`seed:bands:move` does NOT add a new slot, rename a slot, or update the destination slot's metadata. Typical usage:

1. Operator edits `bands.ts` to reflect the new lineup (e.g., `LOU3` now has Lovebites with the new time).
2. Operator runs `seed:bands:move --from FAS1 --to LOU3 --apply` to transfer picks.
3. Operator runs `seed:bands:sync --apply` to update the rest of the fields.

Or in the other order — move + sync are commutative for non-overlapping changes.

---

## Existing tools — what changes

### `supabase/seed/bands.ts` (the destructive script)

- Add `slot_id: string` to the `BandSeed` type.
- Promote `// FAS1`-style comments into `slot_id: 'FAS1'` fields on every row.
- Add the pre-flight assertion (see above).
- The `.insert(bands)` call now writes `slot_id` automatically.
- **No change to the destructive contract.** 5s countdown, `--force` flag, full DELETE-then-INSERT all still work the same way.

### `supabase/seed/festival-reset.ts`

- **No functional change.** It still spawns `npx tsx supabase/seed/bands.ts --force` as a subprocess.
- After the rebuild, all rows have stable `slot_id`s, which is what enables future sync runs.
- Both reset and sync bump `cache_version`. Chained execution bumps it twice, which is harmless (each timestamp is just the latest).

### `package.json`

Add two scripts:

```json
"seed:bands:sync": "tsx supabase/seed/bands-sync.ts",
"seed:bands:move": "tsx supabase/seed/bands-move.ts"
```

`seed:bands` stays as-is.

### TypeScript

`Band` type gains `slot_id: string`. Optional in Phase A, required from Phase C onward. Repositories and components do not need to consume the new field.

---

## Edge cases

| Scenario | Behavior |
|---|---|
| `slot_id` collision in seed file | Pre-flight assertion aborts before any DB call |
| `slot_id` malformed (e.g. `'xyz'`) | Pre-flight regex check aborts |
| Seed row missing `slot_id` (undefined) | Pre-flight check aborts |
| Two seed rows with same `(stage, start_time, name)` | Allowed — composite UNIQUE is dropped; slot_id is the only identity |
| Operator deletes a slot from `bands.ts` that has 50 picks | DRY-RUN's "Pick impact" line shows `· DELETE bucket: 50 picks affected`. Operator can abort. With `--apply`, picks are cascade-deleted (matches scope choice) |
| `TDB MTB` slot → real band announced | UPDATE bucket; `id` preserved; future picks attach to the now-named band; no picks existed before (placeholder name) |
| Operator only changes `name` from a typo | UPDATE bucket; picks preserved |
| Operator changes only `stage` on a row (slot_id stays) | UPDATE bucket; picks preserved. This is a legitimate edit, not a "move" |
| Operator changes `slot_id` of a row in `bands.ts` (FAS1 → LOU3) | Sync sees DELETE(FAS1) + INSERT(LOU3). Picks for FAS1's band are lost. If preservation was wanted, operator should have run `seed:bands:move` first |
| Sync run while clients are connected | `public.bands` is not realtime; no live updates. Clients see new state on next app load via `cache_version` mismatch → IndexedDB wipe → fresh fetch |
| Run sync twice with no source changes | Empty plan. No writes. Idempotent |
| Run on a fresh DB (zero bands) | INSERT bucket has all rows; UPDATE and DELETE empty. Works as a non-destructive initial seed |
| `--apply` partial failure (e.g., UPDATE succeeds, INSERT fails) | Each bucket's post-condition aborts the run. Operator re-runs; idempotency picks up remaining changes |
| DB has rows with NULL `slot_id` (Phase B was skipped) | Sync detects and refuses with a clear error listing NULL-slot_id rows. Operator runs `seed:bands` once to backfill, then re-runs sync |
| `seed:bands:move` when source slot doesn't exist | Pre-condition aborts |
| `seed:bands:move` when destination slot doesn't exist | Pre-condition aborts |
| `seed:bands:move` and a user has picked both source AND destination bands | Dedup: delete the user's source-band pick row (they already have a destination pick; move is a no-op for them). Log affected user IDs |
| `seed:bands:move` and `live_band_test_config.band_id` references source | Re-pointed to destination |
| `.env.local` missing service role key | Hard-fail before any writes (same as `bands.ts` today) |
| Operator runs `bands.ts` (the destructive one) without first running the schema migration | `slot_id` column doesn't exist; `.insert(bands)` fails with a clear DB error. Operator runs migration first |

---

## Rollout

Three-step rollout. The middle step is a one-time intentional pick loss (the same loss every `seed:bands` re-run causes today). After that, all future edits preserve picks.

### Phase A — Schema prep + seed file update (single PR)

- Migration 1 (add `slot_id` NULLable + index).
- Update `bands.ts`: add `slot_id` to every row, add pre-flight assertion.
- Update `Band` TypeScript type with optional `slot_id?: string`.
- Build + tests green.
- Merge to `main`.

### Phase B — Backfill (operator action, no PR)

- Run `npm run seed:bands -- --force` against production once.
- **This is destructive — picks are wiped.** Acceptable because:
  - It matches today's contract (re-runs always wipe picks).
  - We control the timing (do this when pick density is low or pre-festival).
  - It's the only such loss going forward.
- After the run, every row in `public.bands` has its `slot_id` set.

### Phase C — Lock schema + ship new tools (single PR)

- Migration 2 (NOT NULL + UNIQUE + drop composite).
- Make `slot_id: string` non-optional in TypeScript.
- Add `supabase/seed/bands-sync.ts` and `supabase/seed/bands-move.ts`.
- Add `seed:bands:sync` and `seed:bands:move` to `package.json`.
- Wiki updates (see below).
- Build + tests green.
- Merge to `main`.

### Phase D — Steady state

- For small lineup changes: edit `bands.ts`, run `seed:bands:sync` to preview, then `seed:bands:sync -- --apply`.
- For band-relocates-slot: run `seed:bands:move` first, then `seed:bands:sync`.
- For catastrophic refresh: `festival-reset -- --with-bands` (unchanged).

---

## Wiki + Design System updates

- **`docs/ai-wiki/lineup.md`** — Add a "Stable identity" subsection explaining `slot_id` is canonical. Update the "How to update the lineup" instructions to point at `seed:bands:sync` as the default tool; recharacterize `seed:bands` as "destructive — use only for festival reset or major overhauls."
- **`docs/ai-wiki/supabase-schema.md`** — Updated `bands` DDL (add `slot_id`, drop composite UNIQUE), updated RLS commentary.
- **`docs/ai-wiki/festival-reset.md`** — Cross-reference the new sync tool. Note that destructive `seed:bands` remains its `--with-bands` backend.
- **New `docs/ai-wiki/lineup-sync.md`** — Full flow doc (purpose, when to run, flags, plan output, worked examples for each scope case, edge cases). Follows the 8-section flow template.
- **`docs/ai-wiki/changelog.md`** — Dated entry: Added (new scripts, new flow page), Changed (bands schema, lineup.md instructions), Architectural Notes (slot_id as stable identity).
- **`docs/ai-wiki/index.md`** — Link the new page; add to a new "Operational Tooling" subsection alongside the festival-reset link.
- **`public/Design System.html`** — No UI changes; no DS edit.
- **`CLAUDE.md`** — Update the Testing section's seed-script catalog to include `seed:bands:sync` and `seed:bands:move`. No principle changes.

---

## Risks

| Risk | Mitigation |
|---|---|
| Operator forgets `--apply` and assumes a "successful" dry-run actually wrote | Plan output ends with a clear `Run with --apply to execute.` line; summary on `--apply` runs prints "✓ applied N changes" instead |
| Operator runs `seed:bands` (destructive) when they meant `seed:bands:sync` | The destructive script's 5s countdown banner is the safety net; rephrase its first line to "DESTRUCTIVE — picks WILL be lost. For small changes use `seed:bands:sync` instead." |
| Backfill (Phase B) is forgotten between migrations 1 and 2 | Migration 2 would fail at `SET NOT NULL` (rows with NULL slot_id). Clear error; operator runs `seed:bands -- --force` then retries the migration |
| `slot_id` regex too strict — Wacken renumbers slots in the future | Regex is internal to the seed script; easy to update. The DB constraint is just `UNIQUE` text, not regex-restricted |
| Move command leaves picks in inconsistent state if it partially fails | Each step (re-point picks, re-point missed, re-point test config, delete row) is its own SQL statement. Idempotent for re-run on same `--from`/`--to`. Failures abort with the partial state visible |
| Sync deletes a slot the operator didn't realize had picks | Pick impact is reported in the dry-run plan **before** the operator types `--apply`. No silent loss |
| `cache_version` bump after sync confuses clients still using the old data | This is exactly the intended behavior — clients should refresh after a lineup change. Documented in `lineup-sync.md` |

---

## Alternatives considered (and rejected)

### Single script with `--mode={sync,replace}` flag

Mixes two operations with very different safety semantics in one file. The destructive path (DELETE + CASCADE + INSERT + verify) and the sync path (diff + plan + dry-run + UPDATE) are both large. Combining them risks bugs in one path affecting the other and makes incident response harder. Rejected.

### Sync emits a SQL migration file

Operator reviews the SQL then applies via `supabase db push`. Maximum auditability, but heavy machinery for "fix a band name typo." Accumulates one migration per tiny edit. Mismatch with the rest of the codebase, where seed scripts perform direct DB operations. Rejected.

### Use `UNIQUE(stage, start_time, name)` as identity

That composite key is what every "small change" in scope edits. It cannot be the stable identity. Rejected on first principles.

### Use the band name (normalized) as identity

Several bands legitimately appear twice in the lineup at different times on different days (e.g., Wacken Firefighters in WAK1 + WAK23). Name is not a unique identifier per performance. Rejected.

### Use a deterministic UUID derived from slot_id (uuid v5)

Functionally identical to using slot_id directly, but adds an indirection layer. Slot_id is human-readable, matches what the wiki and seed file already use, and is what an operator will actually type into CLI flags. Rejected.

### Soft delete (add `deleted_at` to bands) instead of hard delete

Avoids cascade-deleting picks for canceled bands. Adds an `is_active` filter to every band query in repositories. Net cost in complexity outweighs the benefit — canceled-band picks losing their data is acceptable per the scope decision. Rejected for v1.

---

## Open questions

- **Sync run from CI?** Not currently planned. The service-role key is in operator's `.env.local`; CI would need a secrets store and a triggering convention. Defer until a real need emerges.
- **Telemetry for sync runs?** Logging which slots changed and when could feed a future "lineup changelog" page. Out of scope for this design.
- **`live_band_test_config` reset?** Phase B's destructive backfill nullifies its `band_id` (existing CASCADE-SET-NULL behavior). If the operator was actively testing live-band behavior on a particular band, that gets cleared. Acceptable; operator can re-set it after.

---

## Cross-references

- `supabase/seed/bands.ts` — Existing destructive seed; gets `slot_id` field added.
- `supabase/seed/festival-reset.ts` — Continues to invoke `bands.ts` via `--with-bands`. No change.
- `docs/ai-wiki/lineup.md` — Source of truth for band assignments; already tracks Slot IDs as a documentation convention.
- `docs/ai-wiki/stages.md` — Maps Slot IDs → start/end times.
- `docs/ai-wiki/supabase-schema.md` — DDL reference; updated.
- `docs/ai-wiki/festival-reset.md` — Sibling operator tool; cross-referenced from new sync doc.
- `src/types/` — `Band` type gets `slot_id`.

---

**Last edited:** 2026-05-20 by Claude Opus 4.7 (Cursor)
