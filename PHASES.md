# PHASES.md — Active Development

**Current phase: 49** — Announcement Lineup. Upcoming: 50 `/now` planning · 51 My Picks planning.

See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 49 — Announcement Lineup (`running_order` flag)

**Goal:** Every **Festival** has a **Lineup era**: **Announcement Lineup** (named Bands only) or **Schedule Lineup** (day, time, and stage). While the Active Festival is in Announcement Lineup, `/schedule` is the B2 planning grid (name, image, genre, pick, counts) with no stage, time, day grouping, or conflicts. Picks survive on `bands.id` when slots are filled later. Godlike flips `features.running_order` per Active Festival (`true` = Schedule Lineup). Not **Official running order** (Wacken feed).

**Depends on:** Visual lock done (B2). Implement from `docs/superpowers/plans/2026-09-04-announcement-lineup.md`. Schema/helpers (plan Tasks 1–5) may run before Lineup React (Task 6).

**Visual:** **LOCKED B2 — crew billboard** (2026-09-04). Source: `docs/superpowers/prototypes/announcement-lineup/locked-b2.html`.

### Acceptance

- [ ] Active Festival in **Announcement Lineup**: `/schedule` is B2 (hero + 2-col posters; search + genre; pick + counts; no stage/time/day/conflict)
- [ ] Picks persist after laptop **name match** fills slots and godlike **Lineup era flip** to **Schedule Lineup**
- [ ] Godlike flips Active Festival era online (either direction); others see it after `cache_version` pack **and** catalog reload (no `festivals` Realtime)
- [ ] No **trusted clock** → no live / conflict / map; Lineup / Popular / My Picks still list the Band; **leftover Bands** still on `/schedule` after Schedule Lineup
- [ ] Wacken 2026 and Summer Breeze 2026 start **Schedule Lineup**; new Festivals start **Announcement Lineup**
- [ ] Wiki: flat announced `lineup.md` vs day × stage; rumored days footnotes; leftovers reported, never auto-deleted; name-match laptop-only
- [ ] Offline announcement Lineup works from IDB after first load
- [ ] Wiki + changelog + `CONTEXT.md` terms; DS when Lineup visuals land

Grill locks (full table): `docs/superpowers/plans/2026-09-04-announcement-lineup.md` § Grill locks. Language: `CONTEXT.md`.

### Relevant spec / plan

- Spec: `docs/superpowers/specs/2026-09-04-announcement-lineup-design.md` (local scratch)
- Plan: `docs/superpowers/plans/2026-09-04-announcement-lineup.md` (local scratch)

---

## Phase 50 — `/now` planning mode

**Goal:** When `running_order` is off, `/now` is a dedicated **planning** screen — not an empty live grid and not only “skip untimed bands”. Crew still see that the festival is in announcement era (who people are picking, not who is on stage).

**Depends on:** Phase 49 (`running_order` + `isTimedBand` + nullable slots).

**Visual:** Brainstorm + `huashu-design` prototypes (`docs/superpowers/prototypes/now-planning/`) before implementation. Spec not written yet.

### Acceptance (draft — lock in brainstorm)

- [ ] Flag off: `/now` planning UI (no fake live/next from stored times)
- [ ] Flag on: today’s `/now` unchanged
- [ ] Offline from IDB
- [ ] Wiki + DS + changelog

### Relevant spec / plan

Not yet. Start with `/brainstorming` after Phase 49.

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

Not yet. Start with `/brainstorming` after Phase 49 (or in parallel with 50 once 49 has shipped the flag).

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
