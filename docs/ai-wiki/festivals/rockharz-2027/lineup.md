# ROCKHARZ 2027 — Announcement Lineup

## Purpose

Official named Bands for **rockharz-2027** before the timetable exists. This flat page is an **Announcement Lineup**; historical stage names are not evidence of 2027 slot assignments.

## Festival

- **Dates:** 7–10 July 2027
- **Location:** Verkehrslandeplatz Ballenstedt, Asmusstedt / Ballenstedt, Saxony-Anhalt, Germany
- **Timezone:** `Europe/Berlin`
- **Lineup era:** Announcement Lineup (`features.running_order = false`)
- **Official site:** [rockharz-festival.com](https://www.rockharz-festival.com/)
- **Ticket status:** Sold out

## Official Source Snapshot

- **Checked:** 2026-09-04
- **Primary:** [official Bands page](https://www.rockharz-festival.com/bands)
- **Announcement:** [Erste Bandwelle für das ROCKHARZ 2027](https://www.rockharz-festival.com/erste-bandwelle-fuer-das-rockharz-2027)
- **Dates:** [official 2027 ticket copy](https://shop.rockharz-festival.com/Tickets/ROCKHARZ-2027/)
- **Official status:** 29 first-wave Bands
- **Running order:** Not published. ROCKHARZ normally publishes it about 4–6 weeks before the festival.

## Announced Bands

| Band | Band | Band |
|------|------|------|
| Accept | Alestorm | All For Metal |
| Arch Enemy | Bruce Dickinson | Coppelius |
| Dartagnan | Dust Bolt | Eisbrecher |
| Emil Bulls | Equilibrium | Grave Digger |
| Gutalax | GWAR | H-Blockx |
| Handgemeng | Igels vs. Shark | Katerfahrt |
| Korpiklaani | Lord Of The Lost | Marduk |
| Metal Church | Nestor | Setyoursails |
| Skald | Tankard | The Sisters of Mercy |
| Stormseeker | Turbobier |  |

**Count:** 29.

## Naming and Scope Notes

- Current official-page titles are used in the seed. Announcement copy contains variants such as `Igel vs. Shark`, `SETYØURSAILS`, `SKĀLD` / `SKÀLD`, and `Storm Seeker`.
- The announcement typo `GRAVE DIIGGER` is corrected to the official Bands-page title `Grave Digger`.
- Doro, Ost+Front, and Vitja appear on an aggregator but not on the official Bands page or first-wave announcement; they are excluded.
- Rock Stage and Dark Stage are historical venue stages, not assigned 2027 slots yet.

## Relevant Source Files

- `supabase/seed/announcement-festivals-2027.ts` — catalog metadata and 29 untimed Band rows
- `supabase/migrations/20260904000000_announcement_lineup.sql` — nullable slot fields
- `docs/ai-wiki/add-festival-ops.md` — create-only seed runbook

## Database Preparation

```bash
npm run seed:announcement-festivals-2027 -- --festival rockharz-2027
npm run seed:announcement-festivals-2027 -- --festival rockharz-2027 --apply
```

Dry-run is default. Apply creates the Festival and inserts Bands only when its band set is empty. A later `--apply` with the same names patches `image_url` only. It never deletes Bands.

## Promotion to Schedule Lineup

When organizers publish a 2027 **Schedule Lineup** (day, time, stage), create `stages.md`, convert this page to day × stage tables, and use the Phase 49 laptop name-match workflow (`seed:bands:sync`) to fill slots without replacing Band ids or losing picks. Do **not** rerun `seed:announcement-festivals-2027`. Godlike flips **Lineup era** after verification; the seed never flips era.

## Cross-links

- [Add Festival (Ops)](../../add-festival-ops.md) — create-only seed
- Sibling 2027 Announcement Lineups: [Wacken](../wacken-2027/lineup.md), [Bangers Open Air](../bangers-open-air-2027/lineup.md), [Epic Fest](../epic-fest-2027/lineup.md)

## Edge Cases & Gotchas

- Seeded titles follow the official Bands page (`Igels vs. Shark`, `Setyoursails`, `Skald`, `Stormseeker`), not announcement-copy variants.
- Doro, Ost+Front, and Vitja are aggregator-only; not seeded.
- Historical Rock Stage / Dark Stage names are not 2027 `stage` values.
- Seed catalog print location is `Flugplatz Ballenstedt, Saxony-Anhalt, Germany`; this page keeps the more specific Verkehrslandeplatz / Asmusstedt wording. Catalog insert does not store a location column.
- One normalized name per Festival; duplicates are an operator error.

## Open Questions

- Whether later waves wait for a new wiki/seed pass (current apply refuses mismatched existing Bands).

**Last updated:** 2026-09-04 — Phase 49 Announcement Lineup (29 first-wave Bands).
