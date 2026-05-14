# Schedule Page — Sort Order Filter

**Date:** 2026-05-14  
**Phase:** 16  
**Status:** Approved, ready for implementation

---

## Purpose

Add a user-controlled sort order to the `/schedule` page, placed as an icon-only button to the right of the day-tabs row. The feature has three modes: time ascending (earliest first), time descending (latest first), and alphabetical. The selected order persists across sessions via `localStorage`.

---

## Scope

Pure front-end, pure client-side. No DB changes, no migrations, no Edge Functions, no Service Worker changes. Operates entirely on the already-cached band list in IndexedDB memory — fully offline compatible.

---

## State Model

### `BandFilterValue` — new field

```typescript
// src/components/bandFilterValue.ts
export type BandFilterValue = {
  query: string;
  day: string | null;
  stage: string[];
  genre: string | null;
  upcoming: boolean;
  sortOrder: 'time-asc' | 'time-desc' | 'alpha'; // NEW
};

export const EMPTY_FILTERS: BandFilterValue = {
  query: '',
  day: null,
  stage: [],
  genre: null,
  upcoming: false,
  sortOrder: 'time-asc', // default — preserves current behavior
};
```

### Persistence

`src/services/scheduleFilterStorage.ts` already persists filters to `localStorage` key `vlt:filters:schedule`. `sortOrder` is added to the persisted shape. On load, if the stored value is missing or invalid, it falls back to `'time-asc'`.

---

## Sort Logic

The hardcoded `.sort()` in `SchedulePage.tsx` (currently applied once on load) is **removed**. Sorting moves into `filterBands()` in `src/services/bandFilter.ts` as a final step, so it applies to the post-filter result set.

```typescript
// end of filterBands() in src/services/bandFilter.ts
switch (filters.sortOrder) {
  case 'time-asc':
    result.sort((a, b) => a.start_time.localeCompare(b.start_time));
    break;
  case 'time-desc':
    result.sort((a, b) => b.start_time.localeCompare(a.start_time));
    break;
  case 'alpha':
    result.sort((a, b) => a.name.localeCompare(b.name));
    break;
}
```

---

## UI Design

### Layout — day tabs row

The day tabs row is restructured from a standalone full-width grid to a flex row:

```
[ D1 | D2 | D3 | D4  (flex:1, grid) ]  [ sort icon button (~36×36px) ]
```

The sort button is flush right, vertically centered with the day tabs. It shares the visual language of the existing filter trigger: `bg-elevated` background, `border-strong` border, `r-1` border radius.

### Sort button icon

The button icon reflects the active sort mode. Three new icons are added to `src/components/icons/Icon.tsx`:

| Mode        | Icon name        | Description                                              |
| ----------- | ---------------- | -------------------------------------------------------- |
| `time-asc`  | `sort-time-asc`  | Clock face with a sun — "earliest first" (morning)       |
| `time-desc` | `sort-time-desc` | Clock face with a crescent moon — "latest first" (night) |
| `alpha`     | `sort-alpha`     | "A" over "Z" with downward arrow — alphabetical          |

**Active indicator:** when `sortOrder` is not `'time-asc'` (the default), a small accent-colored dot appears on the button (same pattern as the filter trigger's count badge), signaling that a non-default sort is in effect.

### Popover — icon-only strip

Clicking the sort button opens a small upward-anchored popover positioned absolutely above the button (z-index above the sticky bar). The popover contains **three icon-only buttons in a horizontal row**, one per sort mode:

```
┌───────────────────┐
│  [⏱↑]  [⏱↓]  [AZ] │
└───────────────────┘
```

- Each button is ~40×40px, square, with 8px rounded corners.
- **The currently active option is always highlighted with `var(--accent)` background and white icon — including `time-asc` on first open.** The popover always opens with one option clearly selected.
- Inactive buttons have `bg-elevated` background with `text-muted` icon.
- Each button carries an `aria-label` (localized) for screen readers.
- Selecting any option sets `sortOrder` and **immediately closes** the popover. No "Apply" step.
- Clicking outside the popover (document `mousedown` listener) also closes it.

### Active-state indicator on sort button

| sortOrder | Button appearance |
|---|---|
| `time-asc` (default) | Normal — no dot, neutral icon |
| `time-desc` | Accent dot in top-right corner |
| `alpha` | Accent dot in top-right corner |

---

## i18n

New keys added to all four language files (`SchedulePage_br.json`, `_en.json`, `_es.json`, `_de.json`). These are used only as `aria-label` values — not rendered as visible text.

| Key | BR | EN | ES | DE |
|---|---|---|---|---|
| `sortLabel` | `Ordenação` | `Sort order` | `Ordenar` | `Sortierung` |
| `sortTimeAsc` | `Mais cedo primeiro` | `Earliest first` | `Más temprano primero` | `Früheste zuerst` |
| `sortTimeDesc` | `Mais tarde primeiro` | `Latest first` | `Más tarde primero` | `Späteste zuerst` |
| `sortAlpha` | `Alfabético` | `Alphabetical` | `Alfabético` | `Alphabetisch` |

---

## Files Changed

| File | Change |
|---|---|
| `src/components/bandFilterValue.ts` | Add `sortOrder` field; update `EMPTY_FILTERS` |
| `src/services/bandFilter.ts` | Remove no-op; add sort step at end of `filterBands()` |
| `src/services/scheduleFilterStorage.ts` | Persist and restore `sortOrder`; fallback on invalid value |
| `src/components/icons/Icon.tsx` | Add `sort-time-asc`, `sort-time-desc`, `sort-alpha` icon names + SVG paths |
| `src/components/BandFilters.tsx` | Restructure day tabs row to flex; add sort button + popover |
| `src/components/BandFilters.module.css` | Styles for sort button wrapper, popover, icon buttons, active states |
| `src/pages/SchedulePage.tsx` | Remove hardcoded `.sort()` on load |
| `src/i18n/SchedulePage_br.json` | Add 4 sort keys |
| `src/i18n/SchedulePage_en.json` | Add 4 sort keys |
| `src/i18n/SchedulePage_es.json` | Add 4 sort keys |
| `src/i18n/SchedulePage_de.json` | Add 4 sort keys |

---

## Offline Behavior

No change to offline behavior. Sort operates on the band list already loaded from IndexedDB into React state. The sort preference is persisted to `localStorage` (always available offline).

---

## Clear Filters Behavior

The existing `clearAll()` function in `BandFilters.tsx` resets all filter fields. `sortOrder` is treated as a **display preference, not a filter** — `clearAll()` preserves the current `sortOrder` rather than resetting it to `'time-asc'`. The drawer `clearDrawer()` likewise does not touch `sortOrder`.

---

## Error / Edge Cases

- **Invalid stored `sortOrder`:** if `localStorage` contains a value not in the union, fall back to `'time-asc'`.
- **Empty filtered list:** sort is a no-op on an empty array; existing empty-state UI is unchanged.
- **Bands with identical `start_time`:** secondary sort by `name` (locale-aware) to ensure stable, deterministic ordering.

---

## Out of Scope

- Popularity sort (most-picked bands first) — not requested.
- Persisting sort to Supabase user preferences — local-only is sufficient for a festival app.
- Animated re-ordering of band cards on sort change — adds complexity, not requested.
