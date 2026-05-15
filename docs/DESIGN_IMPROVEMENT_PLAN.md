# Design Improvement Plan — Viralatas Metaleiros

Post-critique action plan · 4 sprints · pre-Wacken 2026

---

## How to use this document

Sprints are ordered by criticality, not calendar time.  
**Start Sprint 0 immediately** — those are bugs.  
Sprints 1–2 should land before new feature work begins.  
Sprint 3 fills systematic gaps.  
Sprint 4 is Phase 19 design work and can run in parallel with Sprint 2.

Rule: update `Design System.html` spec first, then implement in code. This stops the divergence pattern that created the role chip bug.

---

## Sprint 0 — Critical Debt

> Fix what is broken before Wacken. These are bugs, not preferences.  
> **Est. effort: 3–5 h total**

### 1. Merge the two role chip implementations

**Files:** `src/ui/Chip.module.css` + `src/pages/AnnouncementsPage.module.css`

The design system documents a known divergence: `AnnouncementsPage.module.css` uses different color values for `.roleManager` / `.roleGodlike` than the canonical chip in `Chip.module.css`. Pick one source, delete the other.

- Canonical values (from `Chip.module.css`):
  - `.roleManager`: `background: rgba(59,130,246,0.08); color: #3b82f6; border: 1px solid rgba(59,130,246,0.45)`
  - `.roleGodlike`: `background: rgba(217,119,6,0.08); color: #d97706; border: 1px solid rgba(217,119,6,0.45)`
- Delete the overrides in `AnnouncementsPage.module.css`
- Update `Design System.html` §04 to mark the divergence as resolved

**Effort:** S (1–2 h) · **Blocking:** any future chip reskin must be made twice until fixed

---

### 2. Consolidate conflict-chip and conflict-mini

**Files:** `src/components/BandCard.module.css` (or wherever these live)

Two implementations of the same concept — the soft-conflict amber pill — with different CSS:
- `.conflict-chip` used in the component section of the DS (pill style, border-radius pill)
- `.conflict-mini` used in the timeline card phone-frame mockups (different sizing)

Pick the one that survives the frame-size test (mobile, ~36px card height). Delete the other. Update all usages.

**Effort:** S (1–2 h) · **Blocking:** next conflict reskin will update one and break the other

---

### 3. "You are here" border fix

**File:** `src/pages/RightNowPage.module.css`

The `.youAreHere` location card uses `border-color: var(--border)` — identical to every other location card. The only differentiation is the "Live now · you are here" kicker in 9px mono, which is invisible at festival brightness.

**Fix:** Add `border-left: 2px solid var(--accent)` (or `border-top: 2px solid var(--accent)`) to `.youAreHere`.

**Effort:** XS (< 30 min)

---

### 4. Empty states for all list screens

**Files:** `RightNowPage.tsx`, `SchedulePage.tsx`, `MyPicksPage.tsx`, `PopularPage.tsx`, `AnnouncementsPage.tsx`

Offline-first apps hit empty states constantly: first launch, stale cache, quiet periods. Currently undefined → ad-hoc per developer.

Design and implement these 5 canonical empty states:
- `/now` — No one has any picks yet (pre-festival)
- `/schedule` — Search returns no results
- `/my-picks` — User has picked zero bands
- `/popular` — No picks from anyone in the crew
- `/announcements` — Mural board is empty

Each should use a one-liner message in Portuguese (`--text-muted`, `font-sans`, centered) + optional icon from the DS icon set. No generic "No data" strings. Keep the metal voice.

**Effort:** M (2–4 h) · **Blocking:** without DS definition these will look inconsistent across pages

---

## Sprint 1 — Design System Hardening

> Close the gaps in the design system itself so future work is built on solid ground.  
> **Est. effort: 4–6 h total**

### 1. Add sticky navigation to the DS document

**File:** `public/Design System.html`

The document is 3200+ lines with no jump links. Add a fixed left-column sidebar with anchors for all 9 sections (01 Color → 09 Patches). ~30 lines of CSS, no JS needed.

**Effort:** S (1–2 h)

---

### 2. Document the input component

**File:** `public/Design System.html` — §04 Components (new subsection) + `src/ui/Input.module.css`

The `/schedule` search field, `/login`, `/register`, and the announcement composer all use text inputs that are not specced in the DS. Document states: rest, focus, error, disabled. Include the password field with visibility toggle.

**Effort:** S (1–2 h)

---

### 3. Add badge unlock animation spec

**File:** `public/Design System.html` — §07 Motion

The pick toggle has a named 320 ms spring (described as "the only celebratory animation"). Badge unlock is a permanent milestone — bigger than a reversible pick — and has zero spec.

Add: `.patch.unlocking` — same `cubic-bezier(0.34, 1.56, 0.64, 1)` spring as pick toggle, applied to `transform: scale(0.85 → 1.12 → 1.0)` on the patch circle. Duration: 380 ms (slightly longer than pick toggle, because it's more important).

**Effort:** XS (< 30 min)

---

### 4. Formalize the LOST card "crew-state exception"

**File:** `public/Design System.html` — §01 Color header + §07 Motion

The masthead says "no glow / no gradients*" with a vague footnote. The LOST card breaks three rules (background gradient + text-shadow glow + box-shadow). Name the exception explicitly:

> **Crew-state exception:** Cards representing a vira-lata's physical location (camping, metal place, lost) may use a single low-opacity gradient + ambient glow to signal emotional state. The glow must be static — no animation. Total exception budget: 1 gradient + 1 text-shadow + 1 box-shadow, all at ≤ 50% opacity.

**Effort:** XS (< 30 min)

---

### 5. Avatar color assignment — document the actual behavior

**File:** `public/Design System.html` — §04 Components (Avatar subsection)

The DS says "random from stage palette if not set" but demos show consistent per-person colors. Clarify:

> Avatar background color is randomly assigned from the 8 stage colors at account creation and stored in the `users` table. It does not change between sessions. Users cannot currently choose their color.

**Effort:** XS (< 30 min)

---

### 6. Document filter drawer close gesture

**File:** `public/Design System.html` — §04 Components (Filter Drawer subsection)

The drawer shows a grab handle (implying swipe-to-dismiss) but no gesture spec exists.

Add: swipe-down velocity threshold (≥ 200 px/s or ≥ 40% of drawer height), tap-scrim to dismiss, escape key on desktop. Spring-back if threshold not met: 200 ms ease-out return to open position.

**Effort:** XS (< 30 min)

---

## Sprint 2 — Screen Polish Pass

> Go screen-by-screen and lift quality. Prioritized by user screen-time.  
> **Est. effort: 10–16 h total**

### 1. /now — Location card hierarchy

**Files:** `src/pages/RightNowPage.tsx` + `RightNowPage.module.css`

- Strengthen "you are here": accent border (Sprint 0) + slightly elevated background (`var(--bg-elevated)` instead of `var(--bg-surface)`)
- Reduce `.loc-count` from `font-size: 22px` to `18px` on mobile — 22px competes with the band name
- Add "next up →" context line below the live band name on the user's own card (the band they'll watch after this one)

**Effort:** M (2–4 h)

---

### 2. Presence toggle — tap target + transition

**Files:** `src/components/PresenceToggle.tsx` + `PresenceToggle.module.css`

- Increase button `min-height` to `48px` (current appears ~38px from DS)
- Add `transition: background 0.15s, color 0.15s` to both button states (may already exist — verify)
- Darken inactive option text from `var(--text-faint)` to `var(--text-muted)` so they're visible but not active

**Effort:** S (1–2 h)

---

### 3. /schedule — Search input + URL state

**Files:** `src/pages/SchedulePage.tsx` + `SchedulePage.module.css`

- Style the search field using the DS input spec (Sprint 1): dark surface, `var(--border)` border, `var(--font-mono)` placeholder text
- Add a clear-field ×  button that appears when the field has content
- Persist the selected day tab in the URL hash (`#day-2`) so back-navigation restores position

**Effort:** M (2–4 h)

---

### 4. /my-picks — Day group headers

**Files:** `src/pages/MyPicksPage.tsx` + `MyPicksPage.module.css`

- Verify the day group header uses a 2px top rule in `var(--accent)` as specced in the DS
- Add picks-per-day count to the right of the day label (e.g., `Day 3 · Friday  5 picks`)
- Empty day groups (days with zero picks) should not render a header at all

**Effort:** S (1–2 h)

---

### 5. /announcements — Role chip fix + empty state

**Files:** `src/pages/AnnouncementsPage.tsx` + `AnnouncementsPage.module.css`

- Apply Sprint 0 role chip consolidation here (falls out automatically if done correctly)
- Add empty state: empty mural board should show something like "Nenhum anúncio ainda. Seja o primeiro. 🤘"

**Effort:** S (1–2 h) · **Depends on:** Sprint 0 chip consolidation

---

### 6. /profile — Diamond year chip

**Files:** `src/pages/ProfilePage.tsx` + `ProfilePage.module.css`

The DS explicitly notes: "In code: `.modalYearChip` is a 38×38px diamond (clip-path polygon), not a rect pill. Rect pill was the original DS design."

- Replace any rect-pill year chip implementation with the diamond (`clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`)
- Verify patches grid gap matches DS spec (8px)

**Effort:** S (1–2 h)

---

### 7. Band detail modal — toggle thumb animation

**Files:** `src/components/BandDetailModal.tsx` + `BandDetailModal.module.css`

- Add `transition: left 0.15s ease, background 0.15s ease` to the toggle track thumb (`.toggle-track::after`)
- Verify "Não vi" label wording is correct for both states (unseen / seen)
- Ensure `.conflict-warn` and `.overlap-warn` are both rendered correctly as two distinct visual variants

**Effort:** S (1–2 h)

---

### 8. Login + Register — Input styling + error states

**Files:** `src/pages/LoginPage.tsx` + `src/pages/RegisterPage.tsx` + `src/pages/AuthPage.module.css`

- Apply DS input spec: dark background, `var(--border)` border, focus ring in `var(--accent)`, `var(--font-sans)` at 15px
- Add password visibility toggle (eye icon from DS icon set)
- Error states: `border-color: var(--signal-live)` + error message in `var(--signal-live)` below the field
- These are the first screens new users see — they must not use default browser input styling

**Effort:** M (2–4 h)

---

## Sprint 3 — Systematic Gaps

> Ship the components that exist in the app but are missing from the design system.  
> **Est. effort: 8–12 h total**

### 1. Full empty state system in the DS

**File:** `public/Design System.html` — §10 Empty & Error States (new section)

Design and document 5 canonical empty states and 2 error states:

| State | Context | Copy direction |
|---|---|---|
| No picks (crew) | `/now` pre-festival | "Ninguém escolheu uma banda ainda." |
| No results | `/schedule` search | "Nenhuma banda encontrada. Tente outro filtro." |
| No picks (self) | `/my-picks` | "Nenhuma banda salva ainda. Vai lá no Sched. 🤘" |
| No popular data | `/popular` | "Nenhum pick ainda. Primeiro a salvar ganha." |
| Empty mural | `/announcements` | "Nenhum anúncio ainda. Seja o primeiro. 🤘" |
| Network error | any screen | "Sem sinal. No modo offline. 🤘" |
| Sync error | banner | "Erro ao sincronizar. Tentaremos de novo." |

Visual pattern: centered layout, single muted line of copy, optional DS icon (24px stroke), no illustrations. Keep density low — these are transitions, not destinations.

**Effort:** L (4–8 h)

---

### 2. Error state component

**File:** `src/components/ErrorState.tsx` (new)

A reusable component for: network error, sync error, auth error. Each variant has a retry CTA button styled to DS (`.btn` class). Prop interface: `variant`, `onRetry?`, `message?`.

**Effort:** M (2–4 h)

---

### 3. Badge unlock animation — implementation

**File:** `src/components/BadgesDisplay.tsx`

Ther is no transition between unlock and lock, the badge appears or not appears.
verify if it is possible whenthe user gets the badge in the first time some animation happens , please think and ask questions if necessary 
- `transform: scale(0.85)` → `scale(1.12)` → `scale(1.0)`
- Duration: 380 ms, `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Trigger once when badge is available for the user, use minimal coding effort for that, simple solutions. ask if only complex solutions are possible. 

**Effort:** S (1–2 h)

---

### 4. Wacken aesthetic relationship statement

**File:** `public/Design System.html` — masthead/intro section

Add one paragraph after the lede:

> **Visual relationship to Wacken Open Air:** We reference the festival by using its 8 canonical stage colors as the only saturated palette in the app. We do not recreate, copy, or approximate Wacken's own graphic identity (logotype, mascot, stage graphics). Stage color assignments are fixed and must not be changed — they are the festival's identity, not ours to reinterpret.

**Effort:** XS (< 30 min)

---

### 5. DS version bump

**File:** `public/Design System.html` — masthead eyebrow

After Sprint 0–3 complete, update the DS version to `v2.0` and add a changelog section at the bottom documenting what changed.

**Effort:** XS (< 30 min)

---

## Sprint 4 — Phase 19: Closing Ceremony Card

> Design the ceremony entry so it feels first-class but distinct from band cards.  
> Can run in parallel with Sprint 2.  
> **Est. effort: 2–3 h design + rest is engineering (Phase 19 spec)**

### 1. Document the ceremony card variant in the DS

**File:** `public/Design System.html` — §04 Components (BandCard — ceremony addendum)

Add a subsection after the band card variants:

- **Visual treatment:** gold top strip (`var(--stage-jungle)` / `#f39c12`), 2px gold border, no left stage stripe
- Have in mind that is an specific image for the cerominy card, a retangular image, landscape orientation.
- **Label:** "Closing Ceremony" (i18n: `scheduleClosingCeremony`) in place of genre
- **Excluded behaviors:** no conflict chip, not shown in `/popular`, does not count toward any `bands_picked_*` badge
- **Included behaviors:** picks sync to IndexedDB like a band, crew attendance count shown, offline-first intact

### 2. Implement the ceremony card

**Files:** `src/components/BandCard.tsx` + `BandCard.module.css`

Implement `.cardCeremony` per DS spec above. The gold treatment should feel like a medal, not just a colored band card, should have the importance feeling, but remeber that this is metal rock app, go into that direction of theme,colors and fell

**Effort:** M (2–4 h)

---

## Execution order cheat sheet

If you have 2 hours and don't know where to start, work top-to-bottom:

| # | File | Action | Effort |
|---|---|---|---|
| 1 | `RightNowPage.module.css` | Add `border-left: 2px solid var(--accent)` to `.youAreHere` | XS |
| 2 | `Design System.html` | Add sticky sidebar nav with 01–09 anchors | XS / S |
| 3 | `DS §07 Motion` | Add badge unlock animation spec (copy pick toggle spring) | XS |
| 4 | `DS masthead` | Add Wacken identity relationship paragraph | XS |
| 5 | `DS §01 Color` | Formalize LOST card as named "crew-state exception" | XS |
| 6 | `DS §04 Avatar` | Document avatar color assignment (random at creation, stored) | XS |
| 7 | `Chip.module.css` + `AnnouncementsPage.module.css` | Merge role chip into one canonical definition | S |
| 8 | `BandCard.module.css` | Consolidate `conflict-chip` + `conflict-mini` into one class | S |
| 9 | `MyPicksPage.module.css` | Day group header: 2px accent-top rule + count on right | S |
| 10 | `PresenceToggle.module.css` | Raise tap target to 48px, add 150ms transition | S |
| 11 | `BandDetailModal.module.css` | Add toggle thumb `transition: left 0.15s ease` | S |
| 12 | `RightNowPage` + 4 others | Empty states for all list screens | M |
| 13 | `SchedulePage.tsx` | Search input: DS-spec styling + clearable + URL-hash day | M |
| 14 | `AuthPage.module.css` | Login/register: DS-spec inputs + error state | M |
| 15 | `DS §10` (new section) | Empty state system: 5 canonical patterns | L |

---

*Viralatas Metaleiros Design Plan · May 2026 · pre-Wacken sprint*
