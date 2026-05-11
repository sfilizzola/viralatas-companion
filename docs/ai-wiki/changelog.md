# Wiki Changelog

All modifications to the AI-readable architectural wiki, discoveries, and corrections are recorded here.

---

## 2026-05-11

### Added
- **index.md** — Navigation hub, system diagram, architecture principles, reading order
- **architecture.md** — 4-layer design, data flows (online/offline/realtime), repositories, offline behavior, sync mechanisms
- **domain-model.md** — Entities (User, Band, UserPick, UserPresence, Announcement, etc.), relationships, business rules by role
- **offline-first.md** — Golden rule (IDB primary), queue design, deduplication mechanics, example lifetimes, guarantees per data type, Service Worker caching
- **sync-engine.md** — Sync orchestration (4 components), queue flush flow, realtime subscription flow, app init flow, key sync functions, error handling, monitoring
- **routes.md** — All 6 routes, page components, navigation flows (login → /now, browse → pick, post announcement), error handling per route
- **testing.md** — Unit/integration/offline testing, manual test scenarios (offline pick/announcement/dedup), testing offline behavior, badge/time logic tests
- **glossary.md** — 100+ terms: architecture, database, React, auth, data, sync, UI, time, badge, role, testing

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

## Future

### TBD
- **decisions/indexeddb-primary-store.md** — Why IDB is primary (offline, persistence, structured), tradeoffs
- **decisions/supabase-as-sync-target.md** — Why Supabase (auth + DB + realtime), alternatives considered
- **decisions/pwa-not-native.md** — Why PWA only (no React Native), constraints
- **flows/pick-band.md** — Full lifecycle (online, offline, queue, realtime, dedup)
- **flows/offline-pick-sync.md** — Queue mechanics, reconnect behavior, error recovery
- **flows/live-now.md** — Time-based band display, conflicts, crew attendance
- **flows/announcements.md** — Post, realtime, soft-delete, moderation
- **flows/authentication.md** — Login, signup, session persistence, test users
- **supabase-schema.md** — All tables, columns, RLS policies, realtime setup, migrations

---

**Last updated:** 2026-05-11
