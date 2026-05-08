# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

> **Phase 8** (Badge asset intake — Belgian + Colombian country badges) is complete. See the completed-phases list in [CLAUDE.md](CLAUDE.md).

---

## Phase 9 — Differentiate Schedule / My Picks / Popular + extract shared bones `[PLANNED]`

**Goal:** Three pages — `/schedule`, `/my-picks`, `/popular` — currently feel like the same list with tiny tweaks. They share `BandCard` (defined inline inside `SchedulePage.tsx`), the same data hooks, and a near-identical layout. Phase 9 leans into each tab's distinct conceptual role with differentiated UI **and** extracts the shared building blocks underneath.

**Identities to lean into:**
- **Schedule** = "what's happening at the festival" → comprehensive browse
- **My Picks** = "what I'm committed to" → personal commitment view
- **Popular** = "what the crew is into" → social signal / recommendation

**Strategic note:** the new `BandDetailModal` introduced here is also where Phase 10b's crew breakdown and "didn't see it" toggle will live. Designing the modal now with extension in mind keeps Phase 10b additive.

### Architectural decisions

| Decision | Choice |
|---|---|
| Direction | Hybrid: differentiate UI per tab **and** extract shared components. |
| Pick affordance on Popular | Tap card → opens `BandDetailModal` with pick toggle inside. Replaces today's hidden pick button + inline expandable crew section. |
| My Picks card density | Dense variant: image takes ~50% of card width, condensed text on the right. Used by My Picks only. |

### Shared components extracted

- **`src/components/BandCard.tsx`** — moved out of `SchedulePage`. New optional props: `onClick?: () => void` (Popular uses it to open the modal), `dense?: boolean` (My Picks uses the dense variant).
- **`src/components/BandFilters.tsx`** — extracted bottom-sheet filter UI (funnel button, day/stage pills, upcoming toggle, active-filter chips, clear link). Driven by a `value` + `onChange` prop. Adds optional `query` field for the new search input.
- **`src/components/BandDetailModal.tsx`** — new shared modal. Phase 9 contents: band image, name, genre chip, stage badge, time span, crew avatar list (from `useBandAttendees`), pick/unpick button, close + backdrop dismiss.
- **`src/hooks/useBandConflicts.ts`** — pure derivation: takes a list of bands and returns `Map<bandId, Band[]>` of overlapping picks on different stages. ~30 LOC.

### Per-tab redesign

**Schedule — comprehensive browse**
- Use the extracted `BandCard` and `BandFilters`. Page becomes a thin shell.
- Add a search field to the filter bar (case-insensitive substring on band name).
- Add genre filter pill alongside day/stage. Genre values come from `[...new Set(bands.map(b => b.genre).filter(Boolean))]`.
- Keep chronological-by-`start_time` sort.
- LOC drops from ~410 to ~120.

**My Picks — personal commitment timeline**
- Day-grouped layout: section per festival day (29 Jul, 30 Jul, 31 Jul, 1 Aug). Day headers use existing colors/iconography.
- Within each day, bands sorted by `start_time`, rendered with the dense `BandCard` variant.
- Conflict chip on cards whose pick overlaps another pick on a different stage; tap chip → highlights the conflicting card. Uses `useBandConflicts`.
- Header summary: "X bands across Y days · Z conflicts".
- Empty state invites the user to `/schedule` ("Você ainda não escolheu nenhuma banda. Vá para a programação 🤘").
- Pick toggle stays on the star button (consistent with Schedule).

**Dense variant layout:**
```
┌───────────────────────────────────────┐
│                  │ Iron Maiden        │
│     IMAGE        │ Heavy Metal        │
│   (~50% wide)    │ Faster · 21:00     │
│                  │ ⭐ 12 picks         │
└───────────────────────────────────────┘
```

**Popular — crew leaderboard**
- No more inline crew expansion (`PopularPage.tsx:80-121`). The expanded view moves into `BandDetailModal`.
- Card body becomes clickable → opens `BandDetailModal` (using the new `onClick` prop).
- Star button remains hidden on the card (`hidePickButton` stays true). Picking happens inside the modal.
- Add a small avatar cluster on each card — first 3-5 crew avatars who picked the band, with "+N more" overflow. Avatars come from `useBandAttendees`.
- Sort stays pick-count desc, with `start_time` as tiebreaker.

### Files expected to change

**New:**
- `src/components/BandCard.tsx`
- `src/components/BandFilters.tsx`
- `src/components/BandDetailModal.tsx`
- `src/hooks/useBandConflicts.ts`

**Modified:**
- `src/pages/SchedulePage.tsx` — slim down to filter+list shell, add search + genre filter
- `src/pages/MyPicksPage.tsx` — day-grouped timeline, summary header, conflict chips, dense card variant
- `src/pages/PopularPage.tsx` — avatar cluster on card, modal on tap, remove inline expansion
- `src/i18n/SchedulePage_*.json`, `MyPicksPage_*.json`, `PopularPage_*.json` — new keys (search placeholder, genre filter label, conflict chip, day headers, modal labels, "+N more")
- (optional) `src/i18n/Pages_*.json` — for shared keys (`loading`, `empty`, `title`)

### Offline-first checklist

- No DB or schema changes.
- All data still flows from IDB-first hooks (`loadBands`, `useMyPicks`, `usePickCounts`, `useBandAttendees`).
- Detail modal must work offline: tap → instantly opens with cached data; pick toggle goes through existing `togglePick` (which already handles offline queueing via `offline_picks`).
- Search filtering on Schedule is client-side over the IDB band list — no network.

### Acceptance criteria

- [ ] `BandCard` lives in its own file with `onClick` and `dense` props
- [ ] `BandFilters` extracted; Schedule passes the full filter set, includes search + genre
- [ ] `BandDetailModal` opens from Popular cards with crew avatars and a working pick toggle
- [ ] My Picks renders day-grouped sections with the dense card variant and conflict chips
- [ ] Popular cards show avatar cluster and open the modal on tap (no inline expansion)
- [ ] All existing tests pass; new tests cover `useBandConflicts` and `BandCard.onClick`
- [ ] Offline test: tap → modal opens → pick → reconnect → sync confirmed
- [ ] Two-window test: pick in one → other reorders within 3s via Realtime

### What Phase 9 deliberately does NOT include

- A unified single-page `/bands` route (rejected — distinct page identities preferred).
- Aggressive i18n key renaming (only consolidate clear duplicates).
- Filters on My Picks / Popular (the day-grouped timeline and pick-count sort are themselves the affordances).
- Notes / journal / rating per band (Phase 10b territory).

---

## Phase 10 — Badge expansion: characteristics, seen-tracking, year freeze `[PLANNED]`

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

### Phase 10a — Characteristic badges (picks-based)

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

Computed in-memory from cached IDB data.

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

- [ ] **10a:** Four new picks-based condition types implemented and tested. At least one new badge content shipped end-to-end (BR + EN i18n, image, condition).
- [ ] **10b:** Migration applies on a clean Supabase project. IDB v7→v8 upgrade is non-destructive on a populated v7 DB. `BandDetailModal` shows crew breakdown, conflict warning, and missed toggle. New `bands_seen_*` conditions evaluate correctly. Offline mark/unmark syncs on reconnect. Two-window Realtime test passes.
- [ ] **10c:** `historical_badges` migration applies cleanly. Godlike "Freeze year" action snapshots correctly and is idempotent. Frozen badges stay visible after their underlying live condition changes (e.g. user unpicks a band) with a "Wacken YYYY" chip.

### What Phase 10 deliberately does NOT include

- Dwell-time / visibility tracking (rejected — negative-confirmation is simpler).
- Notes / journal / rating per band (out of scope; can be added later inside the modal).
- A free-form filter DSL for characteristic conditions (explicit cases match the project's "no abstractions until needed" tone).
- Auto-freeze on calendar date (godlike-triggered keeps a human in the loop).

---

## Sequencing across phases

1. **Phase 9** ships first — UI-layer only, no DB changes, biggest visible improvement, sets up the modal that Phase 10b extends.
2. **Phase 10a** is purely additive (~1-day change). Validates new condition types before storage work.
3. **Phase 10b** is the highest-risk piece: new table + RLS + Realtime + offline queue + IDB v7→v8 upgrade. Test the upgrade on a populated v7 DB before merging.
4. **Phase 10c** is deferred until ~late July 2026. Stub `yearBound` in 10a/10b configs as new badges land so we don't have to revisit them later.

---

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for ideas that are nice-to-have and will be implemented if time permits after current planned work is complete.
