<!-- Purpose: Wacken 2026 stage configuration, festival schedule, and lineup update procedure. Load on demand when working on stages, schedules, or band seed data. -->

## Stage configuration

**8 Wacken 2026 stages** across 3 main infield + 5 tent/specialized stages.

| Stage | Category | Color | Day 1 | Day 2 | Day 3 | Day 4 |
|-------|----------|-------|-------|-------|-------|-------|
| `Faster` | Main Infield | `#2980b9` (Blue) | ✅ | ✅ | ✅ | ✅ |
| `Harder` | Main Infield | `#e67e22` (Orange) | ✅ | ✅ | ✅ | ✅ |
| `Louder` | Main Infield | `#8e44ad` (Purple) | ✅ | ✅ | ✅ | ✅ |
| `W.E.T.` | Outside Infield | `#c0392b` (Red) | ✅ | ✅ | ✅ | ✅ |
| `Headbangers` | Outside Infield | `#16a085` (Teal) | ✅ | ✅ | ✅ | ✅ |
| `Wasteland` | Specialized | `#2c3e50` (Dark Blue) | ✅ | ✅ | ✅ | ✅ |
| `Wackinger` | Specialized | `#95a5a6` (Gray) | ✅ | ✅ | ✅ | ✅ |
| `Welcome to the Jungle` | Specialized | `#f39c12` (Gold) | ✅ | ✅ | ✅ | ✅ |

**Festival schedule:**
- **Day 1:** Wednesday, July 29, 2026
- **Day 2:** Thursday, July 30, 2026
- **Day 3:** Friday, July 31, 2026
- **Day 4:** Saturday, August 1, 2026

**Total: 78+ bands across 8 stages and 4 days.**

**Stage colors** are defined in `src/pages/SchedulePage.tsx`. Unknown stages gracefully fall back to `var(--accent)`.

To update the lineup: edit `supabase/seed/bands.ts`, never run `npm run seed:bands`, the user has to be asked this is a destructive call. Add a migration if the schema changes.
