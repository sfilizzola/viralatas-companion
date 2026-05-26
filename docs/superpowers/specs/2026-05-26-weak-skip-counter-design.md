# Weak Skip Counter — Design

**Date:** 2026-05-26  
**Status:** Implemented  
**Owner:** sfilizzola  
**Scope:** Wacken 2026 festival session

---

## Problem

The **“I am weak”** button on `/now` (`souFraco`) unpicks the user’s current live band with a 5-second undo window. Today that action is not counted anywhere. We want a **local, per-user counter** so we can:

1. **Store data now** — no badges yet, but the number is ready when we design them.
2. **Add badges later** — e.g. milestone badges for committed weak skips.
3. **Sync to Supabase later** — optional server-side table or event log without redoing client semantics.

The counter must reflect **intentional weak skips only**, not generic unpicks from schedule cards, detail modals, or conflict resolution.

---

## Goals

1. Increment a per-user counter when a weak skip **commits** (unpick sticks after the undo window).
2. Never increment on undo, and never increment on unpicks from other UI paths.
3. Persist in `user_metadata` (same family as `location_visits`) so it survives offline and syncs across devices via auth session refresh.
4. Expose a read helper for future badge context; **no badge registry entries in this phase**.
5. Document the future Supabase sync path without building it now.

## Non-goals

- Badge definitions or new `BadgeCondition` types (deferred).
- Festival reset wiring — add `weak_skips_2026` to `PERSISTENT_BADGE_METADATA_KEYS` when festival-close script lands.
- Supabase migration, RLS, or offline queue for a server table (deferred).
- Counting duck quacks — duck and weak skip are separate actions.
- Counting unpicks via `BandCard` toggle, `BandDetailModal`, or `ConflictSection`.
- Showing the count in the UI (deferred).

---

## Terminology

| Term | Meaning |
|------|---------|
| **Weak skip** | User taps **“I am weak”** on `/now` while on their current live picked band |
| **Committed weak skip** | Weak skip where the unpick is still in place when the 5s undo window ends (no undo) |
| **Generic unpick** | Removing a pick via schedule card, My Picks, Popular, band detail modal, or conflict resolver |

---

## Counter semantics

| Rule | Behavior |
|------|----------|
| What counts | A **committed weak skip** only |
| When to increment | When the undo timer fires (~5s) **and** the band is still unpicked |
| Undo within 5s | Cancel pending commit → **no increment** |
| Generic unpick same band | **No increment** — only the weak-skip commit path may write |
| Storage key | `user_metadata.weak_skips_2026: number` (default `0`) |
| Offline | Increment locally via `supabase.auth.updateUser`; best-effort, same as `location_visits` |
| Festival reset | **Not wired in this phase** — strip list updated when festival-close functionality ships |

### Isolation rule (critical)

> **Generic unpicks must never increment `weak_skips_2026`.**  
> Only the `/now` “I am weak” commit path may call `recordCommittedSkip()`.

Unpick entry points that must **not** touch the counter:

| Path | File / hook | Trigger |
|------|-------------|---------|
| Schedule / Popular card toggle | `togglePick` in `usePickActions` | Pick/unpick on `BandCard` |
| My Picks sections | `togglePick` | Same |
| Band detail modal | `useBandDetailModal` → `togglePick` | Remove pick button |
| Conflict resolver | `ConflictSection` → `unpickBand` | Resolve overlap |

The weak-skip path is **only** `handleSkip` in `useNowData`, wired from `CrewGroupsSection`’s `souFraco` button.

### Edge case: overlapping undo timers

`handleSkip` already clears a previous undo timer when a new skip starts. When clearing an old timer:

- If the user **undid** the previous skip → no commit for that skip (undo handler cancels commit timer).
- If the user did **not** undo and the old skip’s unpick is still in place → **commit the previous skip immediately** before starting the new skip’s timers.

This prevents losing a count when a second weak skip replaces the first undo toast.

---

## Architecture

### Data flow

```
"I am weak" (CrewGroupsSection)
        │
        ▼
handleSkip (useNowData)
  ├─ commit any pending previous weak skip (if applicable)
  ├─ unpickBand(bandId)          ← existing picksRepository path
  ├─ setUndoState + undo timer    ← existing (5s toast)
  └─ schedule commit timer (5s)   ← NEW

commit timer fires:
  ├─ verify band still unpicked (no pick row for bandId)
  └─ weakSkips.recordCommittedSkip(userId, bandId)
            │
            ▼
     supabase.auth.updateUser({
       data: { weak_skips_2026: current + 1 }
     })   // best-effort, fire-and-forget

handleUndo:
  ├─ cancel commit timer          ← NEW
  ├─ pickBand(bandId)             ← existing
  └─ clear undo state             ← existing
```

### New module

**File:** `src/services/weakSkips.ts` (or `src/repositories/weakSkips.ts` — prefer `services/` to mirror small domain helpers; repository if we add IDB later)

```ts
/** Read count from auth metadata. Safe default: 0. */
export function getWeakSkipCount(
  metadata: Record<string, unknown> | undefined,
): number;

/** Increment weak_skips_2026 after a committed skip. Best-effort updateUser. */
export function recordCommittedSkip(
  userId: string,
  bandId: string,
): Promise<void>;
```

`bandId` is accepted for future event-log dual-write but **not persisted** in this phase (YAGNI — parameter documents intent for Phase 2 server sync).

**Do not** hook `recordCommittedSkip` into:

- `usePickActions.unpickBand` / `togglePick`
- `picksRepository`
- Any `BandCard` or modal handler

### Integration point

**Single consumer:** `src/hooks/useNowData.ts`

- Add a `commitTimerId` ref/state alongside existing `undoTimerId`.
- On `handleSkip`: schedule commit; on `handleUndo`: cancel commit.
- On commit fire: call `recordCommittedSkip` only if pick is absent.

### Future badge context (not implemented now)

When badges ship, extend `BadgeContext` with `weakSkipCount: number` and read via `getWeakSkipCount(authUser.user_metadata)` in `badgeContextBuilder.ts`. New condition type candidate:

```ts
{ type: 'weak_skips_min'; count: number }
```

Registry entries and `evaluateBadge` branch deferred.

### Future Supabase sync (not implemented now)

Two viable paths when server data is needed:

**Option A — aggregate mirror (simple)**

```sql
user_festival_stats (
  user_id uuid PK,
  year int,
  weak_skips int not null default 0,
  updated_at timestamptz
)
```

**Option B — event log (richer analytics)**

```sql
user_weak_skip_events (
  id uuid PK,
  user_id uuid,
  band_id uuid,
  skipped_at timestamptz
)
```

Recommendation for later: **Option B for analytics**, with metadata counter remaining the offline-first badge source. Dual-write on `recordCommittedSkip` when online; queue when offline (same pattern as duck/missed queues).

Metadata key stays canonical for badges until a deliberate migration says otherwise.

### Festival reset (deferred)

When festival-close / reset script is extended:

1. Add `'weak_skips_2026'` to `PERSISTENT_BADGE_METADATA_KEYS` in `supabase/seed/festival-reset.ts`.
2. Update `docs/ai-wiki/festival-reset.md` and wiki badges page.
3. For multi-year festivals, consider migrating to `weak_skips: { "2026": N, "2027": M }` — out of scope until Wacken 2027 planning.

---

## Files touched (this phase)

| File | Change |
|------|--------|
| `src/services/weakSkips.ts` | **New** — read + increment helpers |
| `src/hooks/useNowData.ts` | Commit timer; call `recordCommittedSkip` on commit; cancel on undo; commit pending on re-skip |
| `src/__tests__/weakSkips.test.ts` | **New** — unit tests for read/increment |
| `src/__tests__/useNowData.test.ts` | Extend skip/undo tests for counter behavior |
| `docs/ai-wiki/changelog.md` | Dated entry when implemented |
| `docs/ai-wiki/glossary.md` | Optional: define weak skip vs generic unpick |

**Not changed:** `usePickActions`, `picksRepository`, `BandCard`, `BandDetailModal`, `ConflictSection`, badge registry, migrations, Edge Functions, festival reset script.

---

## Offline behavior

- Commit timer is pure client logic — fires offline.
- `recordCommittedSkip` uses `supabase.auth.updateUser` (same as `incrementLocationVisit` in `presence.ts`).
- If `updateUser` fails offline, Supabase client queues or fails silently with `.catch(() => {})` — document expected behavior: count may lag until reconnect; session refresh merges metadata. Acceptable for v1 (matches location visit pattern).
- No IndexedDB store in v1 — metadata is sufficient for badge prep and cross-tab sync via auth.

---

## Testing

### Unit: `weakSkips.test.ts`

- `getWeakSkipCount` returns `0` when key missing or invalid.
- `getWeakSkipCount` reads existing number.
- `recordCommittedSkip` calls `updateUser` with incremented value (mock supabase).

### Integration: `useNowData.test.ts`

| Case | Expected count |
|------|----------------|
| Skip → wait for commit timer → still unpicked | +1 |
| Skip → undo before timer | 0 |
| Skip → undo → unpick same band via `togglePick` | 0 (togglePick not wired) |
| Skip A → skip B before A’s timer, A still unpicked | A committed (+1), B pending |

Use fake timers (`vi.useFakeTimers()`) for commit/undo windows.

---

## Acceptance criteria

1. Tapping **“I am weak”** and letting undo expire with band still unpicked increments `user_metadata.weak_skips_2026` by 1.
2. Undo within 5s does not increment.
3. Unpick via schedule card, detail modal, or conflict resolver never increments.
4. Counter survives page reload (read back from session metadata).
5. No new badges or UI surfaced in this phase.
6. Spec documents future Supabase and festival-reset hooks without implementing them.

---

## Self-review checklist

- [x] No TBD placeholders on core behavior
- [x] Isolation rule explicit — generic unpicks excluded
- [x] Commit semantics match user choice (B: outcome, not intent-at-tap)
- [x] Per-festival key `weak_skips_2026`; reset deferred
- [x] Scope limited — no badges, no migration, no festival reset change
- [x] Future Supabase path documented without over-building now
