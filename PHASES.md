# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 22 — Playlist Launch

**Status:** 🔧 Ready to implement

**Goal:** Add a "Generate setlist" button to `/picks` that deep-links the user to **Play[my W:O:A]list** (setlist viralatas) with their picked band names pre-filled. The external app shows a track preview; the user taps "Generate" and lands in Spotify with their personal playlist. The button ships behind a feature flag so the godlike can test it with managers before releasing it to all vira-latas.

**Design:** `_temp/playlist-button-design-v2.html` · Spec: `docs/superpowers/specs/2026-05-21-playlist-launch-design.md`

**External API:** `GET /launch` deep-link on Play[my W:O:A]list — `user_name` (trimmed to 20 chars) + repeated `bands` params + `lang`. No edge function required. URL to be confirmed before implementation (placeholder: `https://your-app.vercel.app`).

**Architectural shape:** Single self-contained component `PlaylistLaunchButton` — all logic inside (flag check, role check, URL construction). One `<PlaylistLaunchButton bands={myBands} userName={displayName} />` in `MyPicksPage`. Feature flag `playlist_testing boolean default true` added as a column to the existing `app_settings` singleton table (same pattern as `duck_enabled`). Godlike toggles it in `GodlikeAdminPanel`. When flag graduates, only the flag infrastructure is deleted — the component stays permanently.

**Deliverables:**

- `supabase/migrations/YYYYMMDD_playlist_testing.sql` — adds `playlist_testing boolean default true not null` to `public.app_settings`; inherits existing RLS (anyone reads, only godlike updates)
- `src/lib/supabase.types.ts` — `app_settings` Row/Insert/Update types extended with `playlist_testing`
- `src/components/PlaylistLaunchButton.tsx` — self-contained component:
  - Fetches `playlist_testing` flag + user role + `preferred_language` from DB on mount (single query)
  - Visibility: hidden if 0 picks; hidden to `normal` role when `playlist_testing = true`; visible to all when `playlist_testing = false`
  - Builds `/launch` URL via `URLSearchParams` with repeated `bands` params; `user_name` trimmed to 20 chars; `lang` mapped (`br` → `pt-BR`, else `en`)
  - Renders as `<a href={url} target="_blank" rel="noopener noreferrer">` — no loading state, instant redirect
- `src/components/PlaylistLaunchButton.module.css` — component-scoped styles:
  - Full-width strip: `rgba(22,160,133,0.06)` background, `rgba(22,160,133,0.18)` border-bottom
  - Left: Play[my W:O:A]list app icon (22×22, `border-radius: 5px`) + Oswald 13px 700 uppercase label + JetBrains Mono 10px muted sub-label with band count
  - Right: `→` arrow in mono
  - No new CSS custom properties in `index.css` — uses existing `--signal-ok`, `--font-display`, `--font-mono`, `--s-*` tokens
- `src/pages/MyPicksPage.tsx` — add `<PlaylistLaunchButton bands={myBands} userName={displayName} />` below the conflicts summary banner, above the band sections; derive `displayName` from session/profile
- `src/components/profile/GodlikeAdminPanel.tsx` — new "Playlist feature" toggle section in "Godlike Powers" collapsible, mirroring duck feature toggle pattern (button + status label `Testing` / `Live`, loading/error states)
- `src/i18n/MyPicksPage_{br,en,es,de}.json` — button label key (`generateSetlist`) + sub-label key (`generateSetlistSub`)
- `src/i18n/ProfilePage_{br,en,es,de}.json` — admin toggle keys: `playlistToggle`, `playlistTesting`, `playlistLive`, `playlistToggleError`
- `public/Design System.html` — document `PlaylistLaunchButton` in a new component section

**Post-graduation (separate small task, not part of this phase):**
- Remove `playlist_testing` column migration
- Remove flag/role-check logic from `PlaylistLaunchButton`
- Remove admin toggle block from `GodlikeAdminPanel`
- Remove admin toggle i18n keys

**Acceptance criteria:**
- [ ] Godlike and manager see the strip on `/picks` immediately after migration (flag defaults to `true` = testing mode)
- [ ] Normal users do not see the strip while `playlist_testing = true`
- [ ] Godlike can flip flag to `false` in admin panel; all users see the strip on next page load
- [ ] Tapping the strip opens Play[my W:O:A]list `/launch` URL in a new tab with correct `user_name`, all picked band names, and `lang`
- [ ] Strip is hidden when user has 0 picks
- [ ] Build passes, no new linter errors

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
