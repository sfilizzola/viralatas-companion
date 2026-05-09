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

| Phase | Title | Scope | Risk | Status / Feature dep |
|------|-------|-------|------|----------------------|
| A1 | Token foundation | `index.css` token set + stage color helper | low | ✅ completed |
| A2 | Self-hosted fonts | WOFF2 + `@font-face` + service-worker cache | low/med | ✅ completed |
| B  | Typography utilities | `t-display-*`, `t-body`, `t-label`, `t-time` classes | low | ✅ completed |
| C  | Band card restyle | `BandCard` + 3 variants (schedule / timeline / ranked) | med | ✅ completed |
| D  | Filter chrome | `BandFilters` (pills + day tabs + bottom drawer) | med | ✅ completed |
| **E**  | **Band detail modal + alert banner** | `BandDetailModal` + new alert component | med | **⛔ blocked by [Phase 10b](PHASES.md)** |
| F  | `/now` visual polish (no structural change) | restyle existing crew grid in design language | med | — |
| **G**  | **`/profile` + patches grid** | profile head, badge grid, role chips, lang seg, collapsibles | med | **⚠️ partial — see [Phase 10a / 10c](PHASES.md)** |
| H  | Announcements restyle | `AnnouncementsPage` mural cards | low | — |
| I  | Auth pages + bottom nav + offline chrome | login/register, `BottomNav`, offline banner / pending chip / sync toast | low/med | — |
| J  | Icon pass | replace ad-hoc icons with the geometric-line set | low | — |

**Total: 10 visual phases.** Ship them in order — later phases assume tokens and typography from A/B exist.

**Pause points:** After Phase D, stop the design migration and run [PHASES.md → Phase 10a + 10b](PHASES.md) (characteristic badges + seen-tracking). Then resume with Phase E. Phase G has a softer dependency on 10a (badge variety) and 10c (year chip — deferable). See the callouts on Phase E and Phase G below for details.

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

## Phase A1 — Token foundation [completed]

Expanded `src/index.css` from 8 tokens to the full design-system token set (surfaces, borders, text shades, signal/stage palettes, font/spacing/radii scales). Centralized stage colors in `src/lib/stageColors.ts` with a `stageColor()` helper; removed inline hex maps from page components.

---

## Phase A2 — Self-hosted fonts [completed]

Added self-hosted Oswald + IBM Plex Sans + JetBrains Mono WOFF2 files (Latin subset) under `public/fonts/`, wired `@font-face` declarations in `src/index.css`, pre-cached the fonts in the service worker, and preloaded the most-used weights from `index.html`. Fonts now render offline.

---

## Phase B — Typography utilities [completed]

Added the nine typography utility classes (`.t-display-xl`, `.t-display-l`, `.t-display-m`, `.t-band`, `.t-h`, `.t-body`, `.t-small`, `.t-label`, `.t-time`) to `src/index.css` and flipped the global `body` font-family to IBM Plex Sans. First visible change in the migration.

---

## Phase C — Band card restyle (3 variants) [completed]

Rebuilt `BandCard` with three variants (`schedule` | `timeline` | `ranked`), a 4px stage stripe, the star pick toggle (with bouncy animation honoring `prefers-reduced-motion`), and the conflict outline on the timeline variant. Schedule, My Picks, and Popular all consume their respective variants.

---

## Phase D — Filter chrome (pills + day tabs + bottom drawer) [completed]

Rebuilt `BandFilters` with a 4-column day tab bar (D1–D4: Oswald date number + DOW), a bottom-sheet drawer (grab handle, multi-select stage pills with stage colors, neutral genre pills, upcoming toggle, "Apply · N bands" CTA), and a sticky bar combining a search input with a filter trigger that shows an active-filter count badge. `value.stage` became `string[]` (empty = all). Schedule filters persist to `localStorage` under `vlt:filters:schedule` (query excluded). `/my-picks` intentionally untouched.

---

## Phase E — Band detail modal + alert banner

> **⛔ Blocked by feature work — pause the design migration here.**
>
> The design system mockup of this modal includes three surfaces that depend on data that does not yet exist in the schema:
> - **"Vão ver / Viram" two-column attendees list** — the "Viram" column needs the `user_missed_bands` table.
> - **"Actually saw" cell of the StatPair** — same dependency.
> - **"Não vi essa banda" toggle** — same dependency.
>
> All three are planned in [PHASES.md → Phase 10b](PHASES.md) (seen-tracking + extended detail modal). The earlier text in this file calls these "S3"; that label is stale — Phase 10b is the actual implementation track and is more concrete.
>
> **Action:** Before starting Phase E, ship **Phase 10a** (low-risk additive characteristic-badge conditions) and **Phase 10b** (seen-tracking schema, IDB v8, missed-bands queue). Then return here and restyle the modal once with the full data shape in hand. Doing Phase E first means tearing the modal open a second time during 10b — wasted work and a higher chance of regressing the visual layer.
>
> When you return: re-read the questions block at the bottom of this phase, because the "render only Vão ver" question is no longer needed if 10b shipped first.

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

> **⛔ Partially blocked by feature work — read before starting.**
>
> The design system patches grid relies on data that doesn't fully exist yet:
> - **Year chip on historical patches** (the `'25`-style mono chip in the bottom-right of unlocked patches) — depends on [PHASES.md → Phase 10c](PHASES.md) (`users.historical_badges` jsonb column + godlike freeze function). 10c is itself deferred until ~late July 2026.
> - **Patch detail modal "Wacken YYYY" chip** — same dependency on 10c.
> - **Variety in the grid** — the patches grid will look thin until [Phase 10a](PHASES.md) ships characteristic-badge conditions (`bands_picked_genre_min` etc.). This is not a hard block; the grid renders fine with current badges, just sparser.
>
> **Action:** Ideally ship **Phase 10a** before Phase G so the grid has more content to display. Phase 10c is OK to defer — when starting Phase G, **stub the year chip** behind a check for `historical_badges` presence and skip rendering it for now. Add a TODO pointing to 10c. Do **not** invent a placeholder year column or dual-source the year — wait for the schema.
>
> If Phase 10a has not yet shipped when you reach Phase G, surface the question to the user: ship Phase G against the current sparse badge set, or pause and do 10a first?

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
