# Epic Fest 2027 — Announcement Lineup

## Purpose

Official named Bands for **epic-fest-2027** before a timetable exists. This is an **Announcement Lineup** (no invented day/stage/time). This is Epic Fest Chapter 5 in Roskilde, Denmark—not Roskilde Festival or a similarly named US event.

## Festival

- **Full edition name:** Epic Fest 2027 – Chapter 5 – With Power And Rage
- **Dates:** 9–10 April 2027
- **Location:** Roskilde, Denmark
- **Venues:** Roskilde Kongres- & Idrætscenter / King Roar's Hall, plus Gimle and The Raven Tavern
- **Timezone:** `Europe/Copenhagen`
- **Lineup era:** Announcement Lineup (`features.running_order = false`)
- **Official organizer social:** [Epic Fest](https://www.facebook.com/epicfestdk/)

## Official Source Snapshot

- **Checked:** 2026-09-04
- **Primary ticket/lineup page:** [Roskilde Kongrescenter](https://www.roskildekongrescenter.dk/arrangementer/epic-fest)
- **Co-host page:** [Gimle](https://gimle.dk/event/epic-fest-2027-chapter-5/)
- **Official status:** 22 current acts
- **Running order:** Not published. A report that Hagane opens Friday's Main Stage is one isolated slot, not a timetable.

## Announced Bands

| Band | Band | Band |
|------|------|------|
| Dreamtale | Edu Falaschi | Elvenking |
| Freedom Call | Hagane | HammerFall |
| Heavysaurus | Heimdall | Hulkoff |
| Jupiter | Korpiklaani | Labyrinth |
| Nanowar of Steel | Owlbear | Power Paladin |
| Sascha Paeth's Masters of Ceremony | Sellsword | Skeletoon |
| Temperance | The 7th Guild | Tower Hill |
| Warkings |  |  |

**Count:** 22.

## Naming and Cancellation Notes

- `Edu Falaschi` corrects the live page's `Edu Falashi` typo.
- `Skeletoon` corrects the live page's `Skeleton` typo and matches the band/announcement spelling.
- The live page says `Heavysaurus`; a Finnish report says `Hevisaurus`. The seed follows the official page until organizer material resolves the franchise identity.
- `Masters Of Ceremony` is cataloged as the full act name `Sascha Paeth's Masters of Ceremony`.
- Power Quest and Tungsten appeared in the first wave but later cancelled for logistical reasons. They are absent from the current official list and excluded from the seed.

## Relevant Source Files

- `supabase/seed/announcement-festivals-2027.ts` — catalog metadata and 22 untimed Band rows
- `supabase/migrations/20260904000000_announcement_lineup.sql` — nullable slot fields
- `docs/ai-wiki/add-festival-ops.md` — create-only seed runbook

## Database Preparation

```bash
npm run seed:announcement-festivals-2027 -- --festival epic-fest-2027
npm run seed:announcement-festivals-2027 -- --festival epic-fest-2027 --apply
```

Dry-run is default. Apply creates the Festival and inserts Bands only when its band set is empty. It never deletes or overwrites existing Bands.

## Promotion to Schedule Lineup

When organizers publish complete days, stages, and times (**Schedule Lineup**), create `stages.md`, convert this flat list to day × stage tables, and use the Phase 49 laptop name-match workflow (`seed:bands:sync`) to retain Band ids and picks. Do **not** treat a single reported Hagane Main Stage open as a timetable. Do **not** rerun `seed:announcement-festivals-2027`. Godlike flips **Lineup era** after verification; the seed never flips era.

## Cross-links

- [Add Festival (Ops)](../../add-festival-ops.md) — create-only seed
- Sibling 2027 Announcement Lineups: [Wacken](../wacken-2027/lineup.md), [ROCKHARZ](../rockharz-2027/lineup.md), [Bangers Open Air](../bangers-open-air-2027/lineup.md)

## Edge Cases & Gotchas

- Seeded names correct live-page typos (`Edu Falaschi`, `Skeletoon`) and expand `Masters Of Ceremony` to `Sascha Paeth's Masters of Ceremony`.
- Power Quest and Tungsten cancelled; they are not in the current 22 and must not be re-added from first-wave recaps.
- `Heavysaurus` follows the official page until organizer material resolves the Hevisaurus franchise question.
- One isolated Main Stage rumor is not a slot.
- One normalized name per Festival; duplicates are an operator error.

## Open Questions

- Confirm `Heavysaurus` vs `Hevisaurus` if the organizer publishes an English/Finnish identity note.

**Last updated:** 2026-09-04 — Phase 49 Announcement Lineup (22 current Bands).
