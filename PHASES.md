# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## No active phased work

**Next phase:** 43

See `FUTURE_IDEAS.md` for upcoming ideas.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace it with either:
   - The next phase spec (if one is ready), OR
   - `## No active phased work` with `**Next phase:** N+1` — where N+1 is the completed phase number + 1. This line is mandatory so agents always know the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
