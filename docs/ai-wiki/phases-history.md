# Phase History

Complete record of every development phase for Viralatas Metaleiros, in order of completion. This is the canonical log — **do not maintain this list in CLAUDE.md or PHASES.md**.

**Rule:** When a phase is completed, append an entry here following the format below. Keep PHASES.md lean (active phase only) and CLAUDE.md free of phase history.

---

## Entry format

```markdown
### Phase N — Title
**Status:** ✅ Complete
**Deliverables:**
- ...
```

---

## Completed Phases

### Phase 1 — Foundation
**Status:** ✅ Complete
**Deliverables:**
- Auth flow (email/password)
- Initial Supabase schema
- Offline shell (Service Worker + IndexedDB setup)

---

### Phase 2 — Schedule
**Status:** ✅ Complete
**Deliverables:**
- Full band lineup data (78+ bands across 8 stages, 4 days)
- Schedule page with stage + day filters
- Full schedule cached to IndexedDB on first load (offline browsing works)

---

### Phase 3 — Picks
**Status:** ✅ Complete
**Deliverables:**
- Pick / unpick bands; picks stored in IndexedDB immediately
- Live vira-latas attendance counts via Supabase Realtime
- Offline pick queue with flush-on-reconnect

---

### Phase 4B — Live Preview
**Status:** ✅ Complete
**Deliverables:**
- Camping state tracking
- Vira-latas grid on `/now`
- LOST detection (user not at any known location)

---

### Phase 5 — Announcements & User Roles
**Status:** ✅ Complete
**Deliverables:**
- Mural-style announcements board (`/announcements`)
- Role hierarchy: `normal` / `manager` / `godlike`
- Manager blocking of posters
- Godlike powers (pin, delete any post)

---

### Phase 6 — Metal Place
**Status:** ✅ Complete
**Deliverables:**
- Festival-day check-in (`metal_place_config` table)
- Vira-latas grid card showing who is where
- Test mode via `live_band_test_config`

---

### Phase 7 — Profile Polish
**Status:** ✅ Complete
**Deliverables:**
- Badge modal on profile
- Live band test toggle in admin panel
- Collapsible admin sections
- Useful links section

---

### Phase 8 — Badge Asset Intake
**Status:** ✅ Complete
**Deliverables:**
- Inventoried `public/badges/` images
- Added Belgian country badge (`belga`)
- Added Colombian country badge (`cafetero`)

---

### Phase 9 — Schedule / My Picks / Popular Differentiation
**Status:** ✅ Complete
**Deliverables:**
- Extracted shared bones: `BandCard`, `BandFilters`, `BandDetailModal`, `useBandConflicts`
- Schedule: added search + genre filter
- My Picks: day-grouped timeline with conflict chips
- Popular: avatar clusters per band + detail modal

---

### Phase 9.B — Godlike Time Travel
**Status:** ✅ Complete
**Deliverables:**
- `now()` helper + `useNow` hook backed by `localStorage` override
- Quick-jump chips for D-1 / D1–D4 / D+1 in the Profile admin panel
- All time-dependent UI respects the override

---

### Phase 10 — Badge Expansion
**Status:** ✅ Complete
**Deliverables:**
- **10a:** Characteristic-badge conditions engine (`bands_picked_genre_min`, `bands_picked_stage_min`, `bands_picked_before_hour_min`, `band_picked_named`)
- **10b:** Seen-tracking via `user_missed_bands` table, IDB schema v8, offline missed-band queue; "Não vi essa banda" toggle in `BandDetailModal`
- 5 new `bands_seen_*` badge conditions
- Extended `BandDetailModal`: vira-latas breakdown, conflict warning
- 177 tests

---

### Design System Phase F — /now Visual Polish
**Status:** ✅ Complete
**Deliverables:**
- 4px stage-color accent strips per band card
- Oswald group titles for location sections
- Tinted gradient backgrounds (orange / teal / purple) per location type
- `useNow()`-driven page header showing festival day + time
- No structural/data changes

---

### Design System Phase G — /profile Restyle
**Status:** ✅ Complete
**Deliverables:**
- 56px avatar profile head with role chip / country flag / years pill
- All-badges patches-grid (4/6/8 cols by viewport; locked badges shown as grayscale)
- `year?` field on `BadgeConfig`
- Edit-profile collapsible with PT/EN language segment
- Gold godlike + blue manager collapsible section headers
- Sign-out pill at bottom

---

### Design System Phase H — Announcements Restyle
**Status:** ✅ Complete
**Deliverables:**
- `announce` grid card: 40px avatar | head/body/actions in column 2
- Role chips (Vira-latas / Manager / Godlike)
- Mono action buttons (pin, delete, block)
- Updated timestamp format: N min / Nh / DD/MM

---

### Design System Phase I — Auth Pages + Bottom Nav + Offline Chrome
**Status:** ✅ Complete
**Deliverables:**
- Login/register: 4px accent top border + Oswald title + mono labels
- `BottomNav`: mono 9px caps + filled-icon active states (6 tabs)
- `OfflineBanner` on `/now`, `/schedule`, `/my-picks`
- `PendingChip` on offline-queued picks and announcements
- `SyncToast` fires on reconnect flush when ≥1 item was synced

---

### Design System Phase J — Icon Pass
**Status:** ✅ Complete
**Deliverables:**
- `<Icon name="..."/>` component at `src/components/icons/Icon.tsx`
- 17 design-system icons (square caps, miter joins; filled variants for active states)
- `StarIcon` delegates to `Icon`
- `BandFilters` filter icon + `BandDetailModal` close icon updated
- ProfilePage chevrons (▼ → Icon); 🔧/👤 stripped; ✓/✗ removed from buttons

---

### Phase 11 — Profile, Header, Badges
**Status:** ✅ Complete
**Sub-phases:**

| Sub-phase | Deliverable |
|---|---|
| **11.A** | Fix `/now` header datetime stacking on mobile |
| **11.B** | Replace Wacken year checkboxes with pill grid (2005–2026) |
| **11.C** | New badge conditions: `wacken_years_count_min`, `wacken_attended_in_year` |
| **11.D** | Camping arrival day (`wacken_arrival_day` in user metadata) + `wacken_arrived_before` badge condition; `early-bird` badge |
| **11.E** | Godlike-assigned joke badges: `special_badges text[]` column, `assigned` condition, `assign-badge` Edge Function, assignment modal in Profile admin |
| **11.F** | Conflict severity split: soft ≤15 min / hard >15 min; 3-conflict warning banner on MyPicksPage |
| **11.G** | Collapsible day sections in `/my-picks`; 7 new badges + translations |
| **11.H** | Location presence badges + after-hour time badge conditions |
| **post-11** | 4 music-style badges: alestorm, mosh-pit, party-metal, crowdsurfer |

---

### Phase 12 — Crew Arrival Map
**Status:** ✅ Complete
**Sub-phases:**

| Sub-phase | Deliverable |
|---|---|
| **12.A** | Migrated `wacken_arrival_day` to `public.users` column; `EditProfileForm` writes to both places; `syncCrew()` expanded |
| **12.B** | Built `<ArrivalMap />`: bar-row-per-day layout with avatar clusters + name chips; 4px accent strips (teal/red/amber); time-aware auto-minimize |
| **12.C** | Integrated `<ArrivalMap>` on `/announcements` above announcements list |
| **12.D** | Localized arrival map strings for all 4 languages (br/en/es/de) with localized day labels |

---

### Phase 13 — Wiki: User Flows
**Status:** ✅ Complete
**Deliverables:**
- `flows/announcements.md` — Post lifecycle: online immediate, realtime from others, offline queue, reconnect flush, soft-delete, moderation RLS
- `flows/live-now.md` — BandTime logic, current/next band selection, `useNow()` time-shift override, conflict severity (soft/hard), crew counts
- `flows/offline-pick-sync.md` — Queue store structure (13 object stores), dedup by (user_id, band_id), keepLast semantics, worked example (T=0:10→T=0:30), error recovery, SyncToast
- `flows/authentication.md` — Signup trigger → users table, custom IndexedDB session adapter, test user metadata, godlike role assignment, RLS per-table enforcement

---

### Phase 14 — Wiki: Architectural Decisions
**Status:** ✅ Complete
**Deliverables:**
- `decisions/supabase-as-sync-target.md` — Why Supabase (Auth + DB + Realtime), alternatives considered, cost/vendor tradeoffs, eventual consistency accepted
- `decisions/custom-hooks-events-no-redux.md` — Why window events + custom hooks over Zustand/Redux; simplicity, bundle size, when NOT to use
- `decisions/workbox-caching-strategy.md` — NetworkFirst for API, CacheFirst for assets, cache invalidation via version bump, offline resilience

---

### Phase 15 — Wiki: Glossary Expansion & Index
**Status:** ✅ Complete
**Deliverables:**
- Glossary expanded to 140+ terms (was ~100); covers deduplication, soft-delete, time-shift, NetworkFirst, offline queue, godlike, and all terms introduced in Phases 13–14
- `index.md` updated: lists all 19 wiki documents, organised with reading paths for first-time engineer / badge developer / offline expert

---

### Phase 16 — Schedule Sort Order Filter
**Status:** ✅ Complete
**Deliverables:**
- `sortOrder: 'time-asc' | 'time-desc' | 'alpha'` field added to `BandFilterValue` and `EMPTY_FILTERS` (`src/components/bandFilterValue.ts`)
- Sort logic moved into `filterBands()` in `src/services/bandFilter.ts` as a final step; secondary sort by `name` for stable ordering on identical `start_time`
- `scheduleFilterStorage.ts` persists and restores `sortOrder`; falls back to `'time-asc'` on invalid/missing stored value
- 3 new icons added to `src/components/icons/Icon.tsx`: `sort-time-asc` (clock + sun), `sort-time-desc` (clock + crescent moon), `sort-alpha` (A/Z + arrow)
- Day tabs row restructured to flex in `BandFilters.tsx`; sort button (36×36px, accent dot on non-default) + upward-anchored icon-only popover added
- `BandFilters.module.css` — `.dayTabsRow`, `.sortWrapper`, `.sortBtn`, `.sortBtnActive`, `.sortDot`, `.sortPopover`, `.sortOption`, `.sortOptionActive` styles
- Hardcoded `.sort()` removed from `SchedulePage.tsx` `loadBands()` callback
- 4 i18n keys (`sortLabel`, `sortTimeAsc`, `sortTimeDesc`, `sortAlpha`) added to all 4 locale files
- `clearAll()` preserves `sortOrder` (sort is a display preference, not a filter)

---
