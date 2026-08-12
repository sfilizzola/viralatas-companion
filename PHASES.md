# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 48 — Stage Radar (presence-off `/now`)

**Goal:** When festival `features.camp` is off (Summer Breeze), fill the empty camping/lost slot under crew band cards with Stage Radar. When `camp` is on: camping + lost cards as today.

**Visual lock:** Variant B — 2-col §14 schedule tiles (LIVE ribbon, NEXT 0.72, done muted). Prototype: `docs/superpowers/prototypes/stage-radar/index.html`.

### Acceptance

- [ ] `camp` off: Stage Radar under `CrewGroupsSection`; one tile per stage; no camping/lost cards
- [ ] `camp` on: camping + lost cards; no Stage Radar
- [ ] Live / next / done correct vs festival `now` (+ live-band test override)
- [ ] “N going” = crew roster pickers of that band; sheet lists names (+ you)
- [ ] Metal Place still independent via `features.metal_place`
- [ ] Offline from IDB after first load
- [ ] No new backend schema
- [ ] Wiki + DS § stage-radar + changelog updated

### Relevant plan

`docs/superpowers/plans/2026-08-12-stage-radar.md` (local scratch)

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
