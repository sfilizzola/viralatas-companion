# CURRENT_STAGE.md — Phase 4B: Camping / LOST live state

**Goal:** The live view is the first thing crew members see, with live band cards first, then a fun Camping card, then a fun `LOST` card.  
**Status:** Phase 4B implemented. Manual Airplane Mode run-through and live two-device Supabase verification are still recommended.

---

## Phase 4 acceptance criteria (from MAIN_STAGES.md)

- [x] "Right now" screen is accurate to current device time
- [x] Works in Airplane Mode after prior sync
- [x] Crew grid updates automatically as time passes (no manual refresh)

## Phase 4B acceptance criteria

- [x] Login/register sends the user to `/now`
- [x] Camping switch works offline and flushes on reconnect
- [x] A user with camping enabled and no current band appears in the Camping card
- [x] A user with camping disabled and no current band appears as `LOST` in the live view
- [x] A current picked band overrides camping and turns camping off
- [x] Multiple live picked bands render as separate cards before Camping and `LOST`

---

## Deliverables

| # | Task | Status |
|---|---|---|
| 1 | "Right now" screen hero for current user's current/next picked band | Done |
| 2 | If no current pick overlaps device time, show next upcoming pick | Done |
| 3 | Crew grid showing each member's current/next band | Done |
| 4 | All logic reads cached `bands`, `user_picks`, and `crew_users` from IndexedDB | Done |
| 5 | Importable lineup source for final schedule updates and test-data reset | Done |
| 6 | Authenticated landing page opens the live view | Done |
| 7 | Offline-first camping presence cache and sync | Done |
| 8 | Live state cards ordered as band(s), Camping, then `LOST` | Done |

---

## Time logic

```typescript
// Current band = pick whose startTime <= now < endTime
// Next band = pick with earliest startTime > now
// If multiple overlapping picks: show the one with latest startTime (most recently started)
```

---

## Files to create / modify

### New files expected
- `src/lib/livePreview.ts` — pure current/next pick logic from cached schedule + picks
- `src/pages/RightNowPage.tsx` — "Right now" screen
- `src/pages/RightNowPage.module.css` — live preview layout

### Files to modify
- `src/components/BottomNav.tsx` — add "Agora" tab
- `src/App.tsx` — add `/now` route
- `supabase/seed/bands.ts` — export lineup data so the schedule can be updated/imported safely

---

## Offline contract

- `RightNowPage` must render from IndexedDB only after initial sync.
- Time updates happen locally with `setInterval`; no network refresh is required.
- Realtime/pick sync may improve cached freshness, but the live preview cannot depend on it.
- Camping presence is cached in IndexedDB first and synced to `user_presence` when online.
