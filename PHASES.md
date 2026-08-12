# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 48 — Stage Radar (presence-off `/now`)

**Goal:** On festivals with camping/metal-place/presence features off (Summer Breeze), fill the empty slot under crew band cards with a Stage Radar: every stage live/next/done + pick-based “N going”, tap → picker sheet.

**Visual lock:** Variant B — 2-col §14 schedule tiles (LIVE ribbon, NEXT 0.72, done muted). Prototype: `docs/superpowers/prototypes/stage-radar/index.html`.

### Acceptance

- [ ] Presence-off Active Festival: Stage Radar under `CrewGroupsSection`; one tile per stage
- [ ] Live / next / done correct vs festival `now` (+ live-band test override)
- [ ] “N going” = crew roster pickers of that band; sheet lists names (+ you)
- [ ] Presence-on festivals (Wacken): no radar; camping/lost unchanged
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
