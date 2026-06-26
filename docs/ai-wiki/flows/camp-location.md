# Flow: Camp HQ Geolocation

## Purpose

Document how the godlike user sets the vira-latas' shared campground GPS coordinates, how those coordinates sync to IndexedDB, and how all vira-latas open them in an external maps app from the Mural info zone or the festival minimap dock — without any camp UI on `/now`.

---

## Trigger

**Admin:** Godlike opens `/profile` → Godlike Admin panel → **Camping Location** section, enters decimal GPS (`lat, lng`), and taps Save (or Clear to remove).

**Consumer:** Any vira-lata with a cached camp location sees:
- **C+** — `CampHqCard` / `CampNavStrip` on `/announcements` (Mural info zone, above the post form)
- **D1** — `CampMapDock` on `/map` (directly below `MinimapOverlay`)

Tapping the strip opens Google Maps. On touch devices, a long-press (500 ms) opens `CampLocationSheet` instead (copy coords + Open Maps).

---

## Happy Path (Online, Coordinates Set)

1. Godlike enters `54.037809, 9.368845` in `CampingLocationAdminSection` and taps Save.
2. `parseCampCoordinateInput()` validates range and format; `campLocationRepository.saveCampLocationRemote()` updates `public.app_settings.camping_latitude` / `camping_longitude` and writes the same pair to IndexedDB `camp_location` store.
3. `CAMP_LOCATION_CHANGED_EVENT` fires; any mounted `useCampLocation()` hook re-reads IDB.
4. On `/announcements`, `CampHqCard` renders `CampNavStrip` (variant `mural`, green gaffer tape, hint `campHqHint`).
5. On `/map`, `CampMapDock` renders the same strip (variant `map`, hint `campMapHint`) in `.campDockUnder` below the minimap image.
6. User short-taps the strip → `openCampInMaps()` opens `https://www.google.com/maps/search/?api=1&query={lat},{lng}` in a new tab.
7. On a touch device, user long-presses → `CampLocationSheet` slides up with formatted coords, Copy, and Open Maps actions.

---

## Offline Behavior (Disconnected)

- **Read:** `useCampLocation()` loads from IndexedDB first (`loadCampLocation()`), so strips render offline when coords were previously synced.
- **Background sync:** On mount, `campLocationRepository.syncCampLocation()` runs when online; on network error it falls back to the IDB cache (no blank strip if cache exists).
- **Admin save/clear:** Requires Supabase — fails with error message when offline (no offline queue for camp coords).
- **Open Maps:** Works offline if the device has a maps app; the URL is built client-side.

---

## Sync Behavior (Reconnect)

No Realtime subscription on `app_settings` (v1). Camp location propagates by:

1. **Page mount** — `useCampLocation` calls `syncCampLocation()` once, pulling latest `camping_latitude` / `camping_longitude` from Supabase into IDB.
2. **Admin write** — Save/Clear updates Supabase then IDB immediately; `CAMP_LOCATION_CHANGED_EVENT` updates in-session UI on the godlike device.
3. **Other clients** — See new coords after navigating to `/announcements` or `/map` (or any route that mounts `useCampLocation`), or on cold start after IDB was empty and sync succeeds.

Mid-session godlike edits on another device require a page navigation or reload on consumer devices until Realtime is added.

---

## Relevant Source Files

| File | Role |
|------|------|
| `supabase/migrations/20260626000000_app_settings_camp_location.sql` | Adds nullable `camping_latitude`, `camping_longitude` on `app_settings` |
| `src/components/profile/CampingLocationAdminSection.tsx` | Godlike GPS input, Save, Clear |
| `src/components/profile/GodlikeAdminPanel.tsx` | Mounts admin section |
| `src/repositories/campLocation.ts` | Supabase ↔ IDB sync, remote save/clear |
| `src/services/campLocation.ts` | Parse, format, `buildCampMapsUrl`, `openCampInMaps`, `isCampLocation` |
| `src/lib/db/campLocation.ts` | IDB `camp_location` store read/write/clear + event emit |
| `src/hooks/useCampLocation.ts` | IDB-first hook; background sync on mount |
| `src/hooks/useLongPress.ts` | 500 ms pointer timer; short tap vs long-press |
| `src/components/camp/CampHqCard.tsx` | Mural wrapper; null when no location |
| `src/components/camp/CampNavStrip.tsx` | Shared strip UI (tape, pin, hints); hosts sheet |
| `src/components/camp/CampMapDock.tsx` | Map variant wrapper below minimap |
| `src/components/camp/CampLocationSheet.tsx` | Bottom sheet: coords, copy, open maps |
| `src/components/camp/useCampLocationActions.ts` | Tap/long-press → maps or sheet (touch only for sheet) |
| `src/components/icons/CampPinIcon.tsx` | Tent-pin SVG; optional cross for sheet |
| `src/pages/AnnouncementsPage.tsx` | Renders `<CampHqCard />` in info zone (before post form) |
| `src/pages/MapPage.tsx` | Renders `<CampMapDock />` in `.campDockUnder` |
| `src/i18n/CampLocation_{br,en,es,de}.json` | Consumer strings |
| `src/i18n/GodlikeAdmin_{br,en,es,de}.json` | Admin section strings |
| `supabase/seed/festival-reset.ts` | Documents `app_settings` (incl. camp coords) as preserved |

---

## Data Flow Diagram

```
Godlike /profile
  └─ CampingLocationAdminSection
       └─ parseCampCoordinateInput(input)
       └─ campLocationRepository.saveCampLocationRemote(location)
            ├─ supabase.app_settings UPDATE camping_latitude, camping_longitude
            └─ saveCampLocation(location) → IDB camp_location
                 └─ CAMP_LOCATION_CHANGED_EVENT

Consumer pages
  └─ useCampLocation()
       ├─ loadCampLocation()           → IDB (immediate)
       └─ syncCampLocation()           → Supabase SELECT → IDB (background)

/announcements
  └─ CampHqCard → CampNavStrip (mural)
       └─ useCampLocationActions
            ├─ short tap  → openCampInMaps → Google Maps URL
            └─ long press (touch) → CampLocationSheet

/map
  └─ MinimapOverlay
  └─ CampMapDock → CampNavStrip (map)
       └─ (same actions as mural)
```

---

## Edge Cases & Gotchas

- **No camp UI on `/now`** — `RightNowPage` does not import camp components; presence "camping" toggle is unrelated to Camp HQ GPS. Enforced by `campLocation.test.ts` surface guard.
- **Null coords** — When both DB columns are null, `CampHqCard` and `CampMapDock` render nothing (no empty strip).
- **Blocked posters** — `CampHqCard` sits above the `isBlocked` gate on `/announcements`; blocked users still see the camp strip but cannot post.
- **Partial null** — `isCampLocation()` requires both lat and lng non-null; a half-set row is treated as no location and IDB cache is cleared on sync.
- **Decimal commas** — `parseCampCoordinateInput` normalizes European decimal commas before split.
- **Desktop vs touch** — `useCampLocationActions` detects `(hover: none) and (pointer: coarse)`; long-press sheet is touch-only; desktop always short-taps to Maps.
- **No Realtime v1** — `app_settings` is not in the Realtime publication list; consumers rely on page-mount sync.
- **`festival:reset`** — Does not touch `public.app_settings`; camp coordinates survive the pre-festival wipe (godlike may overwrite on next arrival).

---

## Open Questions

- Should `app_settings` camp columns get Realtime so mid-session godlike edits propagate without navigation?
- Should camp coords appear on `/profile` for non-godlike users (read-only display)?
- Should Apple Maps / geo: URI be offered alongside Google Maps on iOS?

---

**Last updated:** 2026-06-26 — Phase 45 Camp HQ Geolocation
