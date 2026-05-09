# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

> **Phases 8, 9, and 9.B** are complete. See the completed-phases list in [CLAUDE.md](CLAUDE.md). Phase 9 shipped page differentiation + the shared `BandCard` / `BandFilters` / `BandDetailModal` / `useBandConflicts` extracts. Phase 9.B added the godlike time-travel override (`now()` + `useNow`, festival quick-jump chips in Profile).

---

## Phase 10 — Badge expansion: characteristics, seen-tracking, year freeze `[10a engine done · content deferred]`

**Goal:** Expand the badge system to reward (a) the *kind* of metal a user goes for via band-property filters, (b) bands actually attended (not just picked), and (c) badges that close at the end of each festival year so 2026 wins persist into 2027 alongside fresh content.

Three independent sub-phases:

| | Scope | Risk |
|---|---|---|
| **10a** | Characteristic badges (picks-based) — new `BadgeCondition` types, no DB changes | Low |
| **10b** | Seen-tracking + extended `BandDetailModal` — new table, IDB v8, modal extension | High |
| **10c** | Year freeze — `users.historical_badges jsonb`, godlike-triggered Edge Function | Low (deferred until late July 2026) |

### Architectural decisions

| Decision | Choice |
|---|---|
| "Seen" mechanism | Picks-based, auto-credited after `end_time` passes. User can opt out via "I didn't see it" toggle. |
| Opt-out availability | Toggle only appears after `band.end_time < now`. |
| Missed-bands storage | Supabase table `user_missed_bands` + IDB mirror, offline queue, only stores **negatives**. |
| Detailed band card location | Inside the Phase 9 `BandDetailModal`, opened from Popular. Schedule and My Picks keep the simpler card. |
| Year-freeze mechanism | `users.historical_badges jsonb` snapshot column, godlike-triggered. |

---

### Phase 10a — Characteristic badges (picks-based) `[engine ✅ · content deferred]`

Engine work shipped: four new condition types, `BadgeContext.pickedBands`, `buildBadgeContext` now takes a `Map<string, BadgeBand>` of the cached band catalog, `BadgesDisplay` joins picks against `loadBands()`. Covered by `src/__tests__/badges.test.ts` (15 cases). `bands_picked_before_hour_min` uses raw CEST hour `<` threshold (matches `bandTime.ts`'s simple `+02:00` offset).

Content (BR/EN i18n + new PNG + concrete `BadgeConfig` entries) is deferred until new badge assets land in `public/badges/`.

Pure additive extension to `src/lib/badges.ts` + i18n. No DB changes, no new UI surface.

**New condition types:**
```ts
| { type: 'bands_picked_genre_min';        genre: string;  count: number }
| { type: 'bands_picked_stage_min';        stage: string;  count: number }
| { type: 'bands_picked_before_hour_min';  hour: number;   count: number }   // local festival time
| { type: 'band_picked_named';             name: string }
```

`hour` uses Wacken local time (CEST, +02:00) — `Intl.DateTimeFormat` with TZ `Europe/Berlin` gives festival-local hour from a band's `start_time`.

**Engine changes (`src/lib/badges.ts`):**
- Extend `BadgeContext` with `pickedBands: Pick<Band, 'id' | 'name' | 'stage' | 'start_time' | 'end_time' | 'genre'>[]`.
- `buildBadgeContext()` becomes async (or accepts a `bands` arg). `BadgesDisplay` already loads picks; it now also loads the band catalog from IDB and joins on `band_id`.
- Add four cases to `evaluateBadge()`. Each is a one-liner array filter + count comparison.

**Badge content (deferred to implementation):** which badges to ship (e.g. "Pirate Soul: 5 Pirate Metal picks", "Early Bird: 3 picks before 13:00") is a per-asset content decision. Implementation inventories `public/badges/` for unassociated images and asks the user per-badge — same flow Phase 8 used.

**Files:** `src/lib/badges.ts`, `src/components/BadgesDisplay.tsx`, `src/i18n/Badges_br.json`, `src/i18n/Badges_en.json`, `public/badges/<new>.png`.

---

### Phase 10b — Seen-tracking + extended detail modal

**Migration:** `supabase/migrations/<date>_phase10b_user_missed_bands.sql`

```sql
create table public.user_missed_bands (
  user_id uuid not null references public.users(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  marked_at timestamptz not null default now(),
  primary key (user_id, band_id)
);

alter table public.user_missed_bands enable row level security;

create policy "users can view all missed records"
  on public.user_missed_bands for select using (true);
create policy "users can insert their own missed"
  on public.user_missed_bands for insert with check (auth.uid() = user_id);
create policy "users can delete their own missed"
  on public.user_missed_bands for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_missed_bands;
```

Mirrors the `user_picks` pattern.

**Derived "seen" definition** (no new column, no counter table). A pick counts as **seen** iff:
1. The user has a row in `user_picks` for the band, AND
2. `band.end_time < now()`, AND
3. There is **no** row in `user_missed_bands` for `(user_id, band_id)`.

Computed in-memory from cached IDB data. The `now()` here uses the Phase 9.B helper, so the godlike time-travel override automatically lets you preview seen-tracking before the festival.

**Client storage:** `src/lib/db.ts` bumps DB version **7 → 8**, adding two stores:
- `user_missed_bands` — keyed by composite `${user_id}|${band_id}`, indexed by `user_id`
- `offline_missed_bands` — pending writes when offline, mirrors `offline_picks`

New file `src/lib/missed.ts` exposes `loadMissedBands`, `markMissed`, `unmarkMissed`, `syncMissedBands`, `subscribeToMissedRealtime`. Emits a `MISSED_CHANGED_EVENT` so `BadgesDisplay` and the modal re-render.

**New `BadgeCondition` types (mirrors 10a):**
```ts
| { type: 'bands_seen_min';                count: number }
| { type: 'bands_seen_genre_min';          genre: string;  count: number }
| { type: 'bands_seen_stage_min';          stage: string;  count: number }
| { type: 'bands_seen_before_hour_min';    hour: number;   count: number }
| { type: 'band_seen_named';               name: string }
```

`BadgeContext` gains `seenBands` (subset of `pickedBands`) and `missedBandIds: Set<string>`.

**`BandDetailModal` extension** — three additions:

1. **Crew breakdown** — under the band name, two numbers: "X picked" and (post `end_time`) "Y actually saw" (counts crew picks not in `user_missed_bands` whose band has ended).
2. **Conflict warning** — if this pick overlaps another pick of the same user on a different stage. Uses `useBandConflicts` from Phase 9.
3. **"Não vi essa banda" toggle** — visible only when the current user has the band picked AND `band.end_time < now`. Tap → `markMissed` → "marked missed" state with "Undo" → tap → `unmarkMissed`. Optimistic update (write IDB first, queue Supabase).

Schedule and My Picks cards stay untouched.

**Files:** `supabase/migrations/<date>_phase10b_user_missed_bands.sql`, `src/lib/db.ts` (v8), `src/lib/missed.ts` (new), `src/lib/badges.ts`, `src/components/BadgesDisplay.tsx`, `src/components/BandDetailModal.tsx`, `src/i18n/Common_*.json`, `src/types/index.ts`, `src/__tests__/missed.test.ts`.

**Offline-first:**
- Marking missed while offline: writes IDB, enqueues, surfaces immediately in modal.
- Reconnect: flushes queue to Supabase; Realtime pulls back any other-device writes.
- IDB v8 upgrade must preserve existing v7 data.

---

### Phase 10c — Year freeze for historical badges

Defer until ~late July 2026.

**Schema:**
```sql
alter table public.users
  add column historical_badges jsonb not null default '[]'::jsonb;
```

Each entry: `{ slug: string; year: number; earnedAt: string }`.

**`BadgeConfig` extension:**
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

**Freeze mechanism:** Godlike-only Edge Function `supabase/functions/freeze-year-badges/index.ts`. Body: `{ year: 2026 }`.

1. Verify caller is godlike.
2. For every user: load picks + missed records + metadata, build a server-side `BadgeContext`, evaluate all badges with `yearBound === year`, collect earned slugs.
3. Upsert into `users.historical_badges`: append new `{ slug, year, earnedAt: now }` entries; de-dupe by `(slug, year)`.
4. Idempotent on re-run.

**UI:** new section in `/profile` for godlike only — single button "Freeze badges for year YYYY" with confirmation modal.

**Display merge** (`src/components/BadgesDisplay.tsx`): `getEarnedBadges()` returns the union of live-evaluated + historical entries. Modal shows a small "Wacken YYYY" chip on historical entries.

**Files:** `supabase/migrations/<date>_phase10c_historical_badges.sql`, `supabase/functions/freeze-year-badges/index.ts`, `src/lib/badges.ts`, `src/lib/supabase.ts`, `src/components/BadgesDisplay.tsx`, `src/pages/ProfilePage.tsx`, `src/i18n/Badges_*.json`.

---

### Acceptance criteria for Phase 10

- [x] **10a engine:** Four new picks-based condition types implemented and tested.
- [ ] **10a content:** At least one new badge shipped end-to-end (BR + EN i18n, image, condition) — deferred until new PNGs land.
- [ ] **10b:** Migration applies on a clean Supabase project. IDB v7→v8 upgrade is non-destructive on a populated v7 DB. `BandDetailModal` shows crew breakdown, conflict warning, and missed toggle. New `bands_seen_*` conditions evaluate correctly. Offline mark/unmark syncs on reconnect. Two-window Realtime test passes.
- [ ] **10c:** `historical_badges` migration applies cleanly. Godlike "Freeze year" action snapshots correctly and is idempotent. Frozen badges stay visible after their underlying live condition changes (e.g. user unpicks a band) with a "Wacken YYYY" chip.

### What Phase 10 deliberately does NOT include

- Dwell-time / visibility tracking (rejected — negative-confirmation is simpler).
- Notes / journal / rating per band (out of scope; can be added later inside the modal).
- A free-form filter DSL for characteristic conditions (explicit cases match the project's "no abstractions until needed" tone).
- Auto-freeze on calendar date (godlike-triggered keeps a human in the loop).

---

## Sequencing across phases

1. **Phase 10a** is purely additive (~1-day change). Validates new condition types before storage work.
2. **Phase 10b** is the highest-risk piece: new table + RLS + Realtime + offline queue + IDB v7→v8 upgrade. Test the upgrade on a populated v7 DB before merging. Phase 9.B's time-travel override is the testing surface for the post-`end_time` toggle.
3. **Phase 10c** is deferred until ~late July 2026. Stub `yearBound` in 10a/10b configs as new badges land so we don't have to revisit them later.

---

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for ideas that are nice-to-have and will be implemented if time permits after current planned work is complete.
