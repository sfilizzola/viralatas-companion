# PHASES.md — Active Development

**Current phase: 51** — My Picks planning mode.

See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 51 — My Picks planning mode

**Goal:** When `running_order` is off, `/my-picks` is a **planning** list of wanted bands — not a timed timeline and not conflict math. Picks remain the same rows that become the schedule after the flag flips.

**Depends on:** Phase 49. Can share copy/era language with Phase 50.

**Visual:** Brainstorm + `huashu-design` prototypes (`docs/superpowers/prototypes/picks-planning/`) before implementation. Spec not written yet.

### Acceptance (draft — lock in brainstorm)

- [ ] Flag off: My Picks planning UI (no timeline / conflict chrome)
- [ ] Flag on: today’s My Picks unchanged
- [ ] Picks identical to Phase 49 survival (`band_id` stable)
- [ ] Offline from IDB
- [ ] Wiki + DS + changelog

### Relevant spec / plan

Not yet. Start with `/brainstorming`.

---

## Phase 52 — Multi-festival badges (next; do not start)

**Status:** Approved design/sketch; **do not implement** until Phase 51 is done and this phase has a detailed implementation plan.

**Goal:** One badge engine. Catalog entries gain festival scope (`festivalId` on `BadgeConfig`). Live vest (when `badges_enabled`) = evergreen + badges for the **Active Festival**. Wacken 2026 year-tagged defs become Wacken-2026-scoped or archive-only — do not copy that vest onto other festivals. Consolidation per festival instance. Archive headings generalize to **Achieved in {festival name} {year}**. Keep `badges_enabled` as the app-wide live-vest killswitch.

**Clarification (current unphased vs this sketch):** `getCurrentFestivalYear()` remains an archive/admin helper (registry max year). It is not the **Active Festival** and is not the live-vest selector. The exact matching predicate for “badges for the Active Festival” is finalized in this phase’s implementation plan.

**Depends on:** Unphased-pass prerequisites `badges_enabled` + evergreen-only live listing. Phase 51 does not block the design; it blocks *starting* this phase.

**Locked approach:** Single engine + `festivalId` on `BadgeConfig`. Rejected: per-festival registry files; badges as Postgres rows.

**Out of scope unless reopened:** Postgres catalog, per-festival vest flags, persist/EF rewrite beyond new config fields, a second evaluator.

**Optional local provenance (gitignored):** `docs/superpowers/specs/2026-09-05-badge-flag-and-multifestival-design.md`

### Acceptance (draft — refine in `/writing-plans` when this phase starts)

- [ ] Live vest = evergreen + Active Festival badges when flag ON
- [ ] Switching Active Festival swaps festival-layer patches only
- [ ] Wacken-grounds conditions are badge data, not global “app is Wacken”
- [ ] Archive grouping names the festival, not a bare year
- [ ] Offline vest from IDB + registry; consolidate still network-only
- [ ] Wiki + DS + changelog

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
