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
| E  | Band detail modal + alert banner | `BandDetailModal` + new alert component | med | ✅ unblocked — Phase 10b shipped; execute after G |
| F  | `/now` visual polish (no structural change) | restyle existing location/group cards in design language | med | ✅ completed |
| G  | `/profile` + patches grid | profile head, badge grid, role chips, lang seg, collapsibles | med | ✅ completed |
| H  | Announcements restyle | `AnnouncementsPage` mural cards | low | ✅ completed |
| I  | Auth pages + bottom nav + offline chrome | login/register, `BottomNav`, offline banner / pending chip / sync toast | low/med | ✅ completed |
| J  | Icon pass | replace ad-hoc icons with the geometric-line set | low | ✅ completed |

**Total: 10 visual phases.** Ship them in order — later phases assume tokens and typography from A/B exist.

**Pause points:** After Phase D, stop the design migration and run [PHASES.md → Phase 10a + 10b](PHASES.md) (characteristic badges + seen-tracking). Then resume with Phase E. Phase G has a softer dependency on 10a (badge variety); the year chip is deferred to [FUTURE_IDEAS.md](FUTURE_IDEAS.md). See the callouts on Phase E and Phase G below for details.

## Phase map (structural — deferred, do NOT start without re-approval)

| Phase | Title | Why deferred |
|------|-------|--------------|
| S1 | `/now` explicit location state | Current UI already groups crew into card-per-location buckets. S1 is the structural rewrite behind that UI: `user_presence` becomes a single 3-state enum instead of two booleans. Migration + RLS + realtime work. |
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

## Phase F — `/now` visual polish (no structural change) [completed]

Restyled `RightNowPage` location cards to the design system's `.loc` / `.loc-stack` language: 4px `.locStrip` status stripe at the top of each card, Oswald uppercase group title + mono kicker + count tile, and crew chips inside. Applied tinted gradient backgrounds per card type — orange for Metal Place, teal for Camping, deep purple for LOST. Page header gained the Oswald "Right Now" title and a day/time mono spec driven by `useNow()` so godlike time-travel stays live. No structural changes to presence booleans, realtime subscriptions, or data flow.

---

## Phase G — `/profile` + patches grid [completed]

Restyled `ProfilePage` with the design system's profile layout using local JSX subtrees (no hook movement). Profile head: centered 56px avatar, Oswald uppercase display name, mono email, role chip (gold for godlike, blue for manager, neutral for crew), country flag emoji, and sorted Wacken-years pill. Replaced `BadgesDisplay` with a full patches-grid (Variant A): 4 / 6 / 8 columns across breakpoints, all BADGES shown (locked = grayscale + 32% opacity), 64px circles, scrim-close detail modal with 132px Oswald title and body description; `year?: number` added to `BadgeConfig` for future year chips. Edit-profile form wrapped in a `pfCollapse` collapsible row; language select replaced with a PT / EN segment control. Manager tools behind a blue-labeled collapsible; Godlike admin behind a gold-labeled collapsible — all existing behaviors (time travel, live-band test, Metal Place config, user management) preserved. Sign-out moved from the top header to a mono pill button at the bottom. 177 tests green.

---

## Phase H — Announcements restyle [completed]

Restyled `AnnouncementsPage` to the design system's `announce` card layout. Each card is now a CSS grid (`40px 1fr`): author avatar (40px, Oswald initials, 2px `--bg` border) in column 1; head row (bold name + role chip + auto-right mono timestamp), body, and actions row stacked in column 2. Role chips: neutral for `normal` ("Crew"), blue tint for `manager`, gold tint for `godlike` — matching the design system spec. Action buttons (Delete, Block) are now mono uppercase text links styled with `.actionBtn` / `.actionBtnDanger` (no filled backgrounds). Already-blocked state renders muted and disabled. Composer stays at top of feed. Timestamp format updated to design system style: `< 1m` → "agora" / "now", `< 60m` → "N min", `< 24h` → "Nh", `≥ 24h` → "DD/MM". Page title uses Oswald uppercase. Useful links section and all existing behaviors (realtime, offline queue, soft-delete, blocking) unchanged. 177 tests green.

---

## Phase I — Auth pages + bottom nav + offline chrome [completed]

Restyled `LoginPage` and `RegisterPage` via `AuthPage.module.css`: 4px `--accent` top border, Oswald uppercase title, mono 11px uppercase subtitle and labels, zero-radius card and inputs to match design system hard geometry. `BottomNav` switched to `grid` (6 equal columns), mono 9px uppercase tab labels, active state = `--accent-hover` + filled icon variant via the `<Icon>` component; all 6 tabs kept (`/now /schedule /my-picks /popular /announcements /profile`). Added `OfflineBanner` component (mono caps + 6px pulsing dot) wired to `/now`, `/schedule`, and `/my-picks`. Added `.pending-chip` global CSS class and `useOfflinePendingBandIds` hook; `BandCard` gained a `pending` prop that shows the chip; `AnnouncementsPage` reads the offline queue and shows the chip on unsynced posts. `SyncToast` appears for 3s at the bottom of the screen after ≥1 queued item flushes (`flushOfflineQueue`, `flushPresenceQueue`, `flushPendingAnnouncements` now return flush counts; App.tsx emits `viralatas:sync-complete` when any are > 0). 177 tests green.

---

## Phase J — Icon pass [completed]

Created `src/components/icons/Icon.tsx` — a single shared component for all 17 design-system icons (`pick`, `live`, `schedule`, `popular`, `profile`, `search`, `filter`, `conflict`, `sync`, `offline`, `dismiss`, `chevron`, `arrow`, `time`, `tent`, `friend`, `mural`). All SVGs use `strokeLinecap="square"` + `strokeLinejoin="miter"` per spec; `filled` prop switches fill for tab-bar and pick-star states. Updated: `StarIcon` now delegates to `Icon`; `BandFilters` local `FunnelIcon` replaced with `<Icon name="filter" />`; `BandDetailModal` local `CloseIcon` replaced with `<Icon name="dismiss" />`; `BottomNav` uses `Icon` with `filled={isActive}`. `ProfilePage`: all `▼` chevrons replaced with `<Icon name="chevron" size={14} />`; `🔧` removed from "MANAGER POWERS" heading and role badge; `👤` removed from role badge (kept `🤘` on godlike — allowed per spec); `✓` / `✗` removed from button labels (text alone is sufficient); `⏳` in registration toggle replaced with an i18n string. 177 tests green.

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
2. **Bottom nav:** 5 cells (`Now / Schedule / Picks / Popular / Me`). Active = `--accent-hover` color + filled icon variant. Inactive = `--text-muted` + line-icon variant. Icons from the design system's icon sheet (Phase J will harden the icon set; here we just adopt it).
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
