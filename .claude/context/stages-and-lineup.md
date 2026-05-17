<!-- Purpose: Wacken 2026 stage configuration, festival schedule, and lineup update procedure. Load on demand when working on stages, schedules, or band seed data. Long-form slot grids and band assignments live in docs/ai-wiki/stages.md and docs/ai-wiki/lineup.md. -->

## Stages

**8 Wacken 2026 stages** across 3 main infield + 2 outside-infield + 3 specialized stages.

| # | Stage | Abbrev | Category | Hex | CSS variable |
|---|-------|--------|----------|-----|--------------|
| 1 | Faster | `FAS` | Main Infield | `#2980b9` (Blue) | `var(--stage-faster)` |
| 2 | Harder | `HAR` | Main Infield | `#e67e22` (Orange) | `var(--stage-harder)` |
| 3 | Louder | `LOU` | Main Infield | `#8e44ad` (Purple) | `var(--stage-louder)` |
| 4 | W.E.T. | `WET` | Outside Infield | `#c0392b` (Red) | `var(--stage-wet)` |
| 5 | Headbangers | `HBA` | Outside Infield | `#16a085` (Teal) | `var(--stage-headbangers)` |
| 6 | Wasteland | `WAS` | Specialized | `#2c3e50` (Dark Blue) | `var(--stage-wasteland)` |
| 7 | Wackinger | `WAK` | Specialized | `#95a5a6` (Gray) | `var(--stage-wackinger)` |
| 8 | Welcome to the Jungle | `JUN` | Specialized | `#f39c12` (Gold) | `var(--stage-jungle)` |

**Stage colors** are defined in `src/index.css` as CSS custom properties. `src/services/stageColors.ts:getStageColor(stage)` returns the CSS variable token (e.g. `var(--stage-faster)`), not the raw hex. Unknown stages fall back to `var(--accent)`.

The `Band` record stores `stage: string` with the **full name** (e.g. `"Faster"`, `"W.E.T."`); abbreviations are only used as a slot-ID prefix in the wiki, never in the database.

---

## Pairing rules

- **HARDER ↔ FASTER** are physically adjacent infield stages. Slots interleave with ~15 min gaps — if Faster ends at 12:45, Harder starts at 13:00, and vice versa.
- **W.E.T. ↔ HEADBANGERS** follow the same rule on the outside infield.

A band finishing on stage A at HH:45 is a reliable signal that paired stage B will start at HH+1:00. Useful for conflict resolution and "which stage next?" planning.

---

## Festival schedule

| Code | Calendar date | Day of week |
|------|---------------|-------------|
| `D1` | 2026-07-29 | Wednesday |
| `D2` | 2026-07-30 | Thursday |
| `D3` | 2026-07-31 | Friday |
| `D4` | 2026-08-01 | Saturday |

Times in `bands.ts` and the wiki are **CEST (UTC+2)**. Slots crossing midnight (`*` in stage schedules) use the **next** day's date variable: `D1n`, `D2n`, `D3n`, `D4n`. Wacken runs late July / early August so Berlin is always on CEST; no DST handling needed.

**HARDER opens on Day 2 (Thursday).** Day 1 has no Harder slots — be careful in any "all stages × all days" loops or seed data.

---

## Slot grid sizing

Each stage's slot IDs are global across all four days (`HAR1` … `HAR12`). Cross-reference Slot ID ↔ time in `docs/ai-wiki/stages.md`, and Slot ID ↔ band in `docs/ai-wiki/lineup.md`.

| Stage | Slot range | Total slots |
|-------|-----------|-------------|
| HAR | HAR1 – HAR12 | 12 |
| FAS | FAS1 – FAS18 | 18 |
| LOU | LOU1 – LOU27 | 27 |
| WET | WET1 – WET35 | 35 |
| HBA | HBA1 – HBA35 | 35 |
| WAS | WAS1 – WAS29 | 29 |
| WAK | WAK1 – WAK28 | 28 |
| JUN | JUN1 – JUN8 | 8 |

---

## Lineup totals

**192 bands total** (per `docs/ai-wiki/lineup.md`):

- 167 CONFIRMED (real image URL from wacken.com)
- 25 TBD (placeholder, no confirmed image yet)
- 1 ceremony — **`Farewell & Announcements`** at slot **FAS17**, marked with `category: 'ceremony'`. Ceremony bands are intentionally excluded from `BadgeContext.pickedBands` (see `engine.ts`) so they never count toward badges or conflict logic.

Stage order convention within each day in the wiki: Harder · Faster · Louder · W.E.T. · Headbangers · Wasteland · Wackinger · Welcome to the Jungle.

---

## Source files

- `src/pages/SchedulePage.tsx` — consumes the stage colors via the CSS variables.
- `src/services/stageColors.ts` — `getStageColor(stage)` mapping.
- `src/index.css` — actual `--stage-*` custom property definitions.
- `src/types/index.ts` — `Band` type with `stage: string` and `category` fields.
- `supabase/seed/bands.ts` — seed script using `STAGES` constants and `D1`–`D4n` date variables.

---

## Updating the lineup

1. Edit `docs/ai-wiki/lineup.md` (the human-editable source of truth for assignments) and/or `docs/ai-wiki/stages.md` if a slot time changes.
2. Mirror the change in `supabase/seed/bands.ts`.
3. **Do NOT run `npm run seed:bands` autonomously.** It cascades to `user_picks` (destructive). Ask the user to run it.
4. Add a migration under `supabase/migrations/` only if the schema itself changes (new column, new constraint). Adding/changing a band row does not need a migration.

When Wacken publishes an official running order, also flip the affected slot's `Confirmed` column in `stages.md` from `NO` to `YES` and update the slot's `start_time` / `end_time` in `bands.ts`.
