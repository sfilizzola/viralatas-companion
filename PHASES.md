# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

---

## Status: Phase 13 — Wiki Documentation: User Flows (planned)

Documenting complete user flows through the app features. See Phase 13 section below.

For upcoming work after Phase 13 see:
- **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** — nice-to-have features if time allows
- **[NEW_ARCH_PLAN.md](NEW_ARCH_PLAN.md)** — staged architectural refactoring plan (services layer, repositories, page decomposition, UI primitives)
- **[COMPONENT_LIBRARY_PLAN.md](COMPONENT_LIBRARY_PLAN.md)** — Stage 4 of the arch plan: `src/ui/` primitives spec

---

## Phase 12 — Crew Arrival Map ✅

All sub-phases completed.

| Sub-phase | Deliverable |
|---|---|
| **12.A** | Schema & data layer: migrated `wacken_arrival_day` to `public.users` column; `EditProfileForm` writes to both places; `syncCrew()` expanded |
| **12.B** | Built `<ArrivalMap />` component: bar-row-per-day layout with avatar clusters + name chips; 4px accent strips (teal/red/amber); time-aware auto-minimize |
| **12.C** | Integrated `<ArrivalMap>` on `/announcements` above announcements list |
| **12.D** | Localized arrival map strings for all 4 languages (br/en/es/de) with localized day labels |

---

## Phase 11 — Profile, Header, Badges ✅

All sub-phases completed.

| Sub-phase | Deliverable |
|---|---|
| **11.A** | Fix `/now` header datetime stacking on mobile |
| **11.B** | Replace Wacken year checkboxes with pill grid (2005–2026) |
| **11.C** | New badge conditions: `wacken_years_count_min`, `wacken_attended_in_year` |
| **11.D** | Camping arrival day tracking (`wacken_arrival_day` in user metadata) + `wacken_arrived_before` badge condition; `early-bird` badge |
| **11.E** | Godlike-assigned joke badges: `special_badges text[]` column, `assigned` badge condition, `assign-badge` Edge Function, assignment modal in ProfilePage admin |
| **11.F** | Conflict severity split: soft ≤15 min / hard >15 min; 3-conflict warning banner on MyPicksPage |
| **11.G** | Collapsible day sections in `/my-picks`; badge system overhaul — 7 new badges + translations |
| **11.H** | Location presence badges + after-hour time badge conditions |
| **post-11** | 4 new music-style badges: alestorm, mosh-pit, party-metal, crowdsurfer |

---

## Phase 13 — Wiki Documentation: User Flows 📖

**Goal:** Document the complete user flows and journeys through the app. Each flow traces a feature from trigger through happy path, offline behavior, sync behavior, realtime updates, and edge cases. These docs prevent future regressions and onboard engineers faster.

**Why after Phase 12:** Phase 12.C (ArrivalMap integration) will surface new data flow questions; documenting live flows immediately after clarifies reasoning.

**Approach:** Write one flow per sub-phase. Each flow reads existing code + wiki (architecture.md, sync-engine.md, offline-first.md) and produces a standalone document with ASCII diagrams, timeline, and worked examples.

### Sub-phases

| Sub-phase | Deliverable | Effort | Dependencies |
|---|---|---|---|
| **13.A** | **Flow: Announcements** — Post message, realtime sync, soft-delete, moderation, offline queue, reconnect | 3h | Read announcements.ts, repositories, RLS policies |
| **13.B** | **Flow: Live Now** — Time-based band display, current/next band logic, crew attendance rendering, conflict detection | 3h | Read BandTime.ts, useNow hook, conflict logic |
| **13.C** | **Flow: Offline Pick Sync** — Queue mechanics, deduplication worked example (5 toggles → 1 call), error recovery, reconnect toast | 2h | Read sync-engine.md, flushOfflineQueue logic |
| **13.D** | **Flow: Authentication** — Login/signup, session persistence to IndexedDB, test user creation, RLS enforcement | 2.5h | Read supabase.ts, auth trigger, test seed scripts |

**Total effort**: ~10.5 hours (reading + writing + testing)

### Acceptance Criteria

- ✅ **announcements.md** — Post lifecycle with 4 paths: (1) online immediate, (2) online realtime from others, (3) offline queue, (4) reconnect flush; soft-delete timing; moderation RLS
- ✅ **live-now.md** — BandTime logic (festival-local hour), current/next band selection algorithm, `useNow()` time-shift override, conflict severity (soft/hard), crew counts, visual priority ordering
- ✅ **offline-pick-sync.md** — Queue store structure (13 object stores), deduplication by (user_id, band_id), keepLast semantics, worked example (timestamps T=0:10 through T=0:30), error recovery, reconnect with SyncToast
- ✅ **authentication.md** — Signup trigger → users table creation, custom Supabase adapter (IndexedDB storage), session persistence, test user metadata (is_test_user), godlike role assignment, RLS per-table enforcement

### Diagram Requirements

Each flow doc should include:
- **Trigger** — What user action starts the flow
- **Happy Path (Online)** — ASCII timeline with 5-7 key moments
- **Offline Behavior** — Queue storage, state representation
- **Sync Behavior (Reconnect)** — Dedup logic (if applicable), Supabase call, result handling
- **Realtime Updates** — Other users' effects (if applicable)
- **Edge Cases** — 2-3 failure scenarios per flow

---

## Phase 14 — Wiki Documentation: Architectural Decisions 📋

**Goal:** Document the "why" behind key technical choices. ADRs (Architectural Decision Records) explain tradeoffs, alternatives considered, and consequences of each major decision.

**Why separate from Phase 13:** Flows are horizontal (features); ADRs are vertical (architectural decisions). Grouping them helps future engineers understand both mechanics (flows) and reasoning (decisions).

**Approach:** Write one ADR per sub-phase. Each ADR follows the template: Status → Date → Context → Decision → Rationale → Consequences → Tradeoffs Accepted → Related Decisions.

### Sub-phases

| Sub-phase | Deliverable | Effort | Dependencies |
|---|---|---|---|
| **14.A** | **ADR: Supabase as Sync Target** — Why Supabase (Auth + DB + Realtime in one), alternatives (Firebase, custom Node, CouchDB), cost/complexity tradeoffs | 2h | Read supabase setup, cost calculator |
| **14.B** | **ADR: Custom Hooks + Event Emitters (no Redux)** — Why window events instead of Zustand/Redux, performance impact, testability, complexity reduction | 1.5h | Read App.tsx, hooks/, event emitter pattern |
| **14.C** | **ADR: Service Worker Caching Strategy** — Why NetworkFirst for API, CacheFirst for images, cache invalidation via version bump, offline resilience | 1.5h | Read vite.config.ts Workbox, sw.ts |

**Total effort**: ~5 hours

### Acceptance Criteria

- ✅ **supabase-as-sync-target.md** — Context (need auth + DB + realtime), decision (Supabase), rationale (cost, integration, free tier), consequences (+ learning curve, - vendor lock-in), tradeoffs (eventual consistency accepted for offline-first)
- ✅ **custom-hooks-events-no-redux.md** — Decision (window events + custom hooks), rationale (simplicity, bundle size, no boilerplate), consequences (+ readable, - no time-travel debugging), when NOT to use (multi-page state sync)
- ✅ **workbox-caching-strategy.md** — Decision (NetworkFirst API + CacheFirst assets), rationale (offline-first, stale-while-revalidate), consequences (+ resilience, - cache busting complexity), how cache invalidation works (version bump)

---

## Phase 15 — Wiki Documentation: Glossary Expansion & Index 🔍

**Goal:** Expand the glossary to cover terms introduced in flows (Phase 13) and decisions (Phase 14), and create a comprehensive index linking all docs.

**Why last:** After flows and decisions are written, the new terminology is clear. Glossary expansion ensures every term used across all docs has a definition.

### Sub-phases

| Sub-phase | Deliverable | Effort |
|---|---|---|
| **15.A** | **Glossary Expansion** — Add 30–40 new terms from Phase 13–14 (e.g., "deduplication," "soft-delete," "time-shift," "NetworkFirst," "offline queue," "godlike," etc.) | 1.5h |
| **15.B** | **Wiki Index Update** — Update index.md to link all new flows/decisions, organize by section, add "reading paths" (e.g., "first-time engineer," "badge developer," "offline expert") | 1h |

**Total effort**: ~2.5 hours

### Acceptance Criteria

- ✅ Glossary now covers 140+ terms (was 100+)
- ✅ Every technical term in Phase 13–14 docs has a glossary entry
- ✅ index.md lists all 18 wiki documents (11 core + 1 badges + 4 flows + 2 decisions)
- ✅ "Reading paths" provide navigation by role/expertise

---

## Summary: Wiki Documentation Roadmap

| Phase | Docs | Hours | Status |
|---|---|---|---|
| **Initial** | 11 core + 1 badges | ✅ 25h | **Complete** |
| **13** | 4 user flows | ~10.5h | Planned |
| **14** | 3 ADRs | ~5h | Planned |
| **15** | Glossary + index | ~2.5h | Planned |
| **Total** | **19 docs** | **~43h** | |

**Execution order**: 13 → 14 → 15 (linear dependency: flows before ADRs, index after both)

**Expected outcome**: Complete, copy-paste-ready wiki covering features, flows, decisions, and terminology. New engineers can onboard in 2–3 hours instead of 2–3 days.
