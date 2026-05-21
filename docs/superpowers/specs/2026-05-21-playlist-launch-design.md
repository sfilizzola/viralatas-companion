# Phase 22: Playlist Launch — Design Spec

**Date:** 2026-05-21  
**Status:** Approved  
**Author:** Claude Sonnet 4.6

---

## Overview

Add a "Create playlist" button to `/picks` that deep-links the user to **Play[my W:O:A]list** (setlist viralatas) with their picked bands pre-filled. The external app shows a track preview, the user taps "Generate", and lands in Spotify with their playlist.

The feature ships behind a feature flag — while testing, only godlike and manager users see it. When the flag is flipped to "released", everyone sees it. When the feature is mature and permanent, the flag and visibility logic are deleted.

---

## External API Contract

**Service:** Play[my W:O:A]list (`https://your-app.vercel.app` — **placeholder, replace before implementation**)  
**Surface used:** `GET /launch` — deep-link to preview

### URL format

```
https://your-app.vercel.app/launch?user_name={name}&bands={Band1}&bands={Band2}&lang={lang}
```

| Param | Value | Rules |
|---|---|---|
| `user_name` | User's `display_name`, trimmed to 20 chars | Required |
| `bands` | Repeated param, one per picked band name | At least one; unknown names silently dropped |
| `lang` | `pt-BR` if `preferred_language === 'br'`, else `en` | Optional |

**URL length:** worst case (all 169 Wacken bands) ≈ 3,500 chars — well within browser limits.

**Error behaviour (external app):** If `user_name` is missing, `bands` is empty, or all names are unknown → user is redirected to the external app's home. No error in our app.

---

## Component: `PlaylistLaunchButton`

**File:** `src/components/PlaylistLaunchButton.tsx`

This is the **only file** added for this feature (beyond the migration and admin toggle). The entire feature is self-contained here. Deleting this file + its one usage in `MyPicksPage` removes the feature completely.

### Props

```ts
interface PlaylistLaunchButtonProps {
  bands: Band[];        // user's picked bands (pass myBands from MyPicksPage)
  userName: string;     // user's display_name (fallback: email username)
}
```

### Internal responsibilities

1. **Feature flag check** — reads `playlist_testing` from `app_settings` (via Supabase, same pattern as duck feature). Cached in component state on mount.
2. **Role check** — reads current user role from `useAuth` session metadata (or fetches from DB same as existing panels).
3. **Visibility logic:**
   - `playlist_testing = true` → show only to `godlike` and `manager` roles
   - `playlist_testing = false` → show to everyone
   - `myBands.length === 0` → render nothing (no picks, no button)
4. **URL construction** — builds `/launch` URL using `URLSearchParams` with repeated `bands` params.
5. **`user_name` clamping** — trims `userName` to 20 chars before including in URL.
6. **Lang mapping** — maps `preferred_language` to `pt-BR` (for `br`) or `en` (for all others). Fetched from `users` table (same DB call as role check — single fetch on mount).
7. **Render** — anchor tag (`<a href={url} target="_blank" rel="noopener noreferrer">`) styled as a button. No loading state — redirect is instant.

### What it does NOT do

- No edge function call
- No playlist URL caching
- No loading spinner
- No error handling (external app handles invalid input gracefully)
- No i18n strings inside the component for the external app (lang param handles it)

---

## Feature Flag: `playlist_testing`

### DB change

New column on `app_settings` (existing singleton table, existing RLS):

```sql
alter table public.app_settings
  add column if not exists playlist_testing boolean default true not null;
```

Default `true` = testing mode (restricted to godlike + manager).

Inherits existing RLS:
- `app_settings_select` — anyone can read → component can check the flag
- `app_settings_update` — only godlike (`sfilizzola@gmail.com`) can write → only godlike can toggle

### Admin toggle

New toggle in `GodlikeAdminPanel`, following the same pattern as the duck feature toggle:

- Section: "Godlike Powers" (existing collapsible)
- Control: toggle button labeled "Playlist feature" with sub-label showing current state:
  - `Testing` (only managers/godlike see it)
  - `Live` (everyone sees it)
- Same loading/error pattern as duck toggle

### Visibility matrix

| `playlist_testing` | User role | Button visible? |
|---|---|---|
| `true` | godlike | ✅ |
| `true` | manager | ✅ |
| `true` | normal | ❌ |
| `false` | any | ✅ |
| any | any (0 picks) | ❌ |

---

## Integration in `MyPicksPage`

Single addition in `MyPicksPage.tsx`:

```tsx
// In the header or just above the band list:
<PlaylistLaunchButton
  bands={myBands}
  userName={displayName}
/>
```

`displayName` derived from `session?.user?.user_metadata?.display_name` or fetched profile — same as existing profile logic.

Position: below the conflicts summary line, above the band sections (visible at page top without scrolling).

---

## User Flow

```
User opens /picks (has ≥1 pick, flag visible to them)
  → sees "Create playlist" button below the header summary
  → taps button
  → browser opens setlist viralatas /launch URL in new tab
  → lands on track preview: "Stefan's Picks 2026 — 30 tracks"
  → taps "Generate playlist"
  → Spotify opens with their playlist
```

---

## Removal Plan (post-testing)

When feature is stable and permanent:

1. Delete `src/components/PlaylistLaunchButton.tsx`
2. Remove `<PlaylistLaunchButton ... />` from `MyPicksPage`
3. Remove the admin toggle block from `GodlikeAdminPanel`
4. Drop the `playlist_testing` column from `app_settings` (migration)
5. Update i18n files if any keys were added

All changes contained in ≤5 locations.

---

## Files Affected

| File | Change |
|---|---|
| `src/components/PlaylistLaunchButton.tsx` | **New** — full feature component |
| `src/pages/MyPicksPage.tsx` | Add one `<PlaylistLaunchButton>` usage |
| `src/components/profile/GodlikeAdminPanel.tsx` | Add playlist_testing toggle |
| `supabase/migrations/YYYYMMDD_playlist_testing.sql` | New column on app_settings |
| i18n files (br, en, es, de) | Button label + admin panel label strings |

---

## Out of Scope

- Edge function / backend proxy
- Playlist URL storage or history
- Loading/pending state in our app
- Error recovery for external API failures
- Offline support (network required; button still renders, external app handles gracefully)
- Spotify OAuth
