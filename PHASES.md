# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 22 — Playlist Launch

**Status:** 🔧 Ready to implement

**Goal:** Add a "Generate setlist" button to `/picks` that deep-links the user to **Setlist Vira-Latas** (setlist viralatas) with their picked band names pre-filled. The external app shows a track preview; the user taps "Generate" and lands in Spotify with their personal playlist. The button ships behind a feature flag so the godlike can test it with managers before releasing it to all vira-latas.

**Design:** `_temp/playlist-button-design-v2.html` · Spec: `docs/superpowers/specs/2026-05-21-playlist-launch-design.md`

**External API:** `GET /launch` deep-link on Setlist Vira-Latas — `user_name` (trimmed to 20 chars) + repeated `bands` params + `lang`. No edge function required. URL to be confirmed before implementation (placeholder: `https://your-app.vercel.app`).

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
  - Left: Setlist Vira-Latas app icon (22×22, `border-radius: 5px`) + Oswald 13px 700 uppercase label + JetBrains Mono 10px muted sub-label with band count
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
- [ ] Tapping the strip opens Setlist Vira-Latas `/launch` URL in a new tab with correct `user_name`, all picked band names, and `lang`
- [ ] Strip is hidden when user has 0 picks
- [ ] Build passes, no new linter errors

---

## Phase 23 — MoshSplit Balance Section

**Status:** ✅ Part 1 complete — awaiting MoshSplit API docs for Part 2

**Goal:** Add a self-contained collapsible `MoshSplitSection` component to the Profile page that shows the user's net balance from **MoshSplit** (`split.viralatas.org`) — the festival finance app used by the vira-latas at Wacken. Shipped in two parts: Part 1 (mocked UI for approval), Part 2 (real API connection, blocked on MoshSplit API docs).

**Design:** `_temp/moshsplit-section-design.html` · Spec: `docs/superpowers/specs/2026-05-22-phase23-moshsplit-section-design.md`

**Architectural shape:** Single self-contained component `MoshSplitSection` — accepts only `userEmail: string`, fetches own data, manages own states. No `t()` prop. Placed after `<ConflictSection>`, before `<EditProfileForm>`. Part 1 uses hardcoded mock data with `setTimeout(200ms)` to simulate latency. Part 2 replaces mock with real `fetch` using `VITE_MOSHSPLIT_TOKEN` + user email.

**Auth (Part 2):** Balance read via app token (`VITE_MOSHSPLIT_TOKEN` in Vercel env) + user email. Redirect to MoshSplit via Supabase token exchange (TBD pending API docs, fallback: plain URL).

**Four render states:**
- `loading` — spinner in header, no content
- `not_found` — `return null`, component invisible
- `settled` (balance = 0) — teal "Quitado" chip + "Tudo acertado 🤘" + CTA button
- `active` (balance ≠ 0) — balance chip (red if owes, teal if owed) + amount row + CTA button

**Part 1 Deliverables:**

- `src/components/profile/MoshSplitSection.tsx` — full component, mock data, all 4 states; `ACTIVE_MOCK` constant for state switching during review
- `src/components/profile/MoshSplitSection.module.css` — existing CSS tokens only (`--bg-elevated`, `--border`, `--signal-ok`, `--accent`, `--font-display`, `--font-mono`, `--s-*`, `--r-*`); no new custom properties
- `src/pages/ProfilePage.tsx` — insert `<MoshSplitSection userEmail={user.email ?? ''} />` after `<ConflictSection>`, before `<EditProfileForm>`
- `public/Design System.html` — document component in profile section

**Part 2 Deliverables (blocked on MoshSplit API docs):**

- `src/components/profile/MoshSplitSection.tsx` — replace mock with real `fetch`; add error state ("Could not load MoshSplit data" + CTA still visible)
- `.env.local` — add `VITE_MOSHSPLIT_TOKEN=...` (not committed)
- Vercel project settings — add `VITE_MOSHSPLIT_TOKEN`
- Token exchange for redirect (once API docs confirm mechanism)

**Collapsible pattern:** uses `<Collapsible trigger={...}>` from `src/ui` — identical to `ConflictSection`. `defaultOpen={false}`. Wrapper has `margin: var(--s-3) var(--s-4)` and max-width 400px aligned to center.

**Balance chip:** `rgba(--accent, 0.20)` background + `rgba(--accent, 0.40)` border for negative; `rgba(--signal-ok, 0.20)` + border for positive; attenuated teal for settled. Font mono 11px tabular-nums.

**CTA button:** full-width, "Abrir MoshSplit →", red-tinted (`rgba(--accent, 0.08)` bg), opens `https://split.viralatas.org` in new tab. Present in all visible states.

**Acceptance criteria (Part 1):**
- [x] `not_found` mock → component not visible on profile page
- [x] `settled` mock → component visible, "All settled 🤘" visible, no balance row, CTA visible
- [x] `owes` mock → collapsible visible, chip red with negative amount, expanded shows amount row + CTA
- [x] `owed` mock → collapsible visible, chip teal with positive amount, expanded shows amount row + CTA
- [x] Component collapses/expands on header tap
- [x] CTA cycles mock states during review (real URL wired in Part 2)
- [x] `loading` mock → spinner in header, no content, not clickable
- [x] Build passes, no linter errors

**Acceptance criteria (Part 2):**
- [ ] Real balance loaded from MoshSplit API using user email + `VITE_MOSHSPLIT_TOKEN`
- [ ] Error state shown if API call fails (component visible, warning message, CTA still available)
- [ ] Redirect uses confirmed auth mechanism (token exchange or plain URL fallback)
- [ ] `VITE_MOSHSPLIT_TOKEN` documented in README env var section

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
