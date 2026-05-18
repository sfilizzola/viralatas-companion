# FUTURE_IDEAS.md — Nice-to-Have Features

Ideas and features that would enhance the app but are not yet scheduled for implementation. Numbered independently of phase numbering.

> **Rule:** When adding a new idea, evaluate its complexity and risk and add a row to the table below before writing the full spec.

## Ideas at a glance

| # | Title | Complexity | Risk | Status |
|---|---|---|---|---|
| 1 | LLM proactive alerts | High | Medium — API key handling, alert spam, offline edge cases | pending |
| 2 | Year freeze for historical badges | Medium | Low — godlike-only, idempotent, additive schema change | pending |
| 3 | Unit tests: IDB layer (`lib/db.ts`) | Medium | Low — requires `fake-indexeddb` dev dependency; isolated from app runtime | pending |
| 4 | Unit tests: Hook logic (pure memoized computations) | Medium | Low — `renderHook` + mocked IDB and Supabase; no network | pending |
| 5 | Unit tests: Component and page integration | High | Low — replaces misleading stub tests; mounts pages with RTL + mocked hooks | pending |

---

## Idea 1 — LLM proactive alerts

**Goal:** Claude proactively taps the crew on the shoulder at key festival moments. No user needs to ask — the app just knows.

**Architecture:**
```
Client (Service Worker timer or Realtime event)
  → POST /functions/v1/check-alerts
  → Edge Function builds AlertContext
  → Calls Claude API (claude-sonnet-4-6)
  → Returns alert payload { type, message, targetUserIds }
  → Client displays push notification or in-app banner
```

---

### Alert types

#### 1a — Conflict alert
- **Trigger:** 30 minutes before a time slot where the user has two picks on different stages simultaneously
- **Offline capable:** Yes — runs from cached picks + schedule, no API call needed
- **Cooldown:** Once per conflicting pair per festival day
- **Example message:** "Você marcou Blind Guardian e Powerwolf ao mesmo tempo. Qual palco vai rolar? 🤘"

#### 1b — Crew split alert
- **Trigger:** When crew picks for the next time slot split across 3 or more stages
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per hour
- **Example message:** "Crew dividida em 4 palcos agora. Ponto de encontro: portão principal às 22h? 🤘"

#### 1c — Discovery nudge
- **Trigger:** User has a gap of 45+ minutes with no picks; a band the crew loves is starting soon
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per gap window
- **Example message:** "Você tem 50 min livre. Fernanda e Beto adoraram Bloodbath — começam em 10 min no HARDER STAGE 🤘"

#### 1d — Day recap
- **Trigger:** 30 minutes after the last scheduled band on each festival day
- **Offline capable:** No — requires Claude API, cached for offline reading after delivery
- **Cooldown:** Once per festival day
- **Example message:** "Viralatas viram 14 bandas hoje. Mais popular: Rammstein (6/7). Mais dividida: Tool (4 foram, 3 fugiram) 🤘"

---

### Edge Function prompt template

```
Você é o assistente da crew Viralatas Metaleiros no Wacken.
Hora atual: {currentTime}. Dia do festival: {festivalDay}.

PICKS DA CREW:
{crewPicks as compact JSON}

SCHEDULE COMPLETO:
{fullSchedule as compact JSON}

Tipo de alerta solicitado: {alertType}

Regras:
- Responda APENAS com a mensagem de notificação
- Máximo 2 frases
- Tom: direto, divertido, metal
- Idioma: português brasileiro
- Termine com 🤘
```

---

### Deliverables

- [ ] `supabase/functions/check-alerts/index.ts` Edge Function
- [ ] Alert cooldown tracking in `user_alerts` table (alert_type, user_id, fired_at)
- [ ] Client-side alert scheduler (Service Worker periodic sync or polling fallback)
- [ ] In-app alert banner component (non-blocking, dismissible)
- [ ] Web Push notification support (when app is backgrounded)
- [ ] Offline conflict alert runs without API call

### Acceptance criteria

- [ ] Conflict alert fires correctly 30 min before a clash
- [ ] No alert fires twice within its cooldown window
- [ ] API key is never present in client bundle (verify with `grep -r "ANTHROPIC" src/`)
- [ ] Alerts arrive in Brazilian Portuguese

### Alert cooldown reference

| Alert | Cooldown |
|---|---|
| Conflict alert | Once per conflicting pair per day |
| Crew split | Once per hour |
| Discovery nudge | Once per gap window |
| Day recap | Once per festival day |

---

## Idea 2 — Badge consolidation (Previously Achieved)

**Goal:** After a festival ends, snapshot every user's earned year-specific badges into a permanent DB table so 2026 wins are still visible in 2027 alongside fresh badge content — and in future years as the history grows.

**When:** Deploy and run ~late July 2026, once the crew is home and festival state is still live in the DB. Must run before any future seed that would wipe picks.

---

### Which badges are consolidated

Only badges where `BadgeConfig.year === festivalYear` (e.g., `year: 2026`) are captured. This field already exists on `BadgeConfig` as the year chip display value — no type change needed.

All badge types qualify:
- Conditional (live-evaluated, e.g. pick-based, seen-based, location)
- `persist: true` (already stored in `user_metadata.achieved_badge_slugs`)
- `assigned` (stored in `users.special_badges`)

Evergreen badges (`puppy`, `pais-tropical`, `belga`, etc.) have no `year` field and are intentionally excluded — they remain live and re-earnable each Wacken.

---

### Schema — dedicated table

> Supersedes the `users.historical_badges jsonb` column approach sketched earlier. A proper relational table is easier to query per-year, has RLS per-row, and extends cleanly without schema churn.

```sql
create table public.user_badge_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  festival_year integer not null,
  slug text not null,
  image_path text not null,   -- frozen from BadgeConfig.imagePath at consolidation time
  label_key text not null,    -- frozen from BadgeConfig.labelKey at consolidation time
  consolidated_at timestamptz not null default now(),
  constraint user_badge_history_unique unique (user_id, festival_year, slug)
);

alter table public.user_badge_history enable row level security;

-- Users can read only their own rows
create policy "Users can read own badge history"
  on public.user_badge_history for select using (auth.uid() = user_id);

-- Godlike can read/insert/update/delete all rows
create policy "Godlike can manage badge history"
  on public.user_badge_history for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'godlike'));
```

---

### Badge images — store path, not binary

Both approaches were evaluated: (a) store `image_path` as a relative path, (b) upload to Supabase Storage for absolute URLs.

**Decision: store `image_path` (the `BadgeConfig.imagePath` value, e.g. `/badges/badge_veteran.png`) frozen at consolidation time.**

Rationale:
- Badge images are stable and shared across years — `badge_puppy.png` will serve Wacken 2027 first-timers just as it served 2026
- The PWA will keep serving future Wackens, so relative paths remain valid
- No image upload step, no Supabase Storage bucket setup, no edge-function file I/O complexity
- Future escape hatch: if the app is ever decommissioned, a single migration adds an `image_url` column backed by Supabase Storage — the path data is already there to drive the upload

---

### Edge Function: `consolidate-year-badges`

```
POST /functions/v1/consolidate-year-badges
Body: { year: 2026 }
Auth: Bearer token — must belong to a godlike user (403 otherwise)
```

**Steps:**

1. Verify caller has `role = 'godlike'` in `public.users`.
2. Fetch all active users: exclude `is_test_user = true` and `is_friend = true`.
3. For each user, assemble a server-side `BadgeContext` by reading:
   - `public.user_picks` + `public.bands` → `pickedBands`, `bandsPicked`, `maxAttendanceInPicks`, `seenBands`
   - `public.user_missed_bands` → `missedBandIds`
   - `auth.users.raw_user_meta_data` → `wacken_years`, `country`, `wacken_arrival_day`, `location_visits`, `achieved_badge_slugs`, `crew_earned_badge_slugs`
   - `public.users.special_badges` → `assignedBadges`
4. Run `getEarnedBadges(context, BADGES)` using copies of `engine.ts` and `registry.ts` inside the function folder (pure TS, no DOM dependencies — ports cleanly to Deno).
5. Filter results to `badge.year === year`.
6. Upsert each earned badge into `user_badge_history` — idempotent due to the `UNIQUE (user_id, festival_year, slug)` constraint.
7. Return `{ processedUsers, savedBadges, skipped, errors }`.

**Function layout:**
```
supabase/functions/consolidate-year-badges/
  index.ts       ← HTTP handler, auth check, orchestration
  engine.ts      ← copy of src/services/badges/engine.ts
  registry.ts    ← copy of src/services/badges/registry.ts
  types.ts       ← copy of src/services/badges/types.ts
```

> Note: keeping copies (not imports) avoids Deno/Node module boundary issues and keeps the function self-contained. When the registry changes for a new year, update both the src copy and the function copy before consolidation runs.

---

### UI — Previously Achieved section

**Location:** `/profile` page, below the current active badge grid.

**For all users:**
- Collapsible section titled "Conquistas Anteriores" / "Previously Achieved" (all 4 locales)
- Groups badges by `festival_year` descending (e.g. "Wacken 2026", then "Wacken 2027" next year)
- Each badge: `<img src={image_path}>` + localized label via `label_key` + year chip (`'26`)
- Section hidden entirely when `user_badge_history` is empty (first-year users)
- Data loaded by new `useUserBadgeHistory()` hook → SELECT from `user_badge_history` where `user_id = auth.uid()`

**For godlike only (Profile admin panel):**
- "Consolidar badges do ano YYYY" button with year selector (defaults to current festival year)
- Confirmation modal: "Isso vai salvar os badges do Wacken YYYY para todos os vira-latas. A ação é idempotente e segura de re-executar."
- After completion: inline result summary ("X vira-latas processados, Y badges salvos, Z erros")

---

### Files

| File | Action |
|------|--------|
| `supabase/migrations/<date>_idea2_user_badge_history.sql` | New table + RLS |
| `supabase/functions/consolidate-year-badges/index.ts` | Edge Function handler |
| `supabase/functions/consolidate-year-badges/engine.ts` | Badge engine copy for Deno |
| `supabase/functions/consolidate-year-badges/registry.ts` | Badge registry copy for Deno |
| `supabase/functions/consolidate-year-badges/types.ts` | Badge types copy for Deno |
| `src/hooks/useUserBadgeHistory.ts` | Fetches `user_badge_history` for current user |
| `src/components/BadgeHistorySection.tsx` | Previously Achieved UI, grouped by year |
| `src/pages/ProfilePage.tsx` | Mount section + godlike consolidation button/modal |
| `src/i18n/ProfilePage_*.json` | 4 locale strings: section title, button label, modal text, result summary |

---

### Acceptance criteria

- [ ] `user_badge_history` migration applies cleanly on a live Supabase project.
- [ ] Consolidation is idempotent: re-running for the same year adds no duplicate rows.
- [ ] Non-godlike callers receive 403 from the edge function.
- [ ] Frozen badges remain visible in "Previously Achieved" even after their underlying live condition no longer holds (e.g. user removes picks, location count drops).
- [ ] Evergreen badges (no `year` field on `BadgeConfig`) are excluded from the snapshot.
- [ ] Previously Achieved section is hidden when `user_badge_history` is empty.
- [ ] Badge images resolve correctly from `image_path` in the Previously Achieved view.

---

## Idea 3 — Unit tests: IDB layer (`lib/db.ts`)

**Goal:** Achieve ~80% branch coverage on `lib/db.ts` (506 lines), the entire offline IndexedDB abstraction, using a real in-memory IDB implementation so tests exercise the actual schema and version migrations.

**Prerequisite:** Install `fake-indexeddb` as a dev dependency (`npm install --save-dev fake-indexeddb`). Scope it to `db.test.ts` only — keep the existing minimal `window.indexedDB` stub in `setup.ts` for all other test files.

**New dev dependency:**
```bash
npm install --save-dev fake-indexeddb
```

### Test file: `src/__tests__/db.test.ts`

| Test group | Cases |
|---|---|
| Bands | `saveBand` / `loadBands` round-trip |
| Picks | `saveUserPick` / `removeUserPick` / `replaceUserPicks` (per-user replace leaves other users' picks intact) |
| Offline queue | `enqueueOfflinePick` / `loadOfflineQueue` / `removeFromOfflineQueue` |
| Presence | `saveUserPresence` / `loadUserPresence` / `replaceUserPresence` |
| Announcements | `loadLatestAnnouncement` returns entry with most recent `created_at` |
| Window events | `PICKS_CHANGED_EVENT` fires after save/remove pick; `PRESENCE_CHANGED_EVENT` fires after presence write |

### Vitest config additions

Add coverage thresholds to `vitest.config.ts` once this stage ships:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  thresholds: {
    lines: 90,
    functions: 90,
    branches: 85,
    statements: 90,
  },
  exclude: [
    'src/supabase.types.ts',
    'src/vite-env.d.ts',
    'src/version.ts',
    'src/i18n/**',
    '**/*.module.css',
  ],
},
```

**Files:** `src/__tests__/db.test.ts`, `vitest.config.ts`, `package.json` (new dev dep).

**Acceptance criteria:**
- [ ] `fake-indexeddb` is a dev-only dependency; production bundle unchanged.
- [ ] All IDB round-trip tests pass without touching the real browser IDB.
- [ ] Window events (`PICKS_CHANGED_EVENT`, `PRESENCE_CHANGED_EVENT`, etc.) are asserted in tests.
- [ ] Coverage thresholds gate is applied in `vitest.config.ts` and CI passes.

---

## Idea 4 — Unit tests: Hook logic (pure memoized computations)

**Goal:** Cover the deterministic derivation logic inside key hooks using `renderHook` from RTL. Mocks target Supabase channels and IDB. Side effects (realtime subscriptions, flush loops) are not in scope — focus is on the pure computed outputs.

**Prerequisite:** Stages 1–3 from the test plan must be complete (pure function extractions already done). Relies on the extracted `computeAttendees` from `services/attendees.ts` and `countPicks` from `hooks/usePickCounts.ts`.

### Test files

#### `src/__tests__/useNowData.logic.test.ts`

| Case | Description |
|---|---|
| `presenceValue` — camping | `is_camping = true`, plan not currently active → `'camping'` |
| `presenceValue` — metal_place | `is_at_metal_place = true`, within metal-place window → `'metal_place'` |
| `presenceValue` — default | No special flags set → `'auto'` |
| `isMetalPlaceWindowActive` | Outside time window gates the metal_place presence value |
| `crewPlans` completeness | Always includes the current user even when absent from `crewUsers` |

#### `src/__tests__/usePickCounts.test.ts`

| Case | Description |
|---|---|
| Basic count | `countPicks()` returns correct `{ [band_id]: number }` map from a `UserPick[]` array |

#### `src/__tests__/useBandAttendees.test.ts`

| Case | Description |
|---|---|
| Grouping | `computeAttendees()` groups picks by `band_id` |
| Hydration | Matches each entry with `CrewUser` display names |

**Files:** `src/__tests__/useNowData.logic.test.ts`, `src/__tests__/usePickCounts.test.ts`, `src/__tests__/useBandAttendees.test.ts`.

**Acceptance criteria:**
- [ ] All derivation tests pass without mounting real Supabase subscriptions.
- [ ] `useNowData.logic.test.ts` covers the three `presenceValue` branches and the `crewPlans` completeness invariant.
- [ ] `countPicks` and `computeAttendees` are tested as pure functions (no `renderHook` overhead needed).

---

## Idea 5 — Unit tests: Component and page integration

**Goal:** Mount real page and component trees with RTL + `I18nProvider`, mock out hooks and repositories, and assert rendered output. These tests replace the three misleading stub files (`registration.test.ts`, `login.test.ts`, `auth-integration.test.ts`) that do not import any app code.

**Prerequisite:** Stages 1–4 complete. All pure function extractions in place. Misleading stub tests removed as part of this work.

### Test files

#### `src/__tests__/SchedulePage.test.tsx`

| Case | Description |
|---|---|
| Initial render | Band list loaded from mocked IDB renders correctly |
| Day filter | Selecting a day hides bands from other days |
| Stage filter | Multi-select stage filter shows only matching bands |
| Pick toggle | Clicking pick button calls `picksRepository.toggle` with correct arguments |

#### `src/__tests__/LoginPage.test.tsx` _(replaces `login.test.ts`)_

| Case | Description |
|---|---|
| Empty email | Shows validation error without calling Supabase |
| Empty password | Shows validation error without calling Supabase |
| Valid submit | Calls `supabase.auth.signInWithPassword` with correct credentials |
| Supabase error | Error response renders error message to user |

#### `src/__tests__/RegisterPage.test.tsx` _(replaces `registration.test.ts`)_

| Case | Description |
|---|---|
| Short password | Shows validation error |
| Missing display name | Shows validation error |
| Valid submit | Calls `supabase.auth.signUp` with correct metadata shape (`display_name`, `preferred_language`, `is_test_user: false`) |

**Files:** `src/__tests__/SchedulePage.test.tsx`, `src/__tests__/LoginPage.test.tsx`, `src/__tests__/RegisterPage.test.tsx`; delete `src/__tests__/registration.test.ts`, `src/__tests__/login.test.ts`, `src/__tests__/auth-integration.test.ts`.

**Acceptance criteria:**
- [ ] Misleading stub tests deleted; replaced by tests that actually import and exercise app code.
- [ ] `SchedulePage` filter and toggle behavior tested end-to-end through the component tree.
- [ ] Auth page tests assert on real form validation logic and correct Supabase call shapes.
- [ ] All new tests pass with `npm test`.
