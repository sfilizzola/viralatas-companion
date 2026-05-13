# Wacken Open Air 2026 — Band Lineup Reference

> **This file is the human-editable source of truth for the Wacken 2026 band lineup.**
> To update the lineup:
> 1. Edit this file
> 2. Apply changes to `supabase/seed/bands.ts`
> 3. Run `npm run seed:bands`

**Summary:** 75 bands CONFIRMED · 85 bands TBD · 160 total

---

## Reference Keys

### Stage Key

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

### Day Key

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

### Slot Status

- **Confirmed (slot grid):** `YES` = official Wacken running order published for this slot · `NO` = approximate, pending official confirmation
- **Band Status (band assignments):** `CONFIRMED` = band has a real image URL from wacken.com · `TBD` = placeholder

### Slot ID Scheme

Each slot has a unique ID combining stage abbreviation + sequential number, global across all days.

- Numbering starts at 1 per stage and increments through Day 1 → Day 4 in chronological order
- Example: `FAS1` = first Faster slot (Day 1, 16:00), `FAS34` = last Faster slot (Day 4, 22:30)
- Use the Slot ID to cross-reference between the Stage Schedules grid and the Band Assignments tables

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

## Stage Pairing Rule

> **HARDER (1) and FASTER (2)** are physically adjacent infield stages. Their slots interleave with ~15 min gaps — if Faster ends at 12:45, Harder likely starts at 13:00, and vice versa. When planning back-to-back moves between these two stages, treat them as one continuous schedule block.
>
> **W.E.T. (4) and HEADBANGERS (5)** follow the same rule — adjacent outside-infield stages with ~15 min interleaving gaps between end and start times.
>
> This means: a band finishing on stage 1 at HH:45 is a reliable signal that stage 2 will start at HH+1:00, and vice versa.

---

## Stage Schedules

> Slot times are approximate until `Confirmed = YES`. All times are CEST (UTC+2).
> Each row here corresponds to one band row in the Band Assignments section via the Slot ID.

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

## Band Assignments

> Stage order within each day: Harder · Faster · Louder · W.E.T. · Headbangers · Wasteland · Wackinger · Welcome to the Jungle

---

## Day 1 — Wednesday, 29 July 2026

> **Note:** Harder stage is closed on Day 1. Faster starts at 16:00 (Doors: 15:30). Louder, W.E.T., Headbangers, Wasteland, Wackinger, and Welcome to the Jungle stages open earlier (from ~11:00–14:00).

### Harder Stage

*Closed — opens Thursday.*

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Visions of Atlantis | Symphonic Metal | FAS1 | TBD | PLACEHOLDER |
| Hämatom | Industrial Metal | FAS2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg |
| Kadavar | Stoner Rock | FAS3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg |
| Unzucht | Industrial / Gothic | FAS4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Crypt Sermon | Doom Metal | LOU1 | TBD | PLACEHOLDER |
| Broken by the Scream | Visual Kei Metal | LOU2 | TBD | PLACEHOLDER |
| Dirty Shirt | Crossover Metal | LOU3 | TBD | PLACEHOLDER |
| Alien Rockin' Explosion | Rock | LOU4 | TBD | PLACEHOLDER |
| The Gathering | Gothic Metal | LOU5 | TBD | PLACEHOLDER |
| Vanir | Viking Metal | LOU6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WET1 | TBD | PLACEHOLDER |
| TBD | TBD | WET2 | TBD | PLACEHOLDER |
| TBD | TBD | WET3 | TBD | PLACEHOLDER |
| TBD | TBD | WET4 | TBD | PLACEHOLDER |
| Ricky Warwick | Hard Rock | WET5 | TBD | PLACEHOLDER |
| TBD | TBD | WET6 | TBD | PLACEHOLDER |
| The Hardkiss | Rock | WET7 | TBD | PLACEHOLDER |
| TBD | TBD | WET8 | TBD | PLACEHOLDER |
| TBD | TBD | WET9 | TBD | PLACEHOLDER |
| Velvet Rush | AOR | WET10 | TBD | PLACEHOLDER |
| TBD | TBD | WET11 | TBD | PLACEHOLDER |
| Rose Tattoo | Hard Rock | WET12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | HBA1 | TBD | PLACEHOLDER |
| TBD | TBD | HBA2 | TBD | PLACEHOLDER |
| TBD | TBD | HBA3 | TBD | PLACEHOLDER |
| TBD | TBD | HBA4 | TBD | PLACEHOLDER |
| TBD | TBD | HBA5 | TBD | PLACEHOLDER |
| TBD | TBD | HBA6 | TBD | PLACEHOLDER |
| TBD | TBD | HBA7 | TBD | PLACEHOLDER |
| TBD | TBD | HBA8 | TBD | PLACEHOLDER |
| TBD | TBD | HBA9 | TBD | PLACEHOLDER |
| TBD | TBD | HBA10 | TBD | PLACEHOLDER |
| TBD | TBD | HBA11 | TBD | PLACEHOLDER |
| TBD | TBD | HBA12 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS1 | TBD | PLACEHOLDER |
| TBD | TBD | WAS2 | TBD | PLACEHOLDER |
| Expellow | TBD | WAS3 | TBD | PLACEHOLDER |
| 5th Avenue | TBD | WAS4 | TBD | PLACEHOLDER |
| TBD | TBD | WAS5 | TBD | PLACEHOLDER |
| Lacuna Coil | Gothic Metal | WAS6 | TBD | PLACEHOLDER |
| TBD | TBD | WAS7 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAK1 | TBD | PLACEHOLDER |
| TBD | TBD | WAK2 | TBD | PLACEHOLDER |
| TBD | TBD | WAK3 | TBD | PLACEHOLDER |
| Mambo Kurt | TBD | WAK4 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | WAK5 | TBD | PLACEHOLDER |
| Gagamania | TBD | WAK6 | TBD | PLACEHOLDER |
| TBD | TBD | WAK7 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Ballroom Hamburg DJ Team | TBD | JUN1 | TBD | PLACEHOLDER |
| Wacken Firefighters | TBD | JUN2 | TBD | PLACEHOLDER |

---

## Day 2 — Thursday, 30 July 2026

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Katerfahrt | Rock | HAR1 | TBD | PLACEHOLDER |
| Black Tish | TBD | HAR2 | TBD | PLACEHOLDER |
| Thundermother | Rock | HAR3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg |
| Life of Agony | Alternative Metal | HAR4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg |
| Europe | Hard Rock | HAR5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg |
| Turbonegro | Punk Rock | HAR6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg |
| Savatage | Heavy Metal | HAR7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Wüstenberg | TBD | FAS5 | TBD | PLACEHOLDER |
| 9mm Headshot | TBD | FAS6 | TBD | PLACEHOLDER |
| Manntra | Folk Metal | FAS7 | TBD | PLACEHOLDER |
| Year of the Goat | Occult Rock | FAS8 | TBD | PLACEHOLDER |
| P.O.D. | Nu Metal | FAS9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg |
| Storm Seeker | Folk Metal | FAS10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg |
| Vogelfrey | Folk Metal | FAS11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg |
| Brunhilde | Folk Metal | FAS12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Saviourself | TBD | LOU7 | TBD | PLACEHOLDER |
| Alien Ant Farm | Alternative Rock | LOU8 | TBD | PLACEHOLDER |
| Sagenbringer | Folk Metal | LOU9 | TBD | PLACEHOLDER |
| Wytch Hazel | Traditional Heavy Metal | LOU10 | TBD | PLACEHOLDER |
| Evil Jared & Krogi | TBD | LOU11 | TBD | PLACEHOLDER |
| Therapy? | Alternative Rock | LOU12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg |
| H-Blockx | Rap Metal | LOU13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Kupfergold | TBD | WET13 | TBD | PLACEHOLDER |
| Skyline | TBD | WET14 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | WET15 | TBD | PLACEHOLDER |
| Uli Jon Roth | Rock | WET16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg |
| Yngwie Malmsteen | Neoclassical Metal | WET17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg |
| Def Leppard | Hard Rock | WET18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBS | TBD | HBA13 | TBD | PLACEHOLDER |
| Battlecreek | TBD | HBA14 | TBD | PLACEHOLDER |
| Anaal Nathrakh | Black Metal / Grindcore | HBA15 | TBD | PLACEHOLDER |
| Diabolisches Werk | TBD | HBA16 | TBD | PLACEHOLDER |
| Craft | Black Metal | HBA17 | TBD | PLACEHOLDER |
| Lovebites | Heavy Metal | HBA18 | TBD | PLACEHOLDER |
| Misery Index | Death Metal / Grindcore | HBA19 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Blood Red Throne | Death Metal | WAS8 | TBD | PLACEHOLDER |
| Sacred Steel | Power Metal | WAS9 | TBD | PLACEHOLDER |
| Firespawn | Death Metal | WAS10 | TBD | PLACEHOLDER |
| Phantom | Heavy Metal | WAS11 | TBD | PLACEHOLDER |
| Spectral Wound | Black Metal | WAS12 | TBD | PLACEHOLDER |
| The Troops of Doom | Thrash Metal | WAS13 | TBD | PLACEHOLDER |
| Poison the Preacher | Metal | WAS14 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Sventevith | Black Metal | WAK8 | TBD | PLACEHOLDER |
| Temple of the Absurd | TBD | WAK9 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Cowgirls From Hell DJ Team | TBD | JUN3 | TBD | PLACEHOLDER |

---

## Day 3 — Friday, 31 July 2026

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Blood Fire Death | Black Metal (Bathory tribute) | HAR8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg |
| Danko Jones | Hard Rock | HAR9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg |
| Faun | Folk | HAR10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg |
| Mantar | Doom Metal | HAR11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg |
| Sepultura | Groove Metal | HAR12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg |
| Black Label Society | Heavy Metal | HAR13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg |
| The Haunted | Melodic Death Metal | HAR14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg |
| Paradise Lost | Gothic Metal | HAR15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Gutalax | Goregrind | FAS13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg |
| Mr. Hurley und die Pulveraffen | Pirate Metal | FAS14 | TBD | PLACEHOLDER |
| Chaosbay | Melodic Death Metal | FAS15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg |
| Any Given Day | Metalcore | FAS16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg |
| Insanity Alert | Crossover Thrash | FAS17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg |
| Paleface Swiss | Metal | FAS18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg |
| Bleed from Within | Metalcore | FAS19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg |
| Ten56. | Metalcore | FAS20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Alcest | Post-Black Metal | LOU14 | TBD | PLACEHOLDER |
| Future Palace | Metalcore | LOU15 | TBD | PLACEHOLDER |
| Alfahanne | Black Metal | LOU16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg |
| Pig Destroyer | Grindcore | LOU17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg |
| Employed to Serve | Metalcore | LOU18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg |
| Hatebreed | Metalcore | LOU19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Bear McCreary | Orchestral / Film Music | WET19 | TBD | PLACEHOLDER |
| Animals as Leaders | Progressive Metal | WET20 | TBD | PLACEHOLDER |
| Grand Magus | Heavy Metal | WET21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg |
| Saxon | Heavy Metal | WET22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg |
| Running Wild | Speed Metal | WET23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg |
| Judas Priest | Heavy Metal | WET24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg |
| Emperor | Black Metal | WET25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg |
| In Flames | Melodic Death Metal | WET26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Arroganz | Metal | HBA20 | TBD | PLACEHOLDER |
| Crematory | Gothic / Industrial Metal | HBA21 | TBD | PLACEHOLDER |
| Deafheaven | Blackgaze | HBA22 | TBD | PLACEHOLDER |
| Cursed Abyss | Black Metal | HBA23 | TBD | PLACEHOLDER |
| Trold | Black Metal | HBA24 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Heartless Human Harvest | Death Metal | WAS15 | TBD | PLACEHOLDER |
| Divlje Jagode | Hard Rock | WAS16 | TBD | PLACEHOLDER |
| Skynd | Dark Electronic | WAS17 | TBD | PLACEHOLDER |
| Tuxedoo | Heavy Metal | WAS18 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Cruachan | Folk Metal | WAK10 | TBD | PLACEHOLDER |
| Eläkeläiset | Humppa | WAK11 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | WAK12 | TBD | PLACEHOLDER |
| Subway to Sally | Medieval Rock | WAK13 | TBD | PLACEHOLDER |
| Metaklapa | Folk | WAK14 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Blaas of Glory | Folk / Brass Metal | JUN4 | TBD | PLACEHOLDER |
| Dubioza Kolektiv | Ska / Reggae Metal | JUN5 | TBD | PLACEHOLDER |
| Luna Kills | Symphonic Metal | JUN6 | TBD | PLACEHOLDER |

---

## Day 4 — Saturday, 1 August 2026

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Triptykon | Black / Doom Metal | HAR16 | TBD | PLACEHOLDER |
| Finsterforst | Folk Metal | HAR17 | TBD | PLACEHOLDER |
| Airbourne | Hard Rock | HAR18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_Airborn-WOA26_24e9c1f588.jpg |
| Crimson Glory | Progressive Metal | HAR19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg |
| Kittie | Heavy Metal | HAR20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg |
| Lamb of God | Groove Metal | HAR21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Allt | Black Metal | FAS21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg |
| Thrown | Post-Metal | FAS22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg |
| Dritte Wahl | Punk | FAS23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg |
| President | Metal | FAS24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/e/csm_president26_527cb5b2ae.jpg |
| Blood Command | Punk Metal | FAS25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg |
| Castle Rat | Heavy Metal | FAS26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg |
| Lagwagon | Melodic Hardcore | FAS27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg |
| Angelus Apatrida | Thrash Metal | FAS28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg |
| Our Promise | Metal | FAS29 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg |
| Vended | Nu Metal | FAS30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg |
| Guilt Trip | Metal | FAS31 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg |
| Sabaton | Power Metal | FAS32 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg |
| Alestorm | Pirate Metal | FAS33 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg |
| Orbit Culture | Melodic Death Metal | FAS34 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Hackneyed | Death Metal | LOU20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg |
| Heavysaurus | Children's Metal | LOU21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg |
| Ad Infinitum | Symphonic Metal | LOU22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg |
| Municipal Waste | Thrash Metal | LOU23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg |
| Fit For An Autopsy | Death Metal | LOU24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg |
| Corrosion of Conformity | Sludge Metal | LOU25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg |
| Of Mice & Men | Metalcore | LOU26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/2/csm_of_mice_and_men_26_26aab5f25c.jpg |
| Kim Dracula | Alternative Metal | LOU27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg |
| Nevermore | Progressive Metal | LOU28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg |
| Thy Art Is Murder | Deathcore | LOU29 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg |
| Einherjer | Viking Metal | LOU30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Hardline | AOR / Hard Rock | WET27 | TBD | PLACEHOLDER |
| The Other | Horror Punk | WET28 | TBD | PLACEHOLDER |
| Stonem | Metal | WET29 | TBD | PLACEHOLDER |
| Arch Enemy | Melodic Death Metal | WET30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg |
| Powerwolf | Power Metal | WET31 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Asrock | Metal | HBA25 | TBD | PLACEHOLDER |
| Dieter Maschine Birr | TBD | HBA26 | TBD | PLACEHOLDER |
| Minotaurus | TBD | HBA27 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Focus. | TBD | WAS19 | TBD | PLACEHOLDER |
| The Limit | TBD | WAS20 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Kärbholz | Folk Punk | WAK15 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | WAK16 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Wacken Firefighters | TBD | JUN7 | TBD | PLACEHOLDER |
| Zeltinger Band | TBD | JUN8 | TBD | PLACEHOLDER |

---

## Removed placeholder bands

The following bands were in the previous version of this file as fake/guessed placeholders and have been **removed** because they do not appear on any official Wacken 2026 poster. They must also be removed from `supabase/seed/bands.ts` and the database.

| Band | Reason |
|------|--------|
| AC/DC | Placeholder guess — not on any official poster |
| Accept | Placeholder guess — not on any official poster |
| Amon Amarth | Placeholder guess — not on any official poster |
| Angel Witch | Placeholder guess — not on any official poster |
| Apocalyptica | Placeholder guess — not on any official poster |
| Archgoat | Placeholder guess — not on any official poster |
| Archspore | Placeholder guess — not on any official poster |
| At the Gates | Placeholder guess — not on any official poster |
| Autopsy | Placeholder guess — not on any official poster |
| Avantasia | Placeholder guess — not on any official poster |
| Bathory (multiple fake entries) | Placeholder guess — not on any official poster |
| Behemoth | Placeholder guess — not on any official poster |
| Belphegor | Placeholder guess — not on any official poster |
| Blind Guardian | Placeholder guess — not on any official poster |
| Bloodbath | Placeholder guess — not on any official poster |
| Burzum | Placeholder guess — not on any official poster |
| Cannibal Corpse | Placeholder guess — not on any official poster |
| Carcass | Placeholder guess — not on any official poster |
| Carnage | Placeholder guess — not on any official poster |
| Celtic Frost | Placeholder guess — not on any official poster |
| Cradle of Filth | Placeholder guess — not on any official poster |
| Cynic | Placeholder guess — not on any official poster |
| Dark Funeral | Placeholder guess — not on any official poster |
| Darkthrone | Placeholder guess — not on any official poster |
| Deicide | Placeholder guess — not on any official poster |
| Delain | Placeholder guess — not on any official poster |
| Demilich | Placeholder guess — not on any official poster |
| Destruction | Placeholder guess — not on any official poster |
| Dimmu Borgir | Placeholder guess — not on any official poster |
| Dying Fetus | Placeholder guess — not on any official poster |
| Electric Callboy | Placeholder guess — not on any official poster |
| Enslaved | Placeholder guess — not on any official poster |
| Entombed | Placeholder guess — not on any official poster |
| Epica | Placeholder guess — not on any official poster |
| Evanescence | Placeholder guess — not on any official poster |
| Exhumed | Placeholder guess — not on any official poster |
| Exodus | Placeholder guess — not on any official poster |
| Goatmoon | Placeholder guess — not on any official poster |
| Gojira | Placeholder guess — not on any official poster |
| Grave | Placeholder guess — not on any official poster |
| Guns N' Roses | Placeholder guess — not on any official poster |
| Gwar | Placeholder guess — not on any official poster |
| Heilung | Placeholder guess — not on any official poster |
| Helloween | Placeholder guess — not on any official poster |
| Immortal | Placeholder guess — not on any official poster |
| Infected Rain | Placeholder guess — not on any official poster |
| Iron Maiden | Placeholder guess — not on any official poster |
| Kreator | Placeholder guess — not on any official poster |
| Manowar | Placeholder guess — not on any official poster |
| Mastodon | Placeholder guess — not on any official poster |
| Meshuggah | Placeholder guess — not on any official poster |
| Metallica | Placeholder guess — not on any official poster |
| Morbid Angel | Placeholder guess — not on any official poster |
| Motorhead | Placeholder guess — not on any official poster |
| Napalm Death | Placeholder guess — not on any official poster |
| Neurosis | Placeholder guess — not on any official poster |
| Nile | Placeholder guess — not on any official poster |
| Norsemen | Placeholder guess — not on any official poster |
| Nothing More | Had real image URL but does not appear on any official poster |
| Obituary | Placeholder guess — not on any official poster |
| Opeth | Placeholder guess — not on any official poster |
| Possessed | Placeholder guess — not on any official poster |
| Primal Fear | Placeholder guess — not on any official poster |
| Sarcófago | Placeholder guess — not on any official poster |
| Satyricon | Placeholder guess — not on any official poster |
| Skalds | Placeholder guess — not on any official poster |
| Slayer | Placeholder guess — not on any official poster |
| Sodom | Placeholder guess — not on any official poster |
| Spawn of Possession | Placeholder guess — not on any official poster |
| Stratovarius | Placeholder guess — not on any official poster |
| Suffocation | Placeholder guess — not on any official poster |
| Svartsot | Placeholder guess — not on any official poster |
| The Agonist | Placeholder guess — not on any official poster |
| Testament | Placeholder guess — not on any official poster |
| Týr | Placeholder guess — not on any official poster |
| Ulver | Placeholder guess — not on any official poster |
| Unleash | Placeholder guess — not on any official poster |
| Unleashed | Placeholder guess — not on any official poster |
| Venom | Placeholder guess — not on any official poster |
| Venom Inc | Placeholder guess — not on any official poster |
| Wardruna | Placeholder guess — not on any official poster |
| Watain | Placeholder guess — not on any official poster |
| Within Temptation | Placeholder guess — not on any official poster |

---

## Maintenance Guide

### How to add a new confirmed band image

1. In the **Band Assignments** section, change `TBD` → `CONFIRMED` and replace `PLACEHOLDER` with the full image URL from wacken.com
2. In `supabase/seed/bands.ts`, find the matching entry by `name` + `stage` + `start_time` and update `image_url` with the same URL
3. Run `npm run seed:bands` to apply the change to the database

### How to confirm a slot's official time

When Wacken publishes the official running order for a stage:

1. In the **Stage Schedules** section, update the `Start` and `End` columns for the affected slots to match the official times
2. Change `Confirmed` from `NO` to `YES` for those slots
3. Update the matching `start_time` / `end_time` values in `supabase/seed/bands.ts`
4. Run `npm run seed:bands`

### How to move a band to a different stage or day

This file maps directly to `bands.ts` as follows:

| This file | `bands.ts` field | Notes |
|-----------|-----------------|-------|
| Stage heading (`### Harder Stage`) | `stage: STAGES.HARDER` | Use the constant from the `STAGES` object at the top of `bands.ts` |
| Day heading (`## Day 1`) | `start_time: new Date(\`${D1}T15:30:00\`)` | `D1`/`D2`/`D3`/`D4` are date string variables defined at the top of the seed file |
| After-midnight slot (`*`) | Uses `D1n`, `D2n`, `D3n`, or `D4n` | These are the *next* calendar date strings, also defined at the top of the file |
| Slot ID (e.g. `HAR3`) | No direct field — cross-reference only | Match by stage + time in `bands.ts` |

**Steps to move a band:**
1. Update the day section and stage section in this file; also update the **Stage Schedules** grid if the slot time changes
2. In `bands.ts`, update the `stage` constant and the date variable prefix in `start_time`/`end_time`
3. Run `npm run seed:bands` (this cascades to `user_picks`, so picks for that band will be cleared)

### How to add a new slot

When a new band is announced that doesn't fit an existing slot:

1. Add a new row to the appropriate **Stage Schedules** day table with the next available Slot ID for that stage
2. Add the corresponding band row to the **Band Assignments** day + stage table, referencing the new Slot ID
3. Update the Slot ID range table in the Reference Keys section
4. Add the band to `supabase/seed/bands.ts` and run `npm run seed:bands`
