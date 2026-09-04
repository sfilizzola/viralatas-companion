# Add Festival (Ops)

## Purpose

How operators create a new **Festival** catalog row and attach a lineup. There is **no in-app festival CRUD** — creation is service-role / laptop only. Vira-latas then Join from `/festivals` (self opt-in). Godlike does **not** get implicit membership.

**Requires** `.env.local` with `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Festivals have no client INSERT/UPDATE/DELETE RLS policies.

---

## Relevant Source Files

- `supabase/seed/festivals.ts` — Upsert festival by `--slug` (`npm run seed:festival`)
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

- Adding a real second event (e.g. Hellfest) after product/ops decide dates and features
- Local/dev proof of multi-festival UX (`seed:demo-fest`)
- Updating an existing catalog row (same `--slug` upserts)

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

**Lineup era** (every Festival; **not** a Festival feature): **Announcement Lineup** (named Bands) vs **Schedule Lineup** (day, time, stage). New Festivals start Announcement Lineup (`running_order` omitted/false). Wacken / Summer Breeze stay Schedule Lineup (`true`) unless godlike flips. Phase 49 stores era in the same JSON as `running_order`. Do not call this **Official running order**.

Example Wacken-style pack (Phase 49 also sets `"running_order":true`):

```bash
--features '{"metal_place":true,"map":true,"duck":true,"camp":true,"wrap":true,"remote_lineup":true}'
```

Core surfaces (schedule, picks, mural, `/now` social) exist for every Festival and are **not** Festival features. How `/schedule` looks follows **Lineup era**.

Upsert is by `slug` (`onConflict: 'slug'`). Re-running with the same slug updates name/dates/tz/features; it does not wipe bands or memberships.

---

## Step 2 — Seed bands for that festival

Every band row must have `festival_id` pointing at the new Festival. Always pass `--festival <slug>` so you do not touch `wacken-2026`.

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

Creates/updates `demo-fest-2027` with features mostly off and three fake slots (`DEM1`–`DEM3`).

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
- Creating a festival row alone is low risk (catalog upsert). Attaching bands with `--force` or `festival:reset --with-bands` is high risk for that Festival’s picks.
- Godlike / service role can write festivals; the PWA cannot. Godlike still must Join to use a Festival in the app.

---

## Acceptance checklist

1. `seed:festival` prints upserted row with expected slug and features
2. `select * from festivals where slug = '…'` shows the row
3. Bands for that slug have non-null `festival_id`; Wacken band count unchanged
4. In the PWA: catalog lists the Festival; Join → Activate → schedule shows only that Festival’s bands
5. With `--features '{}'` (or demo defaults): map / duck / metal place / presence hidden; core routes work

---

## Glossary cross-links

- **Festival** / **Festival membership** / **Active Festival** / **Festival features** / **Festival catalog** → [domain-model.md](domain-model.md), [CONTEXT.md](../../CONTEXT.md)
- Schema + RLS → [supabase-schema.md](supabase-schema.md)
- Client Join/Leave/pack → [routes.md](routes.md) (`/festivals`), [sync-engine.md](sync-engine.md)
- Lineup sync mechanics → [lineup-sync.md](lineup-sync.md)
- Festival-scoped reset → [festival-reset.md](festival-reset.md)

**Last updated:** 2026-08-12 — Ops runbook for `seed:festival` + festival-scoped band seeding.
