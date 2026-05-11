# COMPONENT_LIBRARY_PLAN.md — UI Primitives

_Status: PLAN (not started)_  
_This is Stage 4 of NEW_ARCH_PLAN.md. Read that document first._  
_Context: Written May 2026 for the Viralatas Metaleiros companion app_

---

## Goal

Create `src/ui/` — a folder of pure presentational primitives that carry **zero domain knowledge**. A `Button` in `src/ui/` does not know what a band is. A `Modal` does not know what a badge is. These components are then used inside domain components (`BandCard`, `BadgesDisplay`, `ProfileHeader`, etc.) and in new page sub-components created in Stage 3.

This is **not** a full design system with Storybook, tokens, or versioning. It is a well-organized folder with strict contracts. The scope matches the app: ~20 users, one developer, 11 weeks to a hard deadline.

---

## Folder structure

```
src/ui/
  index.ts                 ← re-exports all primitives
  Button.tsx
  Button.module.css
  Modal.tsx
  Modal.module.css
  Chip.tsx
  Chip.module.css
  Collapsible.tsx
  Collapsible.module.css
  Avatar.tsx
  Avatar.module.css
  SectionTitle.tsx
  SectionTitle.module.css
  forms/
    Input.tsx
    Input.module.css
    Select.tsx
    Select.module.css
    SegmentedControl.tsx
    SegmentedControl.module.css
```

Every primitive exports a named component plus its TypeScript props interface. All are re-exported from `src/ui/index.ts`.

---

## Primitive specs

### Button

**Why extract:** Buttons exist in at least 5 different styles across the app (primary CTA, outline secondary, destructive delete, ghost/link, mono uppercase). Each page builds them from scratch.

**Current instances to unify:**
- Pick/unpick button in `BandCard`
- "Salvar" / "Cancelar" in ProfilePage edit form
- "Bloquear" / "Desbloquear" in AnnouncementsPage
- Role change buttons in admin panel
- Sign-out pill in ProfilePage

**Props:**

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}
```

**Variants:**
- `primary` — filled, accent color background (`var(--accent)`)
- `outline` — transparent background, 1px accent border
- `ghost` — no border, no background, text only
- `destructive` — red/danger color, used for delete/block actions

**Notes:**
- `loading` shows a spinner and disables the button automatically
- The current mono uppercase button style (from Design System Phase I) becomes `size="sm"` + CSS class in the consuming component, or a separate `variant="mono"` if the pattern is common enough

---

### Modal

**Why extract:** Two modals already exist (`BandDetailModal`, badge assignment modal coming in Phase 11.E). Both build the overlay + close button pattern independently. Any future modal (confirm dialogs, etc.) would repeat it again.

**Props:**

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
}
```

**Behavior:**
- Renders a backdrop overlay
- Closes on backdrop click and Escape key
- Traps focus while open (accessibility)
- Animated open/close (CSS transition, not JS animation library)
- `title` renders in an Oswald-font header row with a close `<Icon name="close" />`

**Migration:**
- `BandDetailModal.tsx` uses `<Modal>` for its shell, keeps its domain content
- Phase 11.E badge assignment modal uses `<Modal>` directly

---

### Chip / Tag

**Why extract:** Chips appear as: role chips (Vira-latas / Manager / Godlike), PendingChip (offline queue indicator), conflict chips on MyPicksPage, stage tags on band cards, country chip on profile. All are visually similar — small pill with optional icon.

**Two variants, separate components:**

`<Chip>` — status/state indicator, always read-only:

```typescript
interface ChipProps {
  label: string
  color?: string              // CSS color value or CSS variable
  icon?: React.ReactNode
  size?: 'sm' | 'md'
}
```

`<Tag>` — metadata label, often stage or genre:

```typescript
interface TagProps {
  label: string
  color?: string              // typically a stage color
  size?: 'sm' | 'md'
}
```

**Migration targets:**
- Role chips in `AnnouncementsPage` and `ProfilePage` → `<Chip>`
- `PendingChip` in `OfflineBanner` → `<Chip color="var(--accent)">`
- Stage labels in `BandCard` → `<Tag color={stageColor}>`
- Conflict chips in `MyPicksPage` → `<Chip>`

---

### Collapsible

**Why extract:** ProfilePage uses collapsible sections at least 4 times (Edit Profile, Time Travel, Godlike admin, Manager admin). Each is built with the same `useState(false)` toggle + chevron icon pattern.

**Props:**

```typescript
interface CollapsibleProps {
  trigger: React.ReactNode       // the always-visible header row
  defaultOpen?: boolean
  children: React.ReactNode
}
```

**Behavior:**
- `trigger` is always rendered and receives click handler
- Animated expand/collapse (CSS max-height transition)
- Chevron icon rotation handled by CSS (not passed as prop)

**Migration targets:**
- All 4+ collapsible sections in `ProfilePage`
- Any future accordion-style UI

---

### Avatar

**Why extract:** Avatars appear in announcements list (40px), profile header (56px), vira-latas grid (smaller), and the badge assignment modal. Each implements its own circular img + fallback initial.

**Props:**

```typescript
interface AvatarProps {
  src?: string | null
  displayName: string            // used for fallback initial + alt text
  size?: 'xs' | 'sm' | 'md' | 'lg'  // 24px / 32px / 40px / 56px
  role?: 'normal' | 'manager' | 'godlike'  // optional role ring color
}
```

**Behavior:**
- Renders `<img>` if `src` is set; falls back to a circle with the first initial of `displayName`
- `role` prop adds a 2px colored border ring (gold for godlike, blue for manager, none for normal)
- Size mapping: `xs=24px`, `sm=32px`, `md=40px`, `lg=56px`

**Migration targets:**
- `AnnouncementsPage` announcement cards
- `ProfilePage` header
- `BandDetailModal` attendees list
- Vira-latas grid in `RightNowPage`

---

### SectionTitle

**Why extract:** Oswald-font section headers appear on every page. Currently each page sets font-family, font-size, text-transform, and letter-spacing independently.

**Props:**

```typescript
interface SectionTitleProps {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'   // default: 'h2'
  size?: 'sm' | 'md' | 'lg'
  accent?: boolean                    // adds 4px left accent bar
}
```

**Migration targets:**
- All section headers in `ProfilePage`
- `RightNowPage` group headers (location-type headers with Oswald)
- `SchedulePage` stage group headers

---

### Form primitives

**Why extract:** `ProfilePage` edit form builds Input, Select, and SegmentedControl from scratch. Phase 11.E adds a badge dropdown. Any future form will repeat the same accessible label + error message pattern.

**`Input`:**

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}
```

**`Select`:**

```typescript
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
  error?: string
}
```

**`SegmentedControl`:**

```typescript
interface SegmentedControlProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}
```

**Notes:**
- These are minimal, accessible wrappers. No third-party form library.
- The label is always rendered above the field (not floating/placeholder style).
- Error message renders below the field in red.

---

## What does NOT belong in `src/ui/`

These are domain components and must stay in `src/components/`:

| Component | Why it stays in components/ |
|---|---|
| `BandCard` | Knows about `Band`, `UserPick`, stage colors |
| `BandDetailModal` | Knows about bands, attendees, pick toggling |
| `BandFilters` | Knows about stages, genres, festival days |
| `BadgesDisplay` | Knows about `BadgeConfig`, locked/unlocked state |
| `BottomNav` | Knows about app routes |
| `PresenceToggle` | Knows about camping/Metal Place presence |
| `OfflineBanner` | Knows about online/offline state |
| `SyncToast` | Knows about sync queue |
| `ProfileHeader` | (Stage 3) Knows about user role, country, years |
| `AdminPanel` | (Stage 3) Knows about user management |

The test: if you imagine a different app entirely (a sports app, a restaurant app), would this component still make sense? If yes, it belongs in `ui/`. If no, it belongs in `components/`.

---

## CSS strategy

**Keep CSS Modules.** The app already uses `.module.css` files consistently and they work well with Vite. No change to the CSS approach.

**Design tokens:** `src/index.css` already defines CSS custom properties (`--accent`, `--background`, `--surface`, etc.). UI primitives must use only these variables — never hardcode colors. Stage 4 is a good opportunity to audit and extend the token set if gaps are found (e.g., `--danger` for destructive button color).

**No new CSS framework.** No Tailwind, no styled-components, no CSS-in-JS.

---

## Migration strategy

Stage 4 is additive: all primitives are **new files**. Existing domain components are updated one at a time to use them. No domain component is required to use a primitive immediately — adoption is gradual.

**Recommended migration order:**

1. Build all primitives (thin, prop-verified implementations)
2. Update `AnnouncementsPage` cards (simplest, good test: Avatar + Chip + Button)
3. Update `BandCard` (Tag for stage, Button for pick toggle)
4. Update `BadgesDisplay` (Chip for locked indicator)
5. Update Stage 3 profile sub-components (they're new code, write them with primitives from the start)

---

## Acceptance criteria (Stage 4 complete)

- [ ] `src/ui/` contains: `Button`, `Modal`, `Chip`, `Tag`, `Collapsible`, `Avatar`, `SectionTitle`, plus the 3 form primitives
- [ ] `src/ui/index.ts` re-exports all of the above
- [ ] `BandCard` uses `<Tag>` for stage and `<Button>` for pick toggle
- [ ] `AnnouncementsPage` uses `<Avatar>` and `<Chip>` for role badges
- [ ] `BandDetailModal` uses `<Modal>` for its shell
- [ ] Stage 3 profile sub-components use `<Avatar>`, `<Collapsible>`, `<Button>`, `<SectionTitle>`
- [ ] All 177+ tests pass
- [ ] TypeScript compiles clean
- [ ] No visual regressions (manual spot-check on all 8 routes)

---

## Future considerations (post-Wacken)

- **Storybook integration**: if the team grows or the app is reused, adding Storybook to `src/ui/` is straightforward at this point.
- **Dark/light mode toggle**: currently dark-mode is mandatory. If a light mode is ever added, the token system in `src/index.css` is the only place to change.
- **Animation library**: the CSS transitions used in `Modal` and `Collapsible` are intentionally minimal. If richer animations are needed, a lightweight library (e.g., `@radix-ui/react-collapsible`) could replace just those components.
- **`@radix-ui` primitives**: for accessibility-critical components (Modal focus trap, SegmentedControl ARIA), Radix UI provides excellent headless primitives that could replace the manual implementations here.
