# CURRENT_STAGE.md — Phase 4: Live preview

**Goal:** At any moment during the festival, a user can see where they planned to be and where the crew is right now.  
**Status:** Live preview implemented. Manual Airplane Mode run-through and live two-device Supabase verification are still recommended.

---

## Phase 4 acceptance criteria (from MAIN_STAGES.md)

- [ ] "Right now" screen is accurate to current device time
- [ ] Works in Airplane Mode after prior sync
- [ ] Crew grid updates automatically as time passes (no manual refresh)

---

## Deliverables

| # | Task | Status |
|---|---|---|
| 1 | "Right now" screen hero for current user's current/next picked band | Done |
| 2 | If no current pick overlaps device time, show next upcoming pick | Done |
| 3 | Crew grid showing each member's current/next band | Done |
| 4 | All logic reads cached `bands`, `user_picks`, and `crew_users` from IndexedDB | Done |
| 5 | Importable lineup source for final schedule updates and test-data reset | Done |

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
