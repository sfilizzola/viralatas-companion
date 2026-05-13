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
| 6 | Multi-stage / multi-genre badge conditions | Low | Low — additive condition types, registry-only, no schema change | **implemented (2026-05-13)** |
| 7 | Closing-ceremony slot (non-band timetable entry) | Low | Low — single nullable column on `bands`, registry untouched, narrow scope | pending |
| 8 | Test/preview mode for persistent badges (no metadata writes) | Low | Low — dev-only switch in `BadgesDisplay`, no schema change, opt-in | pending |

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

---

## Idea 6 — Multi-stage / multi-genre badge conditions

> **Status: implemented (2026-05-13).** Shipped with 4 plural-form `BadgeCondition` variants (`bands_picked_stages_min`, `bands_picked_genres_min`, `bands_seen_stages_min`, `bands_seen_genres_min`), matching engine branches, registry CONDITION EXAMPLES, and 18 new test cases in `src/__tests__/badges.test.ts`. Safe to remove this section in a follow-up cleanup pass. See `docs/ai-wiki/changelog.md` (2026-05-13 entry) and the updated `docs/ai-wiki/badges.md`.

**Goal:** Let a single badge reward presence across **a set of stages or genres**, not just one. Concrete motivation: at Wacken, `Faster` and `Harder` are physically adjacent in the Main Infield — a vira-lata who hangs around that corridor and racks up N seen bands across both deserves a badge ("Infield Rat", "Riff Boulevard", etc.). The same shape extends naturally to genre families (e.g. "Extreme Metal" = `Death Metal` ∪ `Black Metal` ∪ `Grindcore`).

### Why now is a good time

The current conditions are 1-stage and 1-genre only, which makes the registry repetitive and forces an artificial choice when designing "vibe" badges. We already have stable seen/picked plumbing (`ctx.seenBands`, `ctx.pickedBands`) and a `BadgeCondition` discriminated union that is trivially extensible.

### Current shape

```ts
// src/services/badges/types.ts
| { type: 'bands_picked_stage_min'; stage: string; count: number }
| { type: 'bands_picked_genre_min'; genre: string; count: number }
| { type: 'bands_seen_stage_min';   stage: string; count: number }
| { type: 'bands_seen_genre_min';   genre: string; count: number }
```

### Proposed shape (additive — no breaking change)

Add four new plural-form condition types that accept arrays. Keep the existing singular forms intact so the 8 badges already in `BADGES[]` (`death-metal`, `power-metal`, `party-metal`, etc.) require no migration.

```ts
// src/services/badges/types.ts
| { type: 'bands_picked_stages_min'; stages: string[]; count: number }
| { type: 'bands_picked_genres_min'; genres: string[]; count: number }
| { type: 'bands_seen_stages_min';   stages: string[]; count: number }
| { type: 'bands_seen_genres_min';   genres: string[]; count: number }
```

**Semantics:** A band counts toward the threshold if its `stage` (or `genre`) is included in the configured array — i.e. set-membership, OR-combined within the array. The badge is earned when total matching bands `>= count`.

> **Note:** This is OR-within-the-array, not AND-across-stages. "Saw 5 bands across Faster ∪ Harder" means *any combination summing to 5*. We do **not** also require ≥1 from each stage; if a use case for that ever appears, it would be a separate `*_across_all_stages_min` condition.

### Engine implementation

In `src/services/badges/engine.ts`, four new `case` branches reuse the existing `pickedBands` / `seenBands` arrays. Implementation is one-liners using `Set` membership for O(1) lookup:

```ts
case 'bands_seen_stages_min': {
  const set = new Set(condition.stages);
  return ctx.seenBands.filter((b) => set.has(b.stage)).length >= condition.count;
}
case 'bands_seen_genres_min': {
  const set = new Set(condition.genres);
  return ctx.seenBands.filter((b) => b.genre != null && set.has(b.genre)).length >= condition.count;
}
case 'bands_picked_stages_min': {
  const set = new Set(condition.stages);
  return ctx.pickedBands.filter((b) => set.has(b.stage)).length >= condition.count;
}
case 'bands_picked_genres_min': {
  const set = new Set(condition.genres);
  return ctx.pickedBands.filter((b) => b.genre != null && set.has(b.genre)).length >= condition.count;
}
```

No changes needed to `BadgeContext`, `buildBadgeContext`, or any repository — the data the new branches need is already in `ctx`.

### Registry: example badges this unlocks

```ts
// Saw 6+ bands while hanging out on the Faster ↔ Harder corridor
{
  slug: 'infield-rat',
  imagePath: '/badges/badge_infield-rat.png',
  labelKey: 'badgeInfieldRat',
  descriptionKey: 'badgeInfieldRatDescription',
  condition: { type: 'bands_seen_stages_min', stages: ['Faster', 'Harder'], count: 6 },
  year: 2026,
},
// Wacken 2026 extreme-metal devotee — saw 5+ across all heavy sub-genres
{
  slug: 'extreme-devotee',
  imagePath: '/badges/badge_extreme-devotee.png',
  labelKey: 'badgeExtremeDevotee',
  descriptionKey: 'badgeExtremeDevoteeDescription',
  condition: {
    type: 'bands_seen_genres_min',
    genres: ['Death Metal', 'Black Metal', 'Grindcore', 'Brutal Death Metal'],
    count: 5,
  },
  year: 2026,
},
```

### Alternative shapes considered

| Approach | Verdict |
|---|---|
| **A. Plural-form additive types (`*_stages_min`)** — recommended | ✅ Zero migration. Backward compatible. Clear at the call site (singular = 1, plural = many). Symmetric with existing seen/picked split. |
| B. Widen field to `stage: string \| string[]` on existing types | ❌ Breaks discriminated-union narrowing in `engine.ts`. Mixes singular/plural reading at the call site. Forces `Array.isArray()` guard everywhere. |
| C. Replace `stage: string` with `stages: string[]` and migrate registry | ❌ Touches every existing music/stage badge. Higher diff, no behavioral upside over A. |
| D. Generic combinator wrapper (`{ type: 'any_of'; conditions: [...] }`) | ❌ Overkill — pulls badge logic toward a tiny DSL we don't need. Reconsider only if we ever want AND/NOT across heterogeneous conditions. |

Option A is the cheapest, least-risky generalisation that still scales to any future "set membership" feature (e.g. multi-day, multi-country) by mirroring the same plural-form pattern.

### Files

- `src/services/badges/types.ts` — extend the `BadgeCondition` union with 4 new variants.
- `src/services/badges/engine.ts` — 4 new `case` branches in `evaluateBadge`.
- `src/services/badges/registry.ts` — extend the CONDITION EXAMPLES block at the bottom with 4 new entries; optionally add the example "Infield Rat" / "Extreme Devotee" badges.
- `src/__tests__/badges.test.ts` — 4 new test groups (single-element-array equivalence, multi-element OR, empty array = never earned, missing genre on bands is skipped).
- `public/badges/badge_*.png` — only if shipping the example badges above.
- `src/i18n/Badges_{br,en,es,de}.json` — only if shipping the example badges above.

### Acceptance criteria

- [x] All four new condition types compile and narrow correctly in `evaluateBadge`'s `switch` (TS exhaustiveness preserved). _Verified via `tsc --noEmit`._
- [x] Single-element-array behavior is identical to the existing singular condition for the same stage/genre. _Covered by 4 test cases (one per new variant)._
- [x] Multi-element-array behavior sums matches across listed stages/genres. _Covered by 4 test cases._
- [x] Bands with `genre = null` are excluded from `*_genres_min` counts. _Covered by dedicated test cases for both picked and seen genres variants._
- [x] All existing badges in `BADGES[]` keep working unchanged — no registry migration required. _Full `badges.test.ts` suite (54 tests) passes._
- [x] `src/services/badges/registry.ts` CONDITION EXAMPLES section documents the four new types with the same prose style as the existing entries.

---

## Idea 7 — Closing-ceremony slot (non-band timetable entry)

**Goal:** Model the traditional Wacken closing ceremony (the owners' farewell + "Sad Song" sing-along) as a first-class timetable entry — pickable by vira-latas, visually distinct, and respectfully kept out of music-badge counts.

**Scope:** Narrow. One ceremony slot per festival year. No opening ceremony, daily anthem, fireworks, or other event types in scope — those would each be a follow-up.

### Behavior summary (decided)

| Aspect | Decision |
|---|---|
| Modeling approach | Add a `category` column to `bands` (Approach 1 from research). No new table. |
| Pickable | ✅ Yes — uses existing `user_picks`. Crew RSVP count and avatars render like any band. |
| Counts toward music badges | ❌ No — excluded from every `bands_picked_*` and `bands_seen_*` condition via filter in `buildBadgeContext`. |
| Conflict alerts on overlap | ❌ No — overlap with another pick at the same time produces no warning. |
| Dedicated ceremony badge | ❌ No — ceremonial, not gamified. |

### Schema change

```sql
-- supabase/migrations/<date>_idea7_band_category.sql
alter table public.bands
  add column category text not null default 'band'
  check (category in ('band', 'ceremony'));

-- Optional index (probably overkill at 78+1 rows, skip unless query plans need it)
-- create index bands_category_idx on public.bands(category);
```

`'band'` is the default, so every existing row stays exactly as-is. `'ceremony'` is opt-in for the new slot.

### Type updates

```ts
// src/types/index.ts
export type Band = {
  id: string;
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  genre: string | null;
  category: 'band' | 'ceremony';  // NEW (defaults to 'band' from DB)
};

// src/services/badges/types.ts
export type BadgeBand = Pick<Band,
  'id' | 'name' | 'stage' | 'start_time' | 'end_time' | 'genre' | 'category'
>;
```

### Badge engine: auto-exclusion via context filter

The cleanest place to exclude ceremonies from every existing badge in one shot is `buildBadgeContext` — filter at the source, so all 13+ `bands_picked_*` / `bands_seen_*` conditions stay protected without touching `evaluateBadge` at all.

```ts
// src/services/badges/engine.ts
const pickedBands = userPickBandIds
  .map((id) => bandsById.get(id))
  .filter((b): b is BadgeBand => b !== undefined)
  .filter((b) => b.category === 'band');  // NEW: ceremonies never count toward music badges
```

This single line guarantees:
- `bands_seen_min`, `bands_picked_min` → ceremony does not inflate totals.
- `bands_seen_genre_min`, `bands_seen_stage_min`, `*_before_hour_min`, `*_after_hour_min` → ceremony is invisible (it has `genre: null` and a stage that *would* match `Faster`/`Harder`/`Louder`, so the filter is essential).
- `band_seen_named`, `band_picked_named` → ceremony can never accidentally satisfy a named-band badge.
- All future plural-form badges from Idea 6 inherit the same protection for free.

### UI treatment

| Surface | Rendering |
|---|---|
| `/schedule` | Card with a gold/silver border, no genre line, label "Closing Ceremony" (i18n), no "pick" toggle override — just the same heart/check pattern as any pick. |
| `/now` | When live: full-width hero card, same special styling. When upcoming within an hour: standard "next up" card with the same border treatment. |
| `/my-picks` | Renders identically to a picked band, with the same border treatment so it's visually grouped at the right slot. |
| `/popular` | Either include it (with the special styling) or exclude it entirely from the popularity list. Recommendation: **include it** so vira-latas can see who's planning to be at the farewell — that's the whole point. |

**i18n keys (new):**
- `scheduleClosingCeremony` — short label shown on the card ("Cerimônia de Encerramento" / "Closing Ceremony" / "Schlusszeremonie" / "Ceremonia de Cierre").
- No translation of the row's `name` itself — keep the canonical name in the DB (e.g. `"Wacken Farewell"` or whatever the team prefers) and surface the category label via i18n.

### Seed data (one row, godlike-curated)

Add a single entry to `supabase/seed/bands.ts` with `category: 'ceremony'`, placed on whichever Main Infield stage the festival actually uses for the farewell (typically Faster on Saturday late afternoon). Genre stays `null`. Real start/end times to be filled when Wacken publishes them.

```ts
// supabase/seed/bands.ts (excerpt)
{
  name: 'Wacken Farewell',
  stage: 'Faster',
  start_time: '2026-08-01T17:00:00+02:00',  // TBD from Wacken's published schedule
  end_time:   '2026-08-01T17:30:00+02:00',  // TBD
  image_url: '/ceremony/wacken-farewell-2026.png',
  genre: null,
  category: 'ceremony',
},
```

### Files

- `supabase/migrations/<date>_idea7_band_category.sql` — single `alter table` + check constraint.
- `src/types/index.ts` — add `category` to `Band`.
- `src/lib/supabase.ts` — extend the generated/manual `bands` row type (or regenerate `supabase.types.ts` after running the migration locally).
- `src/services/badges/types.ts` — add `category` to `BadgeBand`.
- `src/services/badges/engine.ts` — single filter line in `buildBadgeContext`.
- `src/pages/SchedulePage.tsx` — branch on `band.category` for card styling.
- `src/pages/NowPage.tsx` (or wherever `/now` lives) — same branch in the hero/now-card renderer.
- `src/components/<BandCard>.tsx` — accept a `category` prop and toggle the special border + label.
- `src/i18n/{br,en,es,de}.json` — `scheduleClosingCeremony` label.
- `supabase/seed/bands.ts` — one ceremony entry per festival year.
- `src/__tests__/badges.test.ts` — new test: picking a `category: 'ceremony'` row does not satisfy `bands_picked_min`, `bands_picked_stage_min`, `bands_seen_min`, or `band_seen_named`.

### Acceptance criteria

- [ ] Migration applies cleanly; all existing 78+ bands have `category = 'band'` post-migration.
- [ ] Check constraint rejects any value outside `('band', 'ceremony')`.
- [ ] Ceremony row renders on `/schedule` with distinct styling and "Closing Ceremony" label.
- [ ] Picking the ceremony writes to `user_picks` and shows the crew RSVP count, just like a band.
- [ ] Picking the ceremony does **not** increment any music-badge count (`bands_picked_min`, `bands_seen_min`, `bands_*_stage_min`, `bands_*_genre_min`, `band_*_named`) — covered by new test cases.
- [ ] Overlapping picks (band + ceremony at the same time) produce **no** conflict alert.
- [ ] Offline-first behavior intact: ceremony row syncs into IndexedDB exactly like a band; picks made offline queue and flush on reconnect.
- [ ] No regression on existing badges (full `badges.test.ts` suite passes).

### Deferred (out of scope, parked here for future reference)

- Opening ceremony, daily Wacken anthem, fireworks slot, marching-band parade → add new `category` values when needed (`'opening'`, `'anthem'`, `'fireworks'`). The check constraint becomes the migration site.
- Ceremony-specific badge (`event_attended_named` condition) → introduce only if the team later wants to gamify it.
- Auto-pick-on-login behavior → can be layered on top by inserting a `user_picks` row at session bootstrap for any unpicked `'ceremony'` rows, without touching anything in this idea's scope.

---

## Idea 8 — Test/preview mode for persistent badges (no metadata writes)

**Goal:** Let a developer (or godlike user) verify a `persist: true` badge end-to-end in the running app — its icon, year chip, label, description, grid placement, modal — **without** the act of viewing it permanently writing the slug into `user.user_metadata.achieved_badge_slugs[]`. Today the only ways to QA a persistent badge in the live app are: (a) actually earn it and accept the metadata pollution, (b) flip `persist: true → false` in the registry temporarily, or (c) burn a `seed:test-users` account. All three are friction; none is reversible without a manual cleanup step.

### Why now is a good time

The auto-record block in `BadgesDisplay.tsx` is a single 12-line `if (newlyAchieved.length > 0)` branch. Gating it behind a flag is mechanical, has no schema implications, and removes the only "you can't safely look at it" constraint in the badge system. It also makes the godlike admin "Assign Badge" UI safer to demo.

### Current shape (the side effect we want to bypass)

```113:124:src/components/BadgesDisplay.tsx
      if (newlyAchieved.length > 0) {
        supabase.auth.updateUser({
          data: {
            achieved_badge_slugs: [
              ...(user.user_metadata?.achieved_badge_slugs ?? []),
              ...newlyAchieved,
            ],
          },
        }).catch(() => {
          // badge earning is best-effort
        });
      }
```

### Proposed mechanism — three layered options (pick one or stack)

| Option | Where it lives | Persistence touched? | Cleanup needed? |
|---|---|---|---|
| **8a — `?badgePreview=1` URL flag** | Read once in `BadgesDisplay`, short-circuits the `updateUser` block | No | No (close the tab) |
| **8b — Godlike-only "Preview mode" toggle on `/profile`** | Stored in `sessionStorage` (not localStorage — dies with tab) | No | No |
| **8c — Per-evaluation override via dev console** | `window.__viralatas_badgePreview = true` for ad-hoc QA | No | No |

Recommendation: **ship 8a alone first.** It's three lines, requires zero UI, and covers the 95% case ("I want to see what this badge looks like in my profile right now without committing"). 8b is worth adding later if godlike users start using it for screenshots / demos. 8c is escape-hatch only.

### Engine-level hook

`evaluateBadge` already returns `true` for any `persist: true` badge whose slug is in `ctx.achievedBadgeSlugs`, so preview mode does **not** need to change evaluation logic at all — it only needs to suppress the write. The badge will still appear in the UI as long as the live condition is true; it just won't be recorded for next session.

### Implementation sketch (Option 8a)

```ts
// src/components/BadgesDisplay.tsx (inside refresh())
const isPreviewMode =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('badgePreview') === '1';

// ...build newlyAchieved as today...

if (newlyAchieved.length > 0 && !isPreviewMode) {
  supabase.auth.updateUser({
    data: {
      achieved_badge_slugs: [
        ...(user.user_metadata?.achieved_badge_slugs ?? []),
        ...newlyAchieved,
      ],
    },
  }).catch(() => {
    // badge earning is best-effort
  });
}
```

A small `<aside>` banner ("🔬 Badge preview mode — nothing will be recorded") at the top of the badges section while the flag is on prevents foot-guns where someone forgets they're in preview and assumes their state is sticky.

### Same gate applies to `crew_at_location_min`

The location-bonding badges write into `crew_earned_badge_slugs[]` from a separate code path; if we ship 8a, the same `isPreviewMode` check should suppress that write too. Otherwise "preview mode" only works for half the persistent badges, which is worse than not having it.

### Files

- `src/components/BadgesDisplay.tsx` — read URL/sessionStorage flag, gate the `supabase.auth.updateUser` call, render the small "preview mode" banner.
- `src/components/BadgesDisplay.module.css` — banner styling.
- Wherever the `crew_earned_badge_slugs` write lives (likely a hook adjacent to `useNowData` or a presence-driven effect) — same gate applied.
- `src/i18n/{br,en,es,de}.json` — short banner string (e.g. `badgePreviewMode`).
- `docs/ai-wiki/badges.md` — add a "Testing persistent badges safely" subsection under **Testing Badges** pointing to this flag.

### Acceptance criteria

- [ ] Visiting `/profile?badgePreview=1` shows all earned badges (including `persist: true` ones) but writes nothing to `user_metadata.achieved_badge_slugs` or `crew_earned_badge_slugs`.
- [ ] Closing/reopening the tab without the flag returns to normal behavior — no leftover preview state.
- [ ] A visible banner indicates preview mode is active, so it can't silently mislead a user.
- [ ] Non-persistent badges (`persist: false`/omitted) behave identically with or without the flag.
- [ ] Both auto-record paths are gated (`achieved_badge_slugs` and `crew_earned_badge_slugs`).
- [ ] No production bundle change beyond the new gate; flag is purely opt-in.

### Alternatives considered

| Approach | Verdict |
|---|---|
| **A. URL flag (`?badgePreview=1`)** — recommended | ✅ Zero UI, opt-in per page load, dies with the tab. |
| B. Env-gated dev-only build | ❌ Useless for QA against production data. |
| C. Always evaluate but never persist (i.e. drop `persist` writes entirely) | ❌ Breaks the "badge is recorded once earned" semantic for real users — that's the whole point of `persist: true`. |
| D. Mock `supabase.auth.updateUser` in a separate test harness | ❌ Heavy, only useful for a single-time check, doesn't help godlikes demo on their phone. |
| E. Add a per-badge `previewable: true` flag in registry | ❌ Pushes the concern into every config row instead of keeping it as a viewer-side toggle. |

Option A is the cheapest gate that fully removes the "side effect of looking at it" without changing real persistence semantics for anyone else.

### Deferred (out of scope, parked here for future reference)

- A godlike-only "reset my achieved_badge_slugs" admin button → useful for cleaning up if someone *did* earn a test badge. Separate concern; would live in `/profile` admin panel.
- An audit log of when each persistent badge was first recorded → only worth it if disputes ever come up.
- Extending preview mode to `assigned`-condition badges (so godlikes can preview an assignment before committing it) → currently low value because assignment is already an explicit, reversible action.
