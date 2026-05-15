# Friend User Flag — Design Spec

**Date:** 2026-05-15  
**Phase:** TBD (post Phase 19)  
**Status:** Approved

---

## Overview

A "friend" user is someone who attends Wacken Open Air but is **not camping** with the Viralatas group. Friends can pick bands, appear in the "going to a band" crew group, and win most badges — but they are excluded from camping/lost presence logic and cannot win location-specific badges.

---

## Requirements

### What friends can do
- Pick and unpick bands (full functionality)
- Appear in the **band group** on `/now` when they have a current pick
- Contribute to band attendance counts ("5 going")
- Win all non-location badges (bands picked/seen, genres, stages, country, wacken_years, etc.)
- View the camping group and the lost group (read-only, they just don't appear in them)
- Post announcements, use all other features normally

### What friends cannot do / see
- The `PresenceToggle` component is **not rendered** for friends on `/now`
- Friends do **not appear** in the camping group, the lost group, or the metal_place group
- Friends are **invisible** between band sets (not shown in any crew group when not on a current band)
- Friends cannot win location-specific badges: `metal-place-2026`, `bbq-crew`, `lost-together`
- Friends are **excluded from `crewLocationCounts`** — they do not count toward the crew thresholds for camping/lost badges for other users either

### Administration
- Only **godlike** can mark/unmark users as friends
- Toggle is in `GodlikeAdminPanel` user list, next to the "Promote to Manager" button
- Existing users default to `NULL` (treated as non-friend)
- New users default to `NULL`

---

## Data Layer

### Migration

```sql
-- supabase/migrations/20260515000000_add_is_friend_flag.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_friend boolean DEFAULT NULL;
```

`NULL` semantics: `NULL` and `false` both mean "not a friend"; only `true` activates friend behavior. This matches the `is_test_user` precedent.

No RLS changes needed — `is_friend` is readable by all authenticated users (same as other `users` columns), writable only by the user themselves (existing policy) and the godlike admin via the Edge Function / direct update.

### Type changes

**`src/types/index.ts`**

Add to `User`:
```typescript
is_friend?: boolean | null;
```

Add to `CrewUser` (the slim type used in crew lists and `mapCrewLivePlans`):
```typescript
is_friend?: boolean | null;
```

---

## Crew Grouping

**File:** `src/services/livePreview.ts`

### `CrewLivePlan` shape

Add a derived field:
```typescript
isFriend: boolean;  // user.is_friend === true
```

Set in `mapCrewLivePlans` when building each `CrewLivePlan`:
```typescript
isFriend: user.is_friend === true,
```

### `groupCrewLivePlans` — updated routing

```typescript
for (const crew of crewPlans) {
  if (crew.isAtMetalPlace && metalPlaceWindowActive) {
    metalPlaceMembers.push(crew);
    continue;
  }

  if (crew.plan.status === 'current' && crew.plan.band) {
    // band group — friends appear here too
    const group = bandGroups.get(crew.plan.band.id) ?? { kind: 'band', band: crew.plan.band, members: [] };
    group.members.push(crew);
    bandGroups.set(crew.plan.band.id, group);
    continue;
  }

  // NEW: friends are invisible when not on a current band
  if (crew.isFriend) {
    continue;  // skip — not added to camping, lost, or any group
  }

  if (crew.isCamping) {
    campingMembers.push(crew);
  } else {
    lostMembers.push(crew);
  }
}
```

---

## PresenceToggle — hiding from friends

**File:** `src/hooks/useNowData.ts`

Add a derived value exposed from the hook:
```typescript
const isFriend = useMemo(
  () => users.find(u => u.id === userId)?.is_friend === true,
  [users, userId]
);
// expose isFriend in the hook's return value
```

**File:** `src/pages/RightNowPage.tsx`

Change the PresenceToggle render guard from:
```tsx
{userId && <PresenceToggle ... />}
```
to:
```tsx
{userId && !isFriend && <PresenceToggle ... />}
```

No changes needed in the `presenceRepository` — the toggle absence is sufficient; friends won't have stale camping flags set because they never had access to the toggle.

---

## Badge Exclusions

**File:** `src/components/BadgesDisplay.tsx`

### Current user `currentLocation`

Change from:
```typescript
const currentLocation = isAtMetalPlace ? 'metal_place' : isAtCamping ? 'camping' : 'lost';
```

To:
```typescript
const isCurrentUserFriend = myUser?.is_friend === true;
const currentLocation = isCurrentUserFriend
  ? null
  : isAtMetalPlace ? 'metal_place' : isAtCamping ? 'camping' : 'lost';
```

Setting `currentLocation: null` means no `location_visit_count_min` or `crew_at_location_min` condition can ever match for a friend — blocks all 3 location badges.

### `crewLocationCounts` — exclude friends

Change from:
```typescript
const crewLocationCounts = {
  camping: presence.filter(p => p.is_camping).length,
  metal_place: presence.filter(p => p.is_at_metal_place).length,
  lost: presence.filter(p => !p.is_camping && !p.is_at_metal_place).length,
};
```

To:
```typescript
const friendUserIds = new Set(users.filter(u => u.is_friend === true).map(u => u.id));
const nonFriendPresence = presence.filter(p => !friendUserIds.has(p.user_id));
const crewLocationCounts = {
  camping: nonFriendPresence.filter(p => p.is_camping).length,
  metal_place: nonFriendPresence.filter(p => p.is_at_metal_place).length,
  lost: nonFriendPresence.filter(p => !p.is_camping && !p.is_at_metal_place).length,
};
```

This ensures friends don't artificially lower/raise the camping or lost thresholds that gate `bbq-crew` and `lost-together` for real camping users.

`BadgesDisplay` already loads `users` for `special_badges` — add `is_friend` to that `select()` call.

---

## Godlike Admin UI

**File:** `src/components/profile/GodlikeAdminPanel.tsx`

### New handler

```typescript
const handleToggleFriend = async (userId: string, currentValue: boolean | null) => {
  const newValue = currentValue === true ? null : true;
  await supabase.from('users').update({ is_friend: newValue }).eq('id', userId);
  // refresh user list
};
```

`null` is used to "remove" friend status (instead of `false`) to keep the nullable default semantics consistent.

### Button in user row

Add next to the promote/demote button (inside the `user.role !== 'godlike'` block):

```tsx
<button
  className={`${styles.userActionButton} ${
    user.is_friend ? styles.secondaryAction : ''
  } ${user.loading ? styles.loading : ''}`}
  onClick={() => handleToggleFriend(user.id, user.is_friend)}
  disabled={user.loading}
  type="button"
>
  {user.is_friend ? t('removerAmigo') : t('marcarAmigo')}
</button>
```

### New i18n keys

Keys follow the existing pattern (Portuguese names like `promoverManager`, `removerManager`). Add the same keys to all 4 locale files with localized values:

| Key | ProfilePage_br.json | ProfilePage_en.json | ProfilePage_de.json | ProfilePage_es.json |
|-----|---------------------|---------------------|---------------------|---------------------|
| `marcarAmigo` | "Marcar como amigo" | "Mark as friend" | "Als Freund markieren" | "Marcar como amigo" |
| `removerAmigo` | "Remover amigo" | "Remove friend" | "Als Freund entfernen" | "Quitar amigo" |

---

## Offline Behavior

- `is_friend` is part of the `users` table, which is cached to IndexedDB on first load
- `mapCrewLivePlans` reads from the cached `users[]` in IDB — works offline
- `BadgesDisplay` reads users from IDB as well — location badge exclusion works offline
- `PresenceToggle` is hidden based on IDB-cached user data — works offline

No new IDB stores or sync queues are needed. The `users` cache already includes the full row; `is_friend` just needs to be included in the select queries that populate it.

---

## Files Affected

| File | Change |
|------|--------|
| `supabase/migrations/20260515000000_add_is_friend_flag.sql` | New migration — add `is_friend` column |
| `src/types/index.ts` | Add `is_friend` to `User` and `CrewUser` |
| `src/services/livePreview.ts` | `mapCrewLivePlans` + `groupCrewLivePlans` — friend skip logic |
| `src/hooks/useNowData.ts` | Expose `isFriend` derived value |
| `src/pages/RightNowPage.tsx` | Guard `PresenceToggle` with `!isFriend` |
| `src/components/BadgesDisplay.tsx` | `currentLocation = null` for friends; exclude friends from `crewLocationCounts` |
| `src/components/profile/GodlikeAdminPanel.tsx` | Add `handleToggleFriend` + button in user row |
| `src/i18n/ProfilePage_br.json` | Add `marcarAmigo`, `removerAmigo` |
| `src/i18n/ProfilePage_en.json` | Add `markAsFriend`, `removeFriend` keys |
| `src/i18n/ProfilePage_de.json` | Add German equivalents |
| `src/i18n/ProfilePage_es.json` | Add Spanish equivalents |
| `docs/ai-wiki/domain-model.md` | Add `is_friend` to User entity docs |
| `docs/ai-wiki/supabase-schema.md` | Document new column |

---

## Out of Scope

- Friends are still visible in other users' band group when on a current pick — this is intentional
- No badge for "brought a friend" — not requested
- No self-service "I'm a friend" flag — godlike-only assignment
- No UI label/indicator showing that a user is a friend (their card looks the same as normal users)

---

## Acceptance Criteria

- [ ] Migration applies cleanly; existing users have `is_friend = NULL`
- [ ] Godlike can toggle `is_friend` on any non-godlike user from the admin panel
- [ ] PresenceToggle is not rendered on `/now` for a friend user
- [ ] A friend with a current band pick appears in the band group on `/now`
- [ ] A friend without a current band pick does not appear in any crew group
- [ ] Friends do not appear in the camping group, lost group, or metal_place group
- [ ] Friends can still view camping and lost groups (they just don't appear in them)
- [ ] Friends cannot win `metal-place-2026`, `bbq-crew`, or `lost-together` badges
- [ ] Friends are excluded from `crewLocationCounts` (don't inflate camping/lost thresholds)
- [ ] All behavior works offline (IDB-cached `is_friend` value drives all logic)
- [ ] Normal users (is_friend = NULL or false) are unaffected
