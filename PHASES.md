# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

### Phase 35 — Festival minimap (live vira-lata positions)

**Status:** Planned — design locked, not started.
**Design spec:** `docs/superpowers/specs/2026-05-29-festival-minimap-design.md`
**Product spec:** `FUTURE_IDEAS.md` § Idea 6
**Map asset:** `public/infield_map.png` (already exists).

**Goal:** New private route `/map`, reached via a small button on `/now` (no bottom-nav tab), overlaying live vira-lata avatars on the existing cartoon Wacken map. Pure presentation over existing data — **no schema, no Edge Function, no new sync.** Positions are *derived* from the same `useSocialSnapshot` pipeline as `/now`.

**Key locked decisions:**
- **Derived placement** — a dot sits at a stage only when that user's picked band is live now (no `current_stage` field on `user_presence`).
- **Avatar-circle dots** (`avatar_url`, colored-initials fallback); current user's dot highlighted.
- **Welcome to the Jungle → Wasteland zone** (not separately drawn on the asset).
- **No new privacy control** — mirrors `/now`; honors existing `is_friend` hiding.
- **Fully offline** — derives from cached picks + static schedule + clock; map image precached.
- **Render:** absolute-positioned avatar divs over `<img>` at fractional coords; **zones = fractional inset bounding boxes** in one config file.

**Scope (new files):** `src/pages/MapPage.tsx` · `src/components/map/MinimapOverlay.tsx` · `src/components/map/minimapZones.ts` · `src/services/minimapPlacement.ts` · `src/services/userColor.ts`. **Touches:** `src/App.tsx` (route) · `src/pages/RightNowPage.tsx` (button) · `src/i18n/*.json` · `public/vira-lata-ds.html`.

**Non-goals:** GPS / geolocation, navigation, distance accuracy, manual check-in, privacy opt-out, drag/zoom, redrawing the asset.

**Acceptance criteria** → see design spec.

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
