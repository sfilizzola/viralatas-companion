# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

---

## Status: No active phases

All planned phases are complete. The app is feature-ready for Wacken 2026.

For upcoming work see:
- **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** — nice-to-have features if time allows
- **[NEW_ARCH_PLAN.md](NEW_ARCH_PLAN.md)** — staged architectural refactoring plan (services layer, repositories, page decomposition, UI primitives)
- **[COMPONENT_LIBRARY_PLAN.md](COMPONENT_LIBRARY_PLAN.md)** — Stage 4 of the arch plan: `src/ui/` primitives spec

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
