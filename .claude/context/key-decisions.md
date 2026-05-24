<!-- Purpose: Quick-reference table of key technical decisions. Load on demand when reasoning about why the stack is what it is. Full ADRs (context, rationale, alternatives) → docs/ai-wiki/decisions/. -->

## Key technical decisions

| Decision | Choice | Reason | ADR |
|---|---|---|---|
| App type | PWA only (no native, no App Store) | Vira-latas group is ~20 people; "Add to Home Screen" avoids store friction and dev-account fees | `pwa-not-native.md` |
| Primary store | IndexedDB via `idb` library | Structured, async, survives browser close; UI reads must work fully offline at Wacken | `indexeddb-primary-store.md` |
| Sync target | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) | One hosted service covers auth, DB, realtime broadcast, and server-side Claude calls — no multi-vendor orchestration | `supabase-as-sync-target.md` |
| State management | Custom hooks + `viralatas:*` window events | IndexedDB is source of truth; events let repositories notify components without a global store (no Redux, no Zustand, no Context for data) | `custom-hooks-events-no-redux.md` |
| Service-worker caching | NetworkFirst (Supabase API) · CacheFirst (band images & app shell) · precache app shell with content-hash filenames | Fresh API data when online, instant offline fallback; images are immutable per season; app shell must boot offline | `workbox-caching-strategy.md` |
| LLM delivery | Proactive only (Edge Function pushes alerts) | At a festival, no one is typing into chat — alerts must arrive without user input | — |
| Claude context | Full vira-latas picks + full schedule every call | Vira-latas group is tiny, payload is negligible, and recency beats incremental context | — |
| Alert language | Brazilian Portuguese, max 2 sentences, ends with 🤘 | Viralatas group is BR-first, not a global product | see `llm-alerts.md` |
| Role hierarchy | `normal` / `manager` / `godlike` | 3-tier allows moderation (announcement deletes, block) without giving everyone admin powers; `godlike` is hard-coded to `sfilizzola@gmail.com` in `handle_new_user()` | — |
| Band genres | 13 canonical labels (in-place rename) | ~93 Wacken subgenre strings made mobile genre filter unusable; no `genreGroup` column — rename `genre` only, deploy via `seed:bands:sync` | `genre-collapse-canonical-labels.md` |

**Hard constraints derived from these decisions (do NOT break):**
- No React Native / Capacitor / Expo — PWA only.
- No direct Supabase reads from components — go through repositories that read IndexedDB.
- `ANTHROPIC_API_KEY` never touches the client — all Claude calls live in Edge Functions.

**Full architectural decision records** → `docs/ai-wiki/decisions/`
