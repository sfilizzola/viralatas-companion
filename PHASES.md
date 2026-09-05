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

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
