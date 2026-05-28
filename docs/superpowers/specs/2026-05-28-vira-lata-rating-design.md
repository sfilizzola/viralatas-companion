# Vira-lata Rating — Design

**Date:** 2026-05-28  
**Status:** Approved  
**Owner:** sfilizzola  
**Phase:** 32 — Vira-lata Rating  
**Approach:** Full mirror of `user_missed_bands` / `user_picks` offline-first stack (Approach 1)

---

## Problem

After a set ends, vira-latas want to score how good it was (1–5) and see which bands the crew loved most — separate from pick popularity. Today the app tracks picks and “didn’t see” skips, but has no concert quality signal.

---

## Goals

1. Let an eligible vira-lata rate a ended set **only in `BandDetailModal`** via an iconic 1–5 control (visual treatment chosen by `huashu-design`).
2. Persist ratings offline-first: IndexedDB primary, Supabase sync target, offline queue, Realtime.
3. Add a second sort mode on **`/popular`**: bands ordered by crew average rating (including the current user’s score).
4. Support change and clear (tap same score again → delete row).
5. Auto-remove ratings when eligibility is lost (mark missed, unpick).

## Non-goals (Phase 32)

- Rating display on **My Picks** → FUTURE_IDEAS #8
- Rating stats on **`/wrap`** → FUTURE_IDEAS #9
- **Badge conditions** on ratings → FUTURE_IDEAS #10
- Push notifications or LLM alerts about ratings
- Rating bands the user did not pick
- Rating before `band.end_time`

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Eligibility | User **picked** band + set **ended** + **not** in `user_missed_bands` |
| Aggregation | **Average of all vira-lata ratings** (current user included; solo 3 → avg 3) |
| Edit | Change score anytime while eligible |
| Clear | Tap active score again or explicit clear → delete row |
| Popular inclusion | Band appears when **≥1 rating** exists (solo self rating counts) |
| Popular UI + icons | `huashu-design` chooses layout control and icon set |
| **Rating icon (locked 2026-05-28)** | **Canine + heel** paw anatomy, **−14° rotation** (combine prototype #3 + #7) |
| **Modal aggregates (locked 2026-05-28)** | **No crew avg or rating count** in band detail — avoids biased votes; aggregates on Popular only |
| **Modal layout (approved 2026-05-28)** | `band-detail-full-prototype.html` — compact block below missed toggle; 36px buttons / 20px paws |
| **Modal copy** | Layout approved; final i18n strings may differ slightly from prototype English |
| **Popular sort control (grill 2026-05-28)** | Segmented pill **`Picks` · `Rating`**; hidden until ≥1 rated band (local IDB); `sessionStorage` persistence; hide + reset at zero ratings |
| **Popular card stats (grill 2026-05-28)** | Line 1: avg · count; line 2: `You · N` when viewer rated; hide pick cluster; **keep** missed count on ended bands |
| **Avg display (grill 2026-05-28)** | One decimal, trim trailing zero (`4.2`, `3`, `5`) |
| **Ceremony (grill 2026-05-28)** | Never rateable in modal; excluded from Popular rated list |
| **Undo missed (grill 2026-05-28)** | Re-rate from scratch — no restore of deleted score |
| **`rated_at` (grill 2026-05-28)** | Updates on every score change |
| **Eligibility enforcement (grill 2026-05-28)** | Client-only (RLS own-row); same as picks/missed |
| **Time travel (grill 2026-05-28)** | Simulated `now()` / `useNow()` for `canRateBand` |
| **Test users (grill 2026-05-28)** | Included in aggregates |
| **UI terminology** | User-facing copy: **vira-latas**, never “crew” (CLAUDE.md) |
| Scope | Modal input + Popular by-rating only |

---

## Terminology

| Term | Meaning |
|------|---------|
| **Eligible to rate** | Picked + `end_time < now()` + not marked missed + **not ceremony** |
| **Vira-lata average** | Mean of all `user_band_ratings.score` rows for a band (all users incl. viewer and test users) |
| **Rating count** | Number of distinct vira-latas who rated the band |
| **Clear rating** | Delete `(user_id, band_id)` row from IDB + Supabase |

---

## Data model

### Table: `public.user_band_ratings`

```sql
create table public.user_band_ratings (
  user_id uuid not null references public.users(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  rated_at timestamptz not null default now(),
  primary key (user_id, band_id)
);
```

**RLS:**

- `SELECT` — all authenticated users (`using (true)`)
- `INSERT` — own row only (`check (auth.uid() = user_id)`)
- `UPDATE` — own row only (`using (auth.uid() = user_id)`)
- `DELETE` — own row only

**Realtime:** add table to `supabase_realtime` publication.

**Optional view** (documentation / ad-hoc SQL only — **UI does not read it**):

```sql
create or replace view public.band_rating_stats as
select
  band_id,
  count(*)::int as rating_count,
  round(avg(score)::numeric, 2) as avg_score
from public.user_band_ratings
group by band_id;
```

### TypeScript

```typescript
export type UserBandRating = {
  user_id: string;
  band_id: string;
  score: 1 | 2 | 3 | 4 | 5;
  rated_at: string;
};
```

### IndexedDB stores (DB version bump → 11)

| Store | Key | Purpose |
|-------|-----|---------|
| `user_band_ratings` | `[user_id, band_id]` | All crew ratings (UI reads) |
| `offline_band_ratings` | `id` (`userId\|bandId\|action`) | Offline queue |

Event: `viralatas:ratings-changed` (`RATINGS_CHANGED_EVENT`).

---

## Architecture

```
UI (BandDetailModal, PopularPage)
  → useBandRatings / useRatingAggregates
  → ratingsRepository
  → IndexedDB (write first)
  ↕ flush + syncCrewFromRemote on reconnect
  Supabase user_band_ratings
  ↕ Realtime INSERT/UPDATE/DELETE
  other clients' IndexedDB
```

**Crew-wide cache:** On reconnect, `ratingsRepository.syncCrewFromRemote()` pulls **all** rows (same pattern as `picksRepository.syncCrewFromRemote()`), not just the current user. Realtime keeps peers updated while online.

**Eligibility enforcement:** Client-side only (`canRateBand` + repository). Postgres RLS allows authenticated users to read all ratings and write own rows only — **no DB trigger** for pick/missed/ceremony/end_time checks (mirrors picks/missed).

**Eligibility service** (pure, tested):

```typescript
export function canRateBand(input: {
  band: Band;
  now: Date;
  isPicked: boolean;
  isMissed: boolean;
}): boolean;
// false when band.category === 'ceremony', !isPicked, isMissed, or end_time >= now
// `now` comes from useNow() — respects godlike time-travel override
```

**Aggregate service** (pure, tested):

```typescript
export type BandRatingAggregate = { avg: number; count: number };

export function computeRatingAggregates(
  ratings: UserBandRating[],
): Record<string, BandRatingAggregate>;

/** Popular card display — one decimal, trim trailing zero. Sort uses raw avg. */
export function formatRatingAvg(avg: number): string;
```

---

## Eligibility & lifecycle rules

| Event | Rating behavior |
|-------|-----------------|
| Set ends, user picked, not missed | Rating UI visible; user may rate |
| User sets/changes score 1–5 | Upsert row; **`rated_at` = now** |
| User taps active score again or taps Clear | Delete row (clear) |
| User marks “didn’t see” | Delete user’s rating for that band |
| User **undoes** “didn’t see” | Eligible again; **no restore** — user re-rates from scratch |
| User unpicks band | Delete user’s rating for that band |
| Set not ended | Rating UI hidden |
| User never picked | Rating UI hidden; band may still appear on Popular rated list (read-only modal) |
| Ceremony band | **Never rateable**; excluded from Popular rated list |

---

## UI specification

### Band detail modal

- Compact rating block **below** the “didn’t see” toggle (when eligible) — social context first, private vote last.
- Shows **only the current user’s score**:
  - Mono section label (i18n, e.g. “Your score”)
  - Interactive 1–5 iconic control (`BandRatingInput`) — **36px buttons**, subtle elevated box (same weight as missed toggle)
  - **Clear link** when score set + **tap active paw to clear** (both delete row)
  - Short hint line for tap-to-clear
- **Does not show** vira-lata average, rating count, or any aggregate — those appear on **Popular** (and future My Picks / wrap) so voting stays unbiased.
- Hidden when not eligible (incl. ceremony).
- **`huashu-design` prototype (user-approved 2026-05-28):** `_temp/rating-prototypes/band-detail-full-prototype.html`
- Copy in prototype is indicative; implement via i18n keys at build time (see plan Task 8 Step 6).

### Popular page (`/popular`)

- Default mode: **by picks** (unchanged).
- **Sort pill (grill locked 2026-05-28):** segmented **`Picks` · `Rating`** in header — **only visible when ≥1 band has a rating** (local IndexedDB count; works offline). When rating count drops to zero, pill hides, mode resets to picks, `sessionStorage` cleared. Mode choice persists in **`sessionStorage`** while pill is visible.
- Header subtitle swaps with mode (sorted-by-picks ↔ sorted-by-rating). **User-facing strings use vira-latas, not “crew”.**
- **By rating** list:
  - Filter: `rating_count >= 1`, exclude `ceremony`
  - Sort: `avg DESC`, then `count DESC`, then `start_time ASC`
  - **Crew-wide** — includes bands the viewer did not pick (modal read-only if ineligible)
  - Card: rank, band info, **line 1** avg · vira-lata count (`formatRatingAvg`), **line 2** `You · {score}` when viewer rated
  - **Hide** pick attendee cluster in rating mode; **keep** missed count on ended bands (both modes)
  - Test users included in aggregates
- No empty-rated UX while pill hidden (zero ratings globally).

### i18n

All four locales: `br`, `en`, `es`, `de` — new keys in `PopularPage_*.json`, `SchedulePage_*.json` (modal strings). **Never use “crew” in user-facing rating copy** — use vira-latas / localized equivalent.

---

## Sync integration

| Seam | Change |
|------|--------|
| `runReconnectSync` | `flushOfflineQueue` + `syncCrewFromRemote` for ratings |
| `RealtimeSync` | `ratingsRepository.subscribeToRealtime()` |
| `syncCoordinator` flush count | Include ratings queue in toast total |
| Festival reset | `user_band_ratings` wiped with social reset (CASCADE from bands/users); document in wiki |

---

## Testing strategy

| Layer | Cases |
|-------|-------|
| Pure services | `canRateBand` (ceremony, time travel), `computeRatingAggregates`, `formatRatingAvg`, sort order |
| IDB module | save/remove/replace/loadAll/offline queue |
| Repository | upsert/clear offline+online, syncCrewFromRemote, realtime handlers |
| Hook | `useBandRatings` user score, aggregates refresh on event |
| Integration | Modal hidden when ineligible; clear on missed/unpick; undo missed does not restore score; Popular pill visibility |

**Gate:** `rtk npm run build` + `rtk npm test` each sub-phase.

---

## Sub-phases

| Sub-phase | Deliverable |
|-----------|-------------|
| **32.A** | Migration, types, IDB stores (v11), pure services + unit tests |
| **32.B** | Repository, offline queue, reconnect sync, Realtime |
| **32.C** | `huashu-design` prototype → `BandRatingInput` + modal wiring + eligibility purge hooks |
| **32.D** | Popular dual-mode + `useRatingAggregates` + i18n + Design System |
| **32.E** | Wiki, changelog, `FUTURE_IDEAS`, `PHASES.md`, phase close |

---

## Future ideas (out of scope)

See `FUTURE_IDEAS.md` #8–#10:

- **#8** — Show user rating on My Picks ended sections
- **#9** — Crew avg rating in `/wrap` recap
- **#10** — Badge conditions keyed off ratings

---

## Self-review (spec)

- [x] No TBD / placeholder requirements
- [x] Aggregation matches user correction (self included in average)
- [x] Offline-first path explicit (IDB → repo → Supabase)
- [x] Eligibility loss triggers delete
- [x] Scope bounded to modal + Popular
- [x] Popular UX grill-locked 2026-05-28 (pill, cards, persistence, terminology)
- [x] huashu-design ownership of visual decisions documented (modal + pill locked)
