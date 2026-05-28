# Vira-lata Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 32 — eligible vira-latas rate ended sets 1–5 in band detail; `/popular` adds a by-rating sort mode; full offline-first stack mirroring picks/missed.

**Architecture:** New `user_band_ratings` Postgres table + IndexedDB stores (DB v11) + `ratingsRepository` with offline queue and crew-wide `syncCrewFromRemote`. Pure services (`canRateBand`, `computeRatingAggregates`, `sortBandsByRating`) feed hooks. UI: `BandRatingInput` in modal + dual-mode Popular (layout/icons via `huashu-design`).

**Tech stack:** React 18, TypeScript, Vitest, IndexedDB (`src/lib/db/`), Supabase Realtime, existing sync coordinator.

**Spec source:** `docs/superpowers/specs/2026-05-28-vira-lata-rating-design.md`

**Phase:** 32 — sub-phases 32.A–32.E

---

## Locked design decisions (approved — do not re-open)

| Decision | Locked choice |
|----------|---------------|
| Approach | Full mirror of picks/missed offline-first stack |
| Eligibility | Picked + ended + not missed |
| Aggregation | Average of **all** vira-lata ratings (viewer included) |
| Clear | Tap active score again → delete row |
| Popular list | Bands with ≥1 rating; ceremony excluded |
| Sort tie-break | avg DESC → count DESC → start_time ASC |
| Scope v1 | Modal + Popular only |
| Visual design | `huashu-design` picks Popular mode control; **paw icon locked:** Canine+heel, −14°; **modal:** user score only, no crew avg |
| **Band detail modal layout (approved 2026-05-28)** | `_temp/rating-prototypes/band-detail-full-prototype.html` — rating **below** missed toggle; compact box (36px buttons, 20px paws); no crew avg |
| **Modal copy (approved layout, copy TBD at build)** | Final i18n strings may differ slightly from prototype English; match approved structure + tone in Step 6 |

---

## Prerequisites (read before Task 1)

1. `docs/superpowers/specs/2026-05-28-vira-lata-rating-design.md`
2. `docs/ai-wiki/decisions/indexeddb-primary-store.md`
3. `src/repositories/missed.ts` — repository pattern to copy
4. `src/repositories/picks.ts` — crew-wide `syncCrewFromRemote` pattern
5. `src/lib/db/missed.ts` — IDB module pattern
6. `src/hooks/useMissedBands.ts` — hook + window event pattern
7. `src/hooks/usePickCounts.ts` — aggregate hook pattern

**Verification gates (every sub-phase):** `rtk npm run build` · `rtk npm test`

---

## File map (create / modify)

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260528100000_phase32_user_band_ratings.sql` | Table, RLS, Realtime |
| `src/types/index.ts` | `UserBandRating`, `BandRatingScore` |
| `src/lib/db/types.ts` | IDB store typings + `OfflineBandRatingOp` |
| `src/lib/db/connection.ts` | DB v11 stores |
| `src/lib/db/events.ts` | `RATINGS_CHANGED_EVENT` |
| `src/lib/db/ratings.ts` | **Create** — IDB CRUD + offline queue |
| `src/lib/db/index.ts` | Re-exports |
| `src/services/bandRatings.ts` | **Create** — pure eligibility + aggregates + sort |
| `src/repositories/ratings.ts` | **Create** — sync, queue, Realtime |
| `src/repositories/index.ts` | Export |
| `src/lib/syncCoordinator.ts` | Flush + crew sync |
| `src/components/sync/RealtimeSync.tsx` | Subscribe ratings |
| `src/hooks/useBandRatings.ts` | **Create** — user ratings + aggregates |
| `src/hooks/useBandDetailModal.ts` | Pass rating props |
| `src/components/BandRatingInput.tsx` | **Create** — iconic 1–5 control |
| `src/components/BandDetailModal.tsx` | Rating section |
| `src/pages/PopularPage.tsx` | Dual sort mode |
| `src/i18n/PopularPage_*.json` | 4 locales |
| `src/i18n/SchedulePage_*.json` | Modal rating strings |
| `public/Design System.html` | Rating control section |
| `src/__tests__/bandRatings.test.ts` | **Create** |
| `src/__tests__/ratingsRepository.test.ts` | **Create** |
| `src/__tests__/useBandRatings.test.ts` | **Create** |
| `docs/ai-wiki/domain-model.md` | Entity doc |
| `docs/ai-wiki/supabase-schema.md` | Table doc |
| `docs/ai-wiki/changelog.md` | Dated entry on 32.E |

---

## Sub-phase 32.A — Schema, types, IDB, pure services

### Task 1: Migration

**Files:**
- Create: `supabase/migrations/20260528100000_phase32_user_band_ratings.sql`

- [ ] **Step 1: Add migration**

```sql
create table public.user_band_ratings (
  user_id uuid not null references public.users(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  rated_at timestamptz not null default now(),
  primary key (user_id, band_id)
);

alter table public.user_band_ratings enable row level security;

create policy "authenticated users can view all ratings"
  on public.user_band_ratings for select
  using (auth.role() = 'authenticated');

create policy "users can insert their own ratings"
  on public.user_band_ratings for insert
  with check (auth.uid() = user_id);

create policy "users can update their own ratings"
  on public.user_band_ratings for update
  using (auth.uid() = user_id);

create policy "users can delete their own ratings"
  on public.user_band_ratings for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_band_ratings;
```

- [ ] **Step 2: Regenerate types if project uses `supabase gen types`** (optional; update `src/lib/supabase.types.ts` manually if needed)

---

### Task 2: Shared types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add types after `UserMissedBand`**

```typescript
export type BandRatingScore = 1 | 2 | 3 | 4 | 5;

export type UserBandRating = {
  user_id: string;
  band_id: string;
  score: BandRatingScore;
  rated_at: string;
};
```

---

### Task 3: Pure rating services + tests

**Files:**
- Create: `src/services/bandRatings.ts`
- Create: `src/__tests__/bandRatings.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  canRateBand,
  computeRatingAggregates,
  sortBandsByRating,
} from '../services/bandRatings';
import type { Band, UserBandRating } from '../types';

const band: Band = {
  id: 'b1',
  name: 'Test',
  stage: 'Faster',
  start_time: '2026-07-29T18:00:00+02:00',
  end_time: '2026-07-29T19:00:00+02:00',
  image_url: null,
  genre: 'Metal',
};

describe('canRateBand', () => {
  it('allows when picked, ended, not missed', () => {
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: true,
        isMissed: false,
      }),
    ).toBe(true);
  });

  it('denies when not ended', () => {
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T18:30:00+02:00'),
        isPicked: true,
        isMissed: false,
      }),
    ).toBe(false);
  });

  it('denies when missed or not picked', () => {
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: true,
        isMissed: true,
      }),
    ).toBe(false);
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: false,
        isMissed: false,
      }),
    ).toBe(false);
  });
});

describe('computeRatingAggregates', () => {
  it('averages all raters including multiple users', () => {
    const ratings: UserBandRating[] = [
      { user_id: 'u1', band_id: 'b1', score: 5, rated_at: 't' },
      { user_id: 'u2', band_id: 'b1', score: 3, rated_at: 't' },
    ];
    expect(computeRatingAggregates(ratings).b1).toEqual({ avg: 4, count: 2 });
  });

  it('solo rating avg equals score', () => {
    const ratings: UserBandRating[] = [
      { user_id: 'u1', band_id: 'b1', score: 3, rated_at: 't' },
    ];
    expect(computeRatingAggregates(ratings).b1).toEqual({ avg: 3, count: 1 });
  });
});

describe('sortBandsByRating', () => {
  it('sorts by avg desc, count desc, start_time asc', () => {
    const bands = [
      { ...band, id: 'b1', start_time: '2026-07-29T20:00:00+02:00' },
      { ...band, id: 'b2', start_time: '2026-07-29T18:00:00+02:00' },
      { ...band, id: 'b3', start_time: '2026-07-29T19:00:00+02:00' },
    ];
    const aggregates = {
      b1: { avg: 4.5, count: 2 },
      b2: { avg: 4.5, count: 3 },
      b3: { avg: 3, count: 10 },
    };
    const sorted = sortBandsByRating(bands, aggregates);
    expect(sorted.map((b) => b.id)).toEqual(['b2', 'b1', 'b3']);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `rtk npm test -- src/__tests__/bandRatings.test.ts`

- [ ] **Step 3: Implement service**

```typescript
import type { Band, UserBandRating } from '../types';

export type BandRatingAggregate = { avg: number; count: number };

export function canRateBand(input: {
  band: Band;
  now: Date;
  isPicked: boolean;
  isMissed: boolean;
}): boolean {
  if (!input.isPicked || input.isMissed) return false;
  return new Date(input.band.end_time) < input.now;
}

export function computeRatingAggregates(
  ratings: UserBandRating[],
): Record<string, BandRatingAggregate> {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const row of ratings) {
    const bucket = sums[row.band_id] ?? { total: 0, count: 0 };
    bucket.total += row.score;
    bucket.count += 1;
    sums[row.band_id] = bucket;
  }
  const out: Record<string, BandRatingAggregate> = {};
  for (const [bandId, { total, count }] of Object.entries(sums)) {
    out[bandId] = { avg: total / count, count };
  }
  return out;
}

export function sortBandsByRating<T extends Band>(
  bands: T[],
  aggregates: Record<string, BandRatingAggregate>,
): T[] {
  return [...bands].sort((a, b) => {
    const aggA = aggregates[a.id];
    const aggB = aggregates[b.id];
    if (!aggA && !aggB) return a.start_time.localeCompare(b.start_time);
    if (!aggA) return 1;
    if (!aggB) return -1;
    const avgDelta = aggB.avg - aggA.avg;
    if (avgDelta !== 0) return avgDelta;
    const countDelta = aggB.count - aggA.count;
    if (countDelta !== 0) return countDelta;
    return a.start_time.localeCompare(b.start_time);
  });
}
```

- [ ] **Step 4: Run test — expect PASS**

---

### Task 4: IndexedDB stores (v11)

**Files:**
- Modify: `src/lib/db/types.ts`
- Modify: `src/lib/db/events.ts`
- Modify: `src/lib/db/connection.ts`
- Create: `src/lib/db/ratings.ts`
- Modify: `src/lib/db/index.ts`
- Modify: `src/__tests__/db.test.ts` (add store to wipe test list if present)

- [ ] **Step 1: Add `OfflineBandRatingOp` to `src/lib/db/types.ts`**

```typescript
export type OfflineBandRatingOp =
  | { id: string; user_id: string; band_id: string; action: 'upsert'; score: BandRatingScore; rated_at: string }
  | { id: string; user_id: string; band_id: string; action: 'remove'; rated_at: string };
```

Add to `ViralatasDB`:

```typescript
  user_band_ratings: {
    key: [string, string];
    value: UserBandRating;
    indexes: { by_user: string };
  };
  offline_band_ratings: {
    key: string;
    value: OfflineBandRatingOp;
  };
```

- [ ] **Step 2: Add event**

```typescript
export const RATINGS_CHANGED_EVENT = 'viralatas:ratings-changed';
```

- [ ] **Step 3: Bump `DB_VERSION` to `11`; add stores to `VIRALATAS_OBJECT_STORES` and `upgrade()`**

Mirror `user_missed_bands` / `offline_missed_bands` block with `user_band_ratings` / `offline_band_ratings`.

- [ ] **Step 4: Create `src/lib/db/ratings.ts`** — copy structure from `missed.ts`:

Exports: `saveBandRating`, `removeBandRating`, `loadBandRatings`, `loadAllBandRatings`, `replaceAllBandRatings`, `enqueueOfflineBandRating`, `loadOfflineBandRatingsQueue`, `removeFromOfflineBandRatingsQueue` — emit `RATINGS_CHANGED_EVENT` on writes.

- [ ] **Step 5: Re-export from `src/lib/db/index.ts`**

- [ ] **Step 6: Run build + db tests**

Run: `rtk npm run build` · `rtk npm test -- src/__tests__/db.test.ts`

---

## Sub-phase 32.B — Repository, sync, Realtime

### Task 5: ratingsRepository

**Files:**
- Create: `src/repositories/ratings.ts`
- Create: `src/__tests__/ratingsRepository.test.ts`
- Modify: `src/repositories/index.ts`

- [ ] **Step 1: Write failing repository tests** (mark offline, upsert online, clear, syncCrewFromRemote)

Mirror `src/__tests__/missedRepository.test.ts` patterns with score field.

- [ ] **Step 2: Implement repository**

Key methods:

```typescript
export const ratingsRepository = {
  loadAll,
  setRating(userId, bandId, score),      // upsert IDB + Supabase or queue
  clearRating(userId, bandId),             // delete IDB + Supabase or queue
  toggleRating(userId, bandId, score),   // if same score → clear, else set
  syncCrewFromRemote,                    // select * → replaceAllBandRatings
  flushOfflineQueue,
  subscribeToRealtime,                   // INSERT/UPDATE/DELETE → IDB
};
```

Offline queue `syncOne`:
- `upsert` → `supabase.from('user_band_ratings').upsert({ user_id, band_id, score, rated_at })`
- `remove` → `.delete().eq('user_id').eq('band_id')`

Realtime handlers: upsert on INSERT/UPDATE, delete on DELETE.

- [ ] **Step 3: Export from `src/repositories/index.ts`**

- [ ] **Step 4: Run tests — expect PASS**

Run: `rtk npm test -- src/__tests__/ratingsRepository.test.ts`

---

### Task 6: Wire sync coordinator + Realtime

**Files:**
- Modify: `src/lib/syncCoordinator.ts`
- Modify: `src/components/sync/RealtimeSync.tsx`
- Modify: `src/__tests__/syncCoordinator.test.ts`

- [ ] **Step 1: Add to `runReconnectSync`**

```typescript
import { ratingsRepository } from '../repositories';

// In Promise.all flush:
ratingsRepository.flushOfflineQueue(),

// In second Promise.all sync:
ratingsRepository.syncCrewFromRemote(),
```

Include ratings flush count in return sum.

- [ ] **Step 2: Add to `RealtimeSync`**

```typescript
ratingsRepository.subscribeToRealtime(),
```

- [ ] **Step 3: Update syncCoordinator test mocks + expectations**

- [ ] **Step 4: Run tests**

Run: `rtk npm test -- src/__tests__/syncCoordinator.test.ts`

---

## Sub-phase 32.C — UI: design pass + modal

### Task 7: huashu-design rating prototype ✅ approved 2026-05-28

**Artifacts (locked — do not re-open layout):**
- `_temp/rating-prototypes/vira-lata-rating-variants.html` — paw variants; **`IconPawFinal`**
- `_temp/rating-prototypes/band-detail-full-prototype.html` — **full modal layout** (user-approved)
- `_temp/rating-prototypes/brand-spec.md` — tokens + icon lock

**Still open (Task 9):** Popular mode switch prototype — segmented pill recommended, not user-locked yet.

- [x] **Step 1: Paw icon** — Canine+heel at −14° (`IconPawFinal`).

- [x] **Step 2: Band detail modal** — user approved `band-detail-full-prototype.html` (below missed toggle, compact, no crew avg).

- [ ] **Step 3: Design System** — document rating control in `public/Design System.html` during Task 8/9 (after React implementation matches prototype).

---

### Task 8: BandRatingInput + modal integration

**Files:**
- Create: `src/components/BandRatingInput.tsx`
- Create: `src/components/BandRatingInput.module.css`
- Create: `src/hooks/useBandRatings.ts`
- Create: `src/__tests__/useBandRatings.test.ts`
- Modify: `src/hooks/useBandDetailModal.ts`
- Modify: `src/components/BandDetailModal.tsx`
- Modify: `src/i18n/SchedulePage_*.json` (4 files)

- [ ] **Step 1: Implement `useBandRatings`**

Returns: `allRatings`, `userRatingByBand`, `aggregates`, `setRating`, `clearRating`, `toggleRating` — listens to `RATINGS_CHANGED_EVENT`.

- [ ] **Step 2: Implement `BandRatingInput`**

Props: `value: BandRatingScore | null`, `onChange(score)`, `disabled?`, `iconVariant` from design lock.

Tap active icon → call `onChange(null)` or dedicated clear.

- [ ] **Step 3: Extend `useBandDetailModal`**

When `canRateBand(...)`:
- Pass `userScore`, `onRate(score)`, `canRate` — **no** `crewAggregate` in modal

On `handleToggleMissed` after mark missed → `ratingsRepository.clearRating(userId, bandId)`.

- [ ] **Step 4: Extend `BandDetailModal`**

Render compact rating block **below** missed toggle when `canRate`:
- User score + `BandRatingInput` only
- **No crew average or rating count** (anti-bias; aggregates on Popular)
- Match `_temp/rating-prototypes/band-detail-full-prototype.html` styling

- [ ] **Step 5: Purge on unpick**

In `usePickActions` `togglePick` — when unpicking, call `ratingsRepository.clearRating(userId, bandId)` (fire-and-forget).

- [ ] **Step 6: i18n keys (copy may differ from prototype)**

Prototype English is a placeholder. Lock **structure** from approved layout; refine wording in all 4 locales at implementation time.

| Key | Surface | Prototype hint (not final copy) |
|-----|---------|----------------------------------|
| `ratingSectionTitle` | Modal | “Your score” (mono kicker) |
| `ratingClear` | Modal | “Clear” link when score set |
| `ratingClearHint` | Modal | Tap same paw to clear (short hint line) |
| `ratingCrewAvg` | **Popular only** | Not used in modal |
| `ratingCount` | **Popular only** | e.g. “N vira-latas” on rated cards |
| `popularSortByRating` | Popular | Mode label (Task 9) |

- [ ] **Step 7: Tests + build**

Run: `rtk npm test -- src/__tests__/useBandRatings.test.ts` · `rtk npm run build`

---

## Sub-phase 32.D — Popular page dual mode

### Task 9: Popular by-rating mode

**Files:**
- Modify: `src/pages/PopularPage.tsx`
- Modify: `src/i18n/PopularPage_*.json` (4 files)
- Modify: `public/Design System.html`

- [ ] **Step 1: huashu-design** — prototype Popular header with mode switch (segmented control or tabs per design lock) in `_temp/rating-prototypes/popular-mode-prototype.html`

- [ ] **Step 2: Add state `sortMode: 'picks' | 'rating'`**

- [ ] **Step 3: Derive `ratedBands`**

```typescript
const ratedBands = useMemo(() => {
  const withRatings = bands.filter(
    (b) => b.category !== 'ceremony' && (aggregates[b.id]?.count ?? 0) > 0,
  );
  return sortBandsByRating(withRatings, aggregates);
}, [bands, aggregates]);
```

- [ ] **Step 4: Render list by mode; pass rating display props to `BandCard`**

Extend `BandCard` minimally: optional `ratingAvg`, `userRating`, `ratingCount` props for ranked variant — or inline in PopularPage if smaller diff.

- [ ] **Step 5: Empty state** — `emptyRated`: "No ratings yet — be the first after a set ends 🤘"

- [ ] **Step 6: i18n** — `headerSortedRating`, `modePicks`, `modeRating`, `emptyRated`, `ratingAvgLabel`

- [ ] **Step 7: Update Design System** — rating input + Popular mode switch section

- [ ] **Step 8: Build + test**

Run: `rtk npm run build` · `rtk npm test`

---

## Sub-phase 32.E — Docs + phase close

### Task 10: Wiki + changelog + history

**Files:**
- Modify: `docs/ai-wiki/domain-model.md`
- Modify: `docs/ai-wiki/supabase-schema.md`
- Modify: `docs/ai-wiki/changelog.md`
- Modify: `docs/ai-wiki/phases-history.md`
- Modify: `PHASES.md` (mark 32 complete or hand to phase-closer)

- [ ] **Step 1: Document `UserBandRating` entity + invariants**

- [ ] **Step 2: Document table + RLS in supabase-schema.md**

- [ ] **Step 3: Append changelog + phases-history entries**

- [ ] **Step 4: Run full verification**

Run: `rtk npm run build` · `rtk npm test`

- [ ] **Step 5: Phase close** — delegate `wiki-curator` + `migration-validator` + `offline-sync-auditor` reviews before merge.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Eligibility picked+ended+not missed | Task 3 `canRateBand`, Task 8 modal gate |
| All raters in average | Task 3 `computeRatingAggregates` |
| Clear on same tap | Task 8 `BandRatingInput`, Task 5 `toggleRating` |
| Delete on missed/unpick | Task 8 purge hooks |
| Popular ≥1 rating, ceremony excluded | Task 9 |
| Sort tie-break | Task 3 `sortBandsByRating` |
| Offline-first + crew sync | Task 4 IDB, Task 5 repo, Task 6 coordinator |
| Realtime | Task 5 subscribe, Task 6 mount |
| huashu-design visuals | Task 7, Task 9 step 1 |
| 4 locales | Tasks 8, 9 |
| FUTURE_IDEAS B/C/D | Already in FUTURE_IDEAS #8–#10 |
| Out of scope My Picks/wrap/badges | Not in plan ✓ |

No TBD placeholders remain.

---

## Execution handoff

**Plan saved to:** `docs/superpowers/plans/2026-05-28-vira-lata-rating-plan.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per sub-phase (32.A→32.E), review between phases, invoke `migration-validator` on 32.A, `offline-sync-auditor` on 32.B, `huashu-design` on 32.C/D visuals.

2. **Inline Execution** — implement sequentially in one session using `executing-plans`, checkpoint after each sub-phase.

**Which approach?**
