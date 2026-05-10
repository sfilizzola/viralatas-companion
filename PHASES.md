# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

---

## Phase 11 — Profile, Header, Badges

Seven sub-phases ordered by risk/complexity (least → most). Each is independently shippable.

---

### Phase 11.A — `/now` header datetime fix _(Low — CSS only)_

**Problem:** On phones ≤430px the `/now` header stacks vertically (`flex-direction: column`) due to a mobile media query override. The datetime falls below the title instead of sitting right-aligned as it does on every other page.

**Changes:**
- `src/pages/RightNowPage.module.css` — remove `flex-direction: column` and `align-items: flex-start` from the `@media (max-width: 430px)` block; keep `align-items: flex-end` so both sides baseline-align.
- `src/pages/RightNowPage.tsx` — remove the extra `<div>` wrapper around `<span className={styles.title}>` so the title is a direct flex child (matches SchedulePage structure).

**Acceptance criteria:**
- On a 390px viewport the title sits left and the datetime sits right in the same row, aligned to the bottom edge, matching the Schedule and Popular headers.
- No visual regression on desktop.

---

### Phase 11.G — `/picks` collapsible day sections _(Low — state + CSS only)_

**Goal:** Let the user collapse a festival day in the My Picks timeline so they can scroll past it quickly to reach a later day. The trigger must be discreet — the existing day header row becomes the toggle; nothing new is added to the layout except a tiny chevron indicator.

#### Visual design (follows Design System)

The day header already uses `display: flex; justify-content: space-between`. The right-side `<small dayHeaderCount>` keeps its count text; a 12px `Icon name="chevron"` in `--text-faint` is appended after it in the same flex row. When expanded the chevron points up (▲), when collapsed it points down (▼) — same rotation convention as every other collapse in the app (ProfilePage pattern):

```
QUARTA 29/07       5 BANDAS ▲   ← expanded
QUINTA 30/07       3 BANDAS ▼   ← collapsed
```

No extra buttons, no visual separators — the header row itself is the tap target.

#### State

Single `collapsedDays: Set<string>` in `MyPicksPage`. All days start **expanded** (set is empty). Clicking a day header toggles its ISO date string in/out of the set.

```ts
const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

function toggleDayCollapse(day: string) {
  setCollapsedDays((prev) => {
    const next = new Set(prev);
    next.has(day) ? next.delete(day) : next.add(day);
    return next;
  });
}
```

#### DOM / JSX changes (`src/pages/MyPicksPage.tsx`)

- `<h2 className={styles.dayHeader}>` gains `role="button"`, `tabIndex={0}`, `aria-expanded={isExpanded}`, `onClick={() => toggleDayCollapse(day)}`, `onKeyDown` (Enter/Space).
- The right side of the header: wrap existing `<small>` + new chevron in a `<span className={styles.dayHeaderRight}>`.
- Band cards list wrapped in `<div className={`${styles.dayBands} ${isExpanded ? styles.dayBandsOpen : ''}`}>`.

```tsx
const isExpanded = !collapsedDays.has(day);

<h2
  className={styles.dayHeader}
  role="button"
  tabIndex={0}
  aria-expanded={isExpanded}
  onClick={() => toggleDayCollapse(day)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDayCollapse(day); }}}
>
  <span>{dayLabel(day)}</span>
  <span className={styles.dayHeaderRight}>
    <small className={styles.dayHeaderCount}>
      {t('dayPickCount', { count: dayBands.length })}
    </small>
    <span className={`${styles.dayCollapseChevron} ${isExpanded ? styles.dayCollapseChevronOpen : ''}`}>
      <Icon name="chevron" size={12} />
    </span>
  </span>
</h2>

<div className={`${styles.dayBands} ${isExpanded ? styles.dayBandsOpen : ''}`}>
  {dayBands.map((band) => ( /* existing BandCard render */ ))}
</div>
```

#### CSS additions (`src/pages/SchedulePage.module.css`)

Since `MyPicksPage` imports `SchedulePage.module.css`, add the new classes there. The existing `.dayHeader` needs `cursor: pointer` and `user-select: none`.

```css
/* Existing .dayHeader — add: */
cursor: pointer;
user-select: none;

/* New */
.dayHeaderRight {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.dayCollapseChevron {
  display: inline-flex;
  align-items: center;
  color: var(--text-faint);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.dayCollapseChevronOpen {
  transform: rotate(180deg);
}

.dayBands {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease-out;
}

.dayBandsOpen {
  max-height: 4000px;   /* tall enough for a full festival day */
  transition: max-height 0.25s ease-in;
}
```

**Note:** `max-height` animation has a known quirk — it animates toward the cap, not the actual height, so the collapse feels instant and the expand feels slightly slow on tall lists. This is acceptable for a low-priority touch; a future pass could use a ResizeObserver-based approach if it feels off.

#### No i18n keys needed

The chevron is purely visual; the existing `dayPickCount` key already conveys the content summary. `aria-expanded` is the accessible signal.

**Acceptance criteria:**
- All day sections start expanded on page load.
- Tapping a day header collapses its band cards with a smooth animation; the chevron rotates to ▼.
- Tapping again expands; chevron rotates back to ▲.
- Keyboard (Enter / Space) on a focused day header toggles the section.
- Collapsed day still shows the band count in the header.
- The conflict warning banner (11.F) counts remain correct regardless of collapse state (it reads from state, not DOM).
- No visual change to SchedulePage (the new classes are additive; SchedulePage doesn't use `.dayBands`/`.dayCollapseChevron`).

---

### Phase 11.B — Profile years: pill grid (2005–2026) _(Low-medium — UI only, no DB change)_

**Problem:** The year selector only covers 2022–2026 and uses plain checkboxes. OG metaleiros attended as far back as 2005.

**Changes:**
- `src/pages/ProfilePage.tsx` — replace the `fieldset` + checkbox list with a `WackenYearPicker` inline component (defined in the same file or extracted to `src/components/WackenYearPicker.tsx`).
- Year range: 2005–2026 (22 years, excluding 2020 and 2021 which were COVID cancellations — show them as disabled/greyed if desired, or just omit).
- Layout: decade-labelled rows using a thin `--border` divider. Groups: **2000s** (2005–2009) / **2010s** (2010–2019) / **2020s** (2022–2026). Each year is a pill button (`role="checkbox"`, `aria-checked`). Filled accent = selected, muted outline = unselected.
- A live counter below the grid: `● N Wacken(s) selected` in mono.
- `src/pages/ProfilePage.module.css` — add `.yearGrid`, `.yearDecade`, `.yearPill`, `.yearPillSelected`, `.yearCounter` classes.

**Acceptance criteria:**
- All 22 (or 20 without cancelled years) year pills render in three decade rows.
- Tapping a pill toggles selection; the counter updates.
- Saving persists the correct array to Supabase user_metadata and IndexedDB, same as before.
- The existing `handleYearToggle` logic is reused unchanged.

---

### Phase 11.F — Conflict severity split + `/picks` 3-conflict warning _(Low-medium — hook + UI + i18n + tests)_

**Context:** The current `useBandConflicts` hook flags every time overlap as a conflict regardless of how much time overlaps. A band ending at 20:00 and one starting at 19:55 on a different stage is a 5-minute tail overlap — not a real scheduling problem. The user wants this treated as a softer "overlap" (orange), while genuine conflicts (>10 min) stay red and count toward the conflict total.

#### Severity model

| Overlap duration | Severity | Color token | Card outline | Chip label |
|---|---|---|---|---|
| 1–600 000 ms (≤10 min) | `soft` | `--signal-warn` (orange) | orange outline | "SOBREPOSIÇÃO" / "OVERLAP" |
| > 600 000 ms (>10 min) | `hard` | `--signal-live` (red) | red outline | "CONFLITO" / "CONFLICT" |

#### `src/hooks/useBandConflicts.ts`

- New exported types:
  ```ts
  export type OverlapSeverity = 'hard' | 'soft';
  export type OverlapEntry = { band: Band; severity: OverlapSeverity };
  ```
- `computeBandConflicts` (rename to `computeBandOverlaps`) returns `Map<string, OverlapEntry[]>`.
- Overlap duration = `min(aEnd, bEnd) − max(aStart, bStart)`. If ≤ 600 000 ms → `'soft'`; if > 600 000 ms → `'hard'`.
- `useBandConflicts` hook return type updated accordingly; old name kept as alias for a one-release transition if needed.

#### `src/components/BandCard.tsx` + `BandCard.module.css`

- `conflict` prop: add `severity: 'hard' | 'soft'`.
- Card outline class: `severity === 'hard'` → new `.cardHardConflict` (red, `--signal-live`); `severity === 'soft'` → existing `.cardConflict` remains (orange, `--signal-warn`), renamed to `.cardSoftOverlap` for clarity.
- Chip variant: `'hard'` → existing `.conflictChip` gains a red skin; `'soft'` → new `.overlapChip` class (orange, same geometry, softer alpha — matches existing amber chip style but with the "SOBREPOSIÇÃO" label).
- Chip label i18n key: `'hard'` → `conflictChip` (existing); `'soft'` → new key `overlapChip`.

New CSS in `BandCard.module.css`:
```css
/* hard conflict outline */
.cardHardConflict {
  outline: 2px solid var(--signal-live);
  outline-offset: -2px;
}
/* soft overlap chip */
.overlapChip { /* same geometry as .conflictChip, orange palette */ }
.overlapChipActive { background: var(--signal-warn); color: #1a0d00; }
/* hard conflict chip — red palette */
.conflictChipHard { background: rgba(192,57,43,.12); color: #e74c3c; border-color: rgba(192,57,43,.4); }
.conflictChipHardActive { background: var(--signal-live); color: #fff; }
```

#### `src/components/BandDetailModal.tsx` + `BandDetailModal.module.css`

- New prop: `overlapBands?: Band[]` (soft overlaps).
- Existing `conflictBands` prop now means hard-only.
- In the modal: render hard conflicts with the existing red conflict icon + `conflictWarning` label; render soft overlaps with the orange `⚠` icon + new `overlapWarning` label in a visually lighter style.

#### `src/pages/MyPicksPage.tsx`

- Destructure hard/soft from `useBandConflicts`.
- `totalConflicts` → counts unique band IDs that appear in any `'hard'` entry only.
- `totalOverlaps` → counts unique band IDs in `'soft'`-only entries (bands with no hard conflicts).
- Pass correct severity to each `BandCard`'s `conflict` prop.
- Pass `conflictBands` (hard) and `overlapBands` (soft) to `BandDetailModal`.
- **3-conflict warning banner:** rendered between the `<header>` and `<main>` when `totalConflicts >= 3`:
  ```tsx
  {totalConflicts >= 3 && (
    <a href="/profile" className={styles.conflictBanner}>
      <Icon name="conflict" size={14} />
      {t('conflictWarningBanner', { count: totalConflicts })}
    </a>
  )}
  ```
  Style (`.conflictBanner`): mono 11px, `--signal-live` text, subtle red-tinted row (`rgba(192,57,43,.08)` background), `border-bottom: 1px solid rgba(192,57,43,.2)`, padding `var(--s-3) var(--s-4)`, full-width link, no underline.
- Update `headerConflicts` i18n key to show only hard conflict count; add `headerOverlaps` key for soft count (shown as a separate summary line when > 0).

#### New i18n keys

**`SchedulePage_br.json` / `SchedulePage_en.json`:**
- `overlapChip`: `"Sobreposição"` / `"Overlap"`
- `overlapWarning`: `"Sobrepõe com {name}"` / `"Overlaps with {name}"`

**`MyPicksPage_br.json` / `MyPicksPage_en.json`:**
- `conflictWarningBanner`: `"Você tem {count} conflito(s). Resolva fácil no seu perfil →"` / `"You have {count} conflict(s). Easy to fix in your profile →"`
- `headerOverlaps`: `"{overlaps} sobreposição(ões)"` / `"{overlaps} overlap(s)"`

#### Tests (`src/__tests__/useBandConflicts.test.ts`)

Update all existing tests for the new `OverlapEntry[]` return type. Add:
- 10-min overlap (exactly 600 000 ms) → `'soft'`
- 10-min + 1-second overlap → `'hard'`
- 0-min overlap (adjacent) → no entry
- Band with both a hard-conflict partner and a soft-overlap partner in the same result set

**Acceptance criteria:**
- A band ending at 20:00 and one starting at 19:55 (5 min overlap): orange outline + "SOBREPOSIÇÃO" chip; NOT counted in `totalConflicts`.
- A band ending at 20:00 and one starting at 19:45 (15 min overlap): red outline + "CONFLITO" chip; counted in `totalConflicts`.
- 3 hard conflicts → red banner appears above the list, links to `/profile`.
- 2 hard conflicts + any number of soft overlaps → no banner.
- Header summary reflects only hard count on the conflicts line.

---

### Phase 11.C — New client-side badge conditions: attendance count + anniversary _(Medium — logic only, no DB change)_

Two new `BadgeCondition` discriminants in `src/lib/badges.ts`. No schema migration needed.

#### 11.C.1 — `wacken_years_count_min`
```ts
| { type: 'wacken_years_count_min'; count: number }
```
True when `ctx.wacken_years.length >= condition.count`. Unlocks "5 Wackens" badge, "10 Wackens" badge, etc.

Example badge:
```ts
{
  slug: '5-wackens',
  imagePath: '/badges/badge_5wackens.png',
  labelKey: 'badge5Wackens',
  descriptionKey: 'badge5WackensDescription',
  condition: { type: 'wacken_years_count_min', count: 5 },
}
```

#### 11.C.2 — `wacken_attended_in_year`
```ts
| { type: 'wacken_attended_in_year'; year: number }
```
True when `condition.year` is in the user's `wacken_years` array. Unlocks anniversary badges celebrating how long ago they attended a specific year.

Example badge (for someone who attended in 2016, now 10 years ago):
```ts
{
  slug: 'anniversary-2016-10years',
  imagePath: '/badges/badge_10years.png',
  labelKey: 'badgeAnniversary2016',
  descriptionKey: 'badgeAnniversary2016Description',
  condition: { type: 'wacken_attended_in_year', year: 2016 },
}
```

**Deliverables:**
- New condition types added to `BadgeCondition` union in `badges.ts`.
- New `evaluateBadge` cases.
- At least one badge entry per new condition (pending badge PNG assets in `public/badges/`).
- New i18n keys in `Badges_br.json` and `Badges_en.json`.
- Unit tests covering both conditions (true / false / edge cases).

**Acceptance criteria:**
- User with `wacken_years: [2016, 2019, 2022, 2023, 2026]` earns the `5-wackens` badge (5 years attended) and the `anniversary-2016-10years` badge (attended in 2016, 10 years ago).
- User with `wacken_years: [2026]` earns neither (only attended once, this year, no anniversary yet).

---

### Phase 11.D — Camping arrival day tracking + badge _(Medium — user_metadata field + UI + new condition)_

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

### Phase 11.E — Godlike-assigned joke badges _(Medium-high — DB migration + RLS + admin UI + new condition)_

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

**Godlike admin UI** (in the existing admin collapsible section of ProfilePage):
- "Assign joke badge" panel: user dropdown (all non-godlike vira-latas) + badge dropdown (only badges with `condition.type === 'assigned'`).
- On submit: calls a new Edge Function `assign-badge` that uses the service role key to update `users.special_badges` for the target user. Returns updated list.
- Revoke: same panel shows currently assigned badges per user with an ✕ button.

**Edge Function `assign-badge`:**
- Auth: only callable by a godlike user (verify `role` in JWT claims or users table).
- Input: `{ targetUserId, badgeSlug, action: 'assign' | 'revoke' }`.
- Output: `{ special_badges: string[] }`.

**Deliverables:**
- SQL migration.
- Updated `BadgeCondition`, `BadgeContext`, `buildBadgeContext`, `evaluateBadge`.
- `supabase/functions/assign-badge/index.ts`.
- Godlike UI panel in ProfilePage.
- At least one joke badge PNG + config entry as a template.
- i18n keys for the new admin panel labels.
- Tests for the new condition evaluator.

**Acceptance criteria:**
- Godlike assigns badge `slug-X` to user B. User B's profile shows the badge. User A (without assignment) does not see it.
- Revoking removes the badge from user B's earned list immediately.
- Non-godlike users cannot trigger the Edge Function (403 response).

---

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for ideas that are nice-to-have and will be implemented if time permits after current planned work is complete.
