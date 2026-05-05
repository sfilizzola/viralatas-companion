# Wacken 2026 Stages — 8 Real Stages Configured

All stage names have been updated to match the official Wacken lineup.

## Main Infield Stages (3)

| Stage | Color | Bands |
|-------|-------|-------|
| `Faster` | `#2980b9` (Blue) | 30 |
| `Harder` | `#e67e22` (Orange) | 20 |
| `Louder` | `#8e44ad` (Purple) | 21 |

## Tent & Specialized Stages (5)

| Stage | Color | Bands |
|-------|-------|-------|
| `W.E.T.` | `#c0392b` (Red) | 14 |
| `Headbangers` | `#16a085` (Teal) | 4 |
| `Wasteland` | `#2c3e50` (Dark Blue) | 4 |
| `Wackinger` | `#95a5a6` (Gray) | 4 |
| `Welcome to the Jungle` | `#f39c12` (Gold) | 2 |

**Total: 78 bands across 8 stages and 4 days (Wed-Sat)**

## Festival Schedule

- **Day 1:** Wednesday, July 29, 2026
- **Day 2:** Thursday, July 30, 2026
- **Day 3:** Friday, July 31, 2026
- **Day 4:** Saturday, August 1, 2026

## Code References

- **Stage filtering:** Dynamically extracted from band data via `Set`
- **Stage colors:** Defined in [SchedulePage.tsx:12-20](src/pages/SchedulePage.tsx#L12-L20)
- **Band data:** [supabase/seed/bands.ts](supabase/seed/bands.ts)
- **Tests:** [src/__tests__/schedule.test.ts](src/__tests__/schedule.test.ts) (24 tests, all passing)

## Updating the Festival

To update bands for a future Wacken:

1. Edit `supabase/seed/bands.ts`:
   - Update date constants (`D1`, `D2`, etc.)
   - Add/remove bands
   - Run: `npx tsx supabase/seed/bands.ts`

2. Add new stages in `STAGE_COLORS` if needed
   - Color automatically falls back to `var(--accent)` if missing

3. Update `supabase/migrations/` if schema changes

4. Tests will auto-detect any number of stages/days
