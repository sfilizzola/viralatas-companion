# My Wacken Inline Attendance — Design

**Date:** 2026-05-28  
**Status:** Approved (brainstorming session)  
**Owner:** sfilizzola  
**Phase:** 33 — My Wacken inline attendance  
**Wireframe:** `docs/wireframes/my-programacao-direction-a.html` (Direction A, English prototype)

---

## Problem

Mid-festival, ended picks disappear from their festival-day sections and move into footer **Saw / Didn't See** buckets on `/my-picks`. Users lose the day + time mental map they built while planning.

---

## Goals

1. Rename nav labels: **Lineup** (was Schedule tab) and **My Wacken** (was Picks tab).
2. Keep all picked bands on their festival day — ended and upcoming together (Direction A).
3. Show **Attended** / **Missed** status chips on ended rows only; no timing chips on My Wacken.
4. One-time coach banner when the user's first pick ends, explaining opt-out attendance.

## Non-goals (Phase 33)

- URL path changes (`/schedule`, `/my-picks` stay for PWA bookmarks).
- i18n namespace renames (`SchedulePage`, `MyPicksPage` JSON filenames / `useI18n` keys stay).
- Shared CSS module rename (`SchedulePage.module.css` stays — used by Lineup, My Wacken, Popular).
- Ratings on My Wacken (FUTURE_IDEAS #8).
- **In X min** / **Now** chips on My Wacken.
- Row-level hint on just-ended band (*Ended · counted as attended*).
- Schema, sync, repository, or badge engine changes.
- `BandDetailModal` redesign (missed toggle unchanged).

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Picks tab label + page title | **My Wacken** (all 4 locales) |
| Schedule tab label + Lineup page title | **Lineup** (all 4 locales) |
| Page file rename | **B** — `LineupPage.tsx`, `MyWackenPage.tsx`; routes unchanged |
| Day grouping | All `myBands` per `bandDay()` — **no footer Saw/Didn't See sections** |
| Within-day sort | **A2** — upcoming ascending → divider → ended ascending |
| Divider | **already played today** (localized); show only when day has ≥1 ended pick |
| Ended row chips | **Attended** (opt-out) / **Missed** (in `missedBandIds`) |
| Upcoming row chips | **None** |
| Ended row styling | Dimmed ~72%; missed ~62%; `hidePick` on ended rows |
| First-ended alert | **Coach banner only**; dismiss once via `localStorage` |
| Attendance logic | Unchanged opt-out; modal **I didn't see this band** unchanged |
| Header stat | **{n} left today** during festival (`isFestivalActive`) |
| Terminology | User-facing copy uses **vira-latas** where applicable (CLAUDE.md) |

### Suggested locale strings (EN baseline)

| Key / surface | EN | Notes |
|---------------|-----|-------|
| Bottom nav | Lineup · My Wacken | Replace schedule / picks keys |
| Page title | My Wacken | `MyPicksPage.title` |
| Chip attended | Attended | Teal (`--signal-ok`) |
| Chip missed | Missed | Amber (`--signal-warn`) |
| Divider | already played today | Mono label on soft rule |
| Header stat | {n} left today | New key |
| Coach banner title | First time | Short kicker |
| Coach banner body | Shows that already ended stay on the same day. We count them as attended — didn't go? Open the band and tap "I didn't see this band". | 4 locales at build |
| Remove keys | `sectionSaw`, `sectionDidntSee` | No longer rendered |

BR examples: **Lineup** → *Programação* or *Line-up* (product choice at build); **My Wacken** → *Meu Wacken*.

---

## Architecture

### Data flow (unchanged)

```
UI → IndexedDB (picks, missed) ↕ Supabase
```

No new tables or hooks. `MyWackenPage` composes existing `useBands`, `usePickActions`, `useMissedBands`, `useNow`, etc.

### Grouping logic (new pure helper recommended)

Extract `groupMyWackenDays(bands, pickedIds, missedBandIds, now)` to `src/services/myWackenGrouping.ts`:

For each festival day with picks:

1. **upcoming** — picked, `end_time >= now`, sort `start_time` ASC  
2. **ended** — picked, `end_time < now`, sort `start_time` ASC  
3. Render order: upcoming → optional divider → ended  
4. Chip: `missedBandIds.has(band.id) ? 'missed' : 'attended'` (ended only)

Remove `sawBands` / `didntSeeBands` memos and bottom `<section>` blocks.

### Coach banner

- **Show when:** user has ≥1 ended pick AND `localStorage` flag not set  
- **Dismiss:** × button sets flag (key e.g. `viralatas:my-wacken-ended-coach-dismissed`)  
- **Placement:** below header / conflict banner, above `<main>` day list  

### BandCard extension

New optional prop on timeline variant (My Wacken only):

- `attendanceChip?: 'attended' | 'missed'` — renders mono pill; mutually exclusive with timing chips (not used this phase)

---

## Approved layout reference

From wireframe Scenario 01:

- Page header **My Wacken** + summary lines including **3 left today**
- Day header **Thu 31/07** with pick count
- Upcoming bands first (Powerwolf, Sabaton) — no chips
- Divider **already played today**
- Ended inline (Blind Guardian → Attended, Angel Witch → Missed)
- No **Saw (12)** footer section
- Bottom nav active tab **My Wacken**

---

## Testing

| Area | Approach |
|------|----------|
| Grouping | Unit tests on `myWackenGrouping.ts` — A2 order, divider flag, chip derivation |
| i18n | Keys present in 4 locales; nav labels render |
| Manual | End band → stays on day with Attended; mark missed → Missed same row; banner once; file imports resolve after rename |

**Gates:** `rtk npm run build` · `rtk npm test` before phase close.

---

## Documentation (phase close)

- `docs/ai-wiki/routes.md` — component file names vs URLs  
- `docs/ai-wiki/architecture.md` — `/my-picks` behavior description  
- `docs/ai-wiki/changelog.md` — dated entry  
- `public/Design System.html` — My Wacken section, attendance chips, remove Saw footer docs  
- `docs/ai-wiki/phases-history.md` — on completion only  

---

## Related

- Reverses Phase 11.F footer-bucket UX documented in `phases-history.md`  
- FUTURE_IDEAS #8 (rating on My Wacken) remains deferred  
