# Wacken Open Air 2027 — Announcement Lineup

## Purpose

Official named Bands for **wacken-2027** before day, stage, and set times exist. This is an **Announcement Lineup**, not a **Schedule Lineup**. Do not treat WOA 2026 **Official running order** JSON as 2027 slots.

## Festival

- **Dates:** 28–31 July 2027
- **Location:** Wacken, Schleswig-Holstein, Germany
- **Timezone:** `Europe/Berlin`
- **Lineup era:** Announcement Lineup (`features.running_order = false`)
- **Official site:** [wacken.com](https://www.wacken.com/en/)
- **Tickets:** [Ticket overview 2027](https://www.wacken.com/en/tickets-shop/ticket-overview-2027/)

## Official Source Snapshot

- **Checked:** 2026-09-04
- **Primary:** [official Bands page](https://www.wacken.com/en/line-ups/bands/)
- **Machine-readable primary:** [bandlist-concert.json](https://www.wacken.com/fileadmin/Json/bandlist-concert.json)
- **Official status:** 50 concert acts; `runningOrderActive: false`
- **Running order:** Not published. The live events/timetable feeds still describe Wacken 2026 and must not be used for 2027 slots.

## Announced Bands

| Band | Band | Band |
|------|------|------|
| Avatar | Beast In Black | Belphegor |
| Between Two Worlds | Blue Medusa | Carnifex |
| Cavalera Conspiracy | Children Of Bodom | Creeper |
| Crypta | Dark Tranquility | Dethklok |
| DragonForce | Edguy | Electric Callboy |
| Feuerschwanz | Five Finger Death Punch | Gaerea |
| Halestorm | Hammerfall | Heaven Shall Burn |
| Heavens Gate | Helloween | Hiraes |
| Imminence | Jinjer | John 5 And The Creatures |
| John Bush | Kanonenfieber | Knocked Loose |
| Make Them Suffer | Malevolence | Metal Church |
| Mittel Alta | Napalm Death | Norther |
| Overkill | Primordial | Seven Blood |
| Shadow Of Intent | Sylosis | Tailgunner |
| The Browning | The Narrator | The New Roses |
| Towards The Sinister | Tyketto | U.D.O. |
| Victorius | Witch Club Satan |  |

**Count:** 50.

## Naming Notes

The seed follows current JSON titles because that feed is the official machine-readable source:

- `Dark Tranquility` appears as `Dark Tranquillity` in announcement copy.
- `Hammerfall` appears as `HammerFall` in normal band branding.
- `Heavens Gate` appears as `Heaven's Gate` in prose.
- `John 5 And The Creatures` is the JSON act title; the listing subtitle says “featuring Wednesday 13.”
- `Victorius` appears as `Victorious` in announcement copy.
- Norther, Primordial, and The Narrator are official JSON entries even where an announcement article's A–Z recap omitted them.

## Relevant Source Files

- `supabase/seed/announcement-festivals-2027.ts` — catalog metadata and 50 untimed Band rows
- `supabase/migrations/20260904000000_announcement_lineup.sql` — nullable slot fields
- `docs/ai-wiki/add-festival-ops.md` — create-only seed runbook
- `docs/ai-wiki/lineup-official-source.md` — Wacken feed concepts; its 2026 timetable endpoints are not a 2027 schedule

## Database Preparation

```bash
npm run seed:announcement-festivals-2027 -- --festival wacken-2027
npm run seed:announcement-festivals-2027 -- --festival wacken-2027 --apply
```

Dry-run is default. Apply creates the Festival and inserts Bands only when its band set is empty. A later `--apply` with the same names patches `image_url` only. It never deletes Bands.

## Promotion to Schedule Lineup

When Wacken publishes a 2027 **Schedule Lineup** (day, time, stage — not the 2026 **Official running order** feeds), add a 2027 stage reference and replace this flat table with day × stage tables. Use the Phase 49 laptop name-match workflow (`seed:bands:sync`) so existing Band ids and picks survive. Do **not** rerun `seed:announcement-festivals-2027` to fill slots. Godlike flips **Lineup era** on the Active Festival after verification; the seed never flips era.

## Cross-links

- [Wacken Open Air 2026 Schedule Lineup](../../lineup.md) — do not mix with this page
- [Add Festival (Ops)](../../add-festival-ops.md) — create-only seed
- Sibling 2027 Announcement Lineups: [ROCKHARZ](../rockharz-2027/lineup.md), [Bangers Open Air](../bangers-open-air-2027/lineup.md), [Epic Fest](../epic-fest-2027/lineup.md)

## Edge Cases & Gotchas

- `bandlist-concert.json` titles are the seeded names even when marketing copy uses different spelling (`Dark Tranquillity`, `HammerFall`, `Heaven's Gate`, `Victorious`).
- Live events/timetable JSON still describing WOA 2026 must never be used to invent 2027 slots.
- One normalized name per Festival; duplicates are an operator error, not an app merge.
- Announcement Lineup must not use stored times for live/conflict/map (there are none).

## Open Questions

- When the 2027 Official running order feed goes live, confirm filter rules vs [lineup-official-source.md](../../lineup-official-source.md) before treating it as WOA 2027 Schedule Lineup source.

**Last updated:** 2026-09-04 — Phase 49 Announcement Lineup (50 named Bands).
