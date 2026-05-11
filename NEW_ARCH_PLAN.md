# NEW_ARCH_PLAN.md — Architectural Refactoring Plan

_Status: Stage 4 is CURRENT — Stages 1, 2 & 3 COMPLETE_  
_Context: Written May 2026 for the Viralatas Metaleiros companion app_  
_Deadline constraint: Wacken starts July 29, 2026_

---

## Completed

- **Stage 1** ✅ — `services/` extraction from `lib/` (badges, livePreview, liveBandTest, bandTime, stageColors, time, alerts, usefulLinks)
- **Stage 2** ✅ — `repositories/` layer (picks, presence, missed, announcements, users, bands)
- **Stage 3** ✅ — Fat page decomposition: ProfilePage 1,697→117 lines, RightNowPage 598→116 lines

---

## Target architecture (as-built after Stage 3)

```
src/
  ui/              ← Stage 4: pure UI primitives (no domain knowledge)
  components/      ← domain components (Band*, Badges*, etc.)
    profile/       ← ProfilePage sub-components
    now/           ← RightNowPage sub-components
    icons/         ← existing
  repositories/    ← unified data access (IDB-first + Supabase sync)
  services/        ← business/domain logic (pure functions)
  hooks/           ← React bindings to repositories + services
  pages/           ← thin route-level components (layout + data orchestration only)
  lib/             ← infrastructure only (clients, IDB schema, sync queue)
  i18n/            ← existing
  types/           ← existing
  workers/         ← existing
```

### Layer responsibilities (strict)

| Layer | Knows about | Does NOT know about |
|---|---|---|
| `ui/` | HTML, CSS, React props | Supabase, IDB, domain types |
| `components/` | domain types, `ui/`, hooks | Supabase, IDB directly |
| `repositories/` | `lib/` (IDB + Supabase), domain types | React, hooks |
| `services/` | domain types | Supabase, IDB, React |
| `hooks/` | repositories, services, React | Supabase, IDB directly |
| `pages/` | hooks, components | repositories, services, `lib/` |
| `lib/` | Supabase SDK, idb library | domain types (mostly) |

**The rule in one sentence:** Pages call hooks. Hooks call repositories and services. Repositories call `lib/` (IDB + Supabase). Services are pure functions. `ui/` is dumb HTML+CSS.

---

## Stage 4 — UI primitives 🔄 CURRENT

**Risk:** Low. All changes are additive. Existing components are updated to use primitives, but only after the primitives are verified correct.  
**Duration estimate:** 3–5 days  
**Branch:** `refactor/stage-4-ui`

### Summary

Create `src/ui/` with a set of pure presentational primitives that carry no domain knowledge. Components like `BandCard`, `BadgesDisplay`, `ProfileHeader`, and the new `components/profile/` sub-components are updated to use these primitives.

### Primitives target list

> See **COMPONENT_LIBRARY_PLAN.md** for the full spec.

| Primitive | Description |
|---|---|
| `Button` | primary / outline / ghost / destructive variants |
| `Modal` | generic overlay with close affordance |
| `Chip` / `Tag` | role chips, stage chips, conflict chips |
| `Collapsible` | replaces ad-hoc chevron+show/hide patterns |
| `Avatar` | 40px / 56px sizes, fallback initials |
| `SectionTitle` | Oswald mono section headings |
| `Input` | text input with label |
| `Select` | dropdown with label |
| `SegmentedControl` | PT/EN toggle, day selector, etc. |

### Migration approach

1. Create `src/ui/` and implement each primitive in isolation with a TypeScript interface
2. Verify each primitive looks correct before wiring it up
3. Update `components/profile/` sub-components (from Stage 3) to use primitives first — they are the newest and cleanest consumers
4. Update `BandCard` and `BadgesDisplay` next
5. Sweep remaining uses across `components/` and `pages/`
6. Run tests + TypeScript check after each component is migrated

### Acceptance criteria

- [ ] `src/ui/` has ≥ 6 primitive components with TypeScript interfaces
- [ ] At least 2 existing domain components (`BandCard`, `BadgesDisplay`) use UI primitives
- [ ] `components/profile/` sub-components use UI primitives
- [ ] All 205+ tests pass
- [ ] TypeScript compiles clean
- [ ] No visual regressions (manual spot-check on `/now`, `/schedule`, `/profile`)

---

## Execution checklist (for Stage 4)

Before merging to `dev`:

1. `rtk npm run test` — all tests green
2. `rtk tsc` — no new TypeScript errors
3. Manual smoke test on 3 pages: `/now`, `/schedule`, `/profile`
4. Manual offline test: go offline → toggle a pick → go online → verify sync

---

## What this plan does NOT include

- **Edge Function refactoring** — small, well-isolated, not a pain point.
- **Test suite expansion** — deferred to post-Wacken.
- **TanStack Query migration** — high cost (~2 weeks), revisit post-Wacken.
- **CSS design token system** — `src/index.css` already has CSS variables; full token audit deferred.
- **i18n system overhaul** — the per-page JSON file pattern works.
