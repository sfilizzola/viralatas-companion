# Bangers Open Air 2027 — Announcement Lineup

## Purpose

Official named Bands for **bangers-open-air-2027** before stages and set times exist. The official page groups acts by day, but this remains an **Announcement Lineup** and stores no day or slot fields in the database.

## Festival

- **Dates:** 24–25 April 2027
- **Location:** Memorial da América Latina, São Paulo, Brazil
- **Timezone:** `America/Sao_Paulo`
- **Lineup era:** Announcement Lineup (`features.running_order = false`)
- **Official site:** [bangersopenair.com](https://bangersopenair.com/)
- **Tickets:** [Clube do Ingresso](https://www.clubedoingresso.com/evento/bangersopenair2027)

## Official Source Snapshot

- **Checked:** 2026-09-04
- **Primary:** [official lineup page](https://bangersopenair.com/lineup/)
- **Festival details:** [official information page](https://bangersopenair.com/informacoes/)
- **Official status:** 11 announced acts; partial lineup
- **Running order:** Not published. Day columns exist, but there are no stage assignments or set times.

## Announced Bands

| Band | Band | Band |
|------|------|------|
| Blaze Bayley | Eluveitie | Floor Jansen |
| Kanonenfieber | KK's Priest | Lacuna Coil |
| Metal Church | Quiet Riot | Soen |
| Soilwork | W.E.T. |  |

**Count:** 11.

### Official day buckets (reference only)

- **Saturday 24 April:** Lacuna Coil, Quiet Riot, Floor Jansen, Soen, KK's Priest, W.E.T.
- **Sunday 25 April:** Eluveitie, Kanonenfieber, Soilwork, Metal Church, Blaze Bayley.

These day buckets are not persisted on untimed Band rows. They become slots only after a **Schedule Lineup** exists (day, time, and stage).

## Scope Notes

- This is the São Paulo festival formerly branded Summer Breeze Open Air Brasil, not Summer Breeze Open Air in Germany.
- Twisted Sister and Fear Factory have been discussed as possible returns but are not on the official 2027 lineup page; they are excluded.
- Old artist pages and the site's stale 2026 banner are not evidence of a 2027 booking.

## Relevant Source Files

- `supabase/seed/announcement-festivals-2027.ts` — catalog metadata and 11 untimed Band rows
- `supabase/migrations/20260904000000_announcement_lineup.sql` — nullable slot fields
- `docs/ai-wiki/add-festival-ops.md` — create-only seed runbook

## Database Preparation

```bash
npm run seed:announcement-festivals-2027 -- --festival bangers-open-air-2027
npm run seed:announcement-festivals-2027 -- --festival bangers-open-air-2027 --apply
```

Dry-run is default. Apply creates the Festival and inserts Bands only when its band set is empty. A later `--apply` with the same names patches `image_url` only. It never deletes Bands.

## Promotion to Schedule Lineup

When organizers publish a complete **Schedule Lineup** (day, time, **and** stage), create `stages.md`, replace this flat list with day × stage tables, and use the Phase 49 laptop name-match workflow (`seed:bands:sync`) so Band ids and picks survive. Do **not** persist the day buckets below as `start_time` or `slot_id` until that shape exists. Do **not** rerun `seed:announcement-festivals-2027`. Godlike flips **Lineup era** after verification; the seed never flips era.

## Cross-links

- [Add Festival (Ops)](../../add-festival-ops.md) — create-only seed
- Not [Summer Breeze Open Air 2026](../summer-breeze-2026/lineup.md) (Germany)
- Sibling 2027 Announcement Lineups: [Wacken](../wacken-2027/lineup.md), [ROCKHARZ](../rockharz-2027/lineup.md), [Epic Fest](../epic-fest-2027/lineup.md)

## Edge Cases & Gotchas

- Official day columns are **Lineup wiki** footnotes only. Untimed Band rows have null `slot_id` / `stage` / `start_time` / `end_time`.
- Rumored returns (Twisted Sister, Fear Factory) and stale 2026 site chrome are not bookings.
- Timezone is `America/Sao_Paulo`, not `Europe/Berlin`.
- One normalized name per Festival; duplicates are an operator error.

## Open Questions

- Stage names for Memorial da América Latina 2027 are unpublished; do not invent them.

**Last updated:** 2026-09-04 — Phase 49 Announcement Lineup (11 named Bands).
