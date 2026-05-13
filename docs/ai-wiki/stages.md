# Wacken Open Air 2026 — Stage Reference

## Purpose

Document the 8 Wacken 2026 stages: their identities, physical layout, categories, color codes, slot schedules, and pairing rules. This file is the authoritative reference for **when** a slot happens. For **which band** is in each slot, see [lineup.md](lineup.md).

---

## Relevant Source Files

- `src/pages/SchedulePage.tsx` — Stage color constants (CSS variable mapping)
- `src/services/stageColors.ts` — `getStageColor(stage)` function returning CSS variable strings
- `supabase/seed/bands.ts` — Seed script; uses `STAGES` constants and date variables
- `src/types/index.ts` — `Band` type (has `stage: string` field)

---

## The 8 Stages

| Stage | Abbrev | Category | UI Color | Hex |
|-------|--------|----------|----------|-----|
| Faster | `FAS` | Main Infield | `var(--stage-faster)` | `#2980b9` (Blue) |
| Harder | `HAR` | Main Infield | `var(--stage-harder)` | `#e67e22` (Orange) |
| Louder | `LOU` | Main Infield | `var(--stage-louder)` | `#8e44ad` (Purple) |
| W.E.T. | `WET` | Outside Infield | `var(--stage-wet)` | `#c0392b` (Red) |
| Headbangers | `HBA` | Outside Infield | `var(--stage-headbangers)` | `#16a085` (Teal) |
| Wasteland | `WAS` | Specialized | `var(--stage-wasteland)` | `#2c3e50` (Dark Blue) |
| Wackinger | `WAK` | Specialized | `var(--stage-wackinger)` | `#95a5a6` (Gray) |
| Welcome to the Jungle | `JUN` | Specialized | `var(--stage-jungle)` | `#f39c12` (Gold) |

Stage colors are defined in `src/index.css` as CSS custom properties. `stageColors.ts` returns the CSS variable token (e.g., `var(--stage-faster)`), not the raw hex. Unknown stages fall back to `var(--accent)`.

---

## Stage Pairing Rule

> **HARDER and FASTER** are physically adjacent infield stages. Their slots interleave with ~15 min gaps — if Faster ends at 12:45, Harder likely starts at 13:00, and vice versa.
>
> **W.E.T. and HEADBANGERS** follow the same rule — adjacent outside-infield stages with ~15 min interleaving gaps between end and start times.
>
> This means: a band finishing on stage 1 at HH:45 is a reliable signal that stage 2 will start at HH+1:00, and vice versa. Useful for conflict resolution and "which stage next?" planning.

---

## Reference Keys

### Stage Abbreviations

| Abbrev | Full Name | Pairing |
|--------|-----------|---------|
| `HAR` | Harder | Paired with FASTER (adjacent) |
| `FAS` | Faster | Paired with HARDER (adjacent) |
| `LOU` | Louder | — |
| `WET` | W.E.T. | Paired with HEADBANGERS (adjacent) |
| `HBA` | Headbangers | Paired with W.E.T. (adjacent) |
| `WAS` | Wasteland | — |
| `WAK` | Wackinger | — |
| `JUN` | Welcome to the Jungle | — |

### Day Codes

| Code | Calendar Date | Day of Week |
|------|--------------|-------------|
| `D1` | 2026-07-29 | Wednesday |
| `D2` | 2026-07-30 | Thursday |
| `D3` | 2026-07-31 | Friday |
| `D4` | 2026-08-01 | Saturday |

After-midnight slots (shows crossing midnight) use the **next** calendar date in `bands.ts`:

| Overnight Code | Calendar Date |
|---------------|--------------|
| `D1n` | 2026-07-30 |
| `D2n` | 2026-07-31 |
| `D3n` | 2026-08-01 |
| `D4n` | 2026-08-02 |

Times are **CEST (UTC+2)**. Slots marked `*` cross midnight into the next calendar date.

In `bands.ts`, the `end_time` (and `start_time` for 00:xx slots) uses the **next** day's date variable (e.g. `D1n`, `D2n`, `D3n`, `D4n`).

### Slot Confirmation Status

- **`YES`** = Official Wacken running order published for this slot (time is confirmed)
- **`NO`** = Approximate time, pending official confirmation

---

## Slot ID Scheme

Each slot has a unique ID combining stage abbreviation + sequential number, **global across all days**.

- Numbering starts at 1 per stage and increments through Day 1 → Day 4 in chronological order
- Example: `FAS1` = first Faster slot (Day 1, 16:00), `FAS34` = last Faster slot (Day 4, 22:30)
- Use the Slot ID to cross-reference between this Stage Schedules grid and the Band Assignments tables in [lineup.md](lineup.md)

| Stage | Slot range |
|-------|-----------|
| HAR | HAR1 – HAR21 |
| FAS | FAS1 – FAS34 |
| LOU | LOU1 – LOU30 |
| WET | WET1 – WET31 |
| HBA | HBA1 – HBA27 |
| WAS | WAS1 – WAS20 |
| WAK | WAK1 – WAK16 |
| JUN | JUN1 – JUN8 |

---

## How Stages Link to Bands

Each `Band` record has a `stage: string` field that holds the full stage name (e.g., `"Faster"`, `"W.E.T."`). The `start_time` and `end_time` ISO timestamps encode both the day and the time. There is no separate "Stage" entity in the database — stage is a string attribute on `Band`.

```typescript
type Band = {
  id: string;
  name: string;
  stage: string;        // "Faster" | "Harder" | "Louder" | "W.E.T." | "Headbangers" | "Wasteland" | "Wackinger" | "Welcome to the Jungle"
  start_time: string;   // ISO 8601, e.g., "2026-07-29T18:30:00+02:00" — encodes the festival day
  end_time: string;     // ISO 8601
  image_url: string | null;
  genre: string | null;
};
```

The `supabase/seed/bands.ts` script maps this file's slot grid to band records:

| This file | `bands.ts` field | Notes |
|-----------|-----------------|-------|
| Stage heading (`### HARDER`) | `stage: STAGES.HARDER` | Use the constant from the `STAGES` object |
| Day heading (`## Day 1`) | `start_time: new Date(\`${D1}T15:30:00\`)` | `D1`/`D2`/`D3`/`D4` date variables |
| After-midnight slot (`*`) | Uses `D1n`, `D2n`, `D3n`, or `D4n` | Next calendar date strings |
| Slot ID (e.g. `HAR3`) | No direct field — cross-reference only | Match by stage + time |

---

## Stage Schedules

> Slot times are approximate until `Confirmed = YES`. All times are CEST (UTC+2).
> Each row here corresponds to one band row in [lineup.md](lineup.md) Band Assignments via the Slot ID.

---

### HARDER

> **Closed on Day 1 (Wednesday).** Paired with FASTER — slots interleave with ~15 min gap.

#### Day 1 (Wednesday)

*Closed — HARDER opens Thursday.*

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HAR1 | 12:00 | 13:00 | NO |
| HAR2 | 13:30 | 14:30 | NO |
| HAR3 | 15:30 | 16:30 | NO |
| HAR4 | 17:00 | 18:15 | NO |
| HAR5 | 18:30 | 19:45 | NO |
| HAR6 | 20:15 | 21:15 | NO |
| HAR7 | 22:00 | 23:30 | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HAR8 | 12:00 | 12:45 | NO |
| HAR9 | 13:00 | 13:45 | NO |
| HAR10 | 14:00 | 14:45 | NO |
| HAR11 | 15:00 | 16:00 | NO |
| HAR12 | 16:15 | 17:30 | NO |
| HAR13 | 17:45 | 19:00 | NO |
| HAR14 | 19:15 | 20:15 | NO |
| HAR15 | 21:30 | 22:45 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HAR16 | 12:00 | 13:00 | NO |
| HAR17 | 13:30 | 14:30 | NO |
| HAR18 | 15:30 | 16:30 | NO |
| HAR19 | 17:30 | 18:30 | NO |
| HAR20 | 19:00 | 20:00 | NO |
| HAR21 | 21:00 | 22:30 | NO |

---

### FASTER

> Paired with HARDER — slots interleave with ~15 min gap.

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| FAS1 | 16:00 | 17:00 | NO |
| FAS2 | 17:45 | 19:00 | NO |
| FAS3 | 20:00 | 21:15 | NO |
| FAS4 | 22:15 | 00:00* | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| FAS5 | 12:00 | 12:45 | NO |
| FAS6 | 13:00 | 13:45 | NO |
| FAS7 | 14:00 | 14:45 | NO |
| FAS8 | 15:30 | 16:30 | NO |
| FAS9 | 17:00 | 17:45 | NO |
| FAS10 | 18:30 | 19:15 | NO |
| FAS11 | 20:00 | 20:45 | NO |
| FAS12 | 21:30 | 22:15 | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| FAS13 | 12:00 | 12:45 | NO |
| FAS14 | 13:00 | 13:45 | NO |
| FAS15 | 14:30 | 15:15 | NO |
| FAS16 | 15:45 | 16:45 | NO |
| FAS17 | 17:00 | 17:45 | NO |
| FAS18 | 18:00 | 18:45 | NO |
| FAS19 | 20:00 | 21:00 | NO |
| FAS20 | 21:30 | 22:15 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| FAS21 | 12:00 | 12:45 | NO |
| FAS22 | 13:00 | 13:45 | NO |
| FAS23 | 14:00 | 14:45 | NO |
| FAS24 | 14:45 | 15:30 | NO |
| FAS25 | 15:30 | 16:15 | NO |
| FAS26 | 16:15 | 17:00 | NO |
| FAS27 | 17:00 | 17:45 | NO |
| FAS28 | 17:45 | 18:30 | NO |
| FAS29 | 18:30 | 19:15 | NO |
| FAS30 | 19:15 | 20:00 | NO |
| FAS31 | 20:00 | 20:45 | NO |
| FAS32 | 20:45 | 21:30 | NO |
| FAS33 | 21:30 | 22:30 | NO |
| FAS34 | 22:30 | 23:30 | NO |

---

### LOUDER

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| LOU1 | 12:00 | 13:00 | NO |
| LOU2 | 13:30 | 14:30 | NO |
| LOU3 | 15:15 | 16:15 | NO |
| LOU4 | 17:00 | 18:45 | NO |
| LOU5 | 18:45 | 20:30 | NO |
| LOU6 | 21:00 | 22:30 | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| LOU7 | 12:00 | 12:45 | NO |
| LOU8 | 13:30 | 14:30 | NO |
| LOU9 | 15:00 | 16:00 | NO |
| LOU10 | 17:00 | 18:00 | NO |
| LOU11 | 19:30 | 20:30 | NO |
| LOU12 | 21:30 | 22:30 | NO |
| LOU13 | 23:00 | 00:00* | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| LOU14 | 12:00 | 12:45 | NO |
| LOU15 | 13:30 | 14:15 | NO |
| LOU16 | 15:00 | 16:00 | NO |
| LOU17 | 17:00 | 18:00 | NO |
| LOU18 | 19:30 | 20:30 | NO |
| LOU19 | 21:30 | 22:30 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| LOU20 | 12:00 | 12:45 | NO |
| LOU21 | 13:00 | 13:45 | NO |
| LOU22 | 14:00 | 14:45 | NO |
| LOU23 | 15:00 | 16:00 | NO |
| LOU24 | 16:15 | 17:00 | NO |
| LOU25 | 17:15 | 18:15 | NO |
| LOU26 | 18:30 | 19:30 | NO |
| LOU27 | 19:45 | 20:45 | NO |
| LOU28 | 21:00 | 22:30 | NO |
| LOU29 | 22:45 | 23:30 | NO |
| LOU30 | 23:45 | 00:30* | NO |

---

### W.E.T.

> Paired with HEADBANGERS — slots interleave with ~15 min gap.

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WET1 | 11:00 | 11:20 | NO |
| WET2 | 11:50 | 12:10 | NO |
| WET3 | 12:40 | 13:00 | NO |
| WET4 | 13:30 | 13:50 | NO |
| WET5 | 14:20 | 14:40 | NO |
| WET6 | 15:50 | 16:10 | NO |
| WET7 | 16:40 | 17:00 | NO |
| WET8 | 17:30 | 17:50 | NO |
| WET9 | 18:20 | 18:40 | NO |
| WET10 | 19:10 | 19:30 | NO |
| WET11 | 20:15 | 21:15 | NO |
| WET12 | 22:45 | 00:00* | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WET13 | 12:00 | 13:00 | NO |
| WET14 | 14:00 | 15:00 | NO |
| WET15 | 15:30 | 17:00 | NO |
| WET16 | 17:15 | 18:15 | NO |
| WET17 | 20:00 | 21:00 | NO |
| WET18 | 23:30 | 01:00* | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WET19 | 12:00 | 13:00 | NO |
| WET20 | 13:30 | 14:30 | NO |
| WET21 | 15:00 | 16:00 | NO |
| WET22 | 16:30 | 17:45 | NO |
| WET23 | 18:00 | 19:15 | NO |
| WET24 | 19:30 | 21:00 | NO |
| WET25 | 21:15 | 22:30 | NO |
| WET26 | 00:00* | 01:30* | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WET27 | 12:00 | 13:00 | NO |
| WET28 | 14:30 | 15:30 | NO |
| WET29 | 17:30 | 18:30 | NO |
| WET30 | 20:30 | 22:00 | NO |
| WET31 | 23:00 | 00:30* | NO |

---

### HEADBANGERS

> Paired with W.E.T. — slots interleave with ~15 min gap.

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HBA1 | 11:25 | 11:45 | NO |
| HBA2 | 12:15 | 12:35 | NO |
| HBA3 | 13:00 | 13:25 | NO |
| HBA4 | 13:55 | 14:15 | NO |
| HBA5 | 14:45 | 15:45 | NO |
| HBA6 | 16:15 | 16:35 | NO |
| HBA7 | 17:05 | 17:25 | NO |
| HBA8 | 17:55 | 18:15 | NO |
| HBA9 | 18:15 | 19:05 | NO |
| HBA10 | 19:55 | 20:10 | NO |
| HBA11 | 21:30 | 22:30 | NO |
| HBA12 | 00:00* | 01:00* | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HBA13 | 12:30 | 13:30 | NO |
| HBA14 | 14:00 | 15:00 | NO |
| HBA15 | 15:00 | 16:00 | NO |
| HBA16 | 17:00 | 18:00 | NO |
| HBA17 | 18:30 | 19:30 | NO |
| HBA18 | 20:00 | 21:00 | NO |
| HBA19 | 21:30 | 22:30 | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HBA20 | 13:00 | 13:45 | NO |
| HBA21 | 14:30 | 15:30 | NO |
| HBA22 | 16:30 | 17:30 | NO |
| HBA23 | 18:30 | 19:30 | NO |
| HBA24 | 21:00 | 22:15 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| HBA25 | 13:00 | 14:00 | NO |
| HBA26 | 15:30 | 16:30 | NO |
| HBA27 | 19:00 | 20:00 | NO |

---

### WASTELAND

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAS1 | 14:00 | 14:45 | NO |
| WAS2 | 15:30 | 16:15 | NO |
| WAS3 | 17:00 | 17:45 | NO |
| WAS4 | 18:30 | 19:15 | NO |
| WAS5 | 20:00 | 20:45 | NO |
| WAS6 | 21:30 | 22:15 | NO |
| WAS7 | 23:00 | 00:00* | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAS8 | 13:30 | 14:30 | NO |
| WAS9 | 15:00 | 15:45 | NO |
| WAS10 | 16:30 | 17:30 | NO |
| WAS11 | 18:00 | 18:45 | NO |
| WAS12 | 20:00 | 21:00 | NO |
| WAS13 | 21:00 | 21:45 | NO |
| WAS14 | 22:30 | 23:15 | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAS15 | 13:30 | 14:30 | NO |
| WAS16 | 16:00 | 17:00 | NO |
| WAS17 | 18:30 | 19:30 | NO |
| WAS18 | 21:30 | 22:30 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAS19 | 14:30 | 15:30 | NO |
| WAS20 | 18:00 | 19:00 | NO |

---

### WACKINGER

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAK1 | 12:00 | 12:45 | NO |
| WAK2 | 13:30 | 14:15 | NO |
| WAK3 | 15:00 | 15:45 | NO |
| WAK4 | 15:45 | 16:30 | NO |
| WAK5 | 18:30 | 19:30 | NO |
| WAK6 | 20:15 | 21:15 | NO |
| WAK7 | 22:15 | 23:15 | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAK8 | 14:30 | 15:30 | NO |
| WAK9 | 17:30 | 18:30 | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAK10 | 13:00 | 14:00 | NO |
| WAK11 | 15:00 | 16:00 | NO |
| WAK12 | 17:30 | 18:30 | NO |
| WAK13 | 20:00 | 21:00 | NO |
| WAK14 | 22:00 | 23:00 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| WAK15 | 15:00 | 16:00 | NO |
| WAK16 | 17:30 | 18:30 | NO |

---

### WELCOME TO THE JUNGLE

#### Day 1 (Wednesday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| JUN1 | 19:30 | 20:30 | NO |
| JUN2 | 21:00 | 21:30 | NO |

#### Day 2 (Thursday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| JUN3 | 21:00 | 22:00 | NO |

#### Day 3 (Friday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| JUN4 | 14:00 | 15:00 | NO |
| JUN5 | 17:00 | 18:00 | NO |
| JUN6 | 21:30 | 22:30 | NO |

#### Day 4 (Saturday)

| Slot ID | Start | End | Confirmed |
|---------|-------|-----|-----------|
| JUN7 | 16:00 | 17:00 | NO |
| JUN8 | 20:00 | 21:00 | NO |

---

## How to Confirm a Slot's Official Time

When Wacken publishes the official running order for a stage:

1. Update the `Start` and `End` columns for the affected slots to match the official times
2. Change `Confirmed` from `NO` to `YES` for those slots
3. Update the matching `start_time` / `end_time` values in `supabase/seed/bands.ts`
4. Run `npm run seed:bands`

---

## How to Add a New Slot

When a new band is announced that doesn't fit an existing slot:

1. Add a new row to the appropriate Stage Schedules day table with the next available Slot ID for that stage
2. Update the Slot ID range table above
3. Add the corresponding band row to [lineup.md](lineup.md) Band Assignments for that day + stage, referencing the new Slot ID
4. Add the band to `supabase/seed/bands.ts` and run `npm run seed:bands`

---

**Last updated:** 2026-05-13
