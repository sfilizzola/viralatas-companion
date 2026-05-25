# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 27 — Architecture Deepening (Seam Restoration)

**Status:** 🚧 In progress (27.A–27.C complete)

**Goal:** Restore the intended offline-first seam (`UI → IndexedDB ← repositories → Supabase`). Deepen shallow modules identified in the May 2026 architecture review: fix correctness gaps first, then consolidate sync orchestration, Realtime ownership, and offline-queue semantics. Preserve Phase 26 hook + window-event model; extend ADRs where subscription site moves to sync layer.

**Origin:** `/improve-codebase-architecture` review (8 candidates). HTML report in temp dir; grilling picks refine interface shape per sub-stage.

**Deliverables (ordered — each sub-stage is one reviewable commit):**

- [x] **27.A — Complete `wipeAllLocalData`:** extend `src/lib/db/meta.ts` to clear `offline_duck_quacks`, `metal_place_config`, `live_band_test_config` (and any future non-session stores); test against `src/lib/db/connection.ts` store list
- [x] **27.B — Badge presence alignment:** `deriveUserBadgeLocation()` shared with `/now` grouping; gate `liveTestBandId` on `enabled`; cross-domain contract tests via `src/__tests__/fixtures/liveNowScenarios.ts`
- [x] **27.C — Sync coordinator:** deepen `src/components/sync/SyncOrchestration.tsx` — single reconnect contract (flush all queues → pull remote → `viralatas:sync-complete`); fix Duck mount-flush and missed-band online gap
- [x] **27.D — Realtime in repositories:** `subscribeToRealtime()` on picks, announcements, presence, config repos (mirror `src/repositories/missed.ts`); remove Supabase→IDB writes from hooks
- [x] **27.E — Offline-queue primitive:** shared `OptimisticQueue` with configurable dedup; migrate five repositories; uniform `flushOfflineQueue()` for coordinator
- **27.F — IDB subscription caches:** `useIdbSubscription` or `useSyncExternalStore` domain caches; derived hooks (`usePickCounts`, `useBandAttendees`, `useNowCache`, `useBadgeContext`) consume cache
- **27.G — Decompose `useBadgeContext`:** `useBadgeCache` + `buildBadgeContextFromSnapshot()` + `useBadgePersist` + thin composer (mirror 26.M `/now` split)
- **27.H — Bands repository sync:** fold `src/lib/sync.ts` into `src/repositories/bands.ts`; delete pass-through module

**Deferred (not in 27 scope — track in FUTURE_IDEAS.md if desired):**
- Auth `Provider` (14 `useAuth()` call sites)
- Hook bypasses (`ConflictSection` direct IDB)
- Extract `crewPresence/` slice from `livePreview.ts` (may land inside 27.B)
- `/now` badge pipeline dedup (depends on 27.B + 27.F)

**Acceptance criteria (phase close):**
- [x] 27.A shipped
- [x] 27.B shipped (correctness fixes + contract tests green)
- [x] 27.C shipped (sync coordinator reconnect contract)
- [x] 27.D shipped (hooks no longer own Realtime)
- [x] 27.E shipped (shared OptimisticQueue; uniform flush API)
- [ ] `rtk npm run build` green
- [ ] `rtk npm test` green; new tests for wipe, badge presence parity, queue dedup, coordinator reconnect
- [ ] Offline-first invariants preserved — no presentation-layer Supabase reads
- [ ] Wiki updated: `architecture.md`, `sync-engine.md`, `offline-first.md`, `flows/live-now.md`, `badges.md`, `changelog.md`
- [x] ADR amendment: `docs/ai-wiki/decisions/custom-hooks-events-no-redux.md` — Realtime subscription site = sync layer
- [ ] Phase entry appended to `docs/ai-wiki/phases-history.md`; PHASES.md bumped to Phase 28 TBD

**Recommended execution order:** 27.A → 27.B → (27.C + 27.D + 27.E as a batch) → 27.F → 27.G → 27.H

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
