# Viralatas Companion

Festival companion PWA for the Viralatas Metaleiros crew at Wacken Open Air.

The app lets crew members log in, browse the Wacken schedule, pick bands, see who else is going, and check what they or the crew should be watching right now. It is built offline-first so the schedule and picks keep working after the first sync, even with bad festival signal.

## Features

- Supabase email/password authentication with profile data.
- Offline-first schedule browsing from IndexedDB.
- Wacken 2026 band schedule seed data.
- Stage, day, and time-window filters for the schedule.
- Optimistic band picks saved locally immediately.
- Offline pick queue that flushes to Supabase when the browser reconnects.
- Crew-wide pick counts and popular bands view.
- Personal "My picks" view.
- "Right now" view that shows the current or next band for the user and crew.
- PWA service worker for app shell and image caching.
- Mandatory dark UI theme.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Routing | React Router |
| PWA | vite-plugin-pwa, Workbox |
| Offline data | IndexedDB via `idb` |
| Backend | Supabase Auth, PostgreSQL, Realtime |
| Database changes | Supabase migrations |

## Project Structure

```text
.
├── src/
│   ├── components/       # Shared UI components and navigation
│   ├── hooks/            # Auth, picks, and attendance hooks
│   ├── lib/              # Supabase client, IndexedDB, sync, picks, live preview logic
│   ├── pages/            # Route-level screens
│   ├── types/            # Shared TypeScript app types
│   ├── App.tsx           # App routes and startup sync hooks
│   └── main.tsx          # React entrypoint
├── supabase/
│   ├── migrations/       # Database schema and policy migrations
│   └── seed/             # Band lineup and disposable test-user seed scripts
├── MAIN_STAGES.md        # Full feature plan and acceptance criteria
├── CURRENT_STAGE.md      # Current phase status
└── vite.config.ts        # Vite and PWA configuration
```

## Requirements

- Node.js 20 or newer is recommended.
- npm.
- A Supabase project.
- Supabase CLI if you want to run migrations locally or manage Supabase from the terminal.

## Environment Setup

Copy the example environment file:

```sh
cp .env.local.example .env.local
```

Fill in the client-safe Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

To run the band seed script, also add a service role key locally:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Never commit `.env.local` or service role keys.

## Run Locally

Install dependencies:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

Open the local URL Vite prints, usually:

```text
http://localhost:5173
```

## Database Setup

Apply the migrations to your Supabase project using the Supabase CLI workflow you use for the project. The migrations create:

- `users`
- `bands`
- `user_picks`
- `band_attendance` view
- RLS policies
- Auth trigger for profile creation
- Realtime publication for `user_picks`

## Seed Bands

The schedule seed lives in `supabase/seed/bands.ts`.

Run it after migrations and after adding `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`:

```sh
npm run seed:bands
```

Warning: the seed script deletes existing bands before inserting the lineup, which cascades to `user_picks`. Use it only for dev or staging data unless you are intentionally resetting picks.

## Disposable Test Users

Test crew users are marked with `users.is_test_user = true` and use emails at `viralatas-test.example.com`, so they are easy to remove from Auth and public tables.

Create or recreate the fixed test crew with random band picks and random camping states:

```sh
npm run seed:test-users
```

Delete only those disposable users:

```sh
npm run seed:test-users:delete
```

## Live Preview Fixture

To test the "Right now" screen with the real lineup while the festival is not actually happening, shift a handful of bands around the current device time:

```sh
npm run seed:live-now
```

This reseeds `bands`, which cascades and replaces `user_picks`. If disposable test users already exist, it also gives them deterministic current, next, camping, and lost states for the live crew view.

## Available Scripts

```sh
npm run dev      # Start local dev server
npm run build    # Type-check and build production assets
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
npm run seed:bands
npm run seed:live-now
npm run seed:test-users
npm run seed:test-users:delete
```

## Offline Behavior

The UI reads from IndexedDB first. Supabase is the sync target.

- On authenticated load, bands are synced from Supabase into IndexedDB.
- Picks are written to IndexedDB immediately.
- If the browser is offline, pick changes are queued in IndexedDB.
- When the browser reconnects, queued pick changes are flushed to Supabase.
- The "Right now" screen uses cached bands, picks, and crew users, so it does not require network after prior sync.

## App Routes

- `/login` - sign in
- `/register` - create account
- `/now` - current or next band for the user and crew
- `/schedule` - full schedule and filters
- `/my-picks` - current user's picked bands
- `/popular` - crew popularity view
- `/profile` - profile and logout

Unknown routes redirect to `/now`.

## Development Notes

- Read `MAIN_STAGES.md` before changing feature behavior.
- Check `CURRENT_STAGE.md` for current phase status.
- Put Supabase schema changes in `supabase/migrations/`.
- Keep Claude or other API keys out of the client bundle.
- Keep offline-first behavior intact: IndexedDB is the primary UI data source, Supabase is the sync target.
