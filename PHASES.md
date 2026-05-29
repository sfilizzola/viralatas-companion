# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

No active phased work. See `FUTURE_IDEAS.md` for upcoming ideas.

---

### Phase 35 — Festival minimap (live vira-lata positions)

**Status:** ✅ Complete (2026-05-29). Full history → `docs/ai-wiki/phases-history.md`.
**Design spec:** `docs/superpowers/specs/2026-05-29-festival-minimap-design.md`
**Product spec:** `FUTURE_IDEAS.md` § Idea 6
**Map asset:** `public/infield_map.png` (already exists).

**Goal:** New private route `/map`, reached via a **header glyph button** on `/now` (no bottom-nav tab), overlaying live vira-lata avatars on the existing cartoon Wacken map. Pure presentation over existing data — **no schema, no Edge Function, no new sync.** Positions are *derived* from the same `useSocialSnapshot` pipeline as `/now`.

**Prototypes (approved 2026-05-29, no code):** `docs/superpowers/prototypes/minimap-button.html` (entry button — **Variant A header glyph locked**) · `docs/superpowers/prototypes/minimap-header-glyph-variants.html` (**glyph F "Pin + bolt" locked** — map pin with a lightning-bolt dot) · `docs/superpowers/prototypes/minimap-calibrate.html` (interactive `?calibrate` zone-box harness, seeds `MINIMAP_ZONES`).

**Key locked decisions:**
- **Derived placement** — a dot sits at a stage only when that user's picked band is live now (no `current_stage` field on `user_presence`).
- **Avatar-circle dots** (`avatar_url`, colored-initials fallback); current user's dot highlighted, rendered last (never buried).
- **Welcome to the Jungle → Wasteland zone** (not separately drawn on the asset).
- **No new privacy control** — mirrors `/now`. `is_friend` follows `/now`: friends **visible on live stages**, absent from Camping/Metal Place/Elsewhere (not globally hidden).
- **Fully offline** — derives from cached picks + static schedule + clock; map image precached.
- **Render:** absolute-positioned avatar `<button>`s over `<img>` at fractional coords; **zones = fractional inset bounding boxes** in one config file; **tap toggles a name pill**.

**Grilling refinements (2026-05-29):**
- **Elsewhere/lost** = one box over the **empty left margin** (not the scattered background); never overlaps a stage box.
- **Deterministic spaced layout** (seeded grid/spiral) inside each zone — not raw jitter — so up-to-~20 dots don't fully occlude.
- **Clock = `useNow(30_000)`** (same as `/now`); presence/picks reflect within seconds via Realtime, derived stage moves at ~30 s granularity.
- **Asset:** optimize `infield_map.png` in place to **≤ ~800 KB** (same path/format); hard precache gate.
- **Zone tuning** via a deletable `/map?calibrate` dev harness; box correctness is a visual sign-off, not an automated test.

**Scope (new files):** `src/pages/MapPage.tsx` · `src/components/map/MinimapOverlay.tsx` · `src/components/map/minimapZones.ts` · `src/services/minimapPlacement.ts` · `src/services/userColor.ts`. **Touches:** `src/App.tsx` (route) · `src/pages/RightNowPage.tsx` (button) · `src/i18n/*.json` · `public/vira-lata-ds.html`.

**Non-goals:** GPS / geolocation, navigation, distance accuracy, manual check-in, privacy opt-out, drag/zoom, redrawing the asset.

**Acceptance criteria** → see design spec.

---

#### Subphases

Ordered for incremental shipping; each is a clean commit. Dependencies noted.

**35.A — Asset optimization** _(first; no app code)_
- **Goal:** make `public/infield_map.png` lighter/faster so it can precache without punishing first load.
- **Source today:** `1122 × 1402`, **3.1 MB**. Display size is ≤ ~440 px CSS wide (≤ ~880 px @2x), so the source is far larger than needed.
- **Do:** downscale to a sane max (~1000 px wide) + lossy palette quantize + lossless squeeze, **in place, same path/format (PNG)**. (Tooling note: no `pngquant`/`oxipng`/`magick` on this machine yet — install one, or use `sips` to downscale + a Node/`sharp` pass.)
- **Acceptance:** file **≤ ~800 KB** (aim lower); no perceptible quality loss at display size; appears in the generated precache manifest after `npm run build`.
- **Deps:** none. Independent, revertible (git-tracked).

**35.B — Zone config + placement core + calibration** _(pure logic + dev harness)_
- **Goal:** the single source of zone geometry and the pure placement function, tuned against the (optimized) artwork.
- **New files:** `src/components/map/minimapZones.ts` (`MINIMAP_ZONES` seeded from the calibrate prototype, `stageToZone`, `groupKindToZone`), `src/services/minimapPlacement.ts` (`buildPlacements(crewGroups, zones, selfUserId)` — deterministic spaced layout, `isSelf`, self ordered last), `src/services/userColor.ts` (`colorForUserId`).
- **Dev-only:** wire a deletable `?calibrate` overlay to tune boxes (visual sign-off), per `prototypes/minimap-calibrate.html`.
- **Tests:** `minimapPlacement.test.ts` + `userColor.test.ts` (group→zone, in-box, N distinct coords, friend rules, Jungle→Wasteland, unknown→Elsewhere, lost→left-margin, determinism, color stability).
- **Acceptance:** unit tests green; zone boxes visually signed off via `?calibrate`; no Supabase reads.
- **Deps:** 35.A (tune against final artwork).

**35.C — Map page + overlay + route** _(the visible feature)_
- **Goal:** the `/map` screen renders live dots over the map.
- **New files:** `src/pages/MapPage.tsx` (`useSocialSnapshot(useNow(30_000))` + `useAuth` for `selfUserId`, derive placements, offline note, back nav), `src/components/map/MinimapOverlay.tsx` (presentation-only: `<img>` + absolute avatar `<button>`s, tap-to-toggle name pill, self highlight).
- **Touches:** `src/App.tsx` (`<Route path="/map">` behind `PrivateRoute`).
- **Acceptance:** dots at fractional coords scale at 375 px → desktop; self gold-ring on top; tap toggles pill; works offline; "Elsewhere" never on a stage box; image-load failure degrades gracefully.
- **Deps:** 35.B.

**35.D — Entry button on `/now` + i18n** _(small, mostly independent)_
- **Goal:** reach `/map` from `/now`.
- **Touches:** `src/pages/RightNowPage.tsx` (**Variant A header glyph, glyph F "Pin + bolt"** beside the timestamp, links to `/map`), `src/i18n/{br,en,es,de}.json` (button label "vira-latas" not "crew", page title, offline-note keys).
- **Acceptance:** button visible in `/now` header at 375 px; navigates to `/map`; all 4 locales present; hover→accent.
- **Deps:** 35.C (target route must exist).

**35.E — Docs + design system + phase close** _(wrap-up)_
- **Goal:** sync institutional memory and close.
- **Do:** wiki (architecture/domain-model/routes as needed) + new `docs/ai-wiki/flows/festival-minimap.md`; `docs/ai-wiki/changelog.md` dated entry; `public/vira-lata-ds.html` minimap section (zones, dot, self highlight, glyph F, offline note); flip `FUTURE_IDEAS.md` Idea 6 status; **remove the `?calibrate` dev harness**; append to `phases-history.md`; single commit + push.
- **Acceptance:** build + tests green; harness gone; all three memory surfaces updated.
- **Deps:** 35.A–D.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
