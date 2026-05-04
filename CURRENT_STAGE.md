# CURRENT_STAGE.md — Phase 2: Band Schedule

**Goal:** The full Wacken lineup is in the app and browsable offline.  
**Status:** Complete. Moving to Phase 3.

---

## Phase 2 acceptance criteria (from MAIN_STAGES.md)

- [x] All bands visible in schedule view
- [x] Filtering works without network
- [x] Images are cached (precached or lazy-cached by Service Worker)

---

## Deliverables

| # | Task | Status |
|---|---|---|
| 1 | Seed script `supabase/seed/bands.ts` — 77 Wacken 2026 bands | Done |
| 2 | Schedule view — band cards with name, image placeholder, stage badge, start/end time | Done |
| 3 | Filter bar — by stage, by day, by "próximas bandas" (upcoming) | Done |
| 4 | On first authenticated load, write full band list to IndexedDB via `syncBands()` | Done |
| 5 | Schedule renders from IndexedDB — works offline after first sync | Done |

---

## What was built

### New files
- `supabase/seed/bands.ts` — seed script; run with `npx tsx supabase/seed/bands.ts` (needs `SUPABASE_SERVICE_ROLE_KEY`)
- `src/lib/sync.ts` — `syncBands()` fetches from Supabase and writes to IndexedDB
- `src/pages/SchedulePage.tsx` + `SchedulePage.module.css` — band list with filter bar
- `src/components/BottomNav.tsx` + `BottomNav.module.css` — bottom tab nav (Agenda / Perfil)

### Modified files
- `src/App.tsx` — added `/schedule` route, `BandSync` component (calls `syncBands()` on auth), default redirect now goes to `/schedule`
- `src/pages/ProfilePage.tsx` — added `BottomNav`
- `vite.config.ts` — added `CacheFirst` Workbox rule for images (30-day expiry, 200 entries)

---

## Seed data notes

- 77 bands across 3 festival days (Thu 30 Jul, Fri 31 Jul, Sat 1 Aug 2026)
- 4 stages: W:STAGE, HARDER STAGE, LOUDER STAGE, FASTER STAGE
- Stage times and assignments are **placeholder** — update seed when official running order drops
- Image URLs are `null` — fill in from wacken.com once schedule is published
- Run `npx tsx supabase/seed/bands.ts` to (re)seed; destructive, deletes all bands first

---

## Ready to move to Phase 3?

Phase 3 deliverables:
- Tap a band card to toggle pick on/off
- Picks written to IndexedDB immediately (optimistic) and synced to Supabase
- Offline pick queue flushed on reconnect
- Supabase Realtime subscription → live "X going" count on each card
- "My picks" and "Most popular" views
