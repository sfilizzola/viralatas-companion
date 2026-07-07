# FUTURE_IDEAS.md — Nice-to-Have Features

Ideas and features that would enhance the app but are not yet scheduled for implementation. Numbered independently of phase numbering.

> **Rule:** When adding a new idea, evaluate its complexity and risk and add a row to the table below before writing the full spec.
>
> **Status values:** `pending` · `partial — Phase N` (engine/data only) · `✅ Phase N` (shipped — spec collapsed; see `docs/ai-wiki/phases-history.md`)
>
> **Last synced:** 2026-07-07 — Jungle go-live plan parked (Idea 5); not scheduled for implementation.

## Ideas at a glance

| # | Title | Complexity | Risk | Status |
|---|---|---|---|---|
| 1 | LLM proactive alerts | High | Medium — API key handling, alert spam, offline edge cases | pending |
| 2 | Rating on My Wacken | Low | Low — no new schema; reuse `userRatingByBand` + read-only chip on ended rows | pending (data ✅ Phase 32) |
| 3 | Rating-based badges | Medium | Low — additive registry entries; no further schema change | partial — Phase 34 |
| 4 | Avatar Peek Sheet | Medium | Low — bottom sheet + CTA; re-uses existing presence/pick data | pending |
| 5 | Jungle stage go-live | Medium | Low — feed-gated sync; no schema change; picks preserved on UPDATE | pending — spec + plan ready |

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

## Idea 2 — Rating on My Wacken

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

## Idea 3 — Rating-based badges

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

**Deferred (this idea):**
- New badge slugs in `registry.ts` using Phase 34 predicates
- PNG assets under `public/badges/`
- `Badges_{br,en,es,de}.json` label + description keys
- Design System badge inventory update
- Follow `badge-author` subagent procedure when scheduled

**Key paths:** `src/services/badges/engine.ts` · `src/services/badges/types.ts` · `src/services/badges/badgeContextBuilder.ts` · `src/services/ratingStats.ts` · `src/__tests__/badges.test.ts`.

**Design reference:** `docs/superpowers/specs/2026-05-28-rating-wrap-badge-predicates-design.md`

---

## Idea 4 — Avatar Peek Sheet

**Status:** `pending`

**Goal:** Tappable avatars everywhere (Popular attendee cluster, `/now` crew rows) → user peek bottom sheet → "Ver no lineup" CTA pre-filters the schedule to that crew member's picks.

**Complexity:** Medium · **Risk:** Low — bottom sheet + CTA re-uses existing presence/pick data; no schema change.

**Design:** Bottom sheet triggered on avatar tap. Shows crew member name, avatar, brief stats (how many bands picked, how many shared with me). Primary CTA: "Ver no lineup" → navigates to `/schedule` with `userId` filter pre-applied (Phase 38.A already supports this filter).

**Potential entry points:**
- `/popular` — attendee avatar cluster on band cards
- `/now` — vira-latas crew grid rows

**Acceptance (when scheduled):**
- Tapping any crew avatar outside the schedule page opens the peek sheet
- Sheet shows name, avatar, pick count, shared-pick count
- "Ver no lineup" navigates to `/schedule` with that user's picks pre-filtered
- Works fully offline (all data from IndexedDB)
- i18n in all 4 languages (br, en, de, es)

**Depends on:** ✅ Phase 38.A `userId` filter on `/schedule`.

---

## Idea 5 — Jungle stage go-live

**Status:** `pending` — design approved 2026-07-07; **not scheduled for implementation**. Spec and implementation plan written; execute when Wacken publishes Welcome to the Jungle in the official running order (or proactively before festival if desired).

**Goal:** When Jungle appears in wacken.com `events-concert.json`, CLI and godlike remote sync fill confirmed `JUN1`–`JUN8` slots automatically. When Jungle is absent from the feed, the app keeps showing nothing for that stage (current behavior).

**Complexity:** Medium · **Risk:** Low — no DB schema change; reuses `lineup-official-source.ts` + `lineup-remote-plan.ts`; INSERT only for confirmed band names; UPDATE preserves picks.

### Locked decisions (brainstorming 2026-07-07)

| Topic | Choice |
|-------|--------|
| Apply path | Laptop CLI **and** godlike phone sync — identical behavior |
| Visibility | Show only slots with a **confirmed band name** in the official feed |
| Times | `docs/ai-wiki/stages.md` grid (operator sets `Confirmed = YES` before apply) |
| Slot ID mapping | Chronological global counter — same as FAS/WAK/etc. |
| Approach | Feed-gated auto-enable (`jungleIsPublished`) |

### Problem today

1. `bands.ts` omits all `JUN1`–`JUN8` rows (`Name = TBD` in `lineup.md`).
2. `STAGE_UID_TO_ABBREV` has no Jungle mapping — events dropped at filter time.
3. `isJungleSlot()` permanently skips JUN in diff, patch, and remote plan.

Correct while Jungle is unpublished; breaks the moment Wacken adds the stage unless code is updated.

### Architecture (feed-gated)

```
Official JSON fetch
  → resolve Jungle stage.uid from stages.json title
  → jungleIsPublished? (any JUN* CONFIRMED in feed)
      false → skip all JUN (hidden, same as today)
      true  → JUN flows through diff/sync like other stages
  → INSERT only confirmed names; official TBD JUN slots stay hidden
  → times from JUN_SLOT_TIMES (stages.md grid), not official unix
  → CLI --complete appends new bands.ts rows for confirmed JUN slots
  → seed:bands:sync --apply INSERTs to prod (or godlike remote apply)
```

**No UI work** — schedule/stage colors already support `"Welcome to the Jungle"`.

### Deliverables (10 tasks — see plan)

- [ ] `src/lib/jungle-slot-times.ts` — `JUN_SLOT_TIMES` ISO map from `stages.md`
- [ ] `jungleIsPublished` + `isPolicySkippedSlot(slotId, official)` in `lineup-official-source.ts`
- [ ] Dynamic JUN stage UID from `stages.json` in `buildOfficialSlots`
- [ ] Feed-gated `computeDiff` / `patchBandsTsContent`
- [ ] `generateBandsTsRowsForJungle` for `--complete` seed row INSERT
- [ ] Remote plan: conditional skip + JUN time override on INSERT/UPDATE
- [ ] `lineup-check-official.ts` `--complete` wiring
- [ ] Relax `assertSeedIntegrity` fixed 187-row count in `bands.ts`
- [ ] Wiki: `lineup-official-source.md`, `lineup-sync.md`, changelog
- [ ] Tests: `jungle-slot-times`, official-source gate, remote-plan JUN INSERT

### Operator workflow (go-live day)

**Laptop:**
```bash
npm run lineup:check-official
# Confirm stages.md Jungle slots Confirmed = YES
npm run lineup:check-official -- --lineup
npm run lineup:check-official -- --complete
npm run seed:bands:sync
npm run seed:bands:sync -- --apply
```

**Infield (no laptop):** `/profile` → Lineup sync → preview → apply.

### Acceptance criteria

- [ ] No Jungle in official feed → zero JUN bands in DB; `/schedule` unchanged
- [ ] Partial publish (e.g. 3 confirmed) → exactly 3 bands appear; official TBD slots hidden
- [ ] CLI and godlike remote apply produce same DB state for same feed snapshot
- [ ] JUN `start_time` / `end_time` match `stages.md` grid, not official JSON unix
- [ ] Picks preserved on UPDATE; DELETE blocked when picks exist
- [ ] `rtk npm test` and `rtk npm run build` green

### Design references

- Spec: `docs/superpowers/specs/2026-07-07-jungle-stage-go-live-design.md`
- Plan: `docs/superpowers/plans/2026-07-07-jungle-stage-go-live.md`
- Wiki (update on ship): `docs/ai-wiki/lineup-official-source.md`, `docs/ai-wiki/lineup-sync.md`
