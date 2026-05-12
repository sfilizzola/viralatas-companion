# FUTURE_IDEAS.md — Nice-to-Have Features

Ideas and features that would enhance the app but are not yet scheduled for implementation. Numbered independently of phase numbering.

> **Rule:** When adding a new idea, evaluate its complexity and risk and add a row to the table below before writing the full spec.

## Ideas at a glance

| # | Title | Complexity | Risk |
|---|---|---|---|
| 1 | LLM proactive alerts | High | Medium — API key handling, alert spam, offline edge cases |
| 2 | Year freeze for historical badges | Medium | Low — godlike-only, idempotent, additive schema change |
| 3 | Unit tests: IDB layer (`lib/db.ts`) | Medium | Low — requires `fake-indexeddb` dev dependency; isolated from app runtime |
| 4 | Unit tests: Hook logic (pure memoized computations) | Medium | Low — `renderHook` + mocked IDB and Supabase; no network |
| 5 | Unit tests: Component and page integration | High | Low — replaces misleading stub tests; mounts pages with RTL + mocked hooks |

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

## Idea 2 — Year freeze for historical badges

**Goal:** Snapshot each user's earned badges at the end of a festival year so 2026 wins are still visible in 2027 alongside fresh badge content.

**When:** Defer until ~late July 2026 (post-festival). Needs to land before the crew goes home so the snapshot is taken while festival state is still live.

**Schema:**
```sql
alter table public.users
  add column historical_badges jsonb not null default '[]'::jsonb;
```

Each entry: `{ slug: string; year: number; earnedAt: string }`.

**`BadgeConfig` extension** (stub `yearBound` already allowed in 10a/10b badge configs — no code change needed when this ships):
```ts
type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;
  condition: BadgeCondition;
  yearBound?: number;  // present on 10a/10b badges that depend on a specific festival year
};
```

Existing badges (`puppy`, `pais-tropical`, `belga`, etc.) leave `yearBound` undefined → they remain evergreen.

**Freeze mechanism:** Godlike-only Edge Function `supabase/functions/freeze-year-badges/index.ts`. Request body: `{ year: 2026 }`.

1. Verify caller is godlike.
2. For every user: load picks + missed records + metadata, build a server-side `BadgeContext`, evaluate all badges with `yearBound === year`, collect earned slugs.
3. Upsert into `users.historical_badges`: append new `{ slug, year, earnedAt: now }` entries; de-dupe by `(slug, year)`.
4. Idempotent on re-run.

**UI:**
- New section in `/profile` (godlike only) — single "Freeze badges for year YYYY" button with confirmation modal.
- `BadgesDisplay` / patches grid: year chip (`'26`-style mono, bottom-right corner) on any historically-frozen patch. Chip is already stubbed (skipped when `historical_badges` is absent) from Phase G of the design migration.

**Files:** `supabase/migrations/<date>_idea2_historical_badges.sql`, `supabase/functions/freeze-year-badges/index.ts`, `src/lib/badges.ts`, `src/lib/supabase.ts`, `src/components/BadgesDisplay.tsx`, `src/pages/ProfilePage.tsx`, `src/i18n/Badges_*.json`.

**Acceptance criteria:**
- [ ] `historical_badges` migration applies cleanly on a live Supabase project.
- [ ] Godlike "Freeze year" action snapshots correctly and is idempotent.
- [ ] Frozen badges stay visible after their underlying live condition changes (e.g. user unpicks a band) with a "Wacken YYYY" chip.
- [ ] Non-godlike users cannot call the freeze Edge Function (403 returned).

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
