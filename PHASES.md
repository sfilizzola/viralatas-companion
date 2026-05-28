# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

### Phase 32 — Vira-lata Rating

**Status:** Planned — spec approved; **band detail modal prototype approved** 2026-05-28 (`band-detail-full-prototype.html`). Popular sort control still TBD in design pass.  
**Spec:** `docs/superpowers/specs/2026-05-28-vira-lata-rating-design.md`  
**Plan:** `docs/superpowers/plans/2026-05-28-vira-lata-rating-plan.md`

**Goal:** After a set ends, eligible vira-latas rate concerts 1–5 in band detail; `/popular` gains a second sort mode by crew average rating (offline-first, Supabase sync).

**Sub-phases:**

| Sub | Scope |
|-----|--------|
| **32.A** | Migration + types + IDB v11 + pure rating services + tests |
| **32.B** | `ratingsRepository` + offline queue + reconnect + Realtime |
| **32.C** | `huashu-design` rating icons → `BandRatingInput` + modal + eligibility purge |
| **32.D** | Popular dual-mode + aggregates hook + i18n (4 locales) + Design System |
| **32.E** | Wiki + changelog + phases-history + phase close |

**Acceptance criteria:**

- [ ] Eligible vira-lata can rate 1–5 only in `BandDetailModal` (picked + ended + not missed)
- [ ] Rating changeable anytime; tap same score clears row
- [ ] Mark missed or unpick deletes user's rating for that band
- [ ] Crew average includes all raters (including self); solo rating → avg equals that score
- [ ] `/popular` second mode lists bands with ≥1 rating, sorted avg → count → start_time
- [ ] Ceremony bands excluded from rated list
- [ ] Offline-first: UI reads IndexedDB; writes queue when offline; sync on reconnect
- [ ] Realtime updates peer ratings into IndexedDB
- [ ] All four locales updated; Design System documents rating control
- [ ] `rtk npm run build` and `rtk npm test` green

**Out of scope (→ FUTURE_IDEAS #8–#10):** My Picks display, `/wrap` stats, badge conditions.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
