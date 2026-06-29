# Viralatas Metaleiros 🤘

Festival companion **PWA** for **vira-latas** at **Wacken Open Air 2026**.

Each vira-lata logs in, browses the lineup, picks bands, sees live attendance and who is going where, posts on the announcements mural, earns badges, and gets a private festival recap on `/wrap`. The app is **offline-first**: after the first sync, schedule and picks work with bad or no signal at the festival.

**Deep architecture** → [`docs/ai-wiki/`](docs/ai-wiki/) · **Agent rules** → [`CLAUDE.md`](CLAUDE.md)

---

## Features

### Core

- Email/password auth (Supabase) with roles: normal, manager, godlike.
- Full Wacken 2026 lineup in IndexedDB (8 stages × 4 days).
- **Lineup** (`/schedule`) — stage, day, time filters; genre guide; Metal Battle country flags on band cards.
- **My Wacken** (`/my-picks`) — picks grouped by festival day; inline Attended / Missed on ended sets.
- Optimistic picks: write locally first, sync to Supabase when online; offline queue flushes on reconnect.
- **Popular** (`/popular`) — sort by pick count or crew average rating.
- **Right now** (`/now`) — live / next band, vira-lata groups, camping & lost cards, upcoming-band banner, festival map entry.
- **Map** (`/map`) — live vira-lata positions on the festival minimap (from presence + picks, no extra schema).
- PWA service worker (app shell, assets, API caching).
- Dark UI only (metal app).

### Social & content

- **Announcements** (`/announcements`) — mural board; offline post queue; manager block list; godlike pin/delete.
- **The Duck** — quacks, push subscriptions, killswitch (godlike).
- **Metal Place** — festival-day check-in window on `/now`.
- Realtime updates for picks, announcements, presence, and config tables.

### Profile & festival extras

- Client-side **badge** engine (vest stack, history by year, godlike assign).
- **MoshSplit** balance section (optional `VITE_MOSHSPLIT_TOKEN`).
- **Band ratings** (1–5 after sets end) with sync and aggregates.
- **Festival wrap** (`/wrap`) — offline recap: stats, personality, chaos, crew, ratings, patches.
- i18n: Brazilian Portuguese, English, Spanish, German.

### Planned / partial

- **LLM proactive alerts** — types and queue stub only; Edge Function not wired to UI yet. See [`FUTURE_IDEAS.md`](FUTURE_IDEAS.md).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| PWA | vite-plugin-pwa, Workbox |
| Offline data | IndexedDB (`idb`), domain modules under `src/lib/db/` |
| Backend | Supabase Auth, PostgreSQL, Realtime |
| Edge | Supabase Edge Functions (Deno) — alerts, no API keys in client |
| Tests | Vitest, Testing Library, `fake-indexeddb` |
| Schema | `supabase/migrations/` |

---

## Project structure

```text
.
├── src/
│   ├── components/       # UI + sync/ (SyncOrchestration, BandSync, PickSync, …)
│   ├── pages/            # Route screens (Lineup, My Wacken, Now, Map, Wrap, …)
│   ├── hooks/            # Auth, picks, now data, badges, announcements, …
│   ├── repositories/     # Data access (IndexedDB-first)
│   ├── services/         # Domain logic (badges, live preview, wrap, ratings, …)
│   ├── lib/              # Supabase, db/, sync, realtime, i18n bootstrap
│   ├── workers/sw.ts     # Service worker
│   └── __tests__/        # Vitest unit/integration tests
├── supabase/
│   ├── migrations/       # Schema source of truth
│   ├── functions/        # Edge Functions
│   └── seed/             # Lineup and test-user scripts
├── public/               # DS (vira-lata-ds.html), badges, fonts, map assets
├── docs/ai-wiki/         # Architecture wiki (flows, decisions, schema)
├── CLAUDE.md             # Agent context and constraints
├── PHASES.md             # Active phase (if any) and completion checklist
└── FUTURE_IDEAS.md       # Backlog ideas
```

Local design scratch (gitignored): `docs/superpowers/{specs,plans,prototypes}/` — never committed.

---

## Requirements

- **Node.js 20+** recommended
- **npm**
- A **Supabase** project
- **Supabase CLI** for local migrations / `supabase functions serve` (optional but useful)

---

## Environment setup

```sh
cp .env.local.example .env.local
```

Client-safe values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Optional — MoshSplit balance on Profile (read-only external API):

```env
VITE_MOSHSPLIT_TOKEN=sat_...
```

Obtain from the MoshSplit admin at `split.viralatas.org`. Without it, the section shows an error but stays visible.

For **seed scripts** locally (never commit):

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Never commit `.env.local` or service role keys. Claude/Anthropic keys belong only in Edge Functions — not in `src/`.

---

## Run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

**Build & test:**

```sh
npm run build
npm test
```

---

## Database setup

Apply migrations to your Supabase project (CLI or dashboard). Full DDL, RLS, and Realtime tables → [`docs/ai-wiki/supabase-schema.md`](docs/ai-wiki/supabase-schema.md).

Core entities include `users`, `bands`, `user_picks`, `announcements`, `user_presence`, `user_band_ratings`, `user_badge_history`, duck/push tables, and config tables for Metal Place and live preview testing.

---

## Seed scripts

| Script | Purpose |
|--------|---------|
| `npm run lineup:check-official` | Fetch wacken.com running order, diff vs `docs/ai-wiki/lineup.md` (no writes). `--lineup` / `--complete` apply wiki + seed — see [lineup-official-source.md](docs/ai-wiki/lineup-official-source.md) |
| `npm run seed:bands` | **Destructive** full lineup replace — **deletes all bands and picks**. Dev/staging reset only. |
| `npm run seed:bands:sync` | Non-destructive lineup sync (dry-run by default; `--apply` to write, preserves picks on UPDATE) |
| `npm run seed:bands:backfill-slot-id -- --apply` | One-time `slot_id` bootstrap (UPDATE only) |
| `npm run seed:bands:move -- --from FAS1 --to LOU3 [--apply]` | Move picks when a band changes slot |
| `npm run seed:test-users` | Disposable test vira-latas + random picks/presence |
| `npm run seed:test-users:delete` | Remove only `viralatas-test.example.com` users |
| `npm run seed:live-now` | Time-shift bands for `/now` testing (reseeds bands → wipes picks) |
| `npm run festival:reset` | Wipes social state; `--with-bands` also nukes lineup/picks |

**Production:** this Supabase project has **no point-in-time restore**. Prefer `seed:bands:sync` for lineup edits. Do not run destructive seeds on prod without explicit intent.

Test users use `users.is_test_user = true` and `@viralatas-test.example.com` emails.

---

## NPM scripts

```sh
npm run dev              # Vite dev server
npm run build            # Typecheck + production build
npm run preview          # Preview production build
npm run lint             # ESLint
npm test                 # Vitest
npm run test:coverage    # Coverage report
npm run lineup:check-official
npm run seed:bands
npm run seed:bands:sync
npm run seed:live-now
npm run seed:test-users
npm run seed:test-users:delete
```

---

## Offline behavior

```
UI → IndexedDB
     ↕ sync
Supabase
```

- Bands and schedule cache on authenticated load.
- Picks (and announcements when posted offline) write to IndexedDB immediately; flush when online.
- `/now`, `/map`, and `/wrap` read cached bands, picks, presence, and crew users — no live network required after sync.
- Conflict-style alerts can use cached schedule + picks only; other LLM alerts need network (when implemented).

---

## App routes

| Route | Screen | Notes |
|-------|--------|--------|
| `/login` | Sign in | Public |
| `/register` | Sign up | Public |
| `/now` | Right now | Default after auth |
| `/schedule` | Lineup | Full schedule + filters |
| `/my-picks` | My Wacken | Your picks + attendance |
| `/popular` | Popular | Picks or ratings sort |
| `/announcements` | Mural | |
| `/map` | Festival map | From glyph on `/now` |
| `/profile` | Profile | Badges, prefs, logout |
| `/wrap` | Festival recap | Always available when logged in |

Unknown routes redirect to `/now`.

Install on iOS: Safari → **Add to Home Screen** (PWA only, no app store).

---

## Development notes

- **Wiki first** for features and data flow: [`docs/ai-wiki/index.md`](docs/ai-wiki/index.md).
- **`PHASES.md`** — active phased work (currently none; history in `docs/ai-wiki/phases-history.md`).
- Schema changes only in **`supabase/migrations/`**.
- UI spec: **`public/vira-lata-ds.html`** (living design system).
- Keep **offline-first** intact: UI must not depend on server reads for primary views.
- Phases **1–37** are complete; see wiki changelog for recent ships.

---

## Manual checks

- **Offline:** DevTools → Network → Offline → browse schedule and picks.
- **Realtime:** Two browsers, pick a band in one, count updates in the other within a few seconds.
- **Announcements:** Post online, go offline, refresh — post still visible from IndexedDB.
