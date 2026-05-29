# FUTURE_IDEAS.md — Nice-to-Have Features

Ideas and features that would enhance the app but are not yet scheduled for implementation. Numbered independently of phase numbering.

> **Rule:** When adding a new idea, evaluate its complexity and risk and add a row to the table below before writing the full spec.
>
> **Status values:** `pending` · `partial — Phase N` (engine/data only) · `✅ Phase N` (shipped — spec collapsed; see `docs/ai-wiki/phases-history.md`)
>
> **Last synced:** 2026-05-29 — Phases 30–34 (wrap, social snapshot, My Wacken, ratings, wrap rating stats, badge predicates).

## Ideas at a glance

| # | Title | Complexity | Risk | Status |
|---|---|---|---|---|
| 1 | LLM proactive alerts | High | Medium — API key handling, alert spam, offline edge cases | pending |
| 2 | Year freeze for historical badges | Medium | Low — godlike-only, idempotent, additive schema change | ✅ Phase 29 |
| 3 | Unit tests: IDB layer (`src/lib/db/`) | Medium | Low — `fake-indexeddb` dev dependency; isolated from app runtime | ✅ Phase 26 |
| 4 | Unit tests: Hook logic (pure memoized computations) | Medium | Low — pure services + scenario tests; no network | ✅ Phase 26 |
| 5 | Unit tests: Component and page integration | High | Low — auth pages + repository/hook coverage; SchedulePage logic tested at lower layers | ✅ Phase 26 |
| 6 | Festival minimap with live user positions | Medium | Medium — requires maintained image asset, presence data accuracy, mobile layout fit | pending |
| 7 | Festival wrap (`/wrap` recap page) | Medium | Low — client-side stats from existing IDB; no schema change; additive route | ✅ Phase 30 (+34 Ratings) |
| 8 | Rating on My Wacken | Low | Low — read existing `user_band_ratings` IDB; display-only on ended rows | pending (data ✅ Phase 32) |
| 9 | Rating stats on `/wrap` | Low | Low — aggregate from IDB; additive wrap section | ✅ Phase 34 |
| 10 | Rating-based badges | Medium | Low — predicates ✅ Phase 34; catalog entries still pending | partial — Phase 34 |

---

## Idea 1 — LLM proactive alerts

**Status:** `pending` — types + in-memory queue stub only (`src/services/alerts.ts`; not wired to Edge Function or UI).

**Goal:** Claude proactively taps vira-latas on the shoulder at key festival moments. No user needs to ask — the app just knows.

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

#### 1b — Vira-latas split alert
- **Trigger:** When vira-latas' picks for the next time slot split across 3 or more stages
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per hour
- **Example message:** "Vira-latas divididas em 4 palcos agora. Ponto de encontro: portão principal às 22h? 🤘"

#### 1c — Discovery nudge
- **Trigger:** User has a gap of 45+ minutes with no picks; a band the vira-latas love is starting soon
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
| Vira-latas split | Once per hour |
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
  └── Data source: useSocialSnapshot / usePresenceCache (Phase 31) — same presence IndexedDB as /now
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

**Status:** ✅ **Implemented — Phase 30** (2026-05-27), extended **Phase 34** (Ratings section). Full deliverables, acceptance criteria, and flow → `docs/ai-wiki/phases-history.md` (Phases 30, 34) · `docs/ai-wiki/flows/festival-wrap.md`.

**Shipped summary:** Private scroll-snap route `/wrap` with welcome gate, personal stats (hero, personality, chaos), optional **Ratings** section (Phase 34 · Variant **C · Popular Echo**), vira-latas highlights (pick twin, crew favorite), optional godlike-assigned patches section, chaotic vest patch pile, and finale thanks. Stats from IndexedDB via `useSocialSnapshot` (Phase 31) + `useAllRatingsCache` (Phase 34); no Supabase reads. Post-festival teaser banner (Variant B) on `/now` and `/profile` when `isFestivalEnded(now(), bands)` and not dismissed (`viralatas:wrap-dismissed-2026`). Route always reachable when logged in (no festival-ended gate on the route).

**Key paths:** `src/services/festivalWrap.ts` · `src/services/ratingStats.ts` · `src/hooks/useFestivalWrapStats.ts` · `src/hooks/useAllRatingsCache.ts` · `src/hooks/useWrapTeaserVisible.ts` · `src/pages/WrapPage.tsx` · `src/components/wrap/WrapProgress.tsx` · `src/components/wrap/WrapTeaserBanner.tsx` · `src/__tests__/festivalWrap.test.ts` · `src/__tests__/ratingStats.test.ts`.

**Original design specs (pre-ship):** `docs/superpowers/specs/2026-05-27-festival-wrap-page-design.md` (A2 Vest Chronicle) · `docs/superpowers/specs/2026-05-27-festival-wrap-banner-design.md` · `docs/superpowers/specs/2026-05-27-festival-wrap-godlike-qa-design.md`.

**Relationship to other ideas:**
- **Idea 1 (day recap alert):** LLM push per festival day — complementary; wrap is static on-demand.
- **Idea 2 (badge consolidation):** ✅ Phase 29 — wrap shows live earned badges; **Previously Achieved** on `/profile` after consolidate.
- **Idea 9 (rating stats):** ✅ Phase 34 — merged into wrap as optional Ratings section (see above).

---

## Idea 8 — Rating on My Wacken

**Status:** `pending` — **Phase 32** shipped rating data + modal input; **Phase 33** shipped inline Attended/Missed chips on ended rows but explicitly deferred read-only rating display on the timeline.

**Goal:** Show the current user's 1–5 rating on ended bands in **My Wacken** (`/my-picks`) — read-only on the row, same paw visual language as band detail; edit remains in `BandDetailModal`.

**Depends on:** ✅ **Phase 32** — `user_band_ratings` table, IDB v11, `useBandRatings`, `BandRatingInput` in modal.

**Complexity:** Low · **Risk:** Low — no new schema; reuse `userRatingByBand` + compact paw badge or read-only `BandRatingInput` on `BandCard` timeline rows.

**Not yet shipped:**
- Ended `BandCard` rows (`renderEndedBand` in `MyWackenPage.tsx`) pass `attendanceChip` only — no `userScore` / rating cluster
- Rating is editable only via modal tap-through (already wired via `useBandDetailModal`)

**Acceptance (when scheduled):**
- Ended band rows show user's score when rated; no score chip when unrated
- Tapping row still opens modal where rating can be edited
- Works offline from IndexedDB
- Design System documents My Wacken ended-row rating chip (coordinate with `attendanceChip` layout from Phase 33)

**Design reference:** `docs/superpowers/specs/2026-05-28-vira-lata-rating-design.md` (non-goals) · `docs/superpowers/specs/2026-05-28-my-wacken-inline-attendance-design.md` (explicit deferral)

---

## Idea 9 — Rating stats on `/wrap`

**Status:** ✅ **Implemented — Phase 34** (2026-05-28). Full deliverables → `docs/ai-wiki/phases-history.md` (Phase 34) · `docs/ai-wiki/flows/festival-wrap.md`.

**Shipped summary:** Optional **Ratings** scroll section on `/wrap` (after Chaos, before vira-latas highlights) — Variant **C · Popular Echo**: personal strip (bands rated, user avg, % of seen rated), crew top-rated card, crew lowest-rated picked band (guard when no crew ratings), user top single-score band. Hidden when zero crew ratings or `!hasPicks`. Progress dots scale dynamically (7–9 sections). Pure aggregates via `buildRatingStatsSnapshot()` + `useAllRatingsCache`; same snapshot feeds badge context.

**Key paths:** `src/services/ratingStats.ts` · `src/hooks/useAllRatingsCache.ts` · `src/services/festivalWrap.ts` · `src/pages/WrapPage.tsx` · `src/__tests__/ratingStats.test.ts` · `public/vira-lata-ds.html` (Wrap Ratings § C).

**Depends on:** ✅ **Phase 32** crew-wide ratings in IndexedDB.

---

## Idea 10 — Rating-based badges

**Status:** **Partial — Phase 34** (2026-05-28). Engine predicates shipped; badge catalog (registry slugs, PNG assets, i18n) still pending.

**Goal:** Badge conditions keyed off concert ratings — e.g. rated N bands, gave a 5 to a headliner, vira-latas avg ≥ 4 on a band you picked.

**Depends on:** ✅ **Phase 32** data · ✅ **Phase 34** engine extension.

**Complexity:** Medium · **Risk:** Low — additive registry entries; no further schema change.

**Shipped (Phase 34) — six `BadgeCondition` types in `engine.ts`:**
| Type | Meaning |
|------|---------|
| `bands_rated_min` | User rated ≥ N eligible bands |
| `band_rated_score_min` | User gave band score ≥ N |
| `crew_avg_on_picked_band_min` | Crew avg on a band user picked ≥ threshold |
| `user_rating_avg_min` | User mean rating ≥ avg (requires `minRatings`) |
| `user_rating_avg_max` | User mean rating ≤ avg (requires `minRatings`) |
| `bands_rated_pct_of_seen_min` | Rated ÷ seen ≥ pct |

`BadgeContext` rating fields via `badgeContextBuilder` + `buildRatingStatsSnapshot`. Documented in `docs/ai-wiki/badges.md` and `.claude/context/badges.md`. **`registry.ts` unchanged** — zero new badge slugs.

**Deferred (future phase or ad-hoc):**
- New badge slugs in `registry.ts` using Phase 34 predicates
- PNG assets under `public/badges/`
- `Badges_{br,en,es,de}.json` label + description keys
- Design System badge inventory update
- Follow `badge-author` subagent procedure when scheduled

**Key paths:** `src/services/badges/engine.ts` · `src/services/badges/types.ts` · `src/services/badges/badgeContextBuilder.ts` · `src/services/ratingStats.ts` · `src/__tests__/badges.test.ts`.

**Design reference:** `docs/superpowers/specs/2026-05-28-rating-wrap-badge-predicates-design.md`
