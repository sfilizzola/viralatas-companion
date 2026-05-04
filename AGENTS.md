# AGENTS.md — Viralatas Metaleiros 🤘

Base context for every agent session in this project.
Keep this file short. Linters enforce style. This file enforces intent.

---

## What this app is

A festival companion PWA for **Viralatas Metaleiros** — a Brazilian metal crew attending Wacken Open Air.

Users log in, pick bands they want to watch, see live attendance counts across the crew, and receive **proactive AI alerts** powered by Claude. The app works fully offline after first load — Wacken has terrible signal.

Read `MAIN_STAGES.md` for the full feature breakdown and phase plan before starting any task.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (PWA) |
| Offline | Service Worker + IndexedDB |
| Backend | Supabase (Auth, PostgreSQL, Realtime) |
| Edge functions | Supabase Edge Functions (Deno) |
| LLM alerts | Claude API via Edge Functions |
| Language | TypeScript throughout |

---

## Project structure

```
/
├── src/
│   ├── components/       # Shared UI components
│   ├── pages/            # Route-level page components
│   ├── hooks/            # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts   # Supabase client + types
│   │   ├── db.ts         # IndexedDB helpers (offline store)
│   │   └── alerts.ts     # Alert queue logic
│   ├── workers/
│   │   └── sw.ts         # Service Worker
│   └── types/            # Shared TypeScript types
├── supabase/
│   ├── migrations/       # SQL migrations
│   └── functions/        # Edge Functions (one folder per function)
├── AGENTS.md             # ← you are here
└── MAIN_STAGES.md        # Feature stages + dev plan
```

---

## Database schema (source of truth)

```sql
users          — id (uuid), email, display_name, avatar_url, created_at
bands          — id (uuid), name, stage, start_time (timestamptz), end_time (timestamptz), image_url, genre
user_picks     — user_id (fk), band_id (fk), created_at  [PK: (user_id, band_id)]
```

Supabase Realtime is enabled on `user_picks`. Band attendance counts are computed as a view, not a stored column.

---

## Offline-first rules — never break these

1. **IndexedDB is the primary store.** All reads in the UI come from IndexedDB first.
2. **Supabase is the sync target.** Writes go to IndexedDB immediately, then sync to Supabase when online.
3. **The band list and full schedule must be cached on first load.** A user at Wacken with no signal must be able to browse bands and see their picks.
4. **Picks made offline are queued.** Flush the queue on reconnect. Never silently drop an offline pick.
5. **LLM alert calls are network-dependent.** If offline, queue the trigger and fire when signal returns. Conflict alerts (which use only cached data) may run offline without calling the API.

---

## LLM alert context shape

Every call to the Claude API from an Edge Function must include this context:

```typescript
type AlertContext = {
  currentTime: string;          // ISO 8601
  festivalDay: number;          // 1 | 2 | 3
  triggeringUserId: string;
  crewPicks: {
    userId: string;
    displayName: string;
    picks: { bandId: string; bandName: string; stage: string; startTime: string; endTime: string }[];
  }[];
  fullSchedule: Band[];
};
```

Prompt language: **Brazilian Portuguese**. Responses must be short (max 2 sentences). Tone: direct, fun, metal. End every alert with 🤘.

---

## Critical constraints

- **No native code.** This is a PWA only. No React Native, no Capacitor, no Expo.
- **No App Store release.** iOS users install via Safari "Add to Home Screen."
- **API key never touches the client.** All Claude API calls go through Supabase Edge Functions.
- **No alert spam.** Each alert type has a cooldown (see `MAIN_STAGES.md`). Enforce this in the Edge Function, not the client.
- **Dark mode is mandatory.** It's a metal app.

---

## Subagent locations

Specialized agents for isolated tasks live in `.claude/agents/`. Each agent reads this file plus its own system prompt. When delegating, prefer subagents for:
- Security review of Edge Functions
- Database migration validation
- PWA / Service Worker audits

---

## Before starting any task

1. Read `MAIN_STAGES.md` — find the current phase and its acceptance criteria.
2. Check which files are affected. Read them before editing.
3. For any Supabase change, write a migration file under `supabase/migrations/`.
4. For any Edge Function, test locally with `supabase functions serve` before deploying.
5. Never commit secrets. Use `.env.local` for keys.
