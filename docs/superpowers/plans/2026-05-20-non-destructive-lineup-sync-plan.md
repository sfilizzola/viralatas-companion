# Non-destructive lineup sync — Implementation plan

**Date:** 2026-05-20
**Design doc:** `docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md`
**Status:** Ready to execute

This plan tracks the rollout phases A → B → C → D defined in the design doc. Phase A and Phase C are PRs. Phase B is a one-time operator action between them. Phase D is the steady state — no plan needed.

---

## Prerequisites

- Read `docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md` first.
- Have `.env.local` configured with `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Confirm that no one is actively picking bands when Phase B runs (it's destructive).
- Confirm `git status` shows a clean tree on the branch you'll work in (the spec already lives in `dev`).

---

## Phase A — Schema prep + seed file update

**Goal:** add `slot_id` as a populated, NULLable column on `public.bands`. After this phase, `npm run seed:bands -- --force` will write `slot_id` on every insert. The schema is not yet locked.

**Branch:** start from `dev`.

### Step A1 — Create migration: add `slot_id` NULLable

**File:** `supabase/migrations/20260520000000_bands_slot_id_add.sql` (timestamp = today; bump if it collides with another in-flight PR)

Contents:

```sql
-- Add stable identity column for non-destructive lineup sync.
-- See docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md
ALTER TABLE public.bands ADD COLUMN slot_id text;
CREATE INDEX idx_bands_slot_id ON public.bands(slot_id);
```

Verification: this migration must be safe to apply on a populated table — it does not touch existing rows.

### Step A2 — Update the `BandSeed` type in `bands.ts`

**File:** `supabase/seed/bands.ts`

- Add `slot_id: string` as the **first** field in the `BandSeed` type (visually leads each row).
- Update the file header docstring's "Expected row count" paragraph to mention that each row now declares its `slot_id` explicitly.

### Step A3 — Promote slot codes to a real field on every row

**File:** `supabase/seed/bands.ts`

For each of the ~187 rows, move the end-of-line `// FAS1`-style comment into a `slot_id: 'FAS1'` field at the start of the row. Examples:

Before:
```typescript
{ name: 'Lovebites', stage: STAGES.FASTER, start_time: t(D1,16, 0), end_time: t(D1,17, 0), genre: 'Heavy Metal', image_url: `${WOA}/...` }, // FAS1
```

After:
```typescript
{ slot_id: 'FAS1', name: 'Lovebites', stage: STAGES.FASTER, start_time: t(D1,16, 0), end_time: t(D1,17, 0), genre: 'Heavy Metal', image_url: `${WOA}/...` },
```

The closing-line comment can stay redundant or be deleted — operator's choice. Deleting tightens the file. Keeping it eases visual scanning. Recommendation: **delete** since the field now carries the info.

The HAR13 ceremony row's multiline shape gets the field added at the top.

### Step A4 — Add pre-flight assertion to `bands.ts`

**File:** `supabase/seed/bands.ts`

Add a helper function and call it at the top of `seed()` before any DB call:

```typescript
const SLOT_ID_RE = /^(HAR|FAS|LOU|WET|HBA|WAS|WAK|JUN)\d+$/;

function assertSeedIntegrity(rows: BandSeed[]) {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const [i, row] of rows.entries()) {
    if (!row.slot_id) errors.push(`row ${i}: missing slot_id`);
    else if (!SLOT_ID_RE.test(row.slot_id)) errors.push(`row ${i}: invalid slot_id '${row.slot_id}'`);
    else if (seen.has(row.slot_id)) errors.push(`row ${i}: duplicate slot_id '${row.slot_id}'`);
    else seen.add(row.slot_id);
  }
  if (errors.length) {
    console.error('Seed integrity check failed:');
    for (const e of errors) console.error('  ·', e);
    process.exit(1);
  }
}
```

Call site: in `seed()`, right after `loadEnvFile()`.

### Step A5 — Update the `Band` TypeScript type (optional field)

**File:** `src/types/index.ts`

```typescript
export type Band = {
  id: string;
  slot_id?: string;  // NEW — populated on rows seeded after the slot_id migration; required from Phase C
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  genre: string | null;
  category: BandCategory | null;
};
```

Field is optional in Phase A because old rows in the DB still have NULL slot_id.

### Step A6 — Verify locally

Run:
```bash
rtk npm run build
rtk npm test
```

Both must be green. The new field on `Band` should not break any consumer (it's optional and existing code reads `id`/`name`/etc., not `slot_id`).

### Step A7 — Commit Phase A

Single commit on `dev`:

```
Phase 22.A: Add slot_id to bands schema + seed file

- Migration adds NULLable slot_id column + index
- bands.ts promotes // FAS1-style comments to real slot_id fields
- Pre-flight assertion enforces uniqueness + format
- Band type gains optional slot_id field

Backfill happens in Phase B via destructive seed re-run, then Phase C
locks the column NOT NULL.
```

**Do not merge until Phase B is scheduled.** Phase B must follow Phase A immediately so that no merge to `main` leaves the DB with NULL slot_ids.

---

## Phase B — Backfill (operator action, no PR)

**Goal:** every row in `public.bands` has its `slot_id` set.

**This phase is destructive.** All `user_picks` and `user_missed_bands` are wiped — the same loss every `seed:bands` run causes today. After Phase B, no further routine wipes are needed.

### Step B1 — Pre-flight

- Confirm Phase A is merged to `dev` (and `main` if the project conventions require it before running seed scripts).
- Confirm `.env.local` points at the right Supabase project.
- Announce to the vira-latas: "About to wipe picks for the slot_id migration. Please re-pick after."

### Step B2 — Run the destructive seed

```bash
rtk npm run seed:bands -- --force
```

Expected output (last lines):
```
Inserted 187 rows · verified ✓
Done 🤘
```

### Step B3 — Verify

Open the Supabase SQL editor and run:

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE slot_id IS NULL) AS null_slot_id,
       count(DISTINCT slot_id) AS distinct_slot_ids
FROM public.bands;
```

Expected: `total = 187`, `null_slot_id = 0`, `distinct_slot_ids = 187`.

If any row has NULL `slot_id`, the Phase A change to `bands.ts` was incomplete. Fix the seed file, re-run.

### Step B4 — Bump the cache_version manually (optional)

The destructive seed does NOT bump `cache_version` — that's a `festival-reset.ts` responsibility. To force connected clients to drop their stale band cache:

```sql
UPDATE public.app_config SET value = now()::text WHERE key = 'cache_version';
```

Or just let clients pick up the new data on their next natural app load.

---

## Phase C — Lock the schema + ship the new tools (single PR)

**Goal:** `slot_id` becomes NOT NULL and UNIQUE; the new `seed:bands:sync` and `seed:bands:move` tools land; wiki gets updated.

**Branch:** new branch from `dev`, e.g. `feat/lineup-sync`.

### Step C1 — Create migration: lock `slot_id`

**File:** `supabase/migrations/20260520000001_bands_slot_id_lock.sql`

```sql
-- Lock slot_id as NOT NULL + UNIQUE now that every row has been backfilled.
-- See docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md
ALTER TABLE public.bands ALTER COLUMN slot_id SET NOT NULL;
ALTER TABLE public.bands ADD CONSTRAINT bands_slot_id_unique UNIQUE (slot_id);

-- The old composite UNIQUE is now redundant; slot_id is the canonical identity.
ALTER TABLE public.bands DROP CONSTRAINT IF EXISTS bands_stage_start_time_name_key;
```

Verification: this migration will fail at `SET NOT NULL` if any row has NULL `slot_id`. That's a feature — it's the contract that Phase B was actually run.

### Step C2 — Make `slot_id` required in the TypeScript type

**File:** `src/types/index.ts`

Change `slot_id?: string` → `slot_id: string`.

Run `rtk npm run build` and `rtk npm test` to find any consumer that may have started using the optional form. Fix forward.

### Step C3 — Add `supabase/seed/bands-sync.ts`

**File:** `supabase/seed/bands-sync.ts` (new)

Structure (use `bands.ts` as the template for env loading and Supabase client setup):

1. **Imports + env loader** — copy from `bands.ts`.
2. **Import seed array** — `import { bands, type BandSeed } from './bands';`
3. **Pre-flight assertion** — call the same `assertSeedIntegrity(bands)` defined in `bands.ts` (export it for reuse, or duplicate it; recommendation: **export from bands.ts**).
4. **Define `loadDbRows(supabase)`** — `SELECT id, slot_id, name, stage, start_time, end_time, genre, image_url, category FROM public.bands`. Return as a `Map<slot_id, DbRow>`.
5. **Define `buildPlan(seed, db)`** — returns `{ inserts, updates, deletes }`:
   - `inserts`: rows in `seed` whose `slot_id` is missing from `db`.
   - `deletes`: rows in `db` whose `slot_id` is missing from `seed`. Detect NULL `slot_id` here and abort with a clear error.
   - `updates`: rows in both where field-by-field comparison finds differences. Compare {`name`, `stage`, `start_time`, `end_time`, `genre`, `image_url`, `category`}. Return per-row diff `{ slot_id, dbId, diffs: { field: { before, after } } }`.
6. **Define `computePickImpact(supabase, deletes)`** — for each delete-bucket row, count `user_picks` and `user_missed_bands` rows with `band_id = dbId`. Return totals.
7. **Define `printPlan(plan, impact)`** — formatted like the spec's illustrative output. End with `Run with --apply to execute.` if no `--apply` flag.
8. **Define `applyPlan(supabase, plan)`** — in order:
   - For each `update`: `UPDATE public.bands SET <changed fields> WHERE id = <dbId>`. After all updates: re-fetch and confirm zero remaining diffs (post-condition).
   - For each `insert`: `INSERT INTO public.bands (slot_id, name, stage, start_time, end_time, genre, image_url, category) VALUES (...)`. Single batched insert. After: count rows; confirm `+inserts.length`.
   - For each `delete`: `DELETE FROM public.bands WHERE id = <dbId>`. Batched delete. After: confirm `-deletes.length`.
9. **Bump `cache_version`** — `UPDATE public.app_config SET value = <now-iso> WHERE key = 'cache_version'`. Warn if zero rows updated (row missing).
10. **`main()`** — parse `--apply` and `--json` from `process.argv`. Wire steps together. Use `printPlan` for human output; `JSON.stringify(plan)` for `--json`.
11. **Self-invoking guard** — same pattern as `bands.ts`:
    ```typescript
    if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
      main();
    }
    ```

### Step C4 — Add `supabase/seed/bands-move.ts`

**File:** `supabase/seed/bands-move.ts` (new)

Structure:

1. **Imports + env loader.**
2. **Parse flags:** `--from <slot_id>` (required), `--to <slot_id>` (required), `--apply` (optional).
3. **Pre-conditions:**
   - Validate `--from` and `--to` are present and different.
   - Validate `--from` and `--to` match the slot_id regex.
   - Fetch both rows from `public.bands`; abort if either is missing.
4. **Print context:** side-by-side band/stage/time + current pick count for each.
5. **If not `--apply`:** print "Run with --apply to execute." and exit 0.
6. **If `--apply`:**
   - Compute the set of `user_id`s with picks on both source and destination:
     ```sql
     SELECT user_id FROM public.user_picks WHERE band_id = <from_id>
     INTERSECT
     SELECT user_id FROM public.user_picks WHERE band_id = <to_id>
     ```
     Delete their source-band pick rows. Log the user IDs.
   - Repeat the same dedup logic for `user_missed_bands`.
   - `UPDATE public.user_picks SET band_id = <to_id> WHERE band_id = <from_id>`.
   - `UPDATE public.user_missed_bands SET band_id = <to_id> WHERE band_id = <from_id>`.
   - `UPDATE public.live_band_test_config SET band_id = <to_id> WHERE band_id = <from_id>`.
   - `DELETE FROM public.bands WHERE id = <from_id>`.
   - Bump `cache_version`.
7. **Print summary.**
8. **Self-invoking guard.**

### Step C5 — Add `npm run` scripts

**File:** `package.json`

Add to the `"scripts"` block, alongside the existing `seed:*` entries:

```json
"seed:bands:sync": "tsx supabase/seed/bands-sync.ts",
"seed:bands:move": "tsx supabase/seed/bands-move.ts"
```

### Step C6 — Update wiki

#### `docs/ai-wiki/lineup.md`

Add a new section near the top, before "Reference Keys":

```markdown
## Stable Identity (slot_id)

Each row in `public.bands` carries a `slot_id` (e.g. `FAS1`, `WET12`, `HAR13`).
This is the canonical, stable identity of a slot in the database — it survives
edits to `name`, `start_time`, `image_url`, `genre`, etc., which means user
picks attached to a band are preserved across small lineup changes.

For everyday small edits, use `npm run seed:bands:sync` (see
[lineup-sync.md](lineup-sync.md)). The destructive `npm run seed:bands` is
reserved for festival reset and catastrophic refresh.
```

Update the "Maintenance Guide" subsections at the bottom to point at `seed:bands:sync` as the default, with `seed:bands` listed as "Destructive — use only for festival reset."

#### `docs/ai-wiki/supabase-schema.md`

Update the `public.bands` DDL block to include `slot_id text NOT NULL UNIQUE`, remove the old `UNIQUE(stage, start_time, name)` line, and add `idx_bands_slot_id`. Bump the "Last updated" footer.

#### `docs/ai-wiki/festival-reset.md`

In the cross-references section, add `docs/ai-wiki/lineup-sync.md` as the daily-use sibling tool. In the "Why a Script, Not a Godlike UI Button" rationale section, optionally note that the same logic applies to the new sync tool.

#### `docs/ai-wiki/lineup-sync.md` (NEW)

Follow the 8-section template in `.claude/context/wiki-template.md`:

1. **Purpose** — Non-destructive sync of `public.bands` from `bands.ts`, preserving picks.
2. **Relevant Source Files** — `supabase/seed/bands-sync.ts`, `bands-move.ts`, `bands.ts`, the two migrations.
3. **When to Run** — Any time `bands.ts` changes mid-festival (or in run-up).
4. **Flag Matrix** — table of `--apply`, `--json`, `--from`/`--to` (move), defaults.
5. **Execution Sequence** — Bullet list mirroring the spec's Section "Tool 1" flow.
6. **Worked Examples** — One example each for: time tweak, TDB MTB → real, brand-new slot, canceled slot, band-stage-move.
7. **Edge Cases** — Lift the table from the spec.
8. **Cross-References** — `supabase-schema.md`, `festival-reset.md`, the design doc.

#### `docs/ai-wiki/changelog.md`

```markdown
## 2026-05-20

### Added
- Non-destructive lineup sync: `npm run seed:bands:sync` (dry-run by default, `--apply` to write).
- Band-stage-move tool: `npm run seed:bands:move -- --from <slot> --to <slot> [--apply]`.
- `docs/ai-wiki/lineup-sync.md` — full flow doc for the new tools.

### Changed
- `public.bands` gains `slot_id text NOT NULL UNIQUE` as the canonical stable identity.
- `supabase/seed/bands.ts` now writes `slot_id` on every row.
- `Band` TypeScript type gains `slot_id: string`.
- The old `UNIQUE(stage, start_time, name)` constraint is dropped — redundant with slot_id.

### Architectural Notes
- Slot ID was already the documentation convention; it is now also the database identity.
- The destructive `seed:bands` script keeps its contract unchanged. `festival-reset --with-bands` is unaffected.
- Cache invalidation flows through the existing `cache_version` bump after sync/move runs.
```

#### `docs/ai-wiki/index.md`

Add to the "Operational Tooling" subsection (next to `festival-reset.md`):

```markdown
- **[Lineup Sync](lineup-sync.md)** — Non-destructive `seed:bands:sync` and `seed:bands:move`. Defaults to dry-run; preserves user picks across small lineup edits.
```

### Step C7 — Update `CLAUDE.md`

In the **Testing** section's seed-script catalog, after `seed:live-now` and before `npm run festival:reset`:

```markdown
 - `npm run seed:bands:sync` — Non-destructive lineup sync (dry-run by default; `--apply` to write).
 - `npm run seed:bands:move -- --from FAS1 --to LOU3 [--apply]` — Transfer picks when a band relocates to a different slot.
```

No other CLAUDE.md changes needed. Subagent definitions remain valid (this isn't an architectural shift, just a new operator tool).

### Step C8 — Verify locally

```bash
rtk npm run build
rtk npm test
```

Both must be green.

Smoke test the new scripts against a dev Supabase project:

1. `rtk npm run seed:bands:sync` → should report "no changes" (empty plan) right after a fresh seed.
2. Edit a single field in `bands.ts` (e.g., change `WET3`'s genre).
3. `rtk npm run seed:bands:sync` → should show a 1-row UPDATE bucket.
4. `rtk npm run seed:bands:sync -- --apply` → should write, bump cache_version, exit 0.
5. Verify that `user_picks` count is unchanged after the apply.

Run `rtk npm run seed:bands:move -- --from <slot> --to <slot>` as a dry-run only (do not `--apply` in a dev environment unless you want to test the dedup logic).

### Step C9 — Commit Phase C

Single commit:

```
Phase 22.C: Non-destructive lineup sync tools

- Migration locks slot_id NOT NULL + UNIQUE; drops old composite UNIQUE
- seed:bands:sync — dry-run by default, --apply to write, 3-bucket plan
- seed:bands:move — picks-transfer for band-relocates-slot
- Wiki: new lineup-sync.md flow doc + supabase-schema.md + lineup.md + festival-reset.md cross-ref + changelog
- CLAUDE.md: seed-script catalog updated
- Band TypeScript type: slot_id becomes required
```

### Step C10 — Open PR + merge

Standard PR to `dev`. Reviewer should confirm:
- Migrations have correct timestamps and idempotent guards.
- Sync script's `--apply` path is post-condition-checked at every bucket.
- Move script's dedup-before-update SQL is correct.
- Wiki updates don't drift from the design doc.

After merge to `dev`, eventual merge to `main` triggers the normal version bump (per CLAUDE.md "Automatic versioning"). No additional special handling.

---

## Phase D — Steady state

No plan. Operator workflow once Phase C is live:

| Change | Workflow |
|---|---|
| Time tweak, name fix, image URL update, genre fix | Edit `bands.ts` → `npm run seed:bands:sync` → review plan → `npm run seed:bands:sync -- --apply` |
| TDB MTB → real band announced | Same as above (it's a `name` + `image_url` UPDATE) |
| Brand-new slot added | Add row to `bands.ts` → sync as above |
| Canceled slot | Remove row from `bands.ts` → sync as above (operator sees pick impact in the plan before `--apply`) |
| Band relocates to a different slot, picks should follow | `npm run seed:bands:move -- --from <old> --to <new> --apply`, then edit `bands.ts` + sync |
| Festival reset / catastrophic refresh | `npm run festival:reset -- --with-bands --force` (unchanged) |

---

## Rollback strategy

### Phase A rollback

If something goes wrong after Phase A is merged but before Phase B:

- Revert the migration with a new "down" migration:
  ```sql
  DROP INDEX IF EXISTS public.idx_bands_slot_id;
  ALTER TABLE public.bands DROP COLUMN IF EXISTS slot_id;
  ```
- Revert the `bands.ts` and `Band` type changes.

The DB is unaffected (column is NULLable, no rows changed).

### Phase B rollback

Phase B is destructive and cannot be rolled back. Picks are lost. The vira-latas re-pick. This is the expected one-time cost.

If Phase B reveals a bug (e.g., `bands.ts` has wrong slot_ids), fix `bands.ts` and re-run `seed:bands -- --force`. Acceptable because no new picks have been made yet in the gap.

### Phase C rollback

If sync/move have a bug discovered after merge:

- Stop using them. Fall back to `seed:bands` (destructive) for any needed change. Picks lost — same as before this whole project.
- Revert Phase C's migration with a down migration:
  ```sql
  ALTER TABLE public.bands DROP CONSTRAINT IF EXISTS bands_slot_id_unique;
  ALTER TABLE public.bands ALTER COLUMN slot_id DROP NOT NULL;
  -- (do NOT recreate the old composite UNIQUE — it would now be redundant with future slot_id semantics)
  ```
- Revert the two new TS scripts and the package.json entries. Wiki can stay updated; it's accurate even if the tools are temporarily unavailable.

The `slot_id` column itself stays populated. It costs nothing to leave it in place and re-attempt Phase C later.

---

## Verification checklist (end of Phase C)

- [ ] Migration 1 + Migration 2 applied on production
- [ ] Every row in `public.bands` has a unique non-NULL `slot_id` matching the regex
- [ ] `npm run seed:bands:sync` exits 0 with empty plan against a freshly-seeded DB
- [ ] `npm run seed:bands:sync` correctly detects UPDATE / INSERT / DELETE buckets when `bands.ts` differs from the DB
- [ ] `--apply` writes; second `--apply` run on the same state exits with empty plan (idempotent)
- [ ] After `--apply`, `user_picks` count is preserved (no FK casualties from UPDATEs)
- [ ] `cache_version` row was bumped to a fresh ISO timestamp
- [ ] `npm run seed:bands:move -- --from X --to Y` dry-run prints both slots' contents + pick counts
- [ ] `npm run seed:bands -- --force` still works exactly as before (regression check)
- [ ] `npm run festival:reset -- --with-bands --force` still works exactly as before (regression check)
- [ ] `rtk npm run build` green
- [ ] `rtk npm test` green
- [ ] All wiki pages updated, changelog has dated entry, CLAUDE.md catalog updated
- [ ] No edits to `public/vira-lata-ds.html` (no UI changes)

---

## Out of plan (later, if needed)

- Realtime publication on `public.bands` so sync changes propagate live. The cache-version bump is sufficient for now.
- A `bands_history` audit table.
- Pulling sync into a godlike UI button.
- Running sync from CI / scheduled job.
- Telemetry for sync runs.

---

**Last edited:** 2026-05-20 by Claude Opus 4.7 (Cursor)
