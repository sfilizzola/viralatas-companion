# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

### Phase 33 — My Wacken inline attendance

**Goal:** Fix mid-festival confusion on `/my-picks` — ended picks stay on their festival day with inline **Attended / Missed** chips; rename nav to **Lineup** + **My Wacken**; one-time coach banner on first ended pick.

**Spec:** `docs/superpowers/specs/2026-05-28-my-wacken-inline-attendance-design.md`  
**Plan:** `docs/superpowers/plans/2026-05-28-my-wacken-inline-attendance-plan.md`  
**Wireframe:** `docs/wireframes/my-programacao-direction-a.html`

**Sub-phases:**

| Sub-phase | Deliverable |
|-----------|-------------|
| **33.0** | Nav labels Lineup / My Wacken; rename `LineupPage.tsx` + `MyWackenPage.tsx`; routes `/schedule`, `/my-picks` unchanged |
| **33.1** | Inline day grouping (A2 sort); remove Saw / Didn't See footer buckets; **already played today** divider; **{n} left today** header stat |
| **33.2** | `BandCard` **Attended / Missed** chips on ended rows only; no timing chips; Design System update |
| **33.3** | Dismiss-once coach banner; changelog + wiki |

**Acceptance criteria:**

- [ ] Bottom nav shows **Lineup** and **My Wacken** (4 locales; BR Lineup = **Line-up**)
- [ ] Page files renamed; `rtk npm run build` green; URLs unchanged
- [ ] Ended picks remain under their festival day (no footer Saw/Didn't See sections)
- [ ] Within each day: upcoming by time → optional divider → ended by time
- [ ] Ended rows show **Attended** (opt-out) or **Missed** chip; upcoming rows have no status chip
- [ ] Ended rows have no conflict/overlap indicators; header conflict/overlap counts use upcoming picks only
- [ ] Header `{days}` counts all festival days with picks; day header count = total picks that day
- [ ] **{n} left today** shown during festival when n ≥ 1; hidden when n = 0
- [ ] Mid-festival: past ended-only days collapsed by default; today expanded; post-festival: all days expanded
- [ ] Empty state uses user-facing **Line-up** copy
- [ ] Coach banner appears once when user first has an ended pick; dismiss persists in `localStorage` (per device)
- [ ] `BandDetailModal` missed flow unchanged; no schema/sync changes
- [ ] `rtk npm run build` and `rtk npm test` green at phase close
- [ ] Design System + `docs/ai-wiki/changelog.md` updated

**Out of scope:** Route URL changes, ratings on My Wacken (FUTURE_IDEAS #8), In X min / Now chips, row hint on just-ended band.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
