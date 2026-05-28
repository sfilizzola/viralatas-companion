# Phase 23 — MoshSplit Balance Section

**Date:** 2026-05-22  
**Status:** Approved, ready for implementation  
**Scope:** Self-contained profile component showing the user's MoshSplit balance for Wacken 2026

---

## 1. Overview

A collapsible `MoshSplitSection` component lives on the Profile page. It reads the current user's balance from MoshSplit (a festival finance app at `https://split.viralatas.org`) and shows a net balance chip (positive = owed, negative = owes). A CTA button sends the user to MoshSplit.

Phase has two independent parts:
- **Part 1:** Full UI/UX with hardcoded mocks — ships without any API dependency, used for visual/UX approval.
- **Part 2:** Real API connection wired in after MoshSplit API docs are shared.

---

## 2. Architecture

### Component design

`MoshSplitSection` is fully self-contained:
- Accepts only `userEmail: string` as a prop
- Fetches own data (mock in Part 1, real in Part 2)
- Handles own loading, error, and empty states
- No `t()` prop — manages own strings directly (small component, i18n can be added in a future pass if the app goes multilingual in this area)

### Placement in ProfilePage

Inserted after `<ConflictSection>`, before `<EditProfileForm>`:

```tsx
<ConflictSection userId={user.id} t={t} />
<MoshSplitSection userEmail={user.email ?? ''} />
<EditProfileForm ... />
```

### Auth (Part 2)

- **Balance read:** `VITE_MOSHSPLIT_TOKEN` (app token) + user email sent to MoshSplit API. Token lives in Vercel env vars and is prefixed `VITE_` (bundled into client — acceptable for a ~20-person group app).
- **Redirect to MoshSplit:** Supabase auth token exchange. MoshSplit handles the token on its end. The exact exchange mechanism is TBD pending API docs.

---

## 3. Data Shape

```ts
type MoshSplitBalance = {
  found: boolean;     // false → hide component entirely
  balance: number;    // negative = user owes, positive = user is owed, 0 = settled
  currency: string;   // "BRL", "EUR", etc.
  festival: string;   // "Wacken 2026"
};
```

---

## 4. Render States

| State | Condition | What renders |
|---|---|---|
| `loading` | Fetching data | Collapsible with spinner/skeleton in body |
| `not_found` | `found === false` | `return null` — component invisible |
| `settled` | `found && balance === 0` | Collapsible header + "All settled 🤘" message + CTA button only |
| `active` | `found && balance !== 0` | Collapsible header + balance chip + CTA button |

### Collapsible trigger (header row)

- Left: MoshSplit logo (22×22, `border-radius: 5px`) + "MoshSplit" label in `--font-display`
- Right: balance chip — `--signal-danger` background if negative, `--signal-ok` if positive, muted if settled
- Uses existing `<Collapsible trigger={...}>` from `src/ui` (same pattern as `ConflictSection`)

### Balance chip

Displays formatted balance: `- R$42,50` or `+ R$15,00`. Currency formatted per `balance.currency`.

### CTA button

Full-width button: "Abrir MoshSplit →". Opens `https://split.viralatas.org` in new tab (`target="_blank"`). Present in all visible states (settled + active).

---

## 5. Mock Data for Part 1

Four mock presets toggled by a single constant — developer swaps to test each state:

```ts
// Swap ACTIVE_MOCK to test all states:
const MOCKS = {
  not_found:  { found: false, balance: 0,     currency: 'BRL', festival: 'Wacken 2026' },
  settled:    { found: true,  balance: 0,     currency: 'BRL', festival: 'Wacken 2026' },
  owes:       { found: true,  balance: -42.5, currency: 'BRL', festival: 'Wacken 2026' },
  owed:       { found: true,  balance: 15.0,  currency: 'BRL', festival: 'Wacken 2026' },
};
const ACTIVE_MOCK = MOCKS.owes;
```

A brief `setTimeout(200ms)` simulates network latency so the loading state is visible during testing.

---

## 6. Part 1 Deliverables

| File | Action | Notes |
|---|---|---|
| `src/components/profile/MoshSplitSection.tsx` | Create | Full component, mock data, all 4 states |
| `src/components/profile/MoshSplitSection.module.css` | Create | Uses existing CSS tokens only |
| `src/pages/ProfilePage.tsx` | Edit | Insert `<MoshSplitSection userEmail={...} />` |
| `public/vira-lata-ds.html` | Edit | Document component in profile section |

No migrations, no edge functions, no API calls in Part 1.

---

## 7. Part 2 Deliverables

**Blocked on:** MoshSplit API docs + confirmed endpoint URL.

| File | Action | Notes |
|---|---|---|
| `src/components/profile/MoshSplitSection.tsx` | Edit | Replace mock with real `fetch`; add error state |
| `.env.local` (not committed) | Edit | Add `VITE_MOSHSPLIT_TOKEN=...` |
| Vercel env vars | Manual | Add `VITE_MOSHSPLIT_TOKEN` in project settings |
| Edge Function (optional) | TBD | Only needed if token must be server-side |

Part 2 also adds:
- **Error state:** If fetch fails (network error, API error), component shows a warning row ("Could not load MoshSplit data") + CTA button still visible.
- **Token exchange for redirect:** If MoshSplit supports deep-link with auth token, the CTA builds a parameterized URL. Fallback: plain `https://split.viralatas.org`.

---

## 8. Styling Constraints

- Reuse existing CSS custom properties: `--signal-danger`, `--signal-ok`, `--font-display`, `--font-mono`, `--s-*` spacing tokens
- No new custom properties added to `index.css`
- Dark mode mandatory (metal app)
- MoshSplit logo: `https://split.viralatas.org/moshsplit/assets/logo.svg` — use as `<img>` with fallback to a generic wallet icon if SVG fails to load
- Component background: subtle tinted strip, consistent with `ConflictSection` / other profile sections

---

## 9. Acceptance Criteria

### Part 1
- [ ] `not_found` mock → component not visible on profile page
- [ ] `settled` mock → component visible, balance hidden, "All settled 🤘" visible, CTA visible
- [ ] `owes` mock → component visible, balance chip red with negative amount, CTA visible
- [ ] `owed` mock → component visible, balance chip green with positive amount, CTA visible
- [ ] Component collapses/expands via header tap
- [ ] CTA button opens `https://split.viralatas.org` in new tab
- [ ] Build passes, no linter errors

### Part 2
- [ ] Real balance loaded from MoshSplit API using user email + app token
- [ ] Error state shown if API call fails
- [ ] Redirect uses token exchange (or confirmed fallback)
- [ ] `VITE_MOSHSPLIT_TOKEN` documented in README env var section
