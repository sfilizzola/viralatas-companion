# CLAUDE.md — Viralatas Metaleiros 🤘

Base context for every agent and Claude session in this project. This is the single source of truth for project intent, constraints, and technical decisions. Keep this file as the primary reference.

---

## What this app is

A festival companion PWA for **Viralatas Metaleiros** — a Brazilian metal crew attending Wacken Open Air 2026.

**Core loop:** Each crew member logs in, picks bands they want to watch, sees live attendance counts and who's going where, and receives proactive AI alerts powered by Claude. The app works fully offline after first load — Wacken has terrible signal.

**Who:** ~20 person metal crew mostly from Brazil but people from All Over the World. Team lead: `sfilizzola@gmail.com` (godlike role, hard-coded).

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
│   │   ├── alerts.ts     # Alert queue logic
│   │   └── announcements.ts  # Announcement data layer
│   ├── workers/
│   │   └── sw.ts         # Service Worker
│   ├── types/            # Shared TypeScript types
│   └── i18n/             # Translations (Brazilian Portuguese, English)
├── supabase/
│   ├── migrations/       # SQL migrations (source of truth)
│   └── functions/        # Edge Functions (one folder per function)
├── CLAUDE.md             # ← you are here
├── PHASES.md             # Current and upcoming development phases
└── README.md             # User-facing setup & features
```

---

## App routes

- `/login` — Sign in with email/password
- `/register` — Create account
- `/now` — Live view: current or next band for user and crew (landing page after auth)
- `/schedule` — Full band schedule with filters (stage, day, time)
- `/my-picks` — Current user's picked bands
- `/popular` — Crew popularity: bands sorted by total picks
- `/announcements` — Mural-style announcements board (Phase 5)
- `/profile` — Profile, preferences, godlike/manager UI, logout

Unknown routes redirect to `/now`.

---

## Database schema (source of truth)

```sql
users           — id (uuid), email, display_name, avatar_url, created_at,
                  role (normal|manager|godlike), preferred_language (br|en),
                  is_test_user (bool), wacken_years (int[]), country

bands           — id (uuid), name, stage (text), start_time (timestamptz), 
                  end_time (timestamptz), image_url, genre

user_picks      — user_id (fk), band_id (fk), created_at
                  [PK: (user_id, band_id)]

announcements   — id (uuid), author_id (fk), content, created_at, 
                  deleted_at (soft-delete)

blocked_posters — user_id (fk), blocked_by (fk), blocked_at

user_presence   — user_id (fk), is_camping (bool), is_at_metal_place (bool),
                  updated_at

metal_place_config
                — single-row godlike config for Metal Place festival day,
                  time range, and test_override_day

live_band_test_config
                — single-row godlike config for pinning one band as live now
                  during testing

band_attendance — view: counts picks per band (computed, not stored)
```

**Realtime:** Enabled on `user_picks`, `announcements`, `user_presence`, `metal_place_config`, and `live_band_test_config`. Band counts computed dynamically.

---

## Offline-first rules — NEVER break these

1. **IndexedDB is the primary store.** All UI reads come from IndexedDB first.
2. **Supabase is the sync target.** Writes go to IndexedDB immediately, then sync to Supabase when online.
3. **The band list and full schedule must be cached on first load.** A user at Wacken with no signal must browse bands and see their picks.
4. **Picks made offline are queued.** Flush on reconnect. Never silently drop an offline pick.
5. **Announcements are cached.** New announcements sync via Realtime when online; offline posts queue and flush on reconnect.
6. **LLM alert calls are network-dependent.** Queue triggers offline; fire when signal returns. Conflict alerts (cached-only logic) may run offline.

---

## Critical constraints

- **No native code.** This is a PWA only. No React Native, no Capacitor, no Expo.
- **No App Store release.** iOS users install via Safari "Add to Home Screen."
- **API key never touches the client.** All Claude API calls go through Supabase Edge Functions. Verify with `grep -r "ANTHROPIC\|sk-" src/` — should find nothing.
- **No alert spam.** Each alert type has a cooldown (see PHASES.md). Enforce in Edge Function, not client.
- **Dark mode is mandatory.** It's a metal app.

---

## Stage configuration

**8 Wacken 2026 stages** across 3 main infield + 5 tent/specialized stages.

| Stage | Category | Color | Day 1 | Day 2 | Day 3 | Day 4 |
|-------|----------|-------|-------|-------|-------|-------|
| `Faster` | Main Infield | `#2980b9` (Blue) | ✅ | ✅ | ✅ | ✅ |
| `Harder` | Main Infield | `#e67e22` (Orange) | ✅ | ✅ | ✅ | ✅ |
| `Louder` | Main Infield | `#8e44ad` (Purple) | ✅ | ✅ | ✅ | ✅ |
| `W.E.T.` | Outside Infield | `#c0392b` (Red) | ✅ | ✅ | ✅ | ✅ |
| `Headbangers` | Outside Infield | `#16a085` (Teal) | ✅ | ✅ | ✅ | ✅ |
| `Wasteland` | Specialized | `#2c3e50` (Dark Blue) | ✅ | ✅ | ✅ | ✅ |
| `Wackinger` | Specialized | `#95a5a6` (Gray) | ✅ | ✅ | ✅ | ✅ |
| `Welcome to the Jungle` | Specialized | `#f39c12` (Gold) | ✅ | ✅ | ✅ | ✅ |

**Festival schedule:**
- **Day 1:** Wednesday, July 29, 2026
- **Day 2:** Thursday, July 30, 2026
- **Day 3:** Friday, July 31, 2026
- **Day 4:** Saturday, August 1, 2026

**Total: 78+ bands across 8 stages and 4 days.**

**Stage colors** are defined in `src/pages/SchedulePage.tsx`. Unknown stages gracefully fall back to `var(--accent)`.

To update the lineup: edit `supabase/seed/bands.ts`, run `npm run seed:bands`, and add a migration if the schema changes.

---

## LLM alert context shape

Every call to the Claude API from an Edge Function must include this context (Phase 6):

```typescript
type AlertContext = {
  currentTime: string;          // ISO 8601
  festivalDay: number;          // 1 | 2 | 3 | 4
  triggeringUserId: string;
  crewPicks: {
    userId: string;
    displayName: string;
    picks: { 
      bandId: string; 
      bandName: string; 
      stage: string; 
      startTime: string; 
      endTime: string; 
    }[];
  }[];
  fullSchedule: Band[];
};
```

**Prompt language:** Brazilian Portuguese. **Max length:** 2 sentences. **Tone:** Direct, fun, metal. **Every alert ends with:** 🤘

---

## Auth & trigger notes

The `handle_new_user()` database trigger fires on every `auth.signUp()`:

```sql
-- CRITICAL: Use coalesce() for is_test_user, NOT direct = 'true' comparison
coalesce(new.raw_user_meta_data->>'is_test_user' = 'true', false)
-- If field missing: null → coalesce → false ✓
-- (Previous bug: null = 'true' → null → NOT NULL violation)
```

**Do NOT revert** this to `new.raw_user_meta_data->>'is_test_user' = 'true'`. It caused production failures where signup succeeded but the users table insertion failed silently.

The trigger also:
1. Sets `role = 'godlike'` for `sfilizzola@gmail.com`
2. Sets `role = 'normal'` for all other users
3. Sets `preferred_language` from metadata (default: `'br'`)
4. Handles upserts without overwriting existing roles

---

## Key technical decisions

| Decision | Choice | Reason |
|---|---|---|
| App type | PWA only | No iOS App Store needed; crew is ~7 people |
| Offline store | IndexedDB via `idb` library | Structured, async, survives browser close |
| Backend | Supabase | Auth + DB + Realtime in one free-tier service |
| LLM delivery | Proactive only | At a festival, no one is typing into chat |
| Claude context | Full crew picks every call | Crew is tiny, payload is negligible |
| Alert language | Brazilian Portuguese | It's the Viralatas crew, not a global product |
| Role hierarchy | normal / manager / godlike | 3-tier allows moderation without giving everyone power |

---

## Badge system

Badges are fully client-side and use the existing `BadgeConfig` structure in `src/lib/badges.ts`.

**Current badge contract:**

```ts
type BadgeConfig = {
  slug: string;
  imagePath: string;       // public path, usually /badges/badge_*.png
  labelKey: string;        // src/i18n/Badges_*.json
  descriptionKey: string;  // src/i18n/Badges_*.json
  condition: BadgeCondition;
};
```

**Supported conditions only:**
- `wacken_years_exactly`
- `wacken_years_includes`
- `country_is`
- `bands_picked_min`
- `band_attendance_min`

To add a badge without changing behavior elsewhere: add the PNG to `public/badges/`, append one `BADGES` entry in `src/lib/badges.ts`, and add matching label + description keys to both `src/i18n/Badges_br.json` and `src/i18n/Badges_en.json`.

Phase 8 will use this structure to inventory unassociated images in `public/badges/` and add only the badges approved by user input.

---

## Phases at a glance

**Completed:**
- ✅ **Phase 1** — Foundation: Auth, schema, offline shell
- ✅ **Phase 2** — Schedule: Band data, filters, offline browsing
- ✅ **Phase 3** — Picks: Pick bands, live crew counts via Realtime
- ✅ **Phase 4B** — Live preview: Camping state, crew grid, LOST detection
- ✅ **Phase 5** — Announcements & user roles: Mural board, manager blocking, godlike powers
- ✅ **Phase 6** — Metal Place: Festival-day check-in, crew grid card, test mode
- ✅ **Phase 7** — Profile polish: badge modal, live band test, collapsible admin sections, useful links
- ✅ **Phase 8** — Badge asset intake: added Belgian (`belga`) and Colombian (`cafetero`) country badges
- ✅ **Phase 9** — Differentiate Schedule / My Picks / Popular + extracted shared bones (`BandCard`, `BandFilters`, `BandDetailModal`, `useBandConflicts`); Schedule got search + genre filter, My Picks became a day-grouped timeline with conflict chips, Popular gained avatar clusters and the detail modal
- ✅ **Phase 9.B** — Godlike time travel: `now()` helper + `useNow` hook backed by a localStorage override, with quick-jump chips for D-1 / D1–D4 / D+1 in the Profile admin panel

See **PHASES.md** for detailed acceptance criteria and current status.

---

## Before starting any task

1. **Read PHASES.md** — Understand which phase you're in and its acceptance criteria.
2. **Identify affected files.** Read them before editing.
3. **For Supabase schema changes:** Write a migration under `supabase/migrations/`. Migrations are source of truth.
4. **For Edge Functions:** Test locally with `supabase functions serve` before deploying.
5. **Never commit secrets.** Use `.env.local` for keys. `.env.local` is in `.gitignore`.
6. **Keep offline-first intact.** IndexedDB first, Supabase syncs. Never reverse that.

---

## Subagent locations

Specialized agents for isolated tasks live in `.claude/agents/`. Each agent reads this file plus its own system prompt. When delegating, prefer subagents for:

- **Security review** of Edge Functions (API key handling, RLS policies)
- **Database migration validation** (schema correctness, RLS, triggers)
- **PWA / Service Worker audits** (caching strategy, offline behavior)

---

## Testing

- **Unit tests:** `src/__tests__/` (128 tests verified after Phase 7)
  - Registration validation, login flows, auth integration, RLS enforcement
  - Run with `npm test` or `npm test:coverage`

- **Seed scripts:** `supabase/seed/` and `npm run seed:*`
  - `npm run seed:bands` — Refresh band lineup (cascades to picks)
  - `npm run seed:test-users` — Create disposable test crew
  - `npm run seed:live-now` — Time-shift bands for live preview testing

- **Manual testing:**
  - **Offline:** DevTools → Network → Offline → browse schedule → check picks
  - **Realtime:** Open two browser windows, pick a band in one, watch count update in other within 3s
  - **Announcement sync:** Post while online, then go offline and refresh — announcement should still appear from IndexedDB

---

## References

- **PHASES.md** — Current phases: acceptance criteria, deliverables, deadlines
- **README.md** — Setup instructions, scripts, environment variables
- **supabase/migrations/** — Database schema (source of truth)
- **src/types/index.ts** — TypeScript type definitions
