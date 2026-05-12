# Wiki Changelog

All modifications to the AI-readable architectural wiki, discoveries, and corrections are recorded here.

---

## 2026-05-12 (Password Recovery Flow)

### Added
- `src/pages/ResetPasswordPage.tsx` — New public page at `/reset-password`; listens for Supabase `PASSWORD_RECOVERY` auth event; two password fields (new + confirm) with mismatch validation; calls `supabase.auth.updateUser({ password })` on submit; navigates to `/now` on success; falls back to `getSession()` on page refresh
- i18n keys for forgot-password and reset-password in all 4 languages (`AuthPage_br.json`, `AuthPage_en.json`, `AuthPage_es.json`, `AuthPage_de.json`): `forgotPassword`, `forgotPasswordConfirm`, `sendResetLink`, `sendingResetLink`, `resetLinkSent`, `cancelAction`, `resetPasswordTitle`, `resetPasswordSubtitle`, `newPassword`, `confirmPassword`, `passwordsDoNotMatch`, `resetPasswordAction`, `resetPasswordLoading`, `resetPasswordSuccess`, `resetPasswordNoSession`

### Changed
- `src/pages/LoginPage.tsx` — Added "Forgot password?" link below login form; clicking it reveals an inline 3-step panel: `idle` → `confirm` (email input + Are you sure?) → `sent` (green confirmation); calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: ${origin}/reset-password`
- `src/pages/AuthPage.module.css` — Added `.linkButton`, `.forgotBox`, `.forgotQuestion`, `.forgotActions`, `.buttonSecondary`, `.forgotSent` classes for the forgot-password panel and success state
- `src/App.tsx` — Added public `/reset-password` route (no `PrivateRoute` wrapper)
- `docs/ai-wiki/flows/authentication.md` — Added "Flow: Password Recovery" section (full timeline, Supabase token mechanics, Cassio in-joke note, localization key list); updated Triggers (3 entries), Relevant Source Files (added `ResetPasswordPage.tsx`, i18n files), `onAuthStateChange` events (added `PASSWORD_RECOVERY`), Route Guards (documented public routes), Known Limitations (removed stale "no password reset UI" item, added recovery-link single-use caveat)

### Architectural Notes
- `/reset-password` must be a **public route** — the user arrives unauthenticated from the email link; `PrivateRoute` would redirect them to `/login` before the recovery session is established
- The `PASSWORD_RECOVERY` `onAuthStateChange` event fires only once per tab (when the URL hash token is first exchanged); the `getSession()` fallback handles page refreshes
- "Cassio" is intentionally hard-coded in all 4 language files as a permanent in-joke and must never be replaced with a generic placeholder
- No schema changes required — Supabase manages the recovery token entirely server-side

---

## 2026-05-12 (Phases 13–15: Wiki Documentation Roadmap)

### Added (User Flows — Phase 13)
- **flows/offline-pick-sync.md** (13.C) — Complete queue mechanics: 13-store IDB structure, `OfflinePickOp` shape, online happy path, offline behavior with PendingChip, keepLast dedup algorithm, worked example (5 toggles T=0:10–T=0:30 → 1 Supabase call), sync trigger (login + 'online' event), error recovery table, realtime catch-up after reconnect, 5 edge cases (mid-write offline, concurrent sessions, deleted band, partial flush, large queue), known limitations (no enqueue-time dedup, no backoff, no TTL, `navigator.onLine` unreliability)
- **flows/authentication.md** (13.D) — Login/signup flows, custom IndexedDB auth storage adapter (`getItem`/`setItem`/`removeItem` via `loadSession`/`saveSession`), `handle_new_user()` trigger details and `coalesce()` fix, `useAuth()` lifecycle, session persistence scenarios (PWA open offline, token expiry, concurrent sessions), route guards (`PrivateRoute`), registration gate, test user creation, RLS policy table, offline scenarios, known limitations (no email verification, no password reset, hard-coded godlike email)

### Added (ADRs — Phase 14)
- **decisions/supabase-as-sync-target.md** (14.A) — Decision to use Supabase for auth + DB + realtime + edge functions; alternatives rejected (Firebase NoSQL mismatch, custom Node infra cost, PocketBase no hosted tier, CouchDB no auth); tradeoffs accepted (vendor lock-in, trigger complexity, RLS debugging)
- **decisions/custom-hooks-events-no-redux.md** (14.B) — Decision to use custom hooks + window events instead of Redux/Zustand/Context; rationale (IDB as source of truth requires out-of-React mutation notification); hook lifecycle pattern; when NOT to use (multi-step forms, complex derived state); tradeoffs (no time-travel debugging, no cross-tab sync)
- **decisions/workbox-caching-strategy.md** (14.C) — NetworkFirst for Supabase (24h cache, freshness priority), CacheFirst for Wacken band images (30-day TTL, opaque CORS caching with `statuses: [0, 200]`), precaching for app shell (versioned filenames, `autoUpdate`, `skipWaiting`+`clientsClaim`); alternatives considered; cache invalidation mechanics

### Changed (Glossary — Phase 15.A)
- **glossary.md** expanded from ~100 to 140+ terms: added 40+ new terms covering offline pick lifecycle, keepLast semantics, opaque responses, precache, NetworkFirst, CacheFirst, StaleWhileRevalidate, cache TTL, Service Worker lifecycle, autoUpdate, clientsClaim, content hash, flushPending, draft announcement, server-assigned ID, JWT, refresh token, custom auth storage adapter, handle_new_user trigger, coalesce() fix, security definer, auth state events, LivePlan status, applyLiveBandTestOverride, CrewLiveGroup, Metal Place Window, validateAndAutoCheckout, soft/hard conflict, 3-conflict banner, vendor lock-in, set_user_role RPC, wipeAllLocalData, CacheVersionCheck, emitSyncComplete, graceful degradation, reading path

### Changed (Index — Phase 15.B)
- **index.md** updated: Quick Navigation now lists all 19 wiki documents (11 core + 1 badges + 5 flows + 5 decisions); added "Architectural Decisions" section; 7 reading paths by role (First-Time Engineer, Badge Developer, Offline Expert, Auth & User Management, Announcements/Moderation, Architecture Decision Context, Live Now Page); `Recommended Reading Order` section replaced by detailed `Reading Paths`; `Last Edited` updated to 2026-05-12

### Architectural Notes
- `offline_picks` queue entry `id` format is `${userId}:${bandId}:<crypto-uuid>` — unique even for repeated same-band toggles
- `flushPending()` for announcements replaces draft IDs (crypto.randomUUID client-side) with server-assigned IDs on successful flush
- `handle_new_user()` uses `ON CONFLICT DO UPDATE` to handle re-run (e.g., test user recreation) without overwriting existing roles (except for godlike email)
- Service Worker `CacheFirst` for cross-origin images requires `cacheableResponse: { statuses: [0, 200] }` to cache opaque CORS responses
- Reading paths provide role-based navigation into the wiki, reducing onboarding time from 2–3 days to 30 min–3 hours

---

## 2026-05-11 (Badge Asset Wiring)

### Added
- Wired five badge assets into `BADGES`: `bbq-king-2026`, `dreamer`, `jagger-king`, `live-beast`, and `total-kaput-2026`.
- Added badge localization keys for Brazilian Portuguese, English, Spanish, and German.

### Changed
- Updated the badge inventory to 28 active badges and documented `dreamer` as a persisted 30-pick milestone.
- Updated the `dreamer` badge display copy to use the "I'm Tripping" / "Tô doidão" concept across locales.
- Removed the unused `badge_camping_mob.png` test asset from the active badge asset folder.

### Architectural Notes
- `dreamer` uses the existing `persist: true` badge mechanism so it remains earned after the user later changes picks.
- The new honor badges use the existing `assigned` condition and godlike assignment flow.

## 2026-05-11 (Phase 13.B)

### Added (User Flows)
- **flows/live-now.md** — Live band display: time model (festival-local CEST), current/next band selection algorithm, conflict severity (hard >15min / soft ≤15min), crew grouping (by band → camping → metal place → lost), presence states (camping, metal place time window, auto-checkout), godlike test mode (splice virtual band at now), realtime presence updates (~3s), edge cases (band ends at now, multiple picks both current, timezone wrapping, stale offline state), performance memoization, known limitations (hard-coded CEST, no auto-seen tracking), future improvements

---

## 2026-05-11 (Phase 13.A)

### Added (User Flows)
- **flows/announcements.md** — Complete post lifecycle: happy path (online), offline queueing & flushing, realtime propagation to other users, soft-delete with RLS enforcement, moderation (manager/godlike), edge cases (post-delete race, blocked posters, flaky network, retry idempotency), known issues (blocked poster RLS missing, no dedup on retry), future improvements

---

## 2026-05-11 (Continued)

### Added (Features & Systems)
- **badges.md** — Badge system: 22+ condition types (Wacken history, profile, arrival, band picks/seen, location, assigned), current 30 badges, step-by-step guide to add new badges, localization (4 languages), testing patterns, edge cases, persist vs. conditional badge semantics

### Architectural Discoveries
- IndexedDB has 13 object stores (data + queues + config)
- Queue stores are separate from data stores (offline_picks distinct from user_picks)
- Deduplication groups by (user_id, band_id) and keeps only last action
- Realtime subscriptions are per-hook and clean up on unmount
- Auth session persisted to IndexedDB via custom Supabase storage adapter
- Event emitters (window events) used instead of Redux/Context for state updates
- BandSync runs once on init, not re-run on reconnect (band list immutable)
- Cache version bump wiped all local data, used for lineup invalidation
- Each repository exposes a public interface with sync + queue flush methods
- Workbox caching strategy: NetworkFirst for Supabase, CacheFirst for band images

### Structure
- `/flows/` folder created for user flow documentation
- `/decisions/` folder created for architectural decision records
- Template established for flow documents (Purpose, Trigger, Happy Path, Offline Behavior, Sync Behavior, Source Files, Diagrams, Edge Cases)

---

## 2026-05-11 (Initial Session)

### Added (Core Architecture)
- **index.md** — Navigation hub, system diagram, architecture principles, reading order
- **architecture.md** — 4-layer design, data flows (online/offline/realtime), repositories, offline behavior, sync mechanisms
- **domain-model.md** — Entities (User, Band, UserPick, UserPresence, Announcement, etc.), relationships, business rules by role
- **offline-first.md** — Golden rule (IDB primary), queue design, deduplication mechanics, example lifetimes, guarantees per data type, Service Worker caching
- **sync-engine.md** — Sync orchestration (4 components), queue flush flow, realtime subscription flow, app init flow, key sync functions, error handling, monitoring
- **routes.md** — All 6 routes, page components, navigation flows (login → /now, browse → pick, post announcement), error handling per route
- **testing.md** — Unit/integration/offline testing, manual test scenarios (offline pick/announcement/dedup), testing offline behavior, badge/time logic tests
- **glossary.md** — 100+ terms: architecture, database, React, auth, data, sync, UI, time, badge, role, testing

---

---

**Last updated:** 2026-05-12
