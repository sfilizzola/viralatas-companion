# UI Fixes Batch A — Design Spec

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** 4 independent UI/behaviour fixes. Each can be implemented and deployed by a separate subagent.

---

## Fix 1 — Remove pin emoji from announcement card buttons

### Problem
The `📌` emoji is hard-coded in `AnnouncementsPage.tsx` (line 392) inside the Pin/Unpin button text:
```tsx
{a.is_pinned ? `📌 ${t('unpin')}` : `📌 ${t('pin')}`}
```
The i18n JSON files (`pin`, `unpin`, `pinned` keys) contain no emoji — this is a pure code-level issue.

### Design
- Remove `📌 ` from the button label in `AnnouncementsPage.tsx`.
- Buttons will read the i18n text alone: "Pin" / "Unpin" (or localised equivalent).
- No changes to any i18n files required.

### Affected files
- `src/pages/AnnouncementsPage.tsx` — one line change (line 392)

---

## Fix 2 — Duck button image goes grayscale during cooldown

### Problem
The duck image (`/rubber-duck.png`) is always rendered in full colour, even during the 90-second cooldown when the button is disabled and the drain overlay is active. The user cannot tell visually that the duck is "spent".

### Design
- Add a `.duckImgCooldown` CSS class in `DuckButton.module.css`:
  ```css
  .duckImgCooldown {
    filter: grayscale(1);
    transition: filter 0.4s ease;
  }
  ```
- In `DuckButton.tsx`, conditionally apply the class to the `<img>` element when `isOnCooldown` is true.
- The `transition` ensures a smooth colour→grayscale shift when cooldown starts, and grayscale→colour when cooldown ends.
- The drain overlay is unaffected.
- Both the standard (40px circular) and tile (64px rounded-square) variants are covered by the same class since both share `.duckImg`.

### Affected files
- `src/components/DuckButton.module.css` — add `.duckImgCooldown`
- `src/components/DuckButton.tsx` — conditionally apply class on `<img>`

---

## Fix 3 — ArrivalMap is interactive after festival starts

### Problem
A `useEffect` in `ArrivalMap.tsx` (lines 200–204) forces `view` back to `'collapsed'` whenever `isFestivalActive && view !== 'collapsed'`. This means any user attempt to expand the map is instantly reverted on the next render.

```tsx
// Current (broken) — this overrides the user's interaction
useEffect(() => {
  if (isFestivalActive && view !== 'collapsed') {
    setView('collapsed');
  }
}, [isFestivalActive, view]);
```

### Design
- Delete that `useEffect` entirely.
- The initial state (`getSavedViewState`) already correctly defaults to `'collapsed'` when the festival is active and `localStorage` has no prior preference. This handles the "starts collapsed" requirement.
- Once the user interacts, their choice persists in `localStorage` across reloads.
- No visual or UX change other than the fix itself.

### Affected files
- `src/components/ArrivalMap.tsx` — remove the force-collapse `useEffect`

---

## Fix 4 — "Test Quack" section in Godlike panel

### Problem
There is no way for the godlike user to locally test the DuckButton cooldown animation and the resulting quack notification without creating real database events.

### Design

#### New section in GodlikeAdminPanel
A new section added **before** the `<TimeTravelSection />` call (to keep test utilities grouped together), styled identically to `liveBandTestSection`:
- `<h4>` title (i18n key `testQuackTitle`)
- `<p>` description (i18n key `testQuackDescription`)
- A single `<DuckButton inBody />` instance

#### Cooldown mechanics (local only, no Supabase write)
- The section manages its own state: `testQuackCooldownUntil: number | null`
- `isTestQuackOnCooldown = testQuackCooldownUntil !== null && testQuackCooldownUntil > Date.now()`
- The `DuckButton` receives `isOnCooldown={isTestQuackOnCooldown}` and `cooldownUntil={testQuackCooldownUntil}`
- The cooldown duration is **15 seconds** (`TEST_QUACK_COOLDOWN_MS = 15_000`)
- On button press: set `testQuackCooldownUntil = Date.now() + 15_000`. No call to `duckRepository.quackBand`.
- A `useEffect` watches `testQuackCooldownUntil`. When the timer fires, it:
  1. Clears `testQuackCooldownUntil` (sets to `null`)
  2. Dispatches `viralatas:duck-quack` directly on `window` with `{ bandId: 'godlike-test-quack', bandName: 'Queen' }`

#### DuckToast: support hardcoded bandName
- Extend `DuckQuackEventDetail` in `useDuckNotifications.ts` with `bandName?: string`
- In `DuckToast.tsx`, use `detail.bandName` if present; otherwise fall back to the existing IndexedDB lookup
- This is a non-breaking extension — existing real quacks continue to work unchanged

#### i18n keys to add (all 4 language files: br, en, de, es)
| Key | EN | BR |
|---|---|---|
| `testQuackTitle` | `🦆 Test Quack` | `🦆 Test Quack` |
| `testQuackDescription` | `Simulates receiving a quack notification. Press the duck — after 15 s you'll get a toast from Queen. No database write.` | `Simula o recebimento de uma notificação de quack. Aperte o pato — após 15 s você receberá um toast do Queen. Sem escrita no banco.` |

(DE/ES follow the same pattern in their respective translations.)

#### Affected files
- `src/hooks/useDuckNotifications.ts` — add `bandName?: string` to `DuckQuackEventDetail`
- `src/components/DuckToast.tsx` — use `detail.bandName` if present
- `src/components/profile/GodlikeAdminPanel.tsx` — add test quack section with local cooldown logic
- `src/i18n/ProfilePage_en.json`, `_br.json`, `_de.json`, `_es.json` — add `testQuackTitle`, `testQuackDescription`

---

## Implementation notes

- All 4 fixes are independent; they share no code or state and can be implemented in parallel subagents.
- No database migrations. No Edge Function changes. No Service Worker changes.
- Offline behaviour is unaffected.
- After every change, update `docs/ai-wiki/changelog.md` and `public/Design System.html` per CLAUDE.md rules.
