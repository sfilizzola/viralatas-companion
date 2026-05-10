# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

---

## Phase 11 — Profile, Header, Badges

**Completed sub-phases:** 11.A, 11.B, 11.C, 11.D, 11.E, 11.F, 11.G

---

## Phase 11.D — Camping arrival day tracking + badge _(Completed)_

**Context:** The Wacken camping opens Sunday July 26, 2026 (four days before Day 1). A badge rewards vira-latas who arrive before the official festival start.

**Approach:** Store `wacken_arrival_day` as a string in Supabase Auth `user_metadata` (same as `country`, `wacken_years`). No SQL migration needed.

**Arrival day options (for the profile form select/pills):**
| Value | Label |
|-------|-------|
| `sun-jul26` | Domingo, 26/07 (camping opens) |
| `mon-jul27` | Segunda, 27/07 |
| `tue-jul28` | Terça, 28/07 |
| `wed-jul29` | Quarta, 29/07 (Day 1) |
| `thu-plus` | Quinta ou depois |

**Changes:**
- `src/pages/ProfilePage.tsx` — add an "Quando você chega?" / "When do you arrive?" selector to the edit-profile form. Persists to `user_metadata.wacken_arrival_day`.
- `src/lib/badges.ts` — new `BadgeCondition` discriminant:
  ```ts
  | { type: 'wacken_arrived_before'; day: string }
  ```
  True when the user's stored arrival day sorts before `condition.day` in the ordered options list above.
- `src/lib/badges.ts` — add `wacken_arrival_day` to `BadgeContext`; update `buildBadgeContext` to pull it from `user.user_metadata`.
- Example badge: `early-bird` — awarded for arriving Sunday or Monday.
- New i18n keys in both locale files.

**Acceptance criteria:**
- User who selects "Sunday July 26" earns the `early-bird` badge.
- User who selects "Thursday or later" does not earn it.
- Arrival day saves and loads correctly across sessions.

---

### Phase 11.E — Godlike-assigned joke badges _(Completed)_

**Context:** Some badges are purely subjective — given as an inside joke by the godlike user to a specific vira-lata. There is no algorithmic condition; godlike just picks a user and assigns a pre-defined badge slug.

**Data model:**
- Add `special_badges text[] NOT NULL DEFAULT '{}'` column to the `users` table.
- Migration: `supabase/migrations/YYYYMMDD_add_special_badges.sql`.
- RLS: only `godlike` role can `UPDATE` the `special_badges` column on any row; users can `SELECT` their own row (already covered by existing RLS).

**Badge contract change:**
```ts
// New discriminant
| { type: 'assigned' }
```
A badge with `condition: { type: 'assigned' }` is earned when `ctx.assignedBadges.includes(badge.slug)`.

**Context shape update:**
```ts
type BadgeContext = {
  // ... existing fields
  assignedBadges: string[];   // pulled from users.special_badges
};
```
`buildBadgeContext` receives `assignedBadges: string[]` as a new parameter.

**Godlike admin UI improvements** (integrated into the existing user management section in ProfilePage):
- Each user row in the list now shows:
  - A small chip displaying the count of assigned badges (e.g., "3 assigned") next to the role badge.
  - An inline "🎭 Assign" button (or similar icon/label).
  
- Modal workflow on button click:
  - Modal title: "Assign Badge to [User Name]"
  - **Top section (Assign):** Dropdown or grid of all badges with `condition.type === 'assigned'`. Godlike selects one and clicks "Assign".
  - **Bottom section (Revoke):** Shows currently assigned badges for this user, each with an ✕ button to revoke immediately.
  - Modal closes after assign/revoke (or user clicks X).

**Edge Function `assign-badge`:**
- Auth: only callable by a godlike user (verify `role` in JWT claims or users table).
- Input: `{ targetUserId, badgeSlug, action: 'assign' | 'revoke' }`.
- Output: `{ special_badges: string[] }`.

**Deliverables:**
- SQL migration.
- Updated `BadgeCondition`, `BadgeContext`, `buildBadgeContext`, `evaluateBadge`.
- `supabase/functions/assign-badge/index.ts`.
- Badge assignment modal component (new file or integrated into ProfilePage).
- User list row enhancement: assigned badge count chip + inline assign button.
- At least one joke badge PNG + config entry as a template.
- i18n keys for modal labels, count chip, button labels.
- Tests for the new condition evaluator and Edge Function auth.

**Acceptance criteria:**
- User row shows "3 assigned" chip if user has 3 assigned badges; no chip if none.
- Godlike clicks "Assign" → modal opens → selects badge → badge is assigned and appears in revoke section.
- Revoking a badge removes it from the user's list immediately; count chip updates.
- Non-godlike users cannot trigger the Edge Function (403 response).
- User B's profile shows assigned badges in the patches grid; User A does not see them.

---

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for ideas that are nice-to-have and will be implemented if time permits after current planned work is complete.
