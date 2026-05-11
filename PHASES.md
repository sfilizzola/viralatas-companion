# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

---

## Status: Phase 12 — Crew Arrival Map (active)

Building a social coordination feature to show when vira-latas are arriving at Wacken.

For upcoming work after Phase 12 see:
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

---

## Phase 12 — Crew Arrival Map 🚀

**Goal:** Show when each vira-lata is arriving at Wacken on the `/announcements` page. Build a reusable `<ArrivalMap />` component that displays crew members grouped by arrival day with expandable details.

**Context:** Phase 11.D added `wacken_arrival_day` tracking in Supabase Auth metadata only. Phase 12 mirrors this to `public.users` and builds a visual component for the whole crew to coordinate arrivals.

### Sub-phases

| Sub-phase | Deliverable |
|---|---|
| **12.A** | Schema & data layer: migrate `wacken_arrival_day` to `public.users` column; update `EditProfileForm` to write both places; expand `syncCrew()` select; update types |
| **12.B** | Build `<ArrivalMap />` component: bar-row-per-day layout with avatar clusters (collapsed) + name chips (expanded); 4px accent strips (teal/red/amber per day state); time-aware auto-minimize after Day 1 (Jul 29) |
| **12.C** | Integration: embed `<ArrivalMap>` on `/announcements` above the announcements list; pass `crewUsers`, `currentUserId`, `currentTime` (from `useNow()`), `language` |
| **12.D** | Localization: add arrival map strings for all 4 languages (br/en/es/de) with localized day labels (DOM/SUN/DOM/SO, etc.); handle missing-data "Não definido" row |

### Acceptance Criteria

- ✅ Migration applies cleanly; `wacken_arrival_day` readable on `public.users`
- ✅ `EditProfileForm` writes to both auth metadata AND DB column on save
- ✅ `syncCrew()` fetches `wacken_arrival_day`; crew users in IDB include the field
- ✅ `<ArrivalMap>` renders on `/announcements` above announcements list
- ✅ Arrival days group correctly: SUN/MON/TUE/WED/THU+ order, then "Não definido"
- ✅ Rows show avatar cluster (max 5 + count label) when collapsed
- ✅ Tap row to expand → shows name chips (`.loc-chip` pattern) with current user highlighted (`.me` style)
- ✅ "TODAY" chip appears on the current day row
- ✅ "D1" badge pill on WED JUL 29 row
- ✅ 4px left accent strip: teal (past), red (future), amber (today)
- ✅ Time-aware: after Jul 29 00:00 UTC+1, minimizes to single summary row; user can tap [▼] to expand
- ✅ Empty state handles 0 arrivals: "Nenhum vira-lata definiu chegada ainda"
- ✅ All 4 languages: br/en/es/de strings present in corresponding i18n files
- ✅ No regressions: `npm test` passes
- ✅ Component works in offline mode (no data fetching; relies on cached `crewUsers`)

### Design System Notes

- **Pattern:** timeline-day header + collapsible row structure (reuses `/my-picks` patterns)
- **Avatar clusters:** `.cluster` with `.av.s32` (overlapping, max 5)
- **Name chips:** `.loc-chip` (22px avatar + first name)
- **Styling:** `--bg-surface`, `--border`, `--signal-ok` (teal), `--accent` (red), `--signal-warn` (amber)
- **Typography:** Oswald for day labels, JetBrains Mono for counts
- **Motion:** only state changes (expand/collapse), no animation

### Critical Files

| File | Change |
|---|---|
| `supabase/migrations/<ts>_phase12_arrival_day.sql` | New — add column |
| `src/types/index.ts` | Add `wacken_arrival_day` to `User` and `CrewUser` |
| `src/lib/supabase.types.ts` | Add `wacken_arrival_day` to Row type |
| `src/repositories/users.ts` | Expand syncCrew select |
| `src/components/profile/EditProfileForm.tsx` | Write to DB column on save |
| `src/components/ArrivalMap.tsx` | New component |
| `src/pages/AnnouncementsPage.tsx` | Integrate ArrivalMap |
| `src/i18n/*_br.json`, `*_en.json`, `*_es.json`, `*_de.json` | Arrival map strings (all 4 languages) |
