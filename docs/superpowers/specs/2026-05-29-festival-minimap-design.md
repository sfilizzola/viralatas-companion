# Festival Minimap — live vira-lata positions design (locked)

**Date:** 2026-05-29
**Status:** ✅ Approved — design locked + grilled (7 refinements 2026-05-29), not yet implemented
**Phase:** 35 (proposed)
**Map asset:** `public/infield_map.png` (already exists — hand-drawn cartoon Wacken grounds)
**Product spec:** `FUTURE_IDEAS.md` § Idea 6

---

## Purpose

A new private route **`/map`**, reached via a small button on **`/now`** (not a bottom-nav tab), that overlays live vira-lata avatars on the existing cartoon festival map. Purely visual social awareness — "who is roughly where right now". **Not** GPS, not navigation, not to-scale.

It is a **presentation layer over data that already exists**: positions are derived from the same `useSocialSnapshot` pipeline that powers `/now`. **No schema change, no Edge Function, no new sync, no backend work.**

---

## Key decisions (locked in brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Stage source | **Derived only** — reuse `/now`'s `crewGroups`; a dot sits at a stage only when that user's picked band is live now. No `current_stage` field added to `user_presence`. |
| 2 | Placement in app | **Dedicated `/map` route**, accessed via the **header glyph button (Variant A — approved 2026-05-29)** on `/now`, beside the timestamp. **Glyph: "Pin + bolt" (variant F — locked):** a map pin whose dot is the lightning bolt from the map artwork, + "Mapa" label. No new bottom-nav tab. |
| 3 | Privacy | **No new control.** Map mirrors `/now` (data already visible to all ~20 vira-latas). Honor the existing `is_friend` rule **exactly as `/now`** — see Decision 10. |
| 4 | Dot style | **Avatar circles** (`avatar_url`) with colored-initials fallback. Reuse `Avatar.tsx`. |
| 5 | Map asset | **Already exists** (`public/infield_map.png`). Work is defining zone bounding boxes over it. |
| 6 | Welcome to the Jungle | **Not drawn on the map.** Jungle picks share the **Wasteland** zone box (physically close). |
| 7 | Offline | **Fully functional offline.** Stage dots derive from cached picks + static schedule + clock; camping/metal-place dots use last-known presence. Subtle "offline — positions may be stale" note. |
| 8 | Render technique | **Absolute-positioned avatar divs over `<img>`**, positioned at fractional (%) coordinates so they scale with the image. |
| 9 | Zone geometry | **Fractional inset bounding boxes** `{ x, y, w, h }` (0–1 ratios), inset inside the colored artwork. Deterministic, **overlap-aware** layout inside the box (see Decision 12). |
| 10 | `is_friend` semantics | **Friends follow `/now` exactly** (`groupCrewLivePlans`): **visible when on a live stage**, never shown in Camping / Metal Place / Elsewhere. No new filtering in `buildPlacements` — it consumes `crewGroups` as-is. "Friends are hidden" wording removed. |
| 11 | "Elsewhere" / lost zone | **Not a full-map region.** Lost dots render in the **empty left margin** of the image, defined as one ordinary `elsewhere` box. Guarantees lost dots never overlap a stage/camping box. |
| 12 | Crowding / overlap | **Deterministic spaced layout** (seeded grid/spiral keyed by `userId`) inside each zone box — not raw jitter — so dots don't fully occlude. **Self rendered last (top z-index)** so it's never buried. Stays a pure, testable function. Cluster-collapse ("+N" → sheet) is a future upgrade, out of scope. |
| 13 | Clock cadence | **Reuse `useNow(30_000)`** (same clock as `/now`). Presence/pick changes reflect within seconds via Realtime → IndexedDB → re-memo; derived stage moves follow the shared ~30 s clock. No faster timer for the map. |
| 14 | Asset weight | **Optimize `infield_map.png` in place** (pngquant + oxipng), **same path/format**, **hard gate ≤ ~800 KB** and present in the precache manifest. (Source is 3.1 MB; a flat cartoon compresses to ~400–700 KB with no perceptible loss.) |
| 15 | Interaction | Each dot is a `<button aria-label={displayName}>`. **Tap toggles a name pill**; single-selection state in `MapPage`; tap-away / tapping another dot dismisses. Self labeled by default / on top. No profile or cluster-sheet navigation. |

## Prototypes (HTML design artifacts — not production code)

Two self-contained prototypes in `docs/superpowers/prototypes/` ground the entry button and the calibration harness before any `src/` work. They use the real DS tokens (Oswald / IBM Plex Sans / JetBrains Mono, accent `#c0392b`, self-ring `#d4af37`) and the real `infield_map.png`.

| Prototype | File | Shows |
|-----------|------|-------|
| Entry button | `prototypes/minimap-button.html` | 3 placements explored; **Variant A — header glyph is APPROVED (2026-05-29)**. (B inline banner / C floating pill kept in the file as rejected alternatives for reference only.) Uses a **vira-latas** label (not "crew"), no 🗺️ emoji. |
| Header glyph | `prototypes/minimap-header-glyph-variants.html` | 6 glyph treatments explored; **glyph F "Pin + bolt" is APPROVED (2026-05-29)** — map pin with a lightning-bolt dot, tying the button to `infield_map.png`. (A/B/C/D/E kept as rejected alternatives.) SVG: stroke pin + filled bolt, 16 px, `currentColor` so it inherits hover→accent. |
| Calibrate harness | `prototypes/minimap-calibrate.html` | Interactive `/map?calibrate` mock: drag/resize zone boxes over the real map, edit fractional `{x,y,w,h}`, preview deterministic dot crowding + self-on-top, 375 px toggle, and a live copy-paste-ready `MINIMAP_ZONES`. Doubles as the spec for what the real (deletable) harness must do. Ships **seed values** for the 10 zone boxes (incl. left-margin `elsewhere`). |

Static previews: `prototypes/button-preview.png`, `prototypes/calibrate-preview.png`.

**Copy note:** the entry-button label resolves the spec's "Crew map" wording against the `CLAUDE.md` rule — user-facing copy says **vira-latas**, so the i18n key should read e.g. "Mapa dos vira-latas" (br) rather than "Crew map".

---

## Map zones

The asset (`infield_map.png`) contains these labelled zones:

**Stages:** Wasteland · W.E.T · Headbangers · Wackinger · Louder · Faster · Harder
**Non-stage:** Camping · Metal Place
**Implicit:** "elsewhere / lost" is **not** the scattered background. It is one ordinary box over the **empty left margin** of the image (Decision 11), so lost dots never overlap a stage/camping box.

**Stage → zone mapping** (canonical `bands.stage` string → map zone):

| `bands.stage` | Map zone |
|---------------|----------|
| `Faster` | Faster |
| `Harder` | Harder |
| `Louder` | Louder |
| `W.E.T.` | W.E.T |
| `Headbangers` | Headbangers |
| `Wasteland` | Wasteland |
| `Wackinger` | Wackinger |
| `Welcome to the Jungle` | **Wasteland** (shared; not separately drawn) |

**Group kind → zone:**

| `CrewLiveGroup.kind` | Map zone |
|----------------------|----------|
| `band` | the band's stage zone (per table above) |
| `camping` | Camping |
| `metal_place` | Metal Place (only when `metalPlaceWindowActive`) |
| `lost` | Elsewhere (empty **left-margin** box) |

Any stage string not in the table → **Elsewhere**.

---

## Architecture & components

Respects `UI → IndexedDB ↕ Supabase`. The UI reads only IndexedDB-backed hooks — **no direct Supabase reads** in any new file.

```
/map  (MapPage, PrivateRoute)
  ├── useSocialSnapshot(now)                    [existing — Phase 31]
  │     → snapshot.crewGroups, crewUsers
  ├── useNow(30_000)                            [existing — shared /now clock]
  ├── useAuth() → selfUserId                     [existing — to flag isSelf]
  ├── buildPlacements(crewGroups, MINIMAP_ZONES, selfUserId) → Placement[]   [new, pure]
  └── <MinimapOverlay>                           [new, presentation-only]
        ├── <img src="/infield_map.png">
        └── per Placement: absolutely-positioned <Avatar> at (xPct, yPct)
```

### New files

| File | Type | Responsibility |
|------|------|----------------|
| `src/pages/MapPage.tsx` | page | Route container: `useSocialSnapshot(useNow(30_000))` + `useAuth()` for `selfUserId`, derive placements, render image + overlay, offline note, back nav. |
| `src/components/map/MinimapOverlay.tsx` | component | Presentation-only. Props: `placements: Placement[]`. Renders the `<img>` + absolutely-positioned avatar `<button>`s with tap-to-toggle name pill (Decision 15). No data logic. |
| `src/components/map/minimapZones.ts` | config | `MINIMAP_ZONES: Record<ZoneId, FractionalBox>` + `stageToZone(stage)` + `groupKindToZone(kind)`. The single source of zone geometry — no magic numbers elsewhere. `elsewhere` box sits over the empty left margin (Decision 11). |
| `src/services/minimapPlacement.ts` | pure service | `buildPlacements(crewGroups, zones, selfUserId): Placement[]`. **Deterministic spaced layout** (seeded grid/spiral keyed by `userId`, Decision 12) inside each zone box; flags `isSelf`; self ordered last. |
| `src/services/userColor.ts` | pure util | `colorForUserId(id): string` — stable color for avatar fallback. (Place in `services/` or reuse if an equivalent appears.) |

### Touched files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `<Route path="/map">` behind `PrivateRoute`. |
| `src/pages/RightNowPage.tsx` | Add the **header glyph button** (Variant A) linking to `/map` — **"Pin + bolt" glyph (F)** + "Mapa" label, beside the timestamp. See `prototypes/minimap-button.html` + `prototypes/minimap-header-glyph-variants.html` (glyph F). |
| `src/i18n/*.json` | Button label + offline note + page title keys (br/en/es/de). |
| `public/vira-lata-ds.html` | Document the minimap (zones, dot, self highlight, offline note) as a DS section. |
| `public/infield_map.png` | **Optimize in place** (pngquant + oxipng) to ≤ ~800 KB, same path/format (Decision 14). |

**Dev-only (not shipped):** a deletable calibration harness — `/map?calibrate` draws every `MINIMAP_ZONES` box as a labeled semi-transparent rectangle over the image so boxes can be eyeballed/nudged at 375 px and desktop (Decision 3 grilling). Removed before phase close; zone-box correctness is a **visual sign-off**, not an automated test.

### Types

```ts
type ZoneId =
  | 'faster' | 'harder' | 'louder' | 'wet' | 'headbangers'
  | 'wasteland' | 'wackinger' | 'camping' | 'metal_place' | 'elsewhere';

type FractionalBox = { x: number; y: number; w: number; h: number }; // 0..1 ratios

type Placement = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;       // fallback bg / ring
  xPct: number;        // 0..100, deterministic spaced layout inside zone box
  yPct: number;        // 0..100
  zone: ZoneId;
  isSelf: boolean;
};
```

---

## Data flow

1. `MapPage` calls `useSocialSnapshot(useNow(30_000))` (already cached from IndexedDB; same hook + clock as `/now`).
2. For each `CrewLiveGroup`: resolve `ZoneId` (`band` → `stageToZone(band.stage)`, else `groupKindToZone(kind)`).
3. For each member: build a `Placement` with a **deterministic spaced layout** (seeded grid/spiral keyed by `userId`) inside the zone's inset box, so dots are stable across re-renders, don't jump, and don't fully occlude each other (Decision 12). `selfUserId` flags `isSelf`; self is ordered last.
4. `MinimapOverlay` renders avatars at `xPct`/`yPct` (percent of the image), so positions scale at any width (375 px → desktop).
5. `is_friend` handling is inherited from `crewGroups` unchanged: friends appear in `band` groups (live stages) and are absent from camping/metal place/lost — **no new filtering** (Decision 10). Friends are **not** globally hidden.

---

## Visual / UX

| Element | Rule |
|---------|------|
| Map image | `width: 100%`, scales to container; `position: relative` wrapper. |
| Avatar dot | Reuse `Avatar.tsx`. ~24 px, white border, `transform: translate(-50%,-50%)` centered on coordinate. |
| Self dot | Highlighted (gold ring + accent halo), slightly larger, raised z-index; rendered **last** so it's never buried; name pill shown by default. |
| Fallback | No `avatar_url` → colored circle (`colorForUserId`) with 2-letter initials. |
| Dot element | Each dot is a `<button aria-label={displayName}>` for keyboard/SR access. |
| Tap a dot | **Toggles** a name pill (dark pill anchored to the dot). Single-selection in `MapPage`; tap-away or tapping another dot dismisses. No hover dependency (mobile-first). No profile/cluster navigation. |
| Crowding | Members within a zone use a **deterministic spaced layout** (grid/spiral) so circles don't fully occlude; if a zone overflows, dots shrink/clamp. No collision physics or animation. |
| Empty zone | Render nothing (no placeholder). |
| Offline | When `!navigator.onLine`, subtle "offline — positions may be stale" line. |
| Metal Place | Dots only when `snapshot.metalPlaceWindowActive`. |

The spaced layout uses a fractional inset box; the angled trapezoid zones mean a rectangle isn't pixel-tight, but a generous inset keeps dots on the artwork. A zone can be upgraded to a 4-point quad later if pixel-tight placement is wanted (out of scope for Phase 35).

---

## Offline & PWA

- `public/infield_map.png` already matches the Workbox `globPatterns` (`**/*.png`) in `vite.config.ts`, so it precaches with the app shell on next build. The source is **3.1 MB** — too heavy to precache as-is. **The asset is optimized in place** (pngquant + oxipng) to **≤ ~800 KB**, keeping the same path/format so the glob and precache contract are untouched (Decision 14). **Hard acceptance gate:** file ≤ ~800 KB **and** present in the generated precache manifest.
- All position data derives from cached picks + static schedule + clock + last-known presence in IndexedDB, so the map renders with no network.

---

## Error handling / edge cases

| Case | Behavior |
|------|----------|
| Unknown stage string | Placed in **Elsewhere**. |
| User with no live pick, not camping/metal place | **Elsewhere** (lost). |
| Missing `avatar_url` | Colored initials fallback. |
| Missing/blank `display_name` | `Vira-lata {id.slice(0,4)}` (same fallback as `CrewLivePlan.label`). |
| Image fails to load | Overlay still renders dots on background color; no crash. |
| Zero crew online | Empty map with the image only. |

---

## Testing

Pure-function unit tests only, matching the project's no-network pattern:

- `minimapPlacement.test.ts` — group→zone mapping; layout coordinates stay inside the zone box; `isSelf` flagging from `selfUserId` (and self ordered last); friends present in `band` groups but absent from camping/lost (matches `crewGroups`, no extra filter); Jungle → Wasteland; unknown stage → Elsewhere; lost → left-margin `elsewhere` box; **N members → N distinct in-box coordinates** (spaced, no full overlap); deterministic output for same inputs.
- `userColor.test.ts` — stable & deterministic per id; valid color output.

No Supabase or Realtime in tests. `MinimapOverlay` is presentation-only; covered indirectly via placement tests (no dedicated mount test required, consistent with the project's lower-layer testing trade-off).

---

## Non-goals

- Real GPS / geolocation / device positioning.
- Navigation, routing, or distance accuracy.
- Manual stage check-in / self-reported location (no `current_stage` field).
- Privacy opt-out / "hide me on the map".
- Drag-to-move dots; pinch-zoom/pan of the map.
- Redrawing the asset to add Welcome to the Jungle (Jungle shares Wasteland for now).

---

## Deliverables checklist

- [ ] `/map` route behind `PrivateRoute` in `App.tsx`.
- [ ] Header glyph button (Variant A) on `/now` with the **"Pin + bolt" glyph (F)**; label "vira-latas", not "crew".
- [ ] Seed `MINIMAP_ZONES` from `prototypes/minimap-calibrate.html` defaults, then fine-tune via `?calibrate`.
- [ ] `MapPage` + `MinimapOverlay` + `minimapZones` config + `minimapPlacement` + `userColor`.
- [ ] Zone bounding boxes tuned against `infield_map.png` via the deletable `?calibrate` harness (single config file); harness removed before close.
- [ ] `elsewhere` box placed over the empty left margin.
- [ ] Deterministic spaced layout (no full dot overlap); self rendered last.
- [ ] Self dot highlight; avatar-or-initials dot; dot is `<button aria-label>`; tap toggles name pill.
- [ ] `infield_map.png` optimized in place ≤ ~800 KB; offline note; map image confirmed in precache manifest.
- [ ] i18n keys (br/en/es/de).
- [ ] Pure unit tests (placement + color).
- [ ] Wiki + changelog + `vira-lata-ds.html` updated; `FUTURE_IDEAS.md` Idea 6 status flipped.

## Acceptance criteria

- [ ] Presence/pick changes reflect within a few seconds via Realtime → IndexedDB; derived stage placement follows the shared `/now` clock (`useNow(30_000)`, ~30 s granularity).
- [ ] Zone boxes defined in one config file — no magic numbers scattered across components.
- [ ] "Elsewhere"/lost users render in the empty **left-margin** box, never on top of a stage/camping box (visual sign-off via calibration harness).
- [ ] `is_friend` users follow `/now`: visible only when on a live stage; never in Camping/Metal Place/Elsewhere. (Not globally hidden.)
- [ ] `infield_map.png` ≤ ~800 KB and present in the precache manifest.
- [ ] Works on mobile at 375 px — image scales, dot positions scale proportionally.
- [ ] Works offline (positions from IndexedDB; image precached).
- [ ] No direct Supabase reads in any new UI file (offline-first inversion check passes).
