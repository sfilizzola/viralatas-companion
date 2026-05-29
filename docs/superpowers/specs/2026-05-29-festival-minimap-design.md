# Festival Minimap — live vira-lata positions design (locked)

**Date:** 2026-05-29
**Status:** ✅ Approved — design locked, not yet implemented
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
| 2 | Placement in app | **Dedicated `/map` route**, accessed via a small button on `/now`. No new bottom-nav tab. |
| 3 | Privacy | **No new control.** Map mirrors `/now` (data already visible to all ~20 vira-latas). Honor the existing `is_friend` hiding rule. |
| 4 | Dot style | **Avatar circles** (`avatar_url`) with colored-initials fallback. Reuse `Avatar.tsx`. |
| 5 | Map asset | **Already exists** (`public/infield_map.png`). Work is defining zone bounding boxes over it. |
| 6 | Welcome to the Jungle | **Not drawn on the map.** Jungle picks share the **Wasteland** zone box (physically close). |
| 7 | Offline | **Fully functional offline.** Stage dots derive from cached picks + static schedule + clock; camping/metal-place dots use last-known presence. Subtle "offline — positions may be stale" note. |
| 8 | Render technique | **Absolute-positioned avatar divs over `<img>`**, positioned at fractional (%) coordinates so they scale with the image. |
| 9 | Zone geometry | **Fractional inset bounding boxes** `{ x, y, w, h }` (0–1 ratios), inset inside the colored artwork. Deterministic jitter inside the box. |

---

## Map zones

The asset (`infield_map.png`) contains these labelled zones:

**Stages:** Wasteland · W.E.T · Headbangers · Wackinger · Louder · Faster · Harder
**Non-stage:** Camping · Metal Place
**Implicit:** the dark/starry background between zones = "elsewhere / lost"

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
| `lost` | Elsewhere (dark background region) |

Any stage string not in the table → **Elsewhere**.

---

## Architecture & components

Respects `UI → IndexedDB ↕ Supabase`. The UI reads only IndexedDB-backed hooks — **no direct Supabase reads** in any new file.

```
/map  (MapPage, PrivateRoute)
  ├── useSocialSnapshot(now)                    [existing — Phase 31]
  │     → snapshot.crewGroups, crewUsers
  ├── minimapPlacement(crewGroups, MINIMAP_ZONES) → Placement[]   [new, pure]
  └── <MinimapOverlay>                           [new, presentation-only]
        ├── <img src="/infield_map.png">
        └── per Placement: absolutely-positioned <Avatar> at (xPct, yPct)
```

### New files

| File | Type | Responsibility |
|------|------|----------------|
| `src/pages/MapPage.tsx` | page | Route container: `useSocialSnapshot(now())`, derive placements, render image + overlay, offline note, back nav. |
| `src/components/map/MinimapOverlay.tsx` | component | Presentation-only. Props: `placements: Placement[]`. Renders the `<img>` + absolutely-positioned avatars. No data logic. |
| `src/components/map/minimapZones.ts` | config | `MINIMAP_ZONES: Record<ZoneId, FractionalBox>` + `stageToZone(stage)` + `groupKindToZone(kind)`. The single source of zone geometry — no magic numbers elsewhere. |
| `src/services/minimapPlacement.ts` | pure service | `buildPlacements(crewGroups, zones): Placement[]`. Deterministic seeded jitter inside each zone box. |
| `src/services/userColor.ts` | pure util | `colorForUserId(id): string` — stable color for avatar fallback. (Place in `services/` or reuse if an equivalent appears.) |

### Touched files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `<Route path="/map">` behind `PrivateRoute`. |
| `src/pages/RightNowPage.tsx` | Add a small "Crew map 🗺️" button linking to `/map`. |
| `src/i18n/*.json` | Button label + offline note + page title keys (br/en/es/de). |
| `public/vira-lata-ds.html` | Document the minimap (zones, dot, self highlight, offline note) as a DS section. |

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
  xPct: number;        // 0..100, jittered inside zone box
  yPct: number;        // 0..100
  zone: ZoneId;
  isSelf: boolean;
};
```

---

## Data flow

1. `MapPage` calls `useSocialSnapshot(now())` (already cached from IndexedDB; same hook as `/now`).
2. For each `CrewLiveGroup`: resolve `ZoneId` (`band` → `stageToZone(band.stage)`, else `groupKindToZone(kind)`).
3. For each member: build a `Placement` with deterministic jitter (seeded by `userId`) inside the zone's inset box, so dots are stable across re-renders and don't jump.
4. `MinimapOverlay` renders avatars at `xPct`/`yPct` (percent of the image), so positions scale at any width (375 px → desktop).
5. `is_friend` users are excluded exactly as `/now`/`groupCrewLivePlans` already does — no new filtering logic.

---

## Visual / UX

| Element | Rule |
|---------|------|
| Map image | `width: 100%`, scales to container; `position: relative` wrapper. |
| Avatar dot | Reuse `Avatar.tsx`. ~24 px, white border, `transform: translate(-50%,-50%)` centered on coordinate. |
| Self dot | Highlighted (gold ring + accent halo), slightly larger, raised z-index. |
| Fallback | No `avatar_url` → colored circle (`colorForUserId`) with 2-letter initials. |
| Tap a dot | Reveal display name (tooltip/label). |
| Empty zone | Render nothing (no placeholder). |
| Offline | When `!navigator.onLine`, subtle "offline — positions may be stale" line. |
| Metal Place | Dots only when `snapshot.metalPlaceWindowActive`. |

Jitter uses a fractional inset box; the angled trapezoid zones mean a rectangle isn't pixel-tight, but a generous inset keeps dots on the artwork. A zone can be upgraded to a 4-point quad later if pixel-tight placement is wanted (out of scope for Phase 35).

---

## Offline & PWA

- `public/infield_map.png` already matches the Workbox `globPatterns` (`**/*.png`) in `vite.config.ts`, so it precaches with the app shell on next build. **Acceptance test must verify** the file appears in the generated precache manifest (it is 3.1 MB — confirm bundle/precache budget is acceptable; if not, the asset is optimized/compressed as part of the phase).
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

- `minimapPlacement.test.ts` — group→zone mapping; jitter coordinates stay inside the zone box; `isSelf` flagging; `is_friend` exclusion; Jungle → Wasteland; unknown stage → Elsewhere; deterministic output for same seed.
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
- [ ] "Crew map 🗺️" button on `/now`.
- [ ] `MapPage` + `MinimapOverlay` + `minimapZones` config + `minimapPlacement` + `userColor`.
- [ ] Zone bounding boxes tuned against `infield_map.png` (single config file).
- [ ] Self dot highlight; avatar-or-initials dot; tap-for-name.
- [ ] Offline note; map image confirmed in precache manifest.
- [ ] i18n keys (br/en/es/de).
- [ ] Pure unit tests (placement + color).
- [ ] Wiki + changelog + `vira-lata-ds.html` updated; `FUTURE_IDEAS.md` Idea 6 status flipped.

## Acceptance criteria

- [ ] Dots driven by `user_presence`/picks realtime; update within ~3 s of a location change (same cadence as `/now`).
- [ ] Zone boxes defined in one config file — no magic numbers scattered across components.
- [ ] "Elsewhere" users render in the non-zone region, never on top of a stage/camping box.
- [ ] Works on mobile at 375 px — image scales, dot positions scale proportionally.
- [ ] Works offline (positions from IndexedDB; image precached).
- [ ] No direct Supabase reads in any new UI file (offline-first inversion check passes).
- [ ] `is_friend` users hidden, matching `/now`.
