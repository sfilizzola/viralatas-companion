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

1. **Read PHASES.md** — Understand which phase you're in and its acceptance criteria.
2. **Read `docs/ai-wiki/index.md`** — Overview of the 5 core principles + system diagram; use it to navigate to the right pages.
3. **Read the relevant wiki pages** — flows/ for feature mechanics, decisions/ for rationale, architecture.md + sync-engine.md for data flow, domain-model.md for entities, supabase-schema.md for DB/RLS.
4. **Identify affected source files** from the wiki's "Relevant Source Files" sections — then read only those.
5. Then and only then modify code.

Schema changes go in `supabase/migrations/` (source of truth). Edge Functions test locally with `supabase functions serve`. Never commit secrets (`.env.local` is in `.gitignore`).

### Wiki inventory

- **Core (`docs/ai-wiki/`):** index, architecture, offline-first, sync-engine, domain-model, supabase-schema, routes, testing, glossary, badges, phases-history, stages, lineup, changelog
- **Flows (`docs/ai-wiki/flows/`):** pick-band, announcements, live-now, offline-pick-sync, authentication, duck
- **Decisions (`docs/ai-wiki/decisions/`):** indexeddb-primary-store, pwa-not-native, supabase-as-sync-target, custom-hooks-events-no-redux, workbox-caching-strategy

Each page follows the 8-section template in `.claude/context/wiki-template.md`.

### After every meaningful change

Update **all three**:
- Relevant wiki pages (architecture.md, domain-model.md, etc.)
- `docs/ai-wiki/changelog.md` with your changes
- `public/vira-lata-ds.html` — if any UI element is added, changed, or removed, update the relevant DS section. Treat the design system as a living spec: it must stay in sync with the code. Agents: read the `#ds-manifest` JSON block at the top of `public/vira-lata-ds.html` first — it indexes every section (anchor + purpose), token (by category), and component (→ section), so you can jump without scanning the whole file. Keep the manifest in sync on any section/token/component change.

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
│   │   └── sync/         # SyncOrchestration + BandSync, PickSync, etc. (Phase 26.G)
│   ├── pages/            # Route-level page components
│   ├── ui/               # Lower-level UI primitives
│   ├── hooks/            # Custom React hooks (useBadgeContext, useNowData composables, …)
│   ├── repositories/     # Data access (picks, announcements, duck, ...)
│   ├── services/         # Domain services (badges, time, stage colors, livePreview, ...)
│   ├── lib/
│   │   ├── supabase.ts   # Supabase client
│   │   ├── db.ts         # Shim → re-exports src/lib/db/ (do not add logic here)
│   │   ├── db/           # IndexedDB domain modules (connection, picks, presence, …)
│   │   ├── realtimeSync.ts  # subscribePostgresChanges() helper (Phase 26.H)
│   │   ├── sync.ts       # Sync engine entrypoint
│   │   ├── pushSubscription.ts  # Web Push setup
│   │   └── i18n.ts       # i18n bootstrap
│   ├── workers/
│   │   └── sw.ts         # Service Worker
│   ├── types/            # Shared TypeScript types
│   ├── i18n/             # Translations (br, en, es, de)
│   └── __tests__/        # Vitest unit/integration tests
├── supabase/
│   ├── migrations/       # SQL migrations (source of truth)
│   ├── functions/        # Edge Functions (one folder per function)
│   └── seed/             # Seed scripts (bands, test users, live-now)
├── public/
│   ├── badges/           # Badge PNG assets
│   └── vira-lata-ds.html   # Living UI spec (design system)
├── docs/
│   └── ai-wiki/          # Architecture wiki (core/, flows/, decisions/)
│   # Local scratch (gitignored): docs/superpowers/{specs,plans,prototypes}/
├── .claude/
│   ├── context/          # On-demand context files
│   └── agents/           # Specialized subagents
├── CLAUDE.md             # ← you are here
├── PHASES.md             # Current and upcoming development phases
└── README.md             # User-facing setup & features
```

---

## Artifact layout (local scratch vs committed truth)

**Gitignored local scratch** — entire `docs/superpowers/` tree; never commit.

| Subfolder | Skill / use | Naming |
|-----------|-------------|--------|
| `specs/` | `brainstorming` | `YYYY-MM-DD-<topic>-design.md` |
| `plans/` | `writing-plans`, `executing-plans` | `YYYY-MM-DD-<feature>.md` |
| `prototypes/<feature-slug>/` | `huashu-design`, wireframes, HTML variants | kebab-case folder; any `.html` / `.png` inside |

Use the same `<feature-slug>` across specs, plans, and prototypes when they belong to one effort.

**Committed truth after ship** — update `docs/ai-wiki/` (+ changelog) and `public/vira-lata-ds.html` for UI. Wiki pages must not depend on local spec paths for essential understanding.

**`public/` rule** — shippable assets only (DS, badges, fonts, maps, manifest). Do **not** add exploration HTML under `public/`; prototypes live in `docs/superpowers/prototypes/`. Prototype HTML may reference fonts via relative paths (e.g. `../../../../public/fonts/…`).

**Deprecated scratch locations** — repo-root `_*.html`, `docs/design/`, `docs/wireframes/`, `_temp/` (removed). Throwaway **code** prototypes (`prototype` skill) stay next to target modules in `src/` with clear naming.

---

## App routes

- `/login` — Sign in with email/password
- `/register` — Create account
- `/now` — Live view: current or next band for user and vira-latas (landing page after auth)
- `/schedule` — Full band schedule with filters (stage, day, time)
- `/my-picks` — Current user's picked bands
- `/popular` — Vira-latas popularity: bands sorted by total picks
- `/announcements` — Mural-style announcements board
- `/profile` — Profile, preferences, godlike/manager UI, logout
- `/wrap` — Festival recap (post-festival; always reachable when logged in)

Unknown routes redirect to `/now`.

---

## Agent navigation (post–Phase 26)

Compact map so agents open the right file first — details stay in `docs/ai-wiki/architecture.md`.

| Area | Data / logic | Presentation |
|------|----------------|----------------|
| **Badges** | `useBadgeContext.ts`, `services/badges/` (`engine`, `persistMetadata`) | `BadgesDisplay.tsx`, `stackLayout.ts` |
| **`/now` live view** | `useNowData.ts` composes `useNowCache`, `useNowPlans`, `usePresenceRealtime`, config hooks; plans in `livePreview.ts` | `RightNowPage.tsx` |
| **Announcements mural** | `useAnnouncements.ts`, `announcementsRepository` | `AnnouncementsPage.tsx` |
| **Picks / schedule** | `usePickActions`, `useBands`, `picksRepository` | Schedule / My Picks / Popular pages |
| **Sync on reconnect** | `components/sync/SyncOrchestration.tsx` + domain sync components | `App.tsx` mounts orchestration only |
| **Realtime subscriptions** | `lib/realtimeSync.ts` → `subscribePostgresChanges()` | Hook/repository call sites |
| **IndexedDB** | `src/lib/db/*.ts` (12 modules + barrel) | Never read Supabase directly from UI |

**Crew location counts for badges** use `computeCrewLocationCounts()` in `livePreview.ts` — same rules as `/now` Lost/Camping cards.

---

## Database schema

**10 tables + 1 view:**

```sql
users, bands, user_picks, announcements, blocked_posters,
user_presence, user_missed_bands, metal_place_config,
live_band_test_config, user_badge_history, band_attendance (view)
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

## Production database safety

**This Supabase project has no point-in-time restore.** Destructive ops on prod are **irreversible** — deleting `public.bands` CASCADE-wipes all `user_picks`.

**Agents must never run these against production without explicit user confirmation in the same turn:**

| Command | Effect |
|---------|--------|
| `npm run seed:bands` / `seed:bands -- --force` | DELETE all bands + all picks |
| `npm run festival:reset` | Wipes social state; `--with-bands` also nukes picks |

**Do not infer consent** from migration failures or phase docs — explain options and ask.

**Safe defaults:**

- Lineup edits → `npm run seed:bands:sync` (dry-run first; `--apply` preserves picks on UPDATE)
- `slot_id` bootstrap → `npm run seed:bands:backfill-slot-id -- --apply` (UPDATE only)
- Verify without writes → dry-run sync + SQL counts (see `.claude/context/production-database.md` and `docs/ai-wiki/lineup-sync.md`)

---

## Stage configuration

8 stages × 4 days at Wacken 2026. Full table, colors, festival schedule, and lineup update procedure → `.claude/context/stages-and-lineup.md`.
Stage colors live in `src/pages/LineupPage.tsx`; unknown stages fall back to `var(--accent)`.

---

## LLM alerts

`AlertContext` shape, prompt language, max length, tone, and the 🤘 rule → `.claude/context/llm-alerts.md`.

---

## Auth trigger

The `handle_new_user()` trigger uses `coalesce()` for `is_test_user`. Do NOT revert to `= 'true'` — caused production signup failures.
Full trigger contract and the four behaviors → `.claude/context/auth-trigger.md`.

---

## Key technical decisions

7-row decision/choice/reason table and full ADRs → `.claude/context/key-decisions.md` (and `docs/ai-wiki/decisions/` for the long form).

---

## Badge system

Fully client-side. **`useBadgeContext`** builds `BadgeContext` from IndexedDB + auth metadata; **`BadgesDisplay`** is presentation-only (vest stack, modal).

Client-side `BadgeConfig` contract, supported conditions, and the add-a-badge procedure → `.claude/context/badges.md`.
Full inventory and condition engine → `docs/ai-wiki/badges.md`.

---

## Phases at a glance

Phases 1–30 are complete. See `PHASES.md` and `FUTURE_IDEAS.md` for upcoming work.

**Full phase history** → `docs/ai-wiki/phases-history.md`

**Rule:** When a phase completes, append an entry to `phases-history.md`. Do **not** add completed phase details here or in PHASES.md.

---

## Skill routing

**Hybrid mode:** infer the skill from the task → **announce and ask** before reading the skill file → skip ask if the user typed `/skill-name` or named the skill explicitly. Routine work (existing patterns, typos, small fixes) uses CLAUDE.md + wiki only — no skill.

**Default comms:** when possible, always **`caveman`** mode for token savings (see skill-routing doc for exceptions: brainstorming, grill-me, humanize-writing, prod DB/destructive warnings, user says “normal mode”).

**Full matrix, handoffs, and examples** → `.claude/context/skill-routing.md` (artifact paths, huashu override, lifecycle)

| Trigger | Skill |
|---------|--------|
| New feature / scope unclear / `/brainstorming` | `brainstorming` |
| Spec or plan needed; edit **`PHASES.md`** or **`FUTURE_IDEAS.md`** | `writing-plans` |
| Design exploration, DS update, HTML prototypes | `huashu-design` |
| Ship locked design → production React in `src/` | `frontend-design` |
| Plan in `docs/superpowers/plans/` or **execute phase from `PHASES.md`** | `executing-plans` |
| Close phase / branch wrap-up | `finishing-a-development-branch` |
| Bug, failing tests, regression | `diagnose` or `systematic-debugging` |

**UI pipeline:** `huashu-design` (creativity → `docs/superpowers/prototypes/<feature-slug>/`; locked UI → `public/vira-lata-ds.html`) → user locks variant → `frontend-design` (implement in `src/`).

**User-direct (never auto-suggest; `/skill` only):** `grill-me`, `grill-with-docs`, `handoff`, `humanize-writing`, `prototype`, `tdd`.

Skills define *how* the main agent works; **subagents** below define *who* reviews — both can apply in one task.

---

## Subagent locations

Specialized agents live in `.claude/agents/`. Each reads CLAUDE.md plus its own system prompt. Delegate when the trigger matches:

- **`wiki-curator`** — After any meaningful code change and before phase close: sync wiki pages, append changelog, update `public/vira-lata-ds.html`.
- **`phase-closer`** — On "close phase N": run build + tests, delegate to wiki-curator, append phases-history, single commit, push, version bump if main.
- **`migration-validator`** — On any change under `supabase/migrations/`: validate RLS, triggers, idempotency, realtime config, auth-trigger contract.
- **`edge-function-reviewer`** — On changes under `supabase/functions/`: verify no leaked API key, AlertContext shape preserved, server-side cooldowns, prompt rules.
- **`badge-author`** — On "add badge X" or `src/services/badges/` changes: asset + registry + all 4 locales + supported predicate.
- **`offline-sync-auditor`** — On changes to `src/lib/db/**`, `src/components/sync/`, sync engine, or repositories: enforce `UI → IndexedDB ↕ Supabase`; flag inversions as critical.
- **`pwa-auditor`** — On changes to `src/workers/sw.ts`, manifest, or caching config: NetworkFirst for API, CacheFirst for assets, version-bump invalidation, first-load schedule cache.

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

**Current version:** `10`

**Rule:** When a commit is pushed to the `main` branch:
1. Increment the version number by 1
2. Only Tag the commit with the version string `v[major].[minor].[version]` (e.g., `v1.2.0`, `v1.2.1`) if there is a change in the minor AND major versions; patch-only releases on `main` do not receive a tag.
3. Update this `Current version:` line in CLAUDE.md with the new number, also update `src/version.ts` with the new version.
4. The prefix `v1.3` is hardcoded and never changes; only the patch number increments

**Important:** Only the `main` branch receives tags. Dev branch commits are never tagged. This versioning scheme tracks patch releases only; major/minor version increments follow different rules outside this scope.

---

## Testing

- **Unit tests:** `src/__tests__/` — run with `npm test` or `npm test:coverage`. Coverage details and conventions → `docs/ai-wiki/testing.md`.

- **Seed scripts:** `supabase/seed/` and `npm run seed:*`
  - **Production:** no PITR — see **Production database safety** above. Never run destructive seed/reset on prod without explicit user OK.
  - `npm run seed:bands` — Destructive full lineup replace (festival reset only; wipes picks)
  - `npm run seed:bands:backfill-slot-id -- --apply` — One-time slot_id bootstrap (preserves picks; run before lock migration)
  - `npm run seed:bands:sync` — Non-destructive lineup sync (dry-run by default; `--apply` to write)
  - `npm run seed:bands:move -- --from FAS1 --to LOU3 [--apply]` — Transfer picks when band relocates slot
  - `npm run seed:test-users` — Create disposable test vira-latas
  - `npm run seed:live-now` — Time-shift bands for live preview testing

- **Manual testing:**
  - **Offline:** DevTools → Network → Offline → browse schedule → check picks
  - **Realtime:** Open two browser windows, pick a band in one, watch count update in other within 3s
  - **Announcement sync:** Post while online, then go offline and refresh — announcement should still appear from IndexedDB

---

## References

- `PHASES.md` — Current phase: acceptance criteria, deliverables
- `docs/ai-wiki/` — Architecture wiki
- `.claude/context/` — On-demand context: **skill-routing**, rtk-reference, stages-and-lineup, **production-database**, llm-alerts, badges, auth-trigger, wiki-template, key-decisions
- `.claude/agents/` — Specialized subagents (see Subagent locations above)
- `README.md`, `supabase/migrations/`, `src/types/index.ts`

---

## RTK (Rust Token Killer)

Always prefix shell commands with `rtk`, including inside `&&` chains. If RTK has a filter, it applies it; otherwise the command passes through unchanged.

❌ `git add . && git commit -m "msg" && git push`
✅ `rtk git add . && rtk git commit -m "msg" && rtk git push`

Full command catalog and per-command savings → `.claude/context/rtk-reference.md`.
