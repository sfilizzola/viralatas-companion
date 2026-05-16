# Design: Duck Button 15-Minute Opening Window

**Date:** 2026-05-16  
**Status:** Approved  
**Phase:** 21  

---

## Purpose

Restrict the duck button so it is only available during the first 15 minutes of a band's live set. After the 15-minute window closes, the button disappears silently.

---

## Context

Phase 20 added the duck button. Its visibility is controlled by `duckBandId` in `useNowData.ts`, which is non-null only when:

1. `myPlan.status === 'current'` (band is live)
2. `myPlan.band.category !== 'ceremony'`

This change adds a third condition: the current time must be within 15 minutes of the band's `start_time`.

---

## Change

**Single file: `src/hooks/useNowData.ts`**

In the `duckBandId` memo, add:

```ts
const DUCK_WINDOW_MS = 15 * 60 * 1000;
now.getTime() < new Date(band.start_time).getTime() + DUCK_WINDOW_MS
```

`now` is already a dependency of the memo (it drives `myPlan`). When the window closes, the next `useNow` tick (30 s interval) recomputes `duckBandId` to `null`, which propagates through `RightNowPage` → `CrewGroupsSection` → `BandCard` and the button disappears.

No other files change.

---

## Files touched

| File | Change |
|---|---|
| `src/hooks/useNowData.ts` | Add 15-min window guard to `duckBandId` memo |

**Not changed:** `BandCard`, `DuckButton`, `useDuckQuack`, `SchedulePage`, `DuckToast`, any repository, any Edge Function, any DB migration.

---

## Offline behaviour

No change. The window check is pure local time math and works fully offline. Queued offline ducks flushed on reconnect are unaffected.

---

## Edge cases

| Case | Behaviour |
|---|---|
| User opens app 14 min into set | Duck appears immediately; disappears within 30 s of the 15-min mark |
| Active cooldown when window closes | Cooldown remains in `localStorage` but button is gone; cleans up naturally on next band rotation |
| Live-test band (`liveTestBandId`) | Window check applies equally — test band `start_time` is shifted to 5 min ago, so duck window is 10 min from test activation |
| Ceremony band | Still excluded before the window check — no change |
| `now` tick granularity (30 s) | Button may persist up to 30 s past the 15-min mark. Acceptable. |

---

## Testing

Manual: activate a live-test band via `seed:live-now`, confirm duck button appears, advance mock time past the 15-min mark (or wait), confirm button disappears without a page reload.

No new unit tests required.
