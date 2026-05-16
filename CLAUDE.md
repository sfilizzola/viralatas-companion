---
description: 
alwaysApply: true
---

# CLAUDE.md — Viralatas Metaleiros 🤘

Base context for every agent and Claude session in this project. This file + the **AI Wiki** (`docs/ai-wiki/`) together form the project's institutional memory. This file sets rules and fast facts; the wiki explains the architecture.

---

## What this app is

A festival companion PWA for **Viralatas Metaleiros** — Brazilian metal vira-latas attending Wacken Open Air 2026.

**Core loop:** Each vira-lata logs in, picks bands they want to watch, sees live attendance counts and who's going where, and receives proactive AI alerts powered by Claude. The app works fully offline after first load — Wacken has terrible signal.

**Who:** ~20 metal vira-latas mostly from Brazil but people from All Over the World. Team lead: `sfilizzola@gmail.com` (godlike role, hard-coded).

**Product terminology:** In all user-facing copy and localization files, use **vira-latas** instead of **crew** for the group/membership label. Internal code identifiers and existing schema names may keep `crew` when changing them would create unnecessary churn.

---

## AI Wiki

The **AI Wiki** at `docs/ai-wiki/` is the single source of truth for deep technical understanding. CLAUDE.md provides the quick facts and rules; the wiki explains the "why" and "how" behind every architectural decision.

### Before any coding task

> **Wiki first. Codebase second.** The wiki is the fastest path to understanding intent, constraints, and prior decisions. Only open source files after you know what you're looking for.

1. **Read PHASES.md** — Understand which phase you're in and its acceptance criteria
2. **Read `docs/ai-wiki/index.md`** — Overview of the 5 core principles + system diagram; use it to navigate to the right pages
3. **Read the relevant wiki pages** — Pick from the table below by feature area:
   - Feature mechanics → `architecture.md`, `domain-model.md`
   - Offline / sync → `offline-first.md`, `sync-engine.md`
   - Database / RLS → `supabase-schema.md`
   - User flows → `flows/pick-band.md`, `flows/announcements.md`, `flows/live-now.md`, `flows/offline-pick-sync.md`, `flows/authentication.md`
   - Architectural rationale → `decisions/indexeddb-primary-store.md`, `decisions/pwa-not-native.md`, `decisions/supabase-as-sync-target.md`, `decisions/custom-hooks-events-no-redux.md`, `decisions/workbox-caching-strategy.md`
   - Unknown terms → `glossary.md` (140+ terms)
4. **Identify affected source files** from the wiki's "Relevant Source Files" sections — then read only those
5. Then and only then modify code

### After every meaningful change

Update **all three**:
- Relevant wiki pages (architecture.md, domain-model.md, etc.)
- `docs/ai-wiki/changelog.md` with your changes
- `public/Design System.html` — if any UI element is added, changed, or removed, update the relevant DS section. Treat the design system as a living spec: it must stay in sync with the code.

### Changelog format

```markdown
## YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Architectural Notes
- ...
```

### Current wiki inventory

**Core docs (`docs/ai-wiki/`):**

| File | Purpose |
|---|---|
| `index.md` | Navigation hub; 5 core principles; system diagram; window events; open questions; reading paths by role |
| `architecture.md` | 4-layer design; every hook/repo/service; data flows (online/offline/realtime) |
| `offline-first.md` | Why offline-first; 4-phase sync mechanics; worked examples; per-type guarantees |
| `sync-engine.md` | 4 sync components; queue flush flow; realtime subscriptions; debugging |
| `domain-model.md` | 7 entities + 3 computed views; role-based rules |
| `supabase-schema.md` | Full SQL DDL; RLS policies; Realtime config |
| `routes.md` | 8 routes; 5 key nav flows with ASCII diagrams |
| `testing.md` | 177+ tests; manual offline scenarios; simulation techniques |
| `glossary.md` | 140+ terms across architecture, DB, React, auth, sync, UI, time, badge, role, testing |
| `badges.md` | Badge system design, conditions engine, asset inventory |
| `phases-history.md` | Complete log of every completed phase (1–15+); append here when a phase closes |
| `stages.md` | 8 Wacken 2026 stages: categories, colors, pairing rules, slot schedules (start/end times per slot) |
| `lineup.md` | Band assignments by day and stage; cross-references stages.md via Slot IDs |

**User flow docs (`docs/ai-wiki/flows/`):**

| File | Purpose |
|---|---|
| `flows/pick-band.md` | Pick-band lifecycle: online, offline, dedup, realtime, edge cases |
| `flows/announcements.md` | Post lifecycle: online immediate, realtime from others, offline queue, reconnect flush, moderation |
| `flows/live-now.md` | Time-based band display, current/next logic, time-shift override, conflict severity, crew counts |
| `flows/offline-pick-sync.md` | Queue mechanics, dedup by (user_id, band_id), keepLast semantics, error recovery, SyncToast |
| `flows/authentication.md` | Signup trigger, IndexedDB session storage, test user metadata, godlike role assignment, RLS per table |

**Architectural decision records (`docs/ai-wiki/decisions/`):**

| File | Purpose |
|---|---|
| `decisions/indexeddb-primary-store.md` | ADR: why IndexedDB, not Supabase-primary |
| `decisions/pwa-not-native.md` | ADR: why PWA, not React Native/Capacitor |
| `decisions/supabase-as-sync-target.md` | ADR: why Supabase (Auth + DB + Realtime vs. alternatives), cost/vendor tradeoffs |
| `decisions/custom-hooks-events-no-redux.md` | ADR: why window events + custom hooks instead of Zustand/Redux |
| `decisions/workbox-caching-strategy.md` | ADR: NetworkFirst for API, CacheFirst for assets, cache invalidation via version bump |

### Documentation standards

Every wiki page should cover:

1. **Purpose** — What question does this page answer?
2. **Relevant Source Files** — Which files implement this?
3. **Data Flow** — How does data move through the system?
4. **Key Hooks / Services / Repositories** — What are the main abstractions?
5. **Offline Behavior** — What happens when the user is offline?
6. **Synchronization Behavior** — How does Supabase sync work?
7. **Risks / Caveats** — What could go wrong?
8. **Open Questions** — What's still unclear?

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
├── docs/
│   └── ai-wiki/          # Architecture wiki (14 pages)
├── CLAUDE.md             # ← you are here
├── PHASES.md             # Current and upcoming development phases
└── README.md             # User-facing setup & features
```

---

## App routes

- `/login` — Sign in with email/password
- `/register` — Create account
- `/now` — Live view: current or next band for user and vira-latas (landing page after auth)
- `/schedule` — Full band schedule with filters (stage, day, time)
- `/my-picks` — Current user's picked bands
- `/popular` — Vira-latas popularity: bands sorted by total picks
- `/announcements` — Mural-style announcements board (Phase 5)
- `/profile` — Profile, preferences, godlike/manager UI, logout

Unknown routes redirect to `/now`.

---

## Database schema

**9 tables + 1 view:**

```sql
users, bands, user_picks, announcements, blocked_posters,
user_presence, user_missed_bands, metal_place_config,
live_band_test_config, band_attendance (view)
```

**Realtime enabled on:** `user_picks`, `announcements`, `user_presence`, `metal_place_config`, `live_band_test_config`

**Full DDL, RLS policies, and all migrations** → `docs/ai-wiki/supabase-schema.md`

---

## Offline-first rules — NEVER break these

1. **IndexedDB is the primary store.** All UI reads come from IndexedDB first.
2. **Supabase is the sync target.** Writes go to IndexedDB immediately, then sync to Supabase when online.
3. **The band list and full schedule must be cached on first load.** A user at Wacken with no signal must browse bands and see their picks.
4. **Picks made offline are queued.** Flush on reconnect. Never silently drop an offline pick.
5. **Announcements are cached.** New announcements sync via Realtime when online; offline posts queue and flush on reconnect.
6. **LLM alert calls are network-dependent.** Queue triggers offline; fire when signal returns. Conflict alerts (cached-only logic) may run offline.

---

## Architecture philosophy & guard rails

**Philosophy:**
This project is fundamentally offline-first social coordination for temporary communities. The festival domain is one specialization. Preserve: resilience, portability, synchronization integrity, local usability, low-friction mobile interaction.

**Architectural rule:**
```
UI → IndexedDB
      ↕ sync
   Supabase
```

Never invert this to: `UI → API → local cache`. IndexedDB is the source of truth for the UI; Supabase is the sync backend.

**Coding constraints — do NOT:**
- Break offline-first behavior
- Introduce server-dependent UI reads
- Bypass synchronization abstractions
- Tightly couple components to Supabase
- Duplicate sync logic across files

**Prefer:**
- Repository abstractions over direct DB calls
- Explicit domain logic over implicit behavior
- Deterministic state transitions
- Resilient synchronization
- Optimistic UI updates

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
| App type | PWA only | No iOS App Store needed; vira-latas group is ~20 people |
| Offline store | IndexedDB via `idb` library | Structured, async, survives browser close |
| Backend | Supabase | Auth + DB + Realtime in one free-tier service |
| LLM delivery | Proactive only | At a festival, no one is typing into chat |
| Claude context | Full vira-latas picks every call | Vira-latas group is tiny, payload is negligible |
| Alert language | Brazilian Portuguese | It's the Viralatas group, not a global product |
| Role hierarchy | normal / manager / godlike | 3-tier allows moderation without giving everyone power |

**Full architectural decision records** → `docs/ai-wiki/decisions/`

---

## Badge system

Badges are fully client-side and use the existing `BadgeConfig` structure in `src/services/badges/registry.ts` (re-exported via `src/services/badges/index.ts`).

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

**Supported conditions:**
- `wacken_years_exactly`, `wacken_years_includes`
- `country_is`
- `bands_picked_min`, `band_attendance_min`
- `bands_picked_genre_min`, `bands_picked_stage_min`, `bands_picked_before_hour_min`, `band_picked_named` (Phase 10a)
- `bands_seen_min`, `bands_seen_genre_min`, `bands_seen_stage_min`, `bands_seen_before_hour_min`, `band_seen_named` (Phase 10b — requires `user_missed_bands`)

To add a badge without changing behavior elsewhere: add the PNG to `public/badges/`, append one `BADGES` entry in `src/services/badges/registry.ts`, and add matching label + description keys to all `src/i18n/Badges_*.json` files (br, en, es, de).

See `docs/ai-wiki/badges.md` for the full badge inventory, condition engine details, and asset management guidelines.

---

## Phases at a glance

Phases 1–20 are complete. The next active phase is **Phase 21**.

**Full phase history** → `docs/ai-wiki/phases-history.md`

**Rule:** When a phase completes, append an entry to `phases-history.md`. Do **not** add completed phase details here or in PHASES.md.

---

## Before starting any task

> **Wiki first. Codebase second.** Do not open source files to understand the system — the wiki already explains it. Use source files only to confirm implementation details the wiki points you to.

1. **Read PHASES.md** — Understand the current state of the project.
2. **Read `docs/ai-wiki/index.md`** — System overview, core principles, and reading paths; use it to pick the right next pages.
3. **Read relevant wiki pages** — flows/ for feature mechanics, decisions/ for rationale, architecture.md + sync-engine.md for data flow, domain-model.md for entities, supabase-schema.md for DB/RLS.
4. **Identify affected source files** from wiki "Relevant Source Files" sections — then read only those.
5. **For Supabase schema changes:** Write a migration under `supabase/migrations/`. Migrations are source of truth.
6. **For Edge Functions:** Test locally with `supabase functions serve` before deploying.
7. **Never commit secrets.** Use `.env.local` for keys. `.env.local` is in `.gitignore`.
8. **Keep offline-first intact.** IndexedDB first, Supabase syncs. Never reverse that.

---

## When completing a phase

1. **Update the wiki.** Modify relevant wiki pages to reflect any new architectural understanding. Update `docs/ai-wiki/changelog.md` with a dated entry listing all changes (Added, Changed, Architectural Notes).
2. **Commit once per phase.** Bundle all changes from the phase into a single commit.
3. **Minimize token use.** Use the Bash tool directly (no narration) and stage specific files: `git add <file1> <file2>...` rather than `git add .`
4. **Push to the active branch.** Check `git status` to confirm branch, then push with `-u` if needed: `git push -u origin <branch>`.
5. **Lean commit messages.** State the phase number and key deliverables in 1–2 sentences, ending with the Co-Authored-By footer.

Example: `"Phase 11.A: Fix /now header datetime stacking on mobile\n\nCo-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"`

---

## Pre-commit checklist for main branch

Before committing to `main`, you **must** complete both checks in order:

1. **Build check** — Run `rtk npm run build`
   - If the build fails, fix all errors and stage the fixes before proceeding.
   - Do not commit to `main` while the build is broken.

2. **Test check** — Run `rtk npm test`
   - If any tests fail, fix them and stage the fixes before proceeding.
   - Do not commit to `main` while tests are red.

Only when **both the build and all tests are green** may you proceed with the commit to `main`.

---

## Automatic versioning (main branch only)

**Current version:** `20`

**Rule:** When a commit is pushed to the `main` branch:
1. Increment the version number by 1
2. Only Tag the commit with the version string `v[major].[minor].[version]` (e.g., `v1.0.1`, `v1.0.2`) if there is a change in the minor AND major versions, do not tag versions.
3. Update this `Current version:` line in CLAUDE.md with the new number, also update versions.ts with the new version.
4. The prefix `v1.0` is hardcoded and never changes; only the patch number increments

**Important:** Only the `main` branch receives tags. Dev branch commits are never tagged. This versioning scheme tracks patch releases only; major/minor version increments follow different rules outside this scope.

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
  - `npm run seed:test-users` — Create disposable test vira-latas
  - `npm run seed:live-now` — Time-shift bands for live preview testing

- **Manual testing:**
  - **Offline:** DevTools → Network → Offline → browse schedule → check picks
  - **Realtime:** Open two browser windows, pick a band in one, watch count update in other within 3s
  - **Announcement sync:** Post while online, then go offline and refresh — announcement should still appear from IndexedDB

---

## References

- **PHASES.md** — Current phases: acceptance criteria, deliverables, deadlines
- **docs/ai-wiki/** — Architecture wiki (14 pages)
- **README.md** — Setup instructions, scripts, environment variables
- **supabase/migrations/** — Database schema (source of truth)
- **src/types/index.ts** — TypeScript type definitions

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->
