# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## No active phased work

All phases complete. See `FUTURE_IDEAS.md` for upcoming ideas.

---

## Phase 42 — Presence Architecture Deepening ✅

**Status:** ✅ Complete (2026-06-09) → `docs/ai-wiki/phases-history.md`

---

### Phase 42.A — Presence Policy + Service Seam

**Goal:** Extract all Metal Place and camping rules from `presenceRepository.ts` into a pure `presencePolicy.ts` module, move orchestration into a new `presenceService.ts`, and leave the repository as pure I/O.

**Motivation (from architecture review 2026-06-09):**
`presenceRepository` exports 12 methods, half of which are Metal Place *rules* (`isTimeWithinMetalPlaceWindow`, `autoClearCampingOnCurrentBand`, `validateAndAutoCheckout`, `applyPresenceToggle`, `autoCheckoutAllUsers`). These are business policies that currently require IDB + Supabase to exercise. The window-crossing logic has 6 real edge cases (test_override_day, CEST wall-clock math, midnight windows) that should be unit-testable with plain Date objects.

**Three-layer design (settled in grilling session):**

```
presencePolicy.ts   (pure functions, no I/O)
  isMetalPlaceWindowActive(config: MetalPlaceConfig | null, now: Date): boolean
  resolvePresenceToggle(nextValue: PresenceLocation, ctx: PresenceToggleContext): PresenceDecision
    → returns { setCamping: boolean | null, setMetalPlace: boolean | null }
  shouldAutoClearCamping(isCamping: boolean, planStatus: LivePlanStatus): boolean
  shouldAutoCheckout(config: MetalPlaceConfig | null, now: Date, presence: UserPresence | null): boolean

presenceRepository.ts  (pure I/O — unchanged method signatures)
  setCampingStatus(userId, value): Promise<void>       ← IDB + Supabase/queue
  setMetalPlaceStatus(userId, value): Promise<void>    ← IDB + Supabase/queue
  syncCrewFromRemote(): Promise<void>
  flushOfflineQueue(): Promise<number>
  saveMetalPlaceConfigRemote(config): Promise<void>
  syncMetalPlaceConfig(): Promise<void>
  subscribeToRealtime(): () => void
  subscribeToMetalPlaceConfigRealtime(): () => void
  (incrementLocationVisit stays here for now — see 42.B)

presenceService.ts  (orchestration — calls policy → calls repo)
  applyPresenceToggle(userId, nextValue, ctx): Promise<void>
  autoClearCampingOnCurrentBand(userId, isCamping, planStatus): Promise<void>
  validateAndAutoCheckout(config, userId): Promise<void>
  autoCheckoutAllUsers(): Promise<void>
```

**Key decisions:**
- `resolvePresenceToggle` returns a **decision object** `PresenceDecision` — the service executes it without conditional logic
- `shouldAutoCheckout` receives the **full `UserPresence` object** (flexible for future fields)
- `incrementLocationVisit` stays in `presenceRepository` for now (scoped to 42.B)
- `useNowData` updates to call `presenceService` instead of `presenceRepository` for orchestration methods

**Deliverables:**
- [ ] `src/services/presencePolicy.ts` — 4 pure exported functions + `PresenceDecision` type
- [ ] `src/repositories/presence.ts` — remove the 5 policy/orchestration methods; keep 8 I/O methods
- [ ] `src/services/presenceService.ts` — 4 orchestration methods calling policy + repo
- [ ] `src/hooks/useNowData.ts` — update 2 `useEffect` call sites from `presenceRepository.*` to `presenceService.*`
- [ ] `src/__tests__/presencePolicy.test.ts` — unit tests for all 4 pure functions covering edge cases:
  - `isMetalPlaceWindowActive`: window not started, mid-window, window ended, test_override_day set, no config, config missing start/end
  - `shouldAutoClearCamping`: camping + current → true; camping + next → false; not camping → false
  - `shouldAutoCheckout`: window active → false; window inactive + checked in → true; window inactive + not checked in → false
  - `resolvePresenceToggle`: auto→camping, camping→auto, metal_place, already camping + plan current

**Acceptance criteria:**
- [ ] All existing Metal Place behavior unchanged end-to-end
- [ ] `presenceRepository.ts` exports no functions containing date/time comparison logic
- [ ] `presencePolicy.ts` imports nothing from `../lib/db`, `../lib/supabase`, or `../repositories`
- [ ] `presenceService.ts` calls `presencePolicy` for every decision before calling `presenceRepository` for I/O
- [ ] `presencePolicy.test.ts` covers all edge cases above with plain `Date` objects and no mocks
- [ ] `rtk npm run build` green · `rtk npm test` green

---

### Phase 42.B — incrementLocationVisit extraction ✅

**Status:** ✅ Complete (2026-06-09)

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase with the next phase number (or "no active phased work" when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
