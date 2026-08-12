# Summer Breeze Open Air 2026 — Stage Reference

## Purpose

Document the 4 Summer Breeze Open Air 2026 stages: identities, `slot_id` prefixes, festival calendar, and timezone. This file is the authoritative stage map for the **summer-breeze-2026** festival pack. For **which band** is in each slot (with start/end times), see [lineup.md](lineup.md).

Do **not** confuse with [Wacken stages](../../stages.md) — that page is WOA-only.

---

## Relevant Source Files

- `src/services/stageColors.ts` — Stage name → CSS variable token (includes SB four stages)
- `src/index.css` — `--stage-main` / `--stage-t` / `--stage-tool-rebel` / `--stage-campsite-circus` hex values
- `supabase/seed/summer-breeze-2026.ts` — Festival-scoped band seed (`EXPECTED_BAND_COUNT` 135; `slot_id` prefixes `MAI`/`TST`/`TRB`/`CAM`)
- `docs/superpowers/prototypes/summer-breeze-2026/` — Local parse scratch (gitignored): `lineup-parsed.json`, `bands-seed.json`
- `src/types/index.ts` — `Band` type (`stage: string`, `slot_id`)

---

## Festival Calendar

| Day | Calendar date | Role |
|-----|---------------|------|
| Tue | 2026-08-11 | Campsite pre-day (Campsite Circus Stage only in app seed) |
| Wed | 2026-08-12 | Festival day 1 |
| Thu | 2026-08-13 | Festival day 2 |
| Fri | 2026-08-14 | Festival day 3 |
| Sat | 2026-08-15 | Festival day 4 |

**Timezone:** `Europe/Berlin` (CEST, UTC+2 during the festival). Clock times are as printed on the official running order; ends may cross midnight (e.g. 23:25–00:35). Overnight slots (start before 06:00) belong to the previous festival evening in [lineup.md](lineup.md).

---

## The 4 Stages

| Stage | `slot_id` prefix | UI Color | Hex | Notes |
|-------|-------------------|----------|-----|-------|
| Main Stage | `MAI` | `var(--stage-main)` | `#9b2c2c` (Dried blood) | Headliners / main program |
| T-Stage | `TST` | `var(--stage-t)` | `#1a5f7a` (Oxidized steel) | Parallel main program |
| Wera Tool Rebel Stage | `TRB` | `var(--stage-tool-rebel)` | `#8b5a1f` (Darkened brass) | Parallel main program |
| Campsite Circus Stage | `CAM` | `var(--stage-campsite-circus)` | `#5b3a8c` (Deep amethyst) | Campsite stage (Tue pre-day + Wed–Sat) |

Poster labels often read `CAMPSITE CIRCUS` / `TOOL REBEL STAGE`; wiki + seed use the names above.

Stage colors live in `src/index.css` as CSS custom properties. `stageColors.ts` maps the exact stage name strings above to `var(--stage-*)` tokens. All four SB stages are dark enough for white ribbon text in `StageScheduleSheet`.

### Slot ID

Each musical slot has a unique `slot_id` (e.g. `MAI4`, `TST13`, `CAM1`). Pattern: `^(MAI|TST|TRB|CAM)\d+$`. Same stable-identity rule as Wacken: picks attach to `slot_id`, not band name.

---

## Official Source

- **Primary:** [summer-breeze-app gigs API](https://www.summer-breeze.de/wp-json/summer-breeze-app/v1/gigs/2026) (+ [stages/2026](https://www.summer-breeze.de/wp-json/summer-breeze-app/v1/stages/2026))
- **PDF (gaps):** [Runningorder-2026-A4.pdf](https://www.summer-breeze.de/wp-content/uploads/2026/07/02/Runningorder-2026-A4.pdf) — Surprise Show + Hindarfjäll times
- Posters: [running-order-2026](https://www.summer-breeze.de/en/running-order-2026/) (stage-column check)

---

## Scope (app seed v1)

**Included:** musical `band` slots from the official running order (including **Surprise Show** as a TBA musical act — see [lineup.md](lineup.md)).

**Excluded on purpose:** side events (yoga, disco/party blocks, podcasts, announcements-only blocks, etc.). They appear in the PDF/posters but are **not** seeded into the companion for v1.

Seed entrypoint: `npm run seed:summer-breeze` (see `supabase/seed/summer-breeze-2026.ts`). Do **not** point `npm run seed:bands` at this festival — that script always inserts the Wacken `bands.ts` array.

---

## Cross-References

- Band tables by day/stage → [lineup.md](lineup.md)
- Multi-festival architecture → [domain-model.md](../../domain-model.md), [architecture.md](../../architecture.md)
- Wacken stage reference (different festival) → [stages.md](../../stages.md)

---

## Open Questions

- Whether Campsite Circus side events are ever added as non-pickable ceremony/side rows.
