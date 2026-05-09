# Design System Migration — Viralatas Metaleiros 🤘

Plan for porting the existing app to the new design system defined in [`public/Design System.html`](public/Design%20System.html).

**Decisions locked at planning time** (2026-05-09):
- **Scope:** Visual-only first, structural later. New features the design system implies (e.g. `/now` becomes a list of locations, "Onde estou" 3-state segmented control, "Não vi essa banda" toggle, "actually saw" stat pair, Spanish/German languages) are **deferred** to a second wave of phases that will only be approved after the visual layer ships.
- **Fonts:** Self-host Oswald + IBM Plex Sans + JetBrains Mono (WOFF2). Required by the offline-first rule — Google Fonts CDN can't be reached at Wacken.
- **Badges:** Grid layout (Variant A). The "vest" variant is parked for now.
- **Plan location:** This file, at repo root, sibling to [CLAUDE.md](CLAUDE.md) and [PHASES.md](PHASES.md).
- **Future direction — design as a component system:** The user intends to refactor this codebase into a proper component system after the design layer ships. Every phase below MUST be planned to make that future easier, not harder. Concretely: **do not move, rename, or refactor business logic, hooks, or data flow in this migration.** Limit changes to markup, CSS, tokens, and presentational props (`variant`, `size`). When tempted to "just clean this up while I'm here," stop — that cleanup is the *next* migration's job, and doing it now risks regressing logic this plan promises to preserve. Naming and structure should anticipate componentization (consistent classnames, no inline tokens, clear visual primitives), but no logic-level refactor.

**Question protocol:** Each phase below has its own **"Ask before executing this phase"** block. Ask those questions only when that specific phase is about to start — not in advance, not in bulk. Earlier phases never need to wait on later phases' questions.

---

## Guardrails — non-negotiable for every phase

These rules apply to every phase below. Read them before opening a single file.

1. **Functionality must be preserved at all times.** Pick toggles, realtime counts, offline queueing, conflict detection, presence sync, role gating, godlike admin, time-travel — every existing behavior keeps working through every phase. No "we'll fix that next phase" regressions allowed.
2. **Don't touch logic.** This migration is preparing the ground for a *future* component-system refactor. That future refactor will move hooks, data fetching, and business logic. **This** plan must not. Stay in markup, CSS, tokens, presentational props. If you find yourself editing a `useEffect`, a Supabase call, an IndexedDB write, a hook, or a reducer to "make the styling easier" — stop. Restructure the JSX around the existing logic instead.
3. **Offline-first stays intact.** No new network requests on first paint, no Google Fonts CDN, no skeleton spinners. IndexedDB → UI is the only data path that may render.
4. **Ask before executing each phase.** Each phase has its own questions block. Ask only that phase's questions, only when that phase is about to start. Don't pre-ask future phases. Don't skip the ask step.
5. **One phase = one PR.** Each phase is independently shippable and reviewable. If a phase grows past ~600 lines diff, split it.
6. **Read affected files before editing.** Every phase below names the files in scope. Read them all in the planning step of that phase, not just the one you're about to change.
7. **Visual diffing matters.** The acceptance bar for a visual phase is "looks like the design system mockup," not "compiles." After each phase, open `/Design System.html` side-by-side with the running app and compare the relevant frames.
8. **Tests must stay green.** `npm test` is currently 128 passing. CSS-only changes shouldn't break tests; if they do, the test was over-asserting on classnames — fix the test, don't dilute the change.
9. **No `any`-typed props, no inline `style={{}}` for tokens.** Use tokens (CSS vars) or module-CSS classes. The design system is token-driven; the codebase should be too.
10. **Stage colors are canonical.** `--stage-faster`, `--stage-harder`, etc. — never re-pick a hex value. Centralize in `src/lib/stageColors.ts` (Phase A1).
11. **Dark mode only.** No light-mode tokens, no theme switcher.
12. **Anticipate componentization without performing it.** When you split JSX into a new visual primitive (e.g., a `<StagePill>` markup wrapper), keep it pure-presentational: props in, JSX out, no hooks, no fetches. The future refactor will wire data into these primitives — your job is to leave them ready, not wire them now.

---

## Phase map (visual layer)

| Phase | Title | Scope | Risk |
|------|-------|-------|------|
| A1 | Token foundation | `index.css` token set + stage color helper | low |
| A2 | Self-hosted fonts | WOFF2 + `@font-face` + service-worker cache | low/med |
| B  | Typography utilities | `t-display-*`, `t-body`, `t-label`, `t-time` classes | low |
| C  | Band card restyle | `BandCard` + 3 variants (schedule / timeline / ranked) | med |
| D  | Filter chrome | `BandFilters` (pills + day tabs + bottom drawer) | med |
| E  | Band detail modal + alert banner | `BandDetailModal` + new alert component | med |
| F  | `/now` visual polish (no structural change) | restyle existing crew grid in design language | med |
| G  | `/profile` + patches grid | profile head, badge grid, role chips, lang seg, collapsibles | med |
| H  | Announcements restyle | `AnnouncementsPage` mural cards | low |
| I  | Auth pages + bottom nav + offline chrome | login/register, `BottomNav`, offline banner / pending chip / sync toast | low/med |
| J  | Icon pass | replace ad-hoc icons with the geometric-line set | low |

**Total: 10 visual phases.** Ship them in order — later phases assume tokens and typography from A/B exist.

## Phase map (structural — deferred, do NOT start without re-approval)

| Phase | Title | Why deferred |
|------|-------|--------------|
| S1 | `/now` location-cards | Replaces crew grid with card-per-location. Schema change: `user_presence` becomes a single 3-state enum instead of two booleans. Migration + RLS + realtime work. |
| S2 | "Onde estou" segmented control | Front of S1 — collapses `is_camping` / `is_at_metal_place` / current pick into one selector. |
| S3 | "Não vi essa banda" + "actually saw" stats | New table or column for post-show check-ins; new band-detail UI; cooldown logic; impacts attendance count semantics. |
| S4 | Languages: add ES + DE | i18n catalogs for two new languages; `users.preferred_language` enum widening; QA pass. |
| S5 | Badge "vest" variant | Optional aesthetic alternative to Variant A. |

Each structural phase will get its own plan in this file when the user approves it.

---

## Phase A1 — Token foundation

**Goal:** Replace [`src/index.css`](src/index.css) (currently 44 lines, 8 tokens) with the full token set from the design system. Centralize stage colors. Zero visible UI change yet — every component still uses the variables they already use.

**Files to read first:**
- [`src/index.css`](src/index.css)
- [`src/pages/SchedulePage.tsx`](src/pages/SchedulePage.tsx) — currently holds stage color map
- [`src/components/BandCard.module.css`](src/components/BandCard.module.css)
- All other `*.module.css` files (grep for `var(--`)

**Changes:**
1. Expand `:root` in `src/index.css` to include every token from the design system: surfaces (`--bg-surface`, `--bg-elevated`, `--bg-sunken`), borders (`--border-strong`), text shades (`--text-faint`), semantic states (`--signal-live`, `--signal-warn`, `--signal-ok`, `--signal-lost`), stage palette (`--stage-faster` … `--stage-jungle`), font families (3 stacks, but font-face declarations come in A2), spacing scale `--s-1` through `--s-12`, radii `--r-0` through `--r-pill`.
2. Create `src/lib/stageColors.ts` exporting a typed `STAGE_COLOR_TOKENS` map: `Record<StageName, '--stage-faster' | …>`. Move the inline map currently in `SchedulePage.tsx` here. Provide a helper `stageColorVar(stage: string): string` that returns `var(--stage-…)` or `var(--accent)` fallback.
3. Update every component that references stage colors to read from `stageColors.ts` (no behavior change, but kills the duplication).

**Acceptance:**
- `git diff src/index.css` shows only additions; existing tokens kept at the same hex.
- `grep -r "#2980b9\|#e67e22\|#8e44ad\|#c0392b\|#16a085\|#2c3e50\|#95a5a6\|#f39c12" src/` returns only `stageColors.ts` (and any seed files that legitimately store data, which we leave alone).
- App renders identically to before. Open every page, no visual regressions.
- `npm test` green.

**Ask before executing this phase:**
- None expected — this is a pure refactor. If during execution any component turns out to depend on a hex literal in a way that resists tokenization, surface it and ask before forking the approach.

---

## Phase A2 — Self-hosted fonts

**Goal:** Make Oswald + IBM Plex Sans + JetBrains Mono available via local WOFF2 files, declared with `@font-face` in `src/index.css`, and pre-cached by the service worker. Still no UI change — components keep their current font stack until Phase B.

**Files to read first:**
- [`src/workers/sw.ts`](src/workers/sw.ts) — to understand the current cache strategy and add font files to it
- `vite.config.ts` (if any) — make sure WOFF2 is treated as an asset
- `public/` — where the fonts will live

**Changes:**
1. Download the three font families' weights actually used by the design system:
   - Oswald: 400, 600, 700 (Latin subset only — we don't need extended Cyrillic/Vietnamese)
   - IBM Plex Sans: 400, 500, 600, 700
   - JetBrains Mono: 400, 500, 700
   Place under `public/fonts/`.
2. Add `@font-face` declarations at the top of `src/index.css` with `font-display: swap`.
3. Add the same files to the service worker's pre-cache list so they're available offline after first load.
4. Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the most-used weights (Oswald 700, Plex 400, JetBrains 500) to `index.html`.
5. Define `--font-display`, `--font-sans`, `--font-mono` variables (already added in A1, just no `@font-face` backing them yet) — now they actually resolve.

**Acceptance:**
- DevTools → Network → first load shows fonts loaded from `/fonts/*.woff2`, NOT `fonts.googleapis.com` or `fonts.gstatic.com`.
- DevTools → Application → Service Worker → caches contains the WOFF2 files.
- Offline test: hard reload → go offline → reload page → fonts still render (no fallback to system fonts).
- Bundle size delta documented in the PR description; aim < 250KB for the three families combined (subsetted).
- `npm test` green.

**Ask before executing this phase:**
- Confirm we want to subset to Latin only. (Recommended: yes — saves ~60% size, our crew is BR/EN/ES/DE-Latin only, no Cyrillic / Greek / extended scripts in copy.)
- Confirm font weights inventory matches what the design system actually uses (Oswald 400/600/700, Plex 400/500/600/700, JetBrains 400/500/700) — if any visual phase later wants a weight not in this list, we add it then, not preemptively.
- Confirm we're OK including `LICENSE.txt` for each family in `public/fonts/` (SIL OFL requirement).

---

## Phase B — Typography utilities

**Goal:** Make every type style from the design system available as a CSS class so components can opt in incrementally. No component changes yet, but the next phases will use these.

**Files to read first:**
- [`src/index.css`](src/index.css)
- design system section "02 — Type" (lines 1668–1714 of `Design System.html`)

**Changes:**
1. Append nine utility classes to `src/index.css`: `.t-display-xl`, `.t-display-l`, `.t-display-m`, `.t-band`, `.t-h`, `.t-body`, `.t-small`, `.t-label`, `.t-time`. Match the size, weight, line-height, letter-spacing, and `font-variant-numeric: tabular-nums` from the design system exactly.
2. Set `body { font-family: var(--font-sans); }` so the default text now uses IBM Plex Sans. **This is the first visible change in the migration.**
3. Verify nothing in the existing modules sets a conflicting `font-family` that would override.

**Acceptance:**
- Body text across the whole app renders in IBM Plex Sans.
- A throwaway page or Storybook-style demo proves all 9 utility classes render correctly (or do this manually in the browser DevTools).
- `npm test` green.

**Ask before executing this phase:**
- Confirm we flip the global `body { font-family }` to IBM Plex Sans (recommended) vs gating it per-component. Global is faster and matches the design system; the only risk is a screen that happens to look worse with the new metric — flag any such screen during execution and ask whether to push the change anyway or fix the layout.
- Confirm utility-class naming (`.t-display-xl` … `.t-time`) matches the future component-system naming you have in mind. If you'd rather these be `.text-display-xl` or BEM-style, decide now — they'll be touched by every later phase.

---

## Phase C — Band card restyle (3 variants)

**Goal:** Replace [`BandCard`](src/components/BandCard.tsx) and its CSS with the design system's three variants:
- `schedule` (stripe + thumb + body + pick) — used on `/schedule`
- `timeline` (stripe + when block + body + pick) — used on `/my-picks`
- `ranked` (stripe + rank number + body, no pick) — used on `/popular`

**Files to read first:**
- [`src/components/BandCard.tsx`](src/components/BandCard.tsx)
- [`src/components/BandCard.module.css`](src/components/BandCard.module.css)
- [`src/pages/SchedulePage.tsx`](src/pages/SchedulePage.tsx) — caller
- [`src/pages/MyPicksPage.tsx`](src/pages/MyPicksPage.tsx) — caller
- [`src/pages/PopularPage.tsx`](src/pages/PopularPage.tsx) — caller
- [`src/hooks/useBandConflicts.ts`](src/hooks/useBandConflicts.ts) — feeds the conflict chip
- design system component anatomy (lines 336–436 of `Design System.html`)

**Changes:**
1. Add a `variant?: 'schedule' | 'timeline' | 'ranked'` prop with default `'schedule'`.
2. Restructure markup: `[stage-stripe-4px] [thumb-or-when-or-rank] [body] [pick?]`.
3. Body internals: `t-band` name (uppercase, no-wrap, ellipsis), meta row with stage chip (mono 10px on stage-color background), tabular time, "going" count with red `<b>` per design.
4. Pick toggle: 64px hit area, star SVG. Animate scale 0.9 → 1.15 → 1.0 over 320ms `cubic-bezier(0.34, 1.56, 0.64, 1)` on toggle. Honor `prefers-reduced-motion`.
5. Conflict outline (`outline: 2px solid var(--signal-warn); outline-offset: -2px;`) for `timeline` variant when conflict detected. Schedule variant intentionally does NOT show the conflict chip — design system rule.
6. Avatar cluster lives inside `ranked` variant body — feeds in from `usePickCounts`/avatar-cluster helper.
7. Use module CSS only; no inline styles for tokens. Stage colors come via `stageColorVar()`.

**Acceptance:**
- All three callers render correctly with their variant.
- Pick → unpick animation runs once, settles on red star.
- Offline pick queueing still works (pending chip behavior unchanged for now — Phase I will style it).
- Conflict detection still surfaces only on `/my-picks`.
- Tap-on-card-body opens band detail modal (current behavior); tap-on-pick toggles pick (no modal). Hit-area distinction preserved.
- Realtime count update visible within 3s when picking on another window.
- Tests in `src/__tests__/` covering BandCard still pass.

**Ask before executing this phase:**
- When `image_url` is set on a band, do we show the image in the 56px thumb, or always force the stage-color monogram for visual consistency? (Recommended: show image if present, fall back to monogram.)
- "Going" count behavior at low values: hide the meta entry when 0? Show "1 going" or "1"? (Recommended: hide at 0; show "N going" everywhere else.)
- Star icon: confirm the SVG path from the design system is the canonical pick icon — we'll reuse it in BottomNav, modal, and pick toggle. Worth declaring it once as a shared asset now, even though "do not refactor logic" applies — this is a presentational asset, not logic.

---

## Phase D — Filter chrome (pills + day tabs + bottom drawer)

**Goal:** Restyle [`BandFilters`](src/components/BandFilters.tsx) using stage pills (outline → fill rule), day tab bar (Day 1–4 with date cards), and a bottom-sheet filter drawer for `/schedule`.

**Files to read first:**
- [`src/components/BandFilters.tsx`](src/components/BandFilters.tsx)
- [`src/components/BandFilters.module.css`](src/components/BandFilters.module.css)
- [`src/components/bandFilterValue.ts`](src/components/bandFilterValue.ts)
- [`src/pages/SchedulePage.tsx`](src/pages/SchedulePage.tsx)
- [`src/pages/MyPicksPage.tsx`](src/pages/MyPicksPage.tsx)
- design system component anatomy (lines 441–488 + 1483–1532 of `Design System.html`)

**Changes:**
1. Stage pill component: outlined when off (`color: stage-color`, transparent bg, `border: 1px solid currentColor`), filled when on (bg = stage color, white text). Multi-select; empty selection = all stages.
2. Genre pill follows same outline → fill rule but with neutral border (`var(--border-strong)`), filled state uses `--bg-elevated`.
3. Day tab bar: 4-column grid, each cell shows `D{n}`, big Oswald date number, day-of-week. Active state: `--bg-elevated` background + 2px accent inset underline.
4. Bottom drawer for `/schedule` filters: triggered by a "Filters" button with a count badge. Slides up over scrim, has grab handle, sectioned by Day / Stage / Genre, has primary "Apply · N bands" button. Use `<dialog>` element or a portal — must trap focus and close on Esc.
5. Search input above filter button on `/schedule`. Already wired in Phase 9; just restyle.

**Acceptance:**
- Schedule page filters work as before (stage selection, day, genre, search).
- Drawer opens/closes smoothly, doesn't break body scroll, dismisses on backdrop tap and Esc.
- Day tab bar replaces whatever day picker is currently in use; same selection logic.
- `/my-picks` day grouping still works (it doesn't need the drawer, just the day tabs treatment).
- Mobile: drawer covers ~50–70% of viewport, content scrollable.
- `npm test` green.

**Ask before executing this phase:**
- Current `BandFilters` may have an "all stages" affordance distinct from "empty selection" — confirm the design system rule "empty = all" matches user expectation, or whether we keep an explicit "All" pill.
- Bottom drawer: should it remember last applied filters across sessions, or reset on close? (Recommended: persist in `localStorage` under a single key.)
- Day tabs are also useful on `/my-picks` — confirm we add them there too in this phase, or keep `/my-picks` on the existing day-grouped timeline UI from Phase 9 for now.

---

## Phase E — Band detail modal + alert banner

**Goal:** Restyle [`BandDetailModal`](src/components/BandDetailModal.tsx) per design system spec. Add a new `<AlertBanner>` component for the AI-generated alert UI (visual only — alert generation logic is unchanged).

**Files to read first:**
- [`src/components/BandDetailModal.tsx`](src/components/BandDetailModal.tsx)
- [`src/components/BandDetailModal.module.css`](src/components/BandDetailModal.module.css)
- [`src/lib/alerts.ts`](src/lib/alerts.ts) — current alert data path
- [`src/hooks/useBandAttendees.ts`](src/hooks/useBandAttendees.ts)
- design system anatomy (lines 575–728 of `Design System.html`)

**Changes — modal:**
1. New layout: 8px hero strip (stage color), head section (stage label + Oswald 32 band name + info row with day/time/genre), body section, actions row.
2. Single stat tile for "Picked: N / 20" (use `<StatPair>` component but with one cell — the second "actually saw" cell is **deferred to S3, do not implement**).
3. "Vão ver" list with avatars + names (drives from existing `useBandAttendees`).
4. Conflict warn block (only when overlap exists, mirrors existing logic).
5. **Do not** add the "Não vi essa banda" toggle — it's S3.
6. Action row: ghost "Close" + primary "★ Picked / Unpick" toggle.

**Changes — alert banner:**
1. New `src/components/AlertBanner.tsx` + module CSS.
2. Three severities: `live`, `warn`, `ok` — left stripe color, icon color, copy slot.
3. Slide-in 240ms ease-out, auto-dismiss 6s, manual ✕.
4. Stack max 3 visible; newest on top.
5. Wire to whatever surface currently displays alerts (currently inside `RightNowPage` per session memory; verify when implementing).

**Acceptance:**
- Modal opens from any band card, shows correct band info, picked count, attendees list.
- Pick toggle inside modal animates correctly and persists.
- Conflict warn appears only when applicable.
- Alert banner appears for new alerts, auto-dismisses, can be dismissed manually.
- `prefers-reduced-motion` removes slide animation but not the appear/disappear semantics.
- `npm test` green.

**Ask before executing this phase:**
- After reading `BandDetailModal.tsx`, list the existing sections to the user. If any of them aren't in the design system mockup, ask whether to keep, remove, or move before changing the layout.
- The design system shows "Vão ver / Viram" two-column lists. The "Viram" column depends on S3 (post-show check-in) and is out of scope. Confirm: render only the "Vão ver" column for now? Centered, full-width, no empty placeholder for the missing column?
- AlertBanner: do we wire it now to the existing alert source on `/now`, or build it as a presentational primitive only and wire it as part of S-track later? (Recommended: wire to current source — visual phase covers visual surface, and the alert source already exists.)

---

## Phase F — `/now` visual polish (no structural change)

**Goal:** Apply the design system's visual language to the existing crew-grid layout on [`RightNowPage`](src/pages/RightNowPage.tsx). **Do not** convert it into the location-cards layout — that's S1.

**Files to read first:**
- [`src/pages/RightNowPage.tsx`](src/pages/RightNowPage.tsx) (626 lines — read all of it)
- [`src/pages/RightNowPage.module.css`](src/pages/RightNowPage.module.css)
- [`src/hooks/useNow.ts`](src/hooks/useNow.ts)

**Changes:**
1. Page header treatment: "Right Now" Oswald + day/time spec on the right.
2. Crew cards: restyle current crew member card using the design system's `crew-card` rules — avatar 40px, name + status caps mono, "watching" row with stage-strip + Oswald band name + mono info.
3. LOST state styling: purple tinted gradient background, purple border, no animation (per the design system motion rule).
4. Camping state styling: teal tinted gradient + teal border.
5. Metal Place crew card: orange-tinted gradient + orange border.
6. Page header day/time/festival-day spec.
7. **Do not** add the "Onde estou" segmented control.
8. **Do not** convert the layout to per-location cards.

**Acceptance:**
- All current behaviors preserved: crew presence, camping/metal-place state, LOST detection, godlike time travel still works.
- Visual diff: crew member cards look like the design system's crew-card spec.
- No new data shape, no new RPCs.
- Realtime updates still flow.
- Tests green.

**Ask before executing this phase:**
- After reading the 626-line `RightNowPage.tsx`, list the sections currently displayed. The design system mockup of `/now` is the location-card layout (S1, deferred). For this visual phase we keep the crew-grid structure but skin it. Confirm with the user, section by section, what stays / what gets restyled / what gets postponed to S1.
- Confirm we do NOT render the "Onde estou" segmented control yet (that's S2, depends on schema change).
- Page header: design system shows "Right Now" Oswald + "Day 3 · Fri Jul 31 · 22:14" mono spec on the right. Confirm the day/time spec uses `useNow()` (existing godlike time-travel hook) so the time-travel feature still appears live in the header.

---

## Phase G — `/profile` + patches grid

**Goal:** Restyle [`ProfilePage`](src/pages/ProfilePage.tsx) (1445 lines — the heaviest file in the app) using the design system's profile layout. Replace [`BadgesDisplay`](src/components/BadgesDisplay.tsx) with the patches-grid (Variant A) treatment. Preserve the godlike admin and manager tools — just collapse them behind the new `pf-collapse` rows.

**Files to read first:**
- [`src/pages/ProfilePage.tsx`](src/pages/ProfilePage.tsx) — all 1445 lines, in chunks
- [`src/pages/ProfilePage.module.css`](src/pages/ProfilePage.module.css)
- [`src/components/BadgesDisplay.tsx`](src/components/BadgesDisplay.tsx)
- [`src/components/BadgesDisplay.module.css`](src/components/BadgesDisplay.module.css)
- [`src/lib/badges.ts`](src/lib/badges.ts)
- [`src/i18n/Badges_br.json`](src/i18n/Badges_br.json) and `Badges_en.json`

**Changes:**
1. **Profile head:** centered 56px avatar, Oswald display name, mono email, row of role chips (Crew/Manager/Godlike) + country flag + Wacken-years pill.
2. **Patches section (Variant A grid):**
   - 4-column grid on phone, ~6-column on desktop.
   - Each patch: 64px circle, locked = grayscale + 32% opacity, unlocked = stage-color or accent fill.
   - Year chip (bottom-right, `'25`-style mono) on historical badges.
   - Tap → patch detail modal: 132px circle, Oswald name, body description, Wacken year chip (only for historical).
   - Source data still comes from `BADGES` array in `src/lib/badges.ts` — schema unchanged.
3. **Preferences section:** language seg (only `PT` and `EN` for now — ES/DE deferred to S4), notification toggle.
4. **Manager tools** behind `pf-collapse` row — blue label, expand chevron. Contents = whatever's there now (read it; don't change behavior).
5. **Godlike admin** behind `pf-collapse` row — gold label. Contents include: time-travel chips (Phase 9.B, must be preserved), live-band-test config (Phase 7), Metal-Place config (Phase 6), useful-links section (Phase 7), badge-test panel (Phase 7).
6. **Sign out** at the bottom.

**Acceptance:**
- All ~half-dozen godlike admin features still work: time travel chips D-1 / D1–D4 / D+1, live-band test override, Metal Place config, useful links, badge test.
- Manager tools (block user etc.) still work.
- Badge unlock conditions evaluate identically — no regression in which badges are unlocked.
- Patch detail modal opens for both locked and unlocked patches (just disabled-styled when locked).
- Language switch persists to `users.preferred_language` and updates UI immediately.
- Tests green (especially profile and badge tests).

**Ask before executing this phase:**
- ProfilePage is 1445 lines with many sub-features. Splitting into sub-components (`ProfileHead`, `PatchesGrid`, `PreferencesSection`, `ManagerTools`, `GodlikeAdmin`) would make this phase tractable — but it crosses the "don't refactor logic" guardrail if the split moves hooks. Recommended: split *visually only* (extract JSX subtrees into local components in the same file, with no hook movement), or do a fully separate prep PR ahead of this phase that just splits files without changing markup. Confirm which approach the user prefers.
- Year chip: which badges count as "historical"? (Likely: any badge with a `wacken_years_*` condition.) Confirm.
- Patch detail modal close gesture: tap scrim + ✕ button + Esc — confirm all three.
- Patches grid columns at different viewport sizes — design system shows 4-col on phone, but desktop sizing isn't specced. Recommended: 4 on phone, 6 on tablet, 8 on desktop. Confirm.
- Confirm we render only PT and EN in the language seg, not ES/DE (those are S4).

---

## Phase H — Announcements restyle

**Goal:** Restyle [`AnnouncementsPage`](src/pages/AnnouncementsPage.tsx) to use the design system's `announce` card layout. No behavior change.

**Files to read first:**
- [`src/pages/AnnouncementsPage.tsx`](src/pages/AnnouncementsPage.tsx)
- [`src/pages/AnnouncementsPage.module.css`](src/pages/AnnouncementsPage.module.css)
- [`src/lib/announcements.ts`](src/lib/announcements.ts)

**Changes:**
1. New card layout: 40px author avatar | head row (name + role-chip + relative timestamp) + body + actions row.
2. Role chips: `normal` (neutral), `manager` (blue tint), `godlike` (gold tint). Inline next to display name.
3. Actions: "Delete" (own posts), "Block user" (manager/godlike), no reply / no reactions per design.
4. Composer (post box) at top — restyle to match the surface treatment (`--bg-surface`, hard radius).
5. Realtime new-post insertion still works.
6. Soft-delete still works (godlike can see deleted; manager can't).

**Acceptance:**
- Posting an announcement renders it instantly (optimistic update).
- Blocking a user hides their posts everywhere.
- Soft-delete behaves correctly per role.
- Offline post queues, syncs on reconnect (existing behavior).
- Tests green.

**Ask before executing this phase:**
- Composer position: design system mockups don't explicitly show the composer. Confirm whether the composer stays at the top of the feed (current behavior) or moves to a floating "+" FAB.
- Relative timestamp format: design shows "2 min", "14 min", "1 h" — confirm the cutoffs (`< 1m` = "now", `< 60m` = "X min", `< 24h` = "X h", `> 24h` = "DD/MM"?).

---

## Phase I — Auth pages + bottom nav + offline chrome

**Goal:** Restyle login, register, the bottom nav, and the three offline/sync UI states (offline banner, pending chip, sync toast).

**Files to read first:**
- [`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx) + [`AuthPage.module.css`](src/pages/AuthPage.module.css)
- [`src/pages/RegisterPage.tsx`](src/pages/RegisterPage.tsx)
- [`src/components/BottomNav.tsx`](src/components/BottomNav.tsx)
- [`src/components/BottomNav.module.css`](src/components/BottomNav.module.css)
- design system bottom-nav, offline-banner, pending-chip, sync-toast (lines 826–883 + 932–950 of `Design System.html`)

**Changes:**
1. **Login + register pages:** match the design system's masthead style (4px accent top border, big Oswald headline, mono "specs"-style hint text). Form fields keep current behavior; restyle to use `--bg-elevated` for inputs, hard radii.
2. **Bottom nav:** 5 cells (`Now / Sched / Picks / Popular / Me`). Active = `--accent-hover` color + filled icon variant. Inactive = `--text-muted` + line-icon variant. Icons from the design system's icon sheet (Phase J will harden the icon set; here we just adopt it).
3. **Offline banner:** mono caps text, pulsing 6px dot, sits at the top of `/now`, `/schedule`, `/my-picks` when offline.
4. **Pending chip:** mono caps, `--signal-warn` tint, pulsing dot. Inline on cards/announcements that have unsynced state.
5. **Sync toast:** appears for ~3s when sync completes.

**Acceptance:**
- Auth flows work end-to-end (login, register, validation, error messages).
- Bottom nav routes work, active state correct on each route.
- Offline banner appears within 1s of dropping connection (use `navigator.onLine` event listener).
- Pending chip appears on offline-queued picks and posts.
- Sync toast fires once when reconnect flushes queue.
- 128 existing tests green (especially auth + offline tests).

**Ask before executing this phase:**
- Sync toast trigger: always fire on reconnect, or only when ≥1 queued action flushed? (Recommended: only when ≥1.)
- Auth pages: keep the existing form fields/copy and only restyle, or also re-copy the headlines using the masthead voice from the design system ("Viralatas Metaleiros 🤘 — backstage wristband, not corporate app")? (Recommended: restyle only; copy stays.)
- BottomNav active route detection: confirm we keep the existing approach (likely `useLocation` + matching). No router changes.

---

## Phase J — Icon pass

**Goal:** Replace any ad-hoc emoji or freeform icons in the UI with the geometric line-icon set defined in the design system.

**Files to read first:**
- Any component using inline SVG, emoji icons, or imported icon libraries — `grep -r "<svg\|emoji" src/`
- design system icon grid (lines 2900–2917 of `Design System.html`)

**Changes:**
1. Inventory: list every icon in current usage.
2. For each, swap to the design-system equivalent (24px frame, 2px stroke, square caps, miter joins). Most map 1:1: pick (star), live (filled circle), schedule (calendar), popular (bars), profile (person), search (magnifying glass), filter (3-line), conflict (triangle warn), sync (clock-arrow), offline (wifi-slash), dismiss (X), chevron, arrow, time (clock), tent, friend.
3. Single shared `<Icon name="..."/>` component or a utility to keep stroke/fill consistent.
4. Tab-bar active states are the only icons allowed to switch to filled.
5. **Allowed emoji:** 🤘 (in copy only), country flags on country badges. Banish all others from the UI itself.

**Acceptance:**
- No emoji in interactive controls (buttons, nav items, chips) except where allowed.
- Icon visual weight is consistent across the app.
- Tests green.

**Ask before executing this phase:**
- Inventory deliverable first: present the full list of icons currently in the UI to the user before swapping any. Some may be intentional brand expression worth keeping.
- Confirm the shared `<Icon name="..."/>` API shape (`name`, `size`, `strokeWidth`, optional `filled`) — this primitive will be reused everywhere by the future component system.
- Genre pictograms / brand emoji that aren't in the design system's allowed list (🤘, country flags) — confirm we strip each one. Skulls/flames/pentagrams are forbidden by the design system; verify we don't have any.

---

## What changes after the visual layer ships

Once Phases A–J are merged, the app will *look* like the design system. At that point, the user re-evaluates whether to start the structural wave (S1–S5). Each structural phase will be a new section appended to this file when approved — they are NOT in scope today.

---

## Cross-cutting checklist (run after every phase)

- [ ] `npm run build` passes
- [ ] `npm test` passes (128+ tests)
- [ ] `grep -r "ANTHROPIC\|sk-" src/` returns nothing (API key never on the client)
- [ ] DevTools → Network → Offline → page still renders cached content
- [ ] DevTools → two windows → realtime change in one is visible in the other within 3s
- [ ] CLAUDE.md "Phases at a glance" updated with the phase you just shipped
- [ ] PR description includes a before/after screenshot for the screens touched

---

## References

- [`public/Design System.html`](public/Design%20System.html) — single source of truth for visual decisions
- [`CLAUDE.md`](CLAUDE.md) — project intent, constraints, schema, offline rules
- [`PHASES.md`](PHASES.md) — historical phases (1 through 9.B completed)
- [`src/index.css`](src/index.css) — token target for Phase A1
- [`src/lib/badges.ts`](src/lib/badges.ts) — badge contract (Phase G)
