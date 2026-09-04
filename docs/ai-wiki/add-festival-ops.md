# Add Festival (Ops)

## Purpose

How operators create a new **Festival** catalog row and attach a lineup. There is **no in-app festival CRUD** — creation is service-role / laptop only. Vira-latas then Join from `/festivals` (self opt-in). Godlike does **not** get implicit membership.

**Requires** `.env.local` with `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Client RLS: SELECT for all authenticated; **godlike UPDATE `features` + `cache_version` only** (Phase 49 — Lineup era flip either direction, and pack cache reset). Still no client INSERT/DELETE.

---

## Relevant Source Files

- `supabase/seed/festivals.ts` — Upsert festival by `--slug` (`npm run seed:festival`)
- `supabase/seed/announcement-festivals-2027.ts` — create-only catalog + untimed Band seed for the four researched 2027 Festivals
- `supabase/seed/seed-shared.ts` — `parseFestivalSlug`, `resolveFestivalId`, service client
- `supabase/seed/demo-fest-2027.ts` — Proof seed: demo festival + 3 fake bands (`npm run seed:demo-fest`)
- `supabase/seed/bands.ts` / `bands-sync.ts` / `festival-reset.ts` — Festival-scoped via `--festival <slug>` (default `wacken-2026`)
- `supabase/migrations/20260811000000_multi_festival.sql` — `public.festivals`, memberships, RLS
- `src/repositories/festivals.ts` — Client catalog sync, Join/Leave, Active pack load
- `docs/ai-wiki/supabase-schema.md` — Table / RLS reference
- `docs/ai-wiki/domain-model.md` — Festival / membership language
- `CONTEXT.md` — Locked product terms

---

## When to Run

- Adding a real second event (e.g. Hellfest) after product/ops decide dates and features (`seed:festival` + Schedule Lineup seed)
- Preparing the researched 2027 **Announcement Lineups** (`seed:announcement-festivals-2027` — Wacken, ROCKHARZ, Bangers Open Air, Epic Fest)
- Local/dev proof of multi-festival UX (`seed:demo-fest`)
- Updating an existing catalog row (same `--slug` upserts via `seed:festival`; the 2027 announcement seed does **not** upsert metadata)

Do **not** confuse with `festival:reset` (wipes social state for one festival) or `seed:bands --force` (destructive lineup replace for one festival).

---

## Step 1 — Upsert the festival row

```bash
npm run seed:festival -- \
  --slug hellfest-2027 \
  --name "Hellfest 2027" \
  --tz Europe/Paris \
  --starts 2027-06-17T00:00:00+02:00 \
  --ends 2027-06-22T00:00:00+02:00 \
  --features '{}'
```

| Flag | Required | Default | Notes |
|------|----------|---------|--------|
| `--slug` | yes | — | Stable id string (`wacken-2026`, `hellfest-2027`). Unique. |
| `--name` | yes | — | Display name in catalog / switcher |
| `--tz` | no | `Europe/Berlin` | IANA timezone |
| `--starts` | yes | — | ISO timestamptz |
| `--ends` | yes | — | ISO timestamptz |
| `--features` | no | `{}` | JSON object of Festival feature flags |

**Feature keys** (all optional booleans; missing/false = off):

| Key | Gates |
|-----|--------|
| `metal_place` | Metal Place admin + related Presence UI |
| `map` | `/map` route + map entry points |
| `duck` | Duck quack UI |
| `camp` | Camp HQ / camping Presence UI |
| `wrap` | `/wrap` + wrap teaser |
| `remote_lineup` | Godlike remote lineup sync UI (Wacken **Official running order** feed — not Lineup era) |

**Lineup era** (every Festival; **not** a Festival feature): **Announcement Lineup** (named Bands) vs **Schedule Lineup** (day, time, stage). Storage key is `features.running_order` (`true` = Schedule Lineup; omitted/`false` = Announcement Lineup). New Festivals default off — `'{}'` is enough. **Wacken 2026** and **Summer Breeze 2026** stay Schedule Lineup (`true`) unless godlike flips. **Wacken 2027** and the other 2027 researched Festivals start Announcement Lineup. **`demo-fest-2027` stays without `running_order`** (Announcement Lineup even if the proof seed has fake times). Do not call this **Official running order**.

Example Wacken-style pack (Schedule Lineup + grounds extras):

```bash
--features '{"metal_place":true,"map":true,"duck":true,"camp":true,"wrap":true,"remote_lineup":true,"running_order":true}'
```

Core surfaces (schedule, picks, mural, `/now` social) exist for every Festival and are **not** Festival features. How `/schedule` looks follows **Lineup era**.

Upsert is by `slug` (`onConflict: 'slug'`). Re-running with the same slug updates name/dates/tz/features; it does not wipe bands or memberships.

---

## Step 2 — Seed bands for that festival

Every band row must have `festival_id` pointing at the new Festival. Always pass `--festival <slug>` so you do not touch `wacken-2026`.

### Prepared 2027 Announcement Lineups

Wacken 2027, ROCKHARZ 2027, Bangers Open Air 2027, and Epic Fest 2027 use one create-only command. Human-editable Band lists and source caveats:

- [Wacken Open Air 2027](festivals/wacken-2027/lineup.md)
- [ROCKHARZ 2027](festivals/rockharz-2027/lineup.md)
- [Bangers Open Air 2027](festivals/bangers-open-air-2027/lineup.md)
- [Epic Fest 2027](festivals/epic-fest-2027/lineup.md)

The command creates the catalog row when absent and inserts untimed Bands (`slot_id` / `stage` / `start_time` / `end_time` all null) only if that Festival has no Bands. If the normalized name set already matches, `--apply` patches `image_url` only and bumps `cache_version`. It never deletes rows or picks. It does **not** invent day, stage, or set times — including Bangers' official day groups, which stay wiki footnotes only.

```bash
npm run seed:announcement-festivals-2027 -- --festival <slug>          # dry-run (no credentials)
npm run seed:announcement-festivals-2027 -- --festival <slug> --apply  # create if empty
```

Supported slugs:

- `wacken-2027`
- `rockharz-2027`
- `bangers-open-air-2027`
- `epic-fest-2027`

Requires Phase 49's nullable Band slot migration. New catalog rows start in **Announcement Lineup** (`features.running_order = false`). Seed one Festival at a time and verify it before continuing.

**Create-only gotchas (true in the seed):**

- If the Festival row already exists, metadata/features are left unchanged (not an upsert).
- If the Festival is already **Schedule Lineup** (`running_order === true`), apply refuses.
- If Bands already exist, apply patches `image_url` when the normalized name set matches; otherwise it refuses. Never use this script to add/remove acts later.

When organizers later publish a **Schedule Lineup** (day, time, stage), do **not** rerun this initial seed and do **not** expect it to flip Lineup era. Use the Phase 49 laptop name-match workflow (`seed:bands:sync`) so existing Band ids and picks survive, then godlike flips era on the Active Festival after verification. **Official running order** remains the Wacken JSON feed name — not Lineup era.

### Schedule Lineups

**Preferred (non-destructive sync):**

```bash
npm run seed:bands:sync -- --festival hellfest-2027          # dry-run
npm run seed:bands:sync -- --festival hellfest-2027 --apply
```

**Destructive full replace** (that festival’s bands + CASCADE picks only):

```bash
# Explicit confirmation required on production — no PITR
npm run seed:bands -- --festival hellfest-2027 --force
```

**Tiny proof lineup** (local/dev; does not touch Wacken):

```bash
npm run seed:demo-fest
```

Creates/updates `demo-fest-2027` with features mostly off, **no `running_order`** (Announcement Lineup), and three fake slots (`DEM1`–`DEM3`). Filled times do not make Schedule Lineup.

---

## Step 3 — What users do (not ops)

1. Authenticated user opens `/festivals` (Profile → Festivals)
2. Sees catalog **metadata only** until Join (name, dates, timezone — no lineup)
3. **I'm going** → insert `festival_memberships` (self)
4. Set **Active** while online → clear Active Festival pack → load bands/picks/mural/crew for that `festival_id`
5. Offline switch is blocked (need signal to load the target pack)

**No auto-enroll** for new festivals. Cutover backfill enrolled existing accounts only on `wacken-2026`. New signups start with zero memberships.

---

## Related ops (same `--festival` scope)

| Command | Effect |
|---------|--------|
| `npm run festival:reset -- --festival <slug>` | Wipe social state for that Festival; bumps that Festival’s `cache_version` |
| `npm run festival:reset -- --festival <slug> --with-bands` | Reset + destructive reseed bands for that Festival only |
| `npm run seed:bands:move -- --festival <slug> …` | Transfer picks between slots within a Festival |

Default slug when `--festival` is omitted: **`wacken-2026`**.

---

## Safety

- Production has **no PITR**. Prefer dry-run sync; never run destructive band/reset commands on prod without explicit operator OK in the same turn.
- Creating a festival row alone is low risk (catalog upsert). `seed:announcement-festivals-2027 --apply` is also low risk (create-only untimed Bands, or `image_url` patch on a matching name set; never deletes). Attaching bands with `--force` or `festival:reset --with-bands` is high risk for that Festival’s picks.
- Catalog INSERT/DELETE stay service-role / laptop. Godlike may UPDATE `features` and `cache_version` from the PWA (Lineup era flip either way + pack invalidation). Godlike still must Join to use a Festival in the app.

---

## Acceptance checklist

1. `seed:festival` prints upserted row with expected slug and features
2. `select * from festivals where slug = '…'` shows the row
3. Bands for that slug have non-null `festival_id`; Wacken 2026 band count unchanged
4. For 2027 Announcement Lineups: dry-run first; `--apply` inserts untimed Bands only; `features.running_order` is false; Band count matches the wiki page
5. In the PWA: catalog lists the Festival; Join → Activate → schedule shows only that Festival’s bands (Announcement Lineup is name-only; no fake live times)
6. With `--features '{}'` (or demo defaults): map / duck / metal place / presence hidden; core routes work

---

## Glossary cross-links

- **Festival** / **Festival membership** / **Active Festival** / **Festival features** / **Festival catalog** / **Lineup era** / **Announcement Lineup** / **Schedule Lineup** → [domain-model.md](domain-model.md), [CONTEXT.md](../../CONTEXT.md)
- Schema + RLS → [supabase-schema.md](supabase-schema.md)
- Client Join/Leave/pack → [routes.md](routes.md) (`/festivals`), [sync-engine.md](sync-engine.md)
- Lineup sync mechanics → [lineup-sync.md](lineup-sync.md)
- Festival-scoped reset → [festival-reset.md](festival-reset.md)
- WOA 2026 Schedule Lineup → [lineup.md](lineup.md)
- 2027 Announcement Lineups → [Wacken](festivals/wacken-2027/lineup.md), [ROCKHARZ](festivals/rockharz-2027/lineup.md), [Bangers](festivals/bangers-open-air-2027/lineup.md), [Epic Fest](festivals/epic-fest-2027/lineup.md)

**Last updated:** 2026-09-04 — Phase 49: Lineup era storage key, godlike `features`/`cache_version` UPDATE, Wacken pack includes `"running_order":true`.
