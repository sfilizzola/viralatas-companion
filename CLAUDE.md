# CLAUDE.md — Viralatas Metaleiros 🤘

Base context for every agent and Claude session in this project. This is the single source of truth for project intent, constraints, and technical decisions. Keep this file as the primary reference.

---

## What this app is

A festival companion PWA for **Viralatas Metaleiros** — Brazilian metal vira-latas attending Wacken Open Air 2026.

**Core loop:** Each vira-lata logs in, picks bands they want to watch, sees live attendance counts and who's going where, and receives proactive AI alerts powered by Claude. The app works fully offline after first load — Wacken has terrible signal.

**Who:** ~20 metal vira-latas mostly from Brazil but people from All Over the World. Team lead: `sfilizzola@gmail.com` (godlike role, hard-coded).

**Product terminology:** In all user-facing copy and localization files, use **vira-latas** instead of **crew** for the group/membership label. Internal code identifiers and existing schema names may keep `crew` when changing them would create unnecessary churn.

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
- `/now` — Live view: current or next band for user and vira-latas (landing page after auth)
- `/schedule` — Full band schedule with filters (stage, day, time)
- `/my-picks` — Current user's picked bands
- `/popular` — Vira-latas popularity: bands sorted by total picks
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
| App type | PWA only | No iOS App Store needed; vira-latas group is ~7 people |
| Offline store | IndexedDB via `idb` library | Structured, async, survives browser close |
| Backend | Supabase | Auth + DB + Realtime in one free-tier service |
| LLM delivery | Proactive only | At a festival, no one is typing into chat |
| Claude context | Full vira-latas picks every call | Vira-latas group is tiny, payload is negligible |
| Alert language | Brazilian Portuguese | It's the Viralatas group, not a global product |
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

**Supported conditions:**
- `wacken_years_exactly`, `wacken_years_includes`
- `country_is`
- `bands_picked_min`, `band_attendance_min`
- `bands_picked_genre_min`, `bands_picked_stage_min`, `bands_picked_before_hour_min`, `band_picked_named` (Phase 10a)
- `bands_seen_min`, `bands_seen_genre_min`, `bands_seen_stage_min`, `bands_seen_before_hour_min`, `band_seen_named` (Phase 10b — requires `user_missed_bands`)

To add a badge without changing behavior elsewhere: add the PNG to `public/badges/`, append one `BADGES` entry in `src/lib/badges.ts`, and add matching label + description keys to both `src/i18n/Badges_br.json` and `src/i18n/Badges_en.json`.

Phase 8 will use this structure to inventory unassociated images in `public/badges/` and add only the badges approved by user input.

---

## Phases at a glance

**Completed:**
- ✅ **Phase 1** — Foundation: Auth, schema, offline shell
- ✅ **Phase 2** — Schedule: Band data, filters, offline browsing
- ✅ **Phase 3** — Picks: Pick bands, live vira-latas counts via Realtime
- ✅ **Phase 4B** — Live preview: Camping state, vira-latas grid, LOST detection
- ✅ **Phase 5** — Announcements & user roles: Mural board, manager blocking, godlike powers
- ✅ **Phase 6** — Metal Place: Festival-day check-in, vira-latas grid card, test mode
- ✅ **Phase 7** — Profile polish: badge modal, live band test, collapsible admin sections, useful links
- ✅ **Phase 8** — Badge asset intake: added Belgian (`belga`) and Colombian (`cafetero`) country badges
- ✅ **Phase 9** — Differentiate Schedule / My Picks / Popular + extracted shared bones (`BandCard`, `BandFilters`, `BandDetailModal`, `useBandConflicts`); Schedule got search + genre filter, My Picks became a day-grouped timeline with conflict chips, Popular gained avatar clusters and the detail modal
- ✅ **Phase 9.B** — Godlike time travel: `now()` helper + `useNow` hook backed by a localStorage override, with quick-jump chips for D-1 / D1–D4 / D+1 in the Profile admin panel
- ✅ **Phase 10** — Badge expansion: characteristic-badge conditions engine (10a — `bands_picked_genre/stage/hour_min`, `band_picked_named`); seen-tracking via `user_missed_bands` table + IDB v8 + offline queue (10b); extended `BandDetailModal` with vira-latas breakdown, conflict warning, and "Não vi essa banda" missed toggle; 5 new `bands_seen_*` badge conditions; 177 tests
- ✅ **Design System Phase F** — `/now` visual polish: 4px stage-color strips, Oswald group titles, tinted gradient backgrounds (orange / teal / purple) per location type, `useNow()`-driven page header; no structural changes
- ✅ **Design System Phase G** — `/profile` restyle: 56px avatar profile head with role chip / country flag / years pill; all-badges patches-grid (4/6/8 cols, locked=grayscale); `year?` field on `BadgeConfig`; edit-profile collapsible with PT/EN language seg; gold godlike + blue manager collapsible headers; sign-out pill at bottom
- ✅ **Design System Phase H** — Announcements restyle: `announce` grid card (40px avatar | head/body/actions in col 2), role chips (Vira-latas/Manager/Godlike), mono action buttons, updated timestamp format (N min / Nh / DD/MM)
- ✅ **Design System Phase I** — Auth pages + bottom nav + offline chrome: 4px accent top border + Oswald title + mono labels on login/register; BottomNav mono 9px caps + filled-icon active states (6 tabs kept); `OfflineBanner` on /now, /schedule, /my-picks; `PendingChip` on offline-queued picks and announcements; `SyncToast` fires on reconnect flush (≥1 item)
- ✅ **Design System Phase J** — Icon pass: shared `<Icon name="..."/>` component (`src/components/icons/Icon.tsx`) with all 17 design-system icons (square caps, miter joins, filled variants); `StarIcon` delegates to Icon; `BandFilters` filter icon and `BandDetailModal` close icon updated; ProfilePage chevrons (▼ → Icon), 🔧/👤 stripped, ✓/✗ removed from buttons

See **PHASES.md** for the current active phase.

---

## Before starting any task

1. **Read PHASES.md** — Understand which phase you're in and its acceptance criteria.
2. **Identify affected files.** Read them before editing.
3. **For Supabase schema changes:** Write a migration under `supabase/migrations/`. Migrations are source of truth.
4. **For Edge Functions:** Test locally with `supabase functions serve` before deploying.
5. **Never commit secrets.** Use `.env.local` for keys. `.env.local` is in `.gitignore`.
6. **Keep offline-first intact.** IndexedDB first, Supabase syncs. Never reverse that.

---

## When completing a phase

1. **Commit once per phase.** Bundle all changes from the phase into a single commit.
2. **Minimize token use.** Use the Bash tool directly (no narration) and stage specific files: `git add <file1> <file2>...` rather than `git add .`
3. **Push to the active branch.** Check `git status` to confirm branch, then push with `-u` if needed: `git push -u origin <branch>`.
4. **Lean commit messages.** State the phase number and key deliverables in 1–2 sentences, ending with the Co-Authored-By footer.

Example: `"Phase 11.A: Fix /now header datetime stacking on mobile\n\nCo-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"`

---

## Automatic versioning (main branch only)

**Current version:** `3`

**Rule:** When a commit is pushed to the `main` branch:
1. Increment the version number by 1
2. Tag the commit with the version string `v1.0.[version]` (e.g., `v1.0.1`, `v1.0.2`)
3. Update this `Current version:` line in CLAUDE.md with the new number
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