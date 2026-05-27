# FUTURE_IDEAS.md — Nice-to-Have Features

Ideas and features that would enhance the app but are not yet scheduled for implementation. Numbered independently of phase numbering.

> **Rule:** When adding a new idea, evaluate its complexity and risk and add a row to the table below before writing the full spec.
>
> **Status values:** `pending` · `✅ Phase N` (shipped — spec collapsed; see `docs/ai-wiki/phases-history.md`)

## Ideas at a glance

| # | Title | Complexity | Risk | Status |
|---|---|---|---|---|
| 1 | LLM proactive alerts | High | Medium — API key handling, alert spam, offline edge cases | pending |
| 2 | Year freeze for historical badges | Medium | Low — godlike-only, idempotent, additive schema change | ✅ Phase 29 |
| 3 | Unit tests: IDB layer (`src/lib/db/`) | Medium | Low — `fake-indexeddb` dev dependency; isolated from app runtime | ✅ Phase 26 |
| 4 | Unit tests: Hook logic (pure memoized computations) | Medium | Low — pure services + scenario tests; no network | ✅ Phase 26 |
| 5 | Unit tests: Component and page integration | High | Low — auth pages + repository/hook coverage; SchedulePage logic tested at lower layers | ✅ Phase 26 |
| 6 | Festival minimap with live user positions | Medium | Medium — requires maintained image asset, presence data accuracy, mobile layout fit | pending |
| 7 | Festival wrap (`/wrap` recap page) | Medium | Low — client-side stats from existing IDB; no schema change; additive route | 📋 Phase 30 |

---

## Idea 1 — LLM proactive alerts

**Goal:** Claude proactively taps the crew on the shoulder at key festival moments. No user needs to ask — the app just knows.

**Architecture:**
```
Client (Service Worker timer or Realtime event)
  → POST /functions/v1/check-alerts
  → Edge Function builds AlertContext
  → Calls Claude API (claude-sonnet-4-6)
  → Returns alert payload { type, message, targetUserIds }
  → Client displays push notification or in-app banner
```

---

### Alert types

#### 1a — Conflict alert
- **Trigger:** 30 minutes before a time slot where the user has two picks on different stages simultaneously
- **Offline capable:** Yes — runs from cached picks + schedule, no API call needed
- **Cooldown:** Once per conflicting pair per festival day
- **Example message:** "Você marcou Blind Guardian e Powerwolf ao mesmo tempo. Qual palco vai rolar? 🤘"

#### 1b — Crew split alert
- **Trigger:** When crew picks for the next time slot split across 3 or more stages
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per hour
- **Example message:** "Crew dividida em 4 palcos agora. Ponto de encontro: portão principal às 22h? 🤘"

#### 1c — Discovery nudge
- **Trigger:** User has a gap of 45+ minutes with no picks; a band the crew loves is starting soon
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per gap window
- **Example message:** "Você tem 50 min livre. Fernanda e Beto adoraram Bloodbath — começam em 10 min no HARDER STAGE 🤘"

#### 1d — Day recap
- **Trigger:** 30 minutes after the last scheduled band on each festival day
- **Offline capable:** No — requires Claude API, cached for offline reading after delivery
- **Cooldown:** Once per festival day
- **Example message:** "Viralatas viram 14 bandas hoje. Mais popular: Rammstein (6/7). Mais dividida: Tool (4 foram, 3 fugiram) 🤘"

---

### Edge Function prompt template

```
Você é o assistente da crew Viralatas Metaleiros no Wacken.
Hora atual: {currentTime}. Dia do festival: {festivalDay}.

PICKS DA CREW:
{crewPicks as compact JSON}

SCHEDULE COMPLETO:
{fullSchedule as compact JSON}

Tipo de alerta solicitado: {alertType}

Regras:
- Responda APENAS com a mensagem de notificação
- Máximo 2 frases
- Tom: direto, divertido, metal
- Idioma: português brasileiro
- Termine com 🤘
```

---

### Deliverables

- [ ] `supabase/functions/check-alerts/index.ts` Edge Function
- [ ] Alert cooldown tracking in `user_alerts` table (alert_type, user_id, fired_at)
- [ ] Client-side alert scheduler (Service Worker periodic sync or polling fallback)
- [ ] In-app alert banner component (non-blocking, dismissible)
- [ ] Web Push notification support (when app is backgrounded)
- [ ] Offline conflict alert runs without API call

### Acceptance criteria

- [ ] Conflict alert fires correctly 30 min before a clash
- [ ] No alert fires twice within its cooldown window
- [ ] API key is never present in client bundle (verify with `grep -r "ANTHROPIC" src/`)
- [ ] Alerts arrive in Brazilian Portuguese

### Alert cooldown reference

| Alert | Cooldown |
|---|---|
| Conflict alert | Once per conflicting pair per day |
| Crew split | Once per hour |
| Discovery nudge | Once per gap window |
| Day recap | Once per festival day |

---

## Idea 2 — Badge consolidation

**Status:** ✅ **Implemented — Phase 29** (2026-05-27). Full deliverables, acceptance criteria, and operator runbook → `docs/ai-wiki/phases-history.md` (Phase 29) · `docs/ai-wiki/badges.md` · `docs/ai-wiki/festival-reset.md`.

**Shipped summary:** Godlike `consolidate-year-badges` snapshots earned year-badges into `user_badge_history` (frozen `image_path` + `label_key`). Live vest shows evergreen + current festival year only; past years in **Previously Achieved** on `/profile` (U2 flat grid, diamond year chips, M2 modal). IndexedDB-primary client cache; survives `festival:reset`. Godlike archive preview seed for local UI testing.

**Key paths:** `supabase/migrations/20260527000001_user_badge_history.sql` · `supabase/functions/consolidate-year-badges/` · `src/components/BadgeHistorySection.tsx` · `src/components/profile/ConsolidateBadgesSection.tsx` · `src/repositories/badgeHistoryRepository.ts`.

---

## Idea 3 — Unit tests: IDB layer

**Status:** ✅ **Implemented — Phase 26** (26.A safety net + 26.N domain split). Full inventory → `docs/ai-wiki/testing.md` · `docs/ai-wiki/phases-history.md` (Phase 26).

**Shipped summary:** `fake-indexeddb` scoped via `helpers/fakeIdb.ts`; monolithic `lib/db.ts` split into 12 modules under `src/lib/db/` (barrel import unchanged). `db.test.ts` covers session, catalog, picks, offline queues (picks/presence/announcements/missed/duck), presence, announcements, missed, config, duck, meta, badge history, wipe, and all `*-changed` window events. Coverage thresholds in `vitest.config.ts` gate `src/lib/db/**` (95% lines/funcs/stmts, 55% branches).

**Key paths:** `src/__tests__/db.test.ts` · `src/__tests__/helpers/fakeIdb.ts` · `src/lib/db/` · `vitest.config.ts`.

---

## Idea 4 — Unit tests: Hook logic (pure memoized computations)

**Status:** ✅ **Implemented — Phase 26/27** (26.M `/now` composable split + 27.F IDB subscription caches). Full inventory → `docs/ai-wiki/testing.md` · `docs/ai-wiki/phases-history.md` (Phases 26–27).

**Shipped summary:** Original plan targeted separate `useNowData.logic`, `usePickCounts`, and `useBandAttendees` test files. Delivered instead via pure-service and scenario tests aligned with the refactored architecture: `/now` derivation in `livePreview.test.ts` + table-driven `liveNowScenarios.test.ts`; composable hook wiring in `useNowData.test.ts`; `computeAttendees()` in `attendees.test.ts`; shared pick cache in `useIdbSubscription.test.ts`. No Supabase subscriptions in these tests.

**Key paths:** `src/__tests__/livePreview.test.ts` · `src/__tests__/liveNowScenarios.test.ts` · `src/__tests__/useNowData.test.ts` · `src/__tests__/attendees.test.ts` · `src/__tests__/useIdbSubscription.test.ts` · `src/services/livePreview.ts` · `src/services/attendees.ts`.

---

## Idea 5 — Unit tests: Component and page integration

**Status:** ✅ **Implemented — Phase 26** (26.A auth safety net). Full inventory → `docs/ai-wiki/testing.md` · `docs/ai-wiki/phases-history.md` (Phase 26).

**Shipped summary:** Auth pages mount real components with RTL + mocked Supabase: `login.test.tsx` (LoginPage + `useAuth`), `registration.test.tsx` (RegisterPage validation + signup shape), `auth-integration.test.ts` (IDB session + trigger metadata contract). Original plan also called for `SchedulePage.test.tsx`; filter/toggle behavior is covered at lower layers instead — `bandFilter.test.ts`, `schedule.test.ts`, `usePickActions.test.ts`, `picksRepository.test.ts` — which matches the post–Phase 26 hook/repository architecture. No dedicated SchedulePage mount test; accepted trade-off.

**Key paths:** `src/__tests__/login.test.tsx` · `src/__tests__/registration.test.tsx` · `src/__tests__/auth-integration.test.ts` · `src/__tests__/bandFilter.test.ts` · `src/__tests__/usePickActions.test.ts` · `src/__tests__/picksRepository.test.ts`.

---

## Idea 6 — Festival minimap with live user positions

**Goal:** Show a cartoonish, schematic image of the Wacken festival grounds — infield stages + camping area — as a minimap, with vira-latas' avatars (or colored dots) overlaid on their current location. Purely visual social awareness; not a GPS map, not a real-distance representation.

---

### Concept

A static PNG or SVG asset representing the festival layout (not to scale, not accurate geographically) — think treasure-map style or hand-drawn cartoon. The image contains:
- Named zones for each stage (clickable or labelled)
- A camping zone
- An "elsewhere" zone (rest of the image, non-specific)

Over this image, live presence dots are rendered using absolute positioning (or SVG `<circle>` elements), driven by the existing `user_presence` data already in Supabase Realtime.

---

### User placement logic

| Presence state | Where they appear on the map |
|---|---|
| `stage = <stage_name>` | Dot placed inside the bounding box for that stage zone |
| `is_camping = true` | Dot placed inside the camping zone bounding box |
| Unknown / no presence data | Dot placed randomly within the "outside areas" region of the image |

Placement within each zone is **random jitter inside the zone's bounding box** — not tied to any real coordinate. The goal is visual density awareness, not navigation.

---

### Asset dependency

This feature requires **one custom image asset**: a cartoonish festival map with clearly delimited zones. The zones must be mapped to pixel bounding boxes (e.g., `{ stage: 'MAIN STAGE 1', x: 120, y: 80, w: 200, h: 150 }`). This config lives in a static JS/TS file alongside the component — if the asset changes, the bounding boxes are updated in that config.

The image asset is not part of the codebase until someone produces it. This is the **single hardest prerequisite** for the feature.

---

### Architecture sketch

```
MinimapPage (or overlay on /now)
  ├── <img src="/minimap.png"> (static asset, cached by SW)
  ├── <svg overlay> (absolute-positioned on top of image)
  │   ├── <circle> per user at stage zone (jittered inside bbox)
  │   ├── <circle> per camping user (jittered inside camping bbox)
  │   └── <circle> per unknown user (random in "elsewhere" region)
  └── Data source: usePresence() hook → already drives /now page
```

No new backend work is needed — `user_presence` is already synced via Supabase Realtime and cached in IndexedDB.

---

### Open questions before implementation

1. **Who creates the image asset?** This is a design/illustration task, not a coding task.
2. **Where does the minimap live in the app?** Options: dedicated `/map` route, collapsible section on `/now`, bottom sheet on `/popular`.
3. **Dot labeling?** Show display names on hover/tap, or always show initials inside the dot?
4. **Privacy:** Should presence on the map be opt-in or opt-out? Some vira-latas may not want to be locatable.
5. **Offline behavior:** Minimap shows last known positions when offline (from IndexedDB) — acceptable, but stale positions should be visually de-emphasized (e.g. grayed out dots).

---

### Acceptance criteria (when implemented)

- [ ] Minimap image is cacheable offline (added to Workbox precache list).
- [ ] Dots are driven by `user_presence` realtime data; update within 3 s when a user changes location.
- [ ] Stage zone bounding boxes are defined in a single config file — no magic numbers scattered across components.
- [ ] "Unknown" users appear in the non-zone region of the image, not on top of a stage or camping zone.
- [ ] Privacy consideration addressed (opt-in/out mechanism or explicit decision documented).
- [ ] Works on mobile at 375 px width — image scales, dot positions scale proportionally.

---

## Idea 7 — Festival wrap (`/wrap` recap page)

**Status:** 📋 **Phase 30** — implementation plan: `docs/superpowers/plans/2026-05-27-festival-wrap-plan.md` (no code yet)

**Goal:** After Wacken ends, give each vira-lata a single scrollable recap page — Spotify Wrapped energy, but one route instead of a carousel or modal. Lead with **personal** stats; close with **1–2 crew highlights**. No LLM prose; all numbers computed offline from IndexedDB.

**Inspiration:** Spotify Wrapped, but scoped to what the app already knows (picks, seen bands, badges, schedule chaos, crew overlap).

**When:** Available once the last non-ceremony band's `end_time` has passed. Discovery via a teaser banner on `/now` and/or `/profile` (dismissible per device). Route remains reachable for godlike time-travel testing before festival end.

**Layout decision (locked in design exploration):** **A2 · Vest Chronicle** — extends the patches vest language from `BadgesDisplay` (stage color top bar, surface cards, chaos meters, denim vest finale with chaotic patch pile). HTML prototypes live in `_temp/wrap-proposals/` (`variant-a2-vest-chronicle.html`, comparison gallery `index.html`).

---

### UX — scroll story (Approach A)

One private route `/wrap`. Five full-viewport sections with optional `scroll-snap`. Fixed **5-dot progress bar** at top (updates via `IntersectionObserver` as user scrolls).

| # | Section | Content |
|---|---------|---------|
| 1 | Hero | Giant **bands seen** count; secondary row: picked · skipped · stages visited |
| 2 | Personality | Top genre + top stage copy; stage-colored pill (`Harder stage · N visited`) |
| 3 | Chaos | Horizontal meters: weak skips, hard schedule conflicts, patches earned |
| 4 | Crew | Pick twin (name + overlap %); crew favorite band (name + pick count / active vira-latas) |
| 5 | Patches | Chaotic scattered earned badge thumbnails on denim vest texture; CTA **Open vest on profile** → `/profile` |

**Visual system (from Design System):**
- Tokens: `--bg`, `--bg-surface`, `--text`, `--text-muted`, `--accent` (#c0392b CTA)
- Typography: Oswald display, IBM Plex Sans body, JetBrains Mono kickers
- **Dynamic `--stage` color** from user's top stage (same map as `SchedulePage` stage colors)
- 4px stage-color bar at top of each section card

**Edge cases:**
- `is_friend` users: hide location-toggle stats if ever surfaced; crew comparisons still valid
- Zero picks: friendly empty state — survived Wacken without the app knowing your schedule
- Sparse `user_missed_bands` adoption: prefer pick-based stats over skip-based when missed data is thin

---

### Stats — personal (from IndexedDB + auth metadata)

All computed client-side; reuse patterns from `badgeContextBuilder.ts`, `engine.ts`, `usePickCounts.ts`, `useBandConflicts.ts`.

| Stat | Source |
|------|--------|
| Bands picked | `user_picks` |
| Bands seen | picks where `end_time < now`, minus `user_missed_bands` (same as badge `seenBands`) |
| Bands skipped | picked + ended + in missed set |
| Top genre / stage | aggregate `seenBands` |
| Stage diversity | distinct stages in `seenBands` |
| Hard / soft conflicts | `computeBandOverlaps()` on picked bands |
| Weak skips | `user_metadata.weak_skips_2026` |
| Badges earned | `getEarnedBadges(ctx)` |
| Location toggles | `user_metadata.location_visits` (optional; hide for friends) |
| Max crew at a pick | `maxAttendanceInPicks` in `BadgeContext` |

### Stats — crew closing beats

| Stat | Source |
|------|--------|
| Crew's #1 band | highest pick count across vira-latas (`PopularPage` logic) |
| Pick twin | vira-lata with highest pick-set overlap (Jaccard) |
| Active vira-latas | unique user IDs in all picks |
| Shared seen moment | band you saw that N crew members also picked (optional copy variant) |

### Not in v1 (documented gaps)

| Stat | Gap |
|------|-----|
| Duck quacks sent/received | `duck_quacks` in Supabase only — not cached in IndexedDB |
| Historical presence trail | only toggle counters in metadata |
| True attendance proof | "seen" = didn't opt out of missed mark |
| MoshSplit balance | external API on Profile — out of scope |
| LLM day recap | separate future alert type (`day_recap` in Idea 1) |
| Public shareable URL | no server-side persistence of wrap snapshot |

Optional v2: percentile rank ("You saw more bands than X% of vira-latas") — trivial client-side when crew is ~20 people; copy needs care.

---

### Festival-ended gate

`isFestivalEnded(at, bands)` in `time.ts` — **implemented in Phase 29** (shared with badge consolidation gate). True when `at` is past the max non-ceremony band `end_time`.

- Teaser banner only when `isFestivalEnded()`
- `/wrap` always reachable when logged in (godlike time override for QA)
- Banner dismiss: `localStorage['viralatas:wrap-dismissed-2026']`

---

### Architecture sketch

```
WrapPage (scroll-snap sections × 5)
  ├── useFestivalWrapStats()  ← IDB snapshot + auth metadata
  │     └── festivalWrap.ts   ← pure stats builder
  ├── WrapProgress            ← 5-dot bar (A2+)
  ├── WrapHero / Personality / Chaos / Crew / Patches
  └── Link → /profile (Open vest)

Discovery
  └── Banner on RightNowPage + ProfilePage when isFestivalEnded && !dismissed
```

**Offline-first:** Same as rest of app — reads IndexedDB first; no Supabase reads for stats.

---

### Files (when implemented)

| File | Action |
|------|--------|
| `src/services/festivalWrap.ts` | Pure stats builder + types |
| `src/services/time.ts` | `isFestivalEnded()` ✅ Phase 29 |
| `src/hooks/useFestivalWrapStats.ts` | IDB + auth compose hook |
| `src/pages/WrapPage.tsx` | A2 Vest layout |
| `src/pages/WrapPage.module.css` | Stage bar, meters, vest finale |
| `src/i18n/WrapPage_*.json` | br, en, es, de |
| `src/App.tsx` | Private route `/wrap` |
| `src/pages/RightNowPage.tsx` / `ProfilePage.tsx` | Post-festival teaser banner |
| `public/Design System.html` | Wrap section |
| `src/__tests__/festivalWrap.test.ts` | Edge cases: 0 picks, friend user, sparse missed |
| `_temp/wrap-proposals/` | Design-only HTML (already drafted) |

---

### Relationship to other ideas

- **Idea 1 (day recap alert):** LLM push notification per festival day — complementary, not a substitute; wrap is a static on-demand page.
- **Idea 2 (badge consolidation):** ✅ Phase 29 — wrap shows live earned badges from the current engine; **Previously Achieved** shows consolidated year badges after the godlike operator runs consolidate (and after reset, year-badges live only in archive).

---

### Acceptance criteria

- [ ] `/wrap` renders five scroll sections with A2 Vest visual language (stage bar, meters, patch pile, progress dots).
- [ ] All displayed stats match badge engine semantics for seen/picked/skipped/conflicts.
- [ ] Page works fully offline after first load (stats from IndexedDB only).
- [ ] Teaser banner appears only after `isFestivalEnded()` and respects dismiss localStorage key.
- [ ] Copy uses **vira-latas** (not "crew") in all four locales.
- [ ] Friend users never see location-toggle stats on the wrap page.
- [ ] Empty-picks users see a friendly empty state, not broken layout.
- [ ] "Open vest" navigates to `/profile` where `BadgesDisplay` shows full patch collection.
- [ ] Design System documents Wrap page tokens and section anatomy.
