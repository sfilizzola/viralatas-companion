# Badge Preview Tool in Godlike Menu — Design Spec

**Date:** 2026-05-14
**Phase:** 18
**Status:** Approved

---

## Purpose

Give the godlike user a zero-persistence way to preview every badge's image and detail modal directly from the GODLIKE POWERS panel. Useful when adding new badges to the registry to verify art, year chips, and i18n strings look correct before anyone earns them.

---

## Relevant Source Files

| File | Role |
|---|---|
| `src/components/profile/GodlikeAdminPanel.tsx` | Host component — modified to mount `TestBadgeSection` |
| `src/components/profile/GodlikeAdminPanel.module.css` | Styles — extended with badge grid classes |
| `src/components/profile/TestBadgeSection.tsx` | **New** — self-contained badge preview section |
| `src/services/badges/registry.ts` | Source of all `BADGES` (static import, no network) |
| `src/services/badges/types.ts` | `BadgeConfig` type |
| `src/ui/Modal` | Existing modal component — reused, untouched |
| `src/components/BadgesDisplay.tsx` | Reference for modal markup pattern — read-only, untouched |

---

## Architecture

### Approach chosen: Self-contained section (Option A)

A new `TestBadgeSection.tsx` component is added inside `src/components/profile/`. It imports `BADGES` from the registry, renders a compact scrollable grid of all badge thumbnails, and manages a local `selectedBadge: BadgeConfig | null` state. When non-null, it opens the existing `Modal` from `src/ui` with the badge's image, year chip, translated label, and description — identical to what `BadgesDisplay.tsx` renders for the user's own earned badges.

**Why Option A over alternatives:**
- `BadgesDisplay.tsx` is not modified — zero risk to the real badge display
- No new props or API surface added to any existing component
- Fully isolated: the section can be removed without touching anything else
- Sufficient fidelity for the use case (dev/godlike tool, not production UX)

### Data flow

```
BADGES registry (static import, build-time)
  └─► TestBadgeSection renders grid of all badges
        └─► user clicks a thumbnail
              └─► selectedBadge (local React state, ephemeral)
                    └─► Modal opens with badge details
                          └─► user closes Modal
                                └─► selectedBadge = null
```

**Zero network calls. Zero IndexedDB reads or writes. Zero Supabase interactions.**

---

## Component Design

### `TestBadgeSection.tsx`

**Props:**
```ts
type TestBadgeSectionProps = {
  t: (key: string) => string;
};
```

**State:**
```ts
const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);
```

**Render structure:**
- `<Collapsible>` with trigger "Test Badges" — matches the pattern of other godlike sections
- Inside: scrollable CSS grid (class `testBadgeGrid`)
  - One `<button className={testBadgeCell}>` per badge in `BADGES`
  - `<img src={badge.imagePath} alt={badge.slug} />` at 56×56px
  - `<span className={testBadgeCaption}>{badge.slug}</span>` as a small caption
  - `onClick={() => setSelectedBadge(badge)}`
- `<Modal>` open when `selectedBadge !== null`, `onClose={() => setSelectedBadge(null)}`
  - Modal body: large badge image, optional year chip (if `badge.year`), `t(badge.labelKey)`, `t(badge.descriptionKey)`
  - Mirrors the detail view pattern in `BadgesDisplay.tsx`

### Mount point in `GodlikeAdminPanel.tsx`

Inserted after the Live Band Test section and before the registered users list:

```tsx
<TestBadgeSection t={t} />
```

---

## Styles (`GodlikeAdminPanel.module.css`)

```css
.testBadgeGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

.testBadgeCell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  padding: 4px;
}

.testBadgeCell:hover {
  border-color: var(--accent);
}

.testBadgeCell img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.testBadgeCaption {
  font-size: 9px;
  color: var(--text-muted);
  text-align: center;
  word-break: break-all;
}
```

---

## What Is NOT Changed

- `BadgesDisplay.tsx` — untouched
- Badge condition evaluation engine — untouched
- `BADGES` registry — untouched
- `user_metadata.achieved_badge_slugs` — never read or written
- Database, Supabase, IndexedDB — zero interactions
- Any existing godlike functionality

---

## Error Handling

| Case | Behavior |
|---|---|
| Missing badge image | Browser renders broken-image placeholder — acceptable for a dev tool |
| Missing i18n key | `t()` returns the raw key string — acceptable for a dev tool |

---

## Testing

No new unit tests required. This is a godlike-only dev tool with pure local state and no logic beyond `setSelectedBadge`.

**Manual verification steps:**
1. Open profile as godlike user
2. Expand GODLIKE POWERS panel
3. Expand "Test Badges" section
4. Confirm all registered badges appear as image thumbnails
5. Click any badge → confirm modal shows correct image, year chip (if applicable), title, and description
6. Close modal → confirm no badge was added to own profile page
7. Confirm zero network requests were made (DevTools → Network)

---

## Constraints

- **No persistence:** `user_metadata.achieved_badge_slugs` is never touched
- **No evaluation:** badges are displayed raw from the registry, not evaluated against user context
- **Godlike-only:** `TestBadgeSection` is only rendered inside `GodlikeAdminPanel`, which already guards on `userRole === 'godlike'`
- **No new i18n keys:** section title is a hardcoded dev label; badge labels/descriptions reuse existing registry keys
