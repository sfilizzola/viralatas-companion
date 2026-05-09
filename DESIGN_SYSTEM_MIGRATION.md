# Design System Migration - Viralatas Metaleiros

Plan for porting the existing app to the design system defined in [`public/Design System.html`](public/Design%20System.html).

## Current State

Phases A through J are implemented. The app has the design-system token base, fonts, typography utilities, band cards, filters, band detail modal, `/now` location cards, profile/badges, announcements, auth/nav/offline chrome, and shared icon primitive.

This document now tracks only the remaining approved design-system work.

## Guardrails

1. Preserve existing behavior unless the phase explicitly replaces it.
2. Keep offline-first behavior intact: IndexedDB should continue to render and queue local changes.
3. Reuse existing tokens and stage/status colors; do not introduce one-off inline styles.
4. Build reusable components when a design-system primitive may appear in more than one app surface.
5. Keep each phase independently shippable and verify with tests or a build.

## Phase K - Presence Toggle Component

**Goal:** Implement the design-system "Presence toggle - the user's manual location" surface as a reusable component and use it at the top of `/now`.

**Design-system source:**
- CSS anatomy: `public/Design System.html`, "PRESENCE TOGGLE (manual location on /now)"
- Demo behavior: `public/Design System.html`, "Presence toggle - the user's manual location"
- Mobile frame: `/now - landing - presence toggle + locations`

**Scope:**
- Add an independent `PresenceToggle` component under `src/components/`.
- Replace the existing top camping switch in [`src/pages/RightNowPage.tsx`](src/pages/RightNowPage.tsx).
- Remove the separate Metal Place check-in / checkout button card from `/now`; its behavior moves into `PresenceToggle`.
- Keep the current `user_presence` data shape:
  - `is_camping = false`, `is_at_metal_place = false` means auto-resolve from current pick, then LOST.
  - `is_camping = true` means manual Camping.
  - `is_at_metal_place = true` means manual Metal Place.
- Keep existing persistence/sync/offline behavior by continuing to use `setCampingStatus`, `setMetalPlaceStatus`, `syncCrewPresence`, and the existing offline presence queue.
- Support localization for all visible strings through the existing i18n catalogs.

**Component contract:**
- `value`: `'auto' | 'camping' | 'metal_place'`
- `metalPlaceAvailable`: boolean; when false, render only the Camping toggle.
- `onChange(nextValue)`: selecting an inactive option sets that manual location; selecting the active option sends `'auto'`.
- Copy props or localized labels for:
  - title
  - Camping label
  - Metal Place label

**Behavior:**
1. The toggle sits prominently below the `/now` header and above the main "Right Now" content.
2. Outside the Metal Place window, render only Camping.
3. During the Metal Place window, render Camping and Metal Place as mutually exclusive options.
4. Tapping Camping while inactive stores `is_camping = true` and clears Metal Place via existing logic, except while the user has a current live band; Camping must not override a band state.
5. Tapping Metal Place while inactive stores `is_at_metal_place = true` and clears Camping via existing logic.
6. Tapping the active option clears manual location and returns the user to automatic band/LOST resolution.
7. The previous Metal Place event button/card must not render anymore when the Metal Place event is active.

**Files to read first:**
- [`src/pages/RightNowPage.tsx`](src/pages/RightNowPage.tsx)
- [`src/pages/RightNowPage.module.css`](src/pages/RightNowPage.module.css)
- [`src/lib/presence.ts`](src/lib/presence.ts)
- [`src/lib/livePreview.ts`](src/lib/livePreview.ts)
- [`src/i18n/RightNowPage_en.json`](src/i18n/RightNowPage_en.json)
- [`src/i18n/RightNowPage_br.json`](src/i18n/RightNowPage_br.json)

**Acceptance:**
- `/now` no longer shows the old header camping switch.
- `/now` no longer shows the Metal Place check-in / checkout button card during an active Metal Place window.
- The new component can toggle Camping on/off.
- During an active Metal Place window, the new component can toggle Metal Place on/off.
- Camping and Metal Place remain mutually exclusive.
- Camping does not override current-band state and cannot be enabled while the user is in a current-band state.
- Clearing the active option returns to automatic current-pick/LOST resolution.
- Presence updates still work offline and flush through the existing queue.
- Text is localized for Portuguese and English.
- Build/tests pass.
