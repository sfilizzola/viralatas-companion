# CURRENT_STAGE.md — Phase 3: Picks and social counts

**Goal:** Users pick bands. The crew can see who's going where. Live counts update in real time.  
**Status:** Implementation complete. Live two-device Supabase verification still recommended.

---

## Phase 3 acceptance criteria (from MAIN_STAGES.md)

- [x] Picking a band on one device reflects within 3 seconds on another (Realtime path implemented)
- [x] Picking while offline queues correctly and syncs on reconnect (queue + `online` flush implemented)
- [x] Pick count never goes negative (counts derive from cached rows)

---

## Deliverables

| # | Task | Status |
|---|---|---|
| 1 | Tap band card to toggle pick on/off | Done |
| 2 | Pick written to IndexedDB immediately (optimistic) | Done |
| 3 | Pick synced to `user_picks` in Supabase when online | Done |
| 4 | Offline pick queue — unpersisted picks flushed on reconnect | Done |
| 5 | Supabase Realtime subscription on `user_picks` → update local pick counts | Done |
| 6 | Each band card shows "X going" count | Done |
| 7 | "My picks" view — filtered list of current user's picks | Done |
| 8 | "Most popular" view — bands sorted by total crew picks, live-updated | Done |

---

## Realtime architecture

```
user picks band
  → write IndexedDB (instant)
  → if online: write Supabase user_picks
  → Supabase broadcasts change via Realtime
  → all connected clients update their local count
```

---

## Files to create / modify

### New files expected
- `src/lib/picks.ts` — toggle pick (IndexedDB write + Supabase sync), offline queue flush logic
- `src/hooks/usePickCounts.ts` — Supabase Realtime subscription, keeps per-band pick counts in memory
- `src/pages/MyPicksPage.tsx` — "My picks" view
- `src/pages/PopularPage.tsx` — "Most popular" view (or tab within SchedulePage)

### Files to modify
- `src/lib/db.ts` — add `user_picks` store to IndexedDB schema; add offline queue store
- `src/pages/SchedulePage.tsx` — wire pick toggle on card tap; render "X going" badge
- `src/components/BottomNav.tsx` — add "Meus picks" / "Popular" tabs as needed
- `src/App.tsx` — add routes for new views; subscribe to Realtime on mount

---

## Offline queue contract

Picks made offline are stored in an `offline_picks` IndexedDB store:

```typescript
type OfflinePick = {
  id: string;           // uuid generated locally
  user_id: string;
  band_id: string;
  action: 'add' | 'remove';
  created_at: string;   // ISO 8601
};
```

On reconnect, flush queue in order. Last write wins per `(userId, bandId)` pair — collapse redundant add/remove pairs before sending.

---

## Supabase Realtime notes

- Subscribe to `user_picks` table with `postgres_changes` event (`INSERT` + `DELETE`)
- Update in-memory pick count map; re-render affected band cards
- Do not re-fetch full table on each change — apply delta from the event payload

---

## What Phase 4 needs from this phase

- Pick data reliably in IndexedDB (Phase 4 "right now" logic reads from there)
- `syncBands()` already in place from Phase 2 — picks sync must follow the same pattern
