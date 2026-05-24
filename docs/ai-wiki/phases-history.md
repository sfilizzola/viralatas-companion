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

### Phase 17 — My Picks: Saw / Didn't See Sections
**Status:** ✅ Complete
**Deliverables:**
- `hidePick?: boolean` prop added to `BandCard` — suppresses the star button (controlled by `variant !== 'ranked' && !hidePick`)
- `hidePick?: boolean` prop added to `BandDetailModal` — hides the pick/unpick action button when `true`; saw/missed toggle is unaffected
- `MyPicksPage` grouping refactored: `myBands` split into `upcomingBands` (end_time ≥ now) and `endedBands` (end_time < now); `endedBands` further split into `sawBands` / `didntSeeBands` via per-user `missedBandIds` from `allMissed`
- `grouped` now derives from `upcomingBands`; ended bands no longer appear in day sections
- Two new collapsible sections rendered at the bottom of the list: "Saw" (green `--signal-ok` border) and "Didn't See" (amber `--signal-warn` border); each hidden when empty
- `.dayHeaderSaw` and `.dayHeaderDidntSee` CSS modifier classes added to `SchedulePage.module.css`
- `sectionSaw` and `sectionDidntSee` i18n keys (with `{count}` interpolation) added to all 4 locale files (`br`, `en`, `de`, `es`)
- `BandDetailModal` in `MyPicksPage` receives `hidePick={isBandEnded}` so the pick/unpick button disappears once a band has ended

---

### Phase 18 — Badge Preview Tool in Godlike Menu
**Status:** ✅ Complete
**Deliverables:**
- `src/components/profile/TestBadgeSection.tsx` — new self-contained component; renders scrollable grid of all badges from `BADGES` registry; manages local `selectedBadge: BadgeConfig | null` state; opens a detail modal with badge image, optional year chip, translated title, and description; zero persistence, zero network calls
- `src/components/profile/GodlikeAdminPanel.module.css` — new CSS module with `.testBadgeGrid`, `.testBadgeCell`, `.testBadgeCaption` (grid) and full set of `.testBadgeModal*` classes (modal detail) mirroring `BadgesDisplay.module.css` visual pattern
- `GodlikeAdminPanel.tsx` — imports and mounts `<TestBadgeSection t={t} />` after `<TimeTravelSection />`, before the registered users list

---

## Phase 19 — Closing Ceremony Slot

**Completed:** 2026-05-15

**Goal:** Model the Wacken closing ceremony as a first-class pickable timetable entry — visible across `/schedule`, `/now`, and `/my-picks` with a distinctive gold border and "Closing Ceremony" label, excluded from `/popular`, excluded from all music-badge counts, and generating no conflict alerts when overlapping a band pick.

**Deliverables:**
- `supabase/migrations/20260514000000_idea7_band_category.sql` — `category text not null default 'band'` column + check constraint `('band','ceremony')` on `public.bands`
- `BandCategory = 'band' | 'ceremony'` union and `category` field on `Band` type in `src/types/index.ts`
- `category` field added to `BadgeBand` via `Pick<Band, ...>` in `src/services/badges/types.ts`
- `buildBadgeContext` in `src/services/badges/engine.ts` filters ceremony from `pickedBands` / `seenBands`; `bands_picked_min` condition changed to use `pickedBands.length` (consistent with all other `bands_picked_*` conditions)
- `computeBandOverlaps` in `src/hooks/useBandConflicts.ts` skips ceremony entries — no conflict chip ever shown
- `.cardCeremony` + `.ceremonyLabel` CSS in `src/components/BandCard.module.css`; ceremony rendering logic in `src/components/BandCard.tsx` (gold color, `✦ Closing Ceremony` chip replacing stage chip)
- `popularBands` filter in `src/pages/PopularPage.tsx` excludes `category === 'ceremony'`
- `scheduleClosingCeremony` i18n key in all 4 locale files (`SchedulePage_br/en/de/es.json`)
- `Farewell & Announcements` ceremony seed entry in `supabase/seed/bands.ts` at Faster stage, slot FAS17 (22:30–23:00 Day 4 Saturday Aug 1)
- Phase 19 ceremony badge regression suite (12 tests) in `src/__tests__/badges.test.ts`; `band()` helper updated with `category: 'band'` default; new `ceremonyBand()` helper

---

### Phase 20 — The Duck 🦆
**Status:** ✅ Complete

**Goal:** Add a social rubber-duck quack button to live band cards. When a user who has picked a band presses the duck during the live set, a floating duck notification is broadcast to all other pickers — in-app via Supabase Realtime (DuckToast) and as a Web Push system notification for background/closed-app users. 90-second per-user per-band cooldown shown as a conic-gradient drain animation. Offline presses are queued and flushed on reconnect.

**Deliverables:**
- `supabase/migrations/20260515000002_phase20_duck.sql` — `duck_quacks` (Realtime-enabled, RLS INSERT own / SELECT all) + `push_subscriptions` (RLS INSERT/DELETE/SELECT own) tables
- `src/lib/db.ts` — `offline_duck_quacks` IDB store (DB version 8→9); `OfflineDuckQuackOp` type + helpers
- `src/lib/pushSubscription.ts` — `subscribeToPush(userId)`: Notification permission + PushSubscription registration + Supabase upsert
- `src/workers/sw.ts` — custom SW (injectManifest): Workbox precache + NetworkFirst (Supabase) + CacheFirst (Wacken images) + `push` + `notificationclick` handlers
- `vite.config.ts` — switched from `generateSW` → `injectManifest` strategy
- `src/repositories/duck.ts` — `quackBand` (online/offline) + `flushOfflineDucks`; exported from `src/repositories/index.ts`
- `src/hooks/useDuckQuack.ts` — 90s localStorage cooldown; returns `{ quack, isOnCooldown, cooldownUntil }`
- `src/hooks/useDuckNotifications.ts` — Realtime listener on `duck_quacks` INSERT; dispatches `viralatas:duck-quack` CustomEvent
- `src/components/DuckButton.tsx` + `DuckButton.module.css` — circular duck PNG button; conic-gradient drain overlay (elapsed CW sweep); pop animation
- `src/components/DuckToast.tsx` + `DuckToast.module.css` — global floating toast; listens to `viralatas:duck-quack`; resolves band name from IndexedDB; animated entrance/exit; 3s auto-dismiss
- `src/i18n/DuckButton_{br,en,de,es}.json` — i18n namespace for duck UI labels; registered in `src/lib/i18n.ts`
- `src/components/BandCard.tsx` + `BandCard.module.css` — `onDuck?`/`duckCooldownUntil?` props; `.withDuck` CSS grid variant
- `src/components/now/CrewGroupsSection.tsx` — `onDuck?`/`duckCooldownUntil?` props; DuckButton in `.groupActions` on user's live band group
- `src/hooks/useNowData.ts` — `useDuckQuack(userId, duckBandId)`; exposes `duckBandId`, `duckQuack`, `duckCooldownUntil`
- `src/pages/RightNowPage.tsx` — passes duck props to `CrewGroupsSection`
- `src/pages/SchedulePage.tsx` — `DuckableBandCard` wrapper (hook per band, null when not applicable)
- `src/App.tsx` — mounts `DuckSync`, `PushSetup`, `DuckNotificationsListener`, `DuckToast`
- `supabase/functions/send-duck-push/index.ts` — Edge Function for Web Push via `npm:web-push`; triggered by Supabase Database Webhook on `duck_quacks` INSERT
- `public/Design System.html` §11 — pre-authored DuckButton states (ready/cooldown drain at 10/50/85%), DuckToast entrance/exit, live card simulation with 8 crew + "I am weak" + duck button

**Post-phase additions (2026-05-16):**
- `supabase/functions/send-test-push/index.ts` — diagnostic Edge Function for godlike admins; authenticates caller, looks up their `push_subscriptions`, sends a real VAPID push directly to their own device; allows end-to-end push stack verification without needing a second user
- `src/components/profile/GodlikeAdminPanel.tsx` — "📲 Test Push Notification" button calling `send-test-push`; inline feedback for success, no-subscription, and failure states
- `docs/ai-wiki/flows/duck.md` — full flow document (was missing after Phase 20 closed)

---

### Phase 21 — Duck Killswitch 🦆🔌
**Status:** ✅ Complete

**Goal:** Global on/off switch for the Duck feature, managed from Godlike Powers → Duck feature. When OFF, the rubber-duck button does not render anywhere — `/now`, `/schedule`, and any future `BandCard` instance are all duck-free. When ON, behavior is identical to Phase 20. The Godlike "Test Quack" diagnostic tile remains visible regardless of switch state (admin escape hatch) and surfaces a "currently disabled for users" hint when the feature is off.

**Architectural shape:** Single boolean column on the existing `app_settings` table (same pattern as `registration_enabled`). Fetched once at app boot via `getDuckEnabled()`, cached in a small `DuckEnabledProvider` Context, consumed by `useDuckEnabled()` at three gate-points. Server-side (Edge Function, `duck_quacks` INSERT, Realtime subscription) is untouched on purpose: offline-queued ducks still flush and broadcast on reconnect, respecting the user's intent at press time. The killswitch is a "future button visibility" gate, not a data block.

**Deliverables:**
- `supabase/migrations/20260517000000_app_settings_duck_enabled.sql` — adds `duck_enabled boolean default true not null` to `public.app_settings`; inherits existing RLS (anyone reads, only godlike updates); no Realtime publication change
- `src/lib/supabase.types.ts` — `app_settings` Row/Insert/Update types extended with the new column
- `src/lib/appSettings.ts` — `getDuckEnabled()` and `setDuckEnabled()` helpers mirroring the registration killswitch shape; both default to `true` on read failure (offline-first principle)
- `src/contexts/DuckEnabledContext.tsx` — `DuckEnabledProvider` + `useDuckEnabled()` + `useRefreshDuckEnabled()`; Context value memoized; defaults to `true` while loading so users never see a "missing duck button" flash
- `src/App.tsx` — app tree wrapped in `<DuckEnabledProvider>`
- `src/pages/RightNowPage.tsx` — `onDuck` passed to `CrewGroupsSection` only when `duckEnabled && duckBandId`
- `src/pages/SchedulePage.tsx` — `DuckableBandCard.canDuck` short-circuits when `duckEnabled` is `false`
- `src/components/profile/GodlikeAdminPanel.tsx` — new "Duck feature 🦆" toggle section mirroring the existing "Control registration" UI (button + 🟢/🔴 status dot, identical styling); calls `useRefreshDuckEnabled()` after a successful toggle so the admin's own session reflects the change immediately; existing Test Quack tile now shows a `testQuackDisabledHint` line above the `DuckButton` when the feature is OFF
- `src/i18n/ProfilePage_{br,en,es,de}.json` — 7 new keys: `duckToggle`, `duckToggleDescription`, `duckEnabled`, `duckDisabled`, `duckLoading`, `duckToggleError`, `testQuackDisabledHint`
- `public/Design System.html` — BandCard component-section now documents the killswitch visibility rule and where the toggle lives
- `docs/ai-wiki/flows/duck.md` — new "Killswitch (Phase 21)" section; "Relevant Source Files" table extended with `DuckEnabledContext.tsx` and `appSettings.ts`
- `docs/ai-wiki/supabase-schema.md` — new `public.app_settings` table section documenting both `registration_enabled` and `duck_enabled` (this filled a pre-existing gap — `app_settings` had been missing from the schema doc since the registration killswitch shipped)
- `src/__tests__/duckKillswitch.test.tsx` — 12 new tests covering `getDuckEnabled` (true/false/error/throws/null defaults), `setDuckEnabled` (happy path, row-lookup failure, update failure), and `DuckEnabledProvider` (initial true, initial false, network failure stays true, `refresh()` picks up a toggle within the same session)

**Architectural notes:**
- The killswitch is a UI-layer gate, not a server-side block. `send-duck-push`, the `duck_quacks` INSERT path, and `useDuckNotifications` Realtime subscription are all untouched. Offline-queued ducks still flush and broadcast on reconnect even if the switch was flipped to OFF in the meantime — this respects the user's intent at press time and preserves the offline-first contract.
- **Next-load propagation only.** No Realtime subscription on `app_settings`; mid-session users won't see the change until reload. The admin's own session is the exception: a successful toggle triggers `useRefreshDuckEnabled()` so the cached Context value updates immediately (so the Test Quack hint appears/disappears in real time within the admin panel).
- The Test Quack tile is the **only non-gated duck render**. It uses a local-only window event (no DB write, no other user affected), so leaving it functional during killswitch=off is safe.
- `useDuckEnabled` defaults to `true` while loading so users never see a flash of missing duck button on a slow first paint.

---

### Phase 22 — Playlist Launch
**Status:** ✅ Complete

**Goal:** Add a "Generate setlist" strip to `/my-picks` that deep-links the user to **Setlist Vira-Latas** (`setlist.viralatas.org`) with their picked band names pre-filled. The external app shows a track preview; the user taps "Generate" and lands in Spotify with their personal playlist. Shipped behind a feature flag so the godlike can test with managers before releasing to all vira-latas.

**Deliverables:**
- `supabase/migrations/20260522000000_playlist_testing.sql` — adds `playlist_testing boolean DEFAULT true NOT NULL` to `public.app_settings`; inherits existing RLS (anyone reads, only godlike updates)
- `src/lib/supabase.types.ts` — `app_settings` Row/Insert/Update types extended with `playlist_testing`
- `src/lib/appSettings.ts` — `getPlaylistTesting()` + `setPlaylistTesting()` helpers (duck pattern)
- `src/components/PlaylistLaunchButton.tsx` — self-contained component: reads `playlist_testing`, user role, and `preferred_language` on mount; hidden when 0 picks; hidden to `normal` role when `playlist_testing = true`; builds `/launch` URL via `URLSearchParams` with repeated `bands` params, `user_name` trimmed to 20 chars, `lang` mapped (`br` → `pt-BR`, else `en`); renders as `<a target="_blank">`
- `src/components/PlaylistLaunchButton.module.css` — full-width teal strip using design-system tokens only
- `src/pages/MyPicksPage.tsx` — `<PlaylistLaunchButton bands={myBands} userName={displayName} />` below conflict banner, above band sections
- `src/components/profile/GodlikeAdminPanel.tsx` — new "Playlist feature" toggle section in Godlike Powers, mirroring the duck toggle pattern
- `src/i18n/MyPicksPage_{br,en,es,de}.json` — `generateSetlist` + `generateSetlistSub` keys
- `src/i18n/ProfilePage_{br,en,es,de}.json` — `playlistToggle`, `playlistTesting`, `playlistLive`, `playlistToggleError` keys
- `public/Design System.html` — `PlaylistLaunchButton` documented in a new component section

**Part 2 (integration, no code changes):** Deep-link confirmed working end-to-end — opens `setlist.viralatas.org` with correct `user_name`, all picked band names, and `lang`; track preview loads; "Generate" lands in Spotify with the user's personal playlist.

**Acceptance criteria (all met):**
- [x] Godlike and manager see the strip on `/my-picks` when `playlist_testing = true`
- [x] Normal users hidden while `playlist_testing = true`
- [x] Godlike flips flag to `false` → all users see strip on next load
- [x] URL carries correct `user_name`, band list, and `lang`
- [x] Strip hidden when user has 0 picks
- [x] Build and tests green
- [x] End-to-end: Setlist preview + Spotify playlist generation confirmed

**Wiki:** `docs/ai-wiki/flows/playlist-launch.md` · App Pack section in `architecture.md`

**Architectural notes:**
- `PlaylistLaunchButton` reads `playlist_testing` directly from Supabase on mount (not cached in IndexedDB). This is intentional — the flag is low-frequency and the button is purely a convenience deep-link out of the app; offline-first treatment is unnecessary.
- The flag graduation path (when `playlist_testing` is removed) requires only deleting the flag column, the role-check logic inside the component, and the admin toggle — the component itself stays permanently.

---

### Phase 23 — MoshSplit Balance Section
**Status:** ✅ Complete

**Goal:** Add a self-contained collapsible `MoshSplitSection` component to the Profile page showing the user's net balance from **MoshSplit** (`split.viralatas.org`) — the festival finance app used by the vira-latas at Wacken. Shipped in two parts: Part 1 (mocked UI for approval), Part 2 (real API connection).

**Deliverables:**
- `src/components/profile/MoshSplitSection.tsx` — self-contained component accepting only `userEmail: string`; fetches `POST /v1/balances/external-summary` via same-origin proxy; five render states: `loading` (spinner in trigger), `not_found` (returns null), `settled` (balance = 0, teal "Quitado" chip), `active` (nonzero balance, red chip if owes / teal if owed), `error` (orange `!` chip + warning message, CTA still visible)
- `src/components/profile/MoshSplitSection.module.css` — collapsible card styles using existing design-system tokens only (`--bg-elevated`, `--border`, `--signal-ok`, `--accent`, `--font-display`, `--font-mono`, `--s-*`, `--r-*`); no new custom properties
- `src/pages/ProfilePage.tsx` — `<MoshSplitSection userEmail={user.email ?? ''} />` inserted after `<ConflictSection>`, before `<EditProfileForm>`
- `vercel.json` — `/api/moshsplit/:path*` → `https://split.viralatas.org/:path*` rewrite added before SPA catch-all; solves CORS (browser never contacts `split.viralatas.org` directly)
- `vite.config.ts` — `server.proxy` mirrors the Vercel rewrite for local development
- `README.md` — `VITE_MOSHSPLIT_TOKEN` documented in Environment Setup section
- `public/Design System.html` — `MoshSplitSection` documented in the profile components section
- `docs/ai-wiki/flows/moshsplit.md` — new wiki page covering component states, API contract, proxy architecture, and data flow
- `docs/ai-wiki/architecture.md` — App Pack section extended with MoshSplit integration
- **Hotfixes shipped during phase:** fix horizontal scroll on iOS mobile (`SchedulePage.module.css`), fix offline gap for godlike-assigned badges (`BadgesDisplay.tsx` two-phase loading with skeleton), hide `PlaylistLaunchButton` once the festival starts

**Acceptance criteria (all met):**
- [x] Real balance loaded from `POST /v1/balances/external-summary` using user email + `VITE_MOSHSPLIT_TOKEN`
- [x] `404` response → `not_found` state (component invisible)
- [x] Network / `4xx` error → error state (warning message visible, CTA still available)
- [x] Amounts displayed in EUR converted from cents (`total_balance_cents / 100`)
- [x] CTA "Abrir MoshSplit →" opens `https://split.viralatas.org` in new tab
- [x] `VITE_MOSHSPLIT_TOKEN` documented in README env var section
- [x] Build passes, no linter errors; all 416 tests green

**Architectural notes:**
- The component talks to MoshSplit exclusively through a same-origin Vercel proxy (`/api/moshsplit/*`), mirrored by a Vite dev proxy. This keeps the API token server-side and avoids CORS entirely without a dedicated Edge Function.
- `MoshSplitSection` is deliberately NOT offline-first: balance data is financial and time-sensitive; showing stale cached amounts would be misleading. If offline, the component stays in the `loading` state (spinner) and shows no balance — same as a network error, but without the error message since the user is simply offline.
- `BadgesDisplay` was refactored to two-phase loading during this phase: Phase 1 reads from IndexedDB immediately (fast, offline-safe); Phase 2 fetches `special_badges`/`is_friend` from Supabase in the background with a skeleton pulse animation.

---

### Phase 24 — Non-Destructive Lineup Sync
**Status:** ✅ Complete

**Goal:** Replace destructive `seed:bands` as the default path for lineup edits. Stable `slot_id` identity on every band row; `seed:bands:sync` applies name/time/genre/image changes without wiping `user_picks`.

**Deliverables:**
- `supabase/migrations/20260524000000_bands_slot_id_add.sql` — NULLable `slot_id` + index
- `supabase/migrations/20260524000001_bands_slot_id_lock.sql` — NOT NULL + UNIQUE; drops composite `UNIQUE(stage, start_time, name)`
- `supabase/seed/bands.ts` — `slot_id` on all 187 rows; `assertSeedIntegrity()`; destructive banner points at sync
- `supabase/seed/bands-sync.ts` + `npm run seed:bands:sync` — dry-run default; `--apply` UPDATE/INSERT/DELETE by `slot_id`; bumps `cache_version`; timestamptz-normalized diff
- `supabase/seed/bands-move.ts` + `npm run seed:bands:move` — pick transfer when band relocates slot
- `supabase/seed/bands-backfill-slot-id.ts` — non-destructive `slot_id` bootstrap (UPDATE only; picks preserved)
- `supabase/seed/seed-shared.ts` — shared env loader, service client, cache bump
- `src/types/index.ts` — `Band.slot_id: string` required
- Wiki: `lineup-sync.md`, `lineup.md`, `supabase-schema.md`, `festival-reset.md`, `index.md`; `.claude/context/production-database.md`

**Acceptance criteria (all met):**
- [x] Every band row has unique `slot_id` in DB and `bands.ts` (187 / 187 verified on prod)
- [x] `seed:bands:sync` dry-run exits 0 with empty plan on aligned DB
- [x] One-field change → 1-row UPDATE; `--apply` preserves `user_picks` count (Lovebites FAS1 genre test on prod)
- [x] `cache_version` bumps on `--apply`
- [x] Destructive `seed:bands` banner warns to use sync for small edits
- [x] Build + tests green; wiki + changelog updated

**Wiki:** `docs/ai-wiki/lineup-sync.md` · design `docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md`

**Architectural notes:**
- `slot_id` is canonical DB identity; UI keeps using `band.id` for FKs. Client unchanged except type field.
- Bootstrap path: migration add → `seed:bands:backfill-slot-id -- --apply` → migration lock. **Not** destructive seed (no PITR on this Supabase plan).
- Agents must never run destructive seed/reset on prod without explicit operator confirmation (see `production-database.md`).

---
