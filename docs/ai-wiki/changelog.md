# Wiki Changelog

All modifications to the AI-readable architectural wiki, discoveries, and corrections are recorded here.

---

## 2026-05-15 (Phase 19 — Closing Ceremony Slot)

### Added
- `supabase/migrations/20260514000000_idea7_band_category.sql` — `category text not null default 'band'` column + check constraint `('band','ceremony')` on `public.bands`
- `category: BandCategory` field on `Band` type in `src/types/index.ts`; `BandCategory = 'band' | 'ceremony'` union exported from same file
- `category` field added to `BadgeBand` via `Pick<Band, ...>` in `src/services/badges/types.ts`
- `buildBadgeContext` in `src/services/badges/engine.ts` now filters `category === 'ceremony'` from `pickedBands` and `seenBands`
- `computeBandOverlaps` in `src/hooks/useBandConflicts.ts` skips ceremony entries — no conflict chip ever shown
- `.cardCeremony`, `.ceremonyLabel` CSS classes in `src/components/BandCard.module.css` (gold border `--ceremony-gold #d4af37`, warm tint, pill chip replacing stage chip)
- Ceremony rendering logic in `src/components/BandCard.tsx`: ceremony cards use `--ceremony-gold` for stripe/thumb/pick-active; stage chip replaced by `✦ Closing Ceremony` label
- `popularBands` filter in `src/pages/PopularPage.tsx` excludes `category === 'ceremony'`
- `scheduleClosingCeremony` i18n key in all 4 locale files (`br`, `en`, `de`, `es`) under `SchedulePage_*.json`
- `Farewell & Announcements` ceremony seed entry in `supabase/seed/bands.ts` at Faster stage, slot FAS17 (22:30–23:00 Day 4)
- Phase 19 ceremony badge regression suite in `src/__tests__/badges.test.ts`

### Changed
- `BandSeed.genre` type widened to `string | null`; `BandSeed.category` optional field added
- `band()` test helper in `badges.test.ts` now includes `category: 'band'` default; new `ceremonyBand()` helper added
- `public/Design System.html` — ceremony card demos updated to "Farewell & Announcements" / 22:30–23:00 / `FA` monogram; notes corrected to reflect stage chip is hidden (not absent)

### Architectural Notes
- `category` column uses a DB-level check constraint — invalid values are rejected at the Postgres layer, not just TypeScript.
- Ceremony entries sync into IndexedDB exactly like bands (no special-casing in the sync layer); the filtering is purely presentational and in the badge engine.
- `bandsPicked` (raw pick count) still includes ceremony picks — it feeds `band_attendance_min` checks which are pick-based, not music-based. Only the `pickedBands` / `seenBands` arrays (used by all music conditions) are filtered.

---

## 2026-05-15 (LatestAnnouncementBanner DS alignment)

### Changed
- `src/pages/RightNowPage.module.css` — aligned `.latestSignalKicker`, `.latestSignalText`, `.latestAvatar`, `.latestSignalTime`, `.latestSignalReadMore` to DS §08.02 spec:
  - Kicker: `color: var(--signal-ok)` (was `--text-muted`), 9px (was 10px), letter-spacing 0.12em (was 0.1em), added `::before` red pulse dot with `latestPulse` keyframe
  - Body text: `font-family: var(--font-sans)`, 14px normal weight, `line-height: 1.5` (was display bold 1.05rem)
  - Avatar: 24px (was 22px), consistent with `av s24` in DS
  - Time: removed `/` separator `::before`
  - "See more →": `color: var(--accent-hover)` (was `--accent`), 10px (was 9px)

---

## 2026-05-15 (Friend user flag)

### Added
- `supabase/migrations/20260515000000_add_is_friend_flag.sql` — `is_friend boolean DEFAULT NULL` column on `public.users`
- `is_friend?: boolean | null` field on `User` and `CrewUser` types in `src/types/index.ts`
- `isFriend: boolean` on `CrewLivePlan` (derived from `user.is_friend === true`) in `src/services/livePreview.ts`
- `isFriend` derived value exposed from `useNowData` hook
- `handleToggleFriend` handler in `GodlikeAdminPanel.tsx`
- Friend toggle button in godlike user management row (next to promote/demote)
- i18n keys `marcarAmigo` / `removerAmigo` in all 4 `ProfilePage_*.json` locale files

### Changed
- `src/services/livePreview.ts` — `groupCrewLivePlans`: friends skip camping/lost routing when not on a current band; fallback synthetic users initialised with `is_friend: null`
- `src/repositories/users.ts` — crew sync select now includes `is_friend`
- `src/repositories/announcements.ts` — `fetchAllUsers` select now includes `is_friend`
- `src/pages/RightNowPage.tsx` — `PresenceToggle` hidden for friends (`!isFriend` guard)
- `src/components/BadgesDisplay.tsx` — `currentLocation` set to `null` for friends; `crewLocationCounts` excludes friend presence rows
- `src/components/profile/types.ts` — `UserWithLoading` gains `is_friend?: boolean | null`

### Architectural Notes
- `is_friend` is a permanent user identity flag (like `is_test_user`), not a presence state — stored on `users`, not `user_presence`
- Friends appear in the band group when on a current pick; otherwise invisible in crew grid
- Friends cannot earn `metal-place-2026`, `bbq-crew`, or `lost-together` badges and are excluded from the crew counts that gate those badges for others
- Toggle is godlike-only; setting back to non-friend uses `null` (not `false`) to stay consistent with the nullable default

---

## 2026-05-15 (Admin panel headers — DS §05 spec implementation)

### Changed
- `src/components/profile/GodlikeAdminPanel.tsx` — trigger content updated to DS §05 pf-collapse godlike spec: amber crown icon (`path M5 18 L7 4 L12 12 L17 4 L19 18`) + "Godlike admin" label in `font-display`, uppercase, `#d97706`; collapsible receives `className={styles.godlikeCollapsible}` for amber left accent border
- `src/components/profile/ManagerAdminPanel.tsx` — trigger content updated to DS §05 pf-collapse manager spec: blue shield icon (`path M12 2 L20 6 V12 …`) + "Manager tools" label in `font-display`, uppercase, `#3b82f6`; collapsible receives `className={styles.managerCollapsible}` for blue left accent border
- `src/pages/ProfilePage.module.css` — added `.adminTriggerInner`, `.adminTriggerIcon`, `.adminTriggerLabel` base classes; `.managerTriggerIcon`, `.managerTriggerLabel` (blue tints); `.godlikeTriggerIcon`, `.godlikeTriggerLabel` (amber tints); `.managerCollapsible`, `.godlikeCollapsible` (2px role-colored left border on the Collapsible wrapper)

### Architectural Notes
- All functionality and behaviour unchanged — only the trigger JSX content is replaced; `Collapsible` state management, chevron, collapse animation, and role guard (`userRole !== 'manager'` / `userRole !== 'godlike'`) are untouched
- Icons use `stroke="currentColor"` inheriting the `.adminTriggerIcon` color via CSS, matching the DS SVG stroke pattern

---

## 2026-05-15 (Sprint 3 — Design System Systematic Gaps)

### Added
- `src/components/ErrorState.tsx` + `ErrorState.module.css` — reusable error state component; props: `variant: 'network' | 'sync' | 'auth'`, `onRetry?: () => void`, `message?: string`; each variant shows an appropriate SVG icon and Portuguese copy; retry button only rendered when `onRetry` is provided
- `public/Design System.html` §10 Empty & Error States — new section documenting 5 canonical empty states (`/now`, `/schedule`, `/my-picks`, `/popular`, `/announcements`) and 3 error state variants (`network`, `sync`, `auth`); visual pattern: centered layout, single muted line of copy, optional 24px stroke icon
- `public/Design System.html` Changelog section — revision history for v1.0–v2.0 at the bottom of the document

### Changed
- `src/components/BadgesDisplay.tsx` — badge unlock animation fires once per session per slug; uses `sessionStorage` key `badgeAnimated` to track already-played slugs; applies `.unlocking` CSS class for 380 ms then clears it
- `src/components/BadgesDisplay.module.css` — added `@keyframes badgeUnlock` (scale 0.85 → 1.12 → 1.0) and `.unlocking` class (380 ms, `cubic-bezier(0.34, 1.56, 0.64, 1)`); respects `prefers-reduced-motion`
- `public/Design System.html` masthead — added Wacken identity relationship statement after lede; eyebrow version bumped from v1.0 to v2.0; footer updated to v2.0
- `CLAUDE.md` — "After every meaningful change" rule expanded to include `public/Design System.html` as a required update target alongside the wiki pages
- Deleted `docs/DESIGN_IMPROVEMENT_PLAN.md` — all 4 sprints complete; no longer needed

### Architectural Notes
- `ErrorState` is intentionally thin — no IndexedDB reads, no Supabase calls; it is a pure display component that wraps a known failure state
- Badge unlock animation uses `sessionStorage` (not `localStorage`) so it fires again on next browser open, giving a fresh moment of discovery each festival day
- DS §10 empty state copy is in Brazilian Portuguese as per product voice rules; component implementors should use these exact strings via i18n keys if/when these states are wired up per-page

---

## 2026-05-14 (Phase 18: Badge Preview Tool in Godlike Menu)

### Added
- `src/components/profile/TestBadgeSection.tsx` — self-contained godlike-only section; renders a scrollable grid of all badges from the registry; local `selectedBadge` state drives a detail modal; zero network calls, zero IndexedDB reads or writes
- `src/components/profile/GodlikeAdminPanel.module.css` — new CSS module with `.testBadgeGrid`, `.testBadgeCell`, `.testBadgeCaption` (grid styles) and `.testBadgeModalContent`, `.testBadgeModalPatch`, `.testBadgeModalImg`, `.testBadgeModalYearChip`, `.testBadgeModalName`, `.testBadgeModalDesc` (modal styles mirroring `BadgesDisplay.module.css` pattern)

### Changed
- `src/components/profile/GodlikeAdminPanel.tsx` — imports and mounts `<TestBadgeSection t={t} />` after `<TimeTravelSection />`, before the registered users list

### Architectural Notes
- `TestBadgeSection` uses `useI18n('Badges')` internally to resolve badge label/description keys — the `t` prop from the godlike panel is accepted for the component signature but not used for badge-specific text
- Data flow is entirely static: `BADGES` array (build-time) → grid → `selectedBadge` state → modal; no context evaluation, no persistence
- `BadgesDisplay.tsx` is untouched; `BADGES` registry is untouched; `user_metadata.achieved_badge_slugs` is never read or written

---

## 2026-05-14 (Patches Grid Background Preference)

### Added
- `src/lib/patchesBackground.ts` — shared module with `PatchesBackground` type, `PATCHES_BG_VALUES`, storage key, `PATCHES_BG_CHANGED_EVENT`, `loadPatchesBackground()`, `savePatchesBackground()`
- `src/components/profile/PatchesBackgroundPicker.tsx` + `.module.css` — 5-swatch fabric selector (`none`, `grid`, `steel`, `indigo`, `leather`), each swatch is a miniature of the real texture it represents; swatches sized 42×42px
- Picker mounted inside the **Edit Profile** collapsible (right under the Language control) — it's a per-device personalization, grouped with other cosmetic preferences
- i18n keys `patchesBackground` ("Pick your battle vest color" + translations), `bgNone`, `bgGrid`, `bgSteel`, `bgIndigo`, `bgLeather` in all 4 locale files (`br`, `en`, `es`, `de`)
- `data-bg` attribute on `.patchesGrid` in `BadgesDisplay` driven by the preference
- CSS variants `.patchesGrid[data-bg='none' | 'grid' | 'steel' | 'indigo' | 'leather']` in `BadgesDisplay.module.css`
- Leather texture uses three offset radial-gradient dot grids at differing sizes (8px / 11px / 13px) to simulate pebbled grain — non-repeating organic look on a `#2b1813` cordovan base

### Changed
- `.patchesGrid` no longer has a hard-coded background; the texture is fully delegated to the `data-bg` attribute selectors
- `BadgesDisplay` now reads `loadPatchesBackground()` on mount and listens to `PATCHES_BG_CHANGED_EVENT` for live updates
- **`country` label rephrased** to "Where do you live?" (and translations) — users were confusing this with country of origin; the field stores their current residence (`user_metadata.country`)

### Architectural Notes
- **Storage is localStorage, not Supabase or IndexedDB.** The preference is purely cosmetic, per-device by design, and must work offline at Wacken with zero round-trip. It does not belong in `user_metadata` or the `users` table.
- The picker dispatches a `CustomEvent` with the new value in `detail`; this matches the existing window-event pattern used for IDB changes (e.g. `PICKS_CHANGED_EVENT`), keeping component coupling minimal.
- Default is `steel` (dark indigo denim) — visually consistent with the rest of the dark theme.

---

## 2026-05-14 (Phase 17: My Picks — Saw / Didn't See Sections)

### Added
- `hidePick?: boolean` prop on `BandCard` — suppresses the star button when `true`; controlled by `variant !== 'ranked' && !hidePick`
- `hidePick?: boolean` prop on `BandDetailModal` — hides the pick/unpick action button in the `.actions` footer when `true`
- `upcomingBands` / `endedBands` split in `MyPicksPage` (filter on `end_time < currentNow`)
- `missedBandIds` (per current user) derived from `allMissed` to further split `endedBands` into `sawBands` and `didntSeeBands`
- Two collapsible sections at the bottom of `/my-picks`: "Saw" (green border, `--signal-ok`) and "Didn't See" (amber border, `--signal-warn`)
- `.dayHeaderSaw` and `.dayHeaderDidntSee` CSS modifier classes in `SchedulePage.module.css`
- `sectionSaw` and `sectionDidntSee` i18n keys (with `{count}` interpolation) in all 4 locale files (`br`, `en`, `de`, `es`)

### Changed
- `grouped` in `MyPicksPage` now derives from `upcomingBands` instead of `myBands`; ended bands no longer appear in day sections
- `BandDetailModal` in `MyPicksPage` receives `hidePick={isBandEnded}` so the pick/unpick button disappears for ended bands

### Architectural Notes
- All state is offline-first: `endedBands` / `sawBands` / `didntSeeBands` are derived entirely from IndexedDB (`allMissed` via `missedRepository`, bands from `loadBands()`). No new network calls.
- Saw/missed toggle in the detail modal still moves a card between the two ended sections in real time via the `MISSED_CHANGED_EVENT` window event and `refreshMissed()`.

---

## 2026-05-14 (Phase 16: Schedule Sort Order Filter)

### Added
- `sortOrder: 'time-asc' | 'time-desc' | 'alpha'` field to `BandFilterValue` and `EMPTY_FILTERS`
- Sort step at end of `filterBands()` — operates on post-filter result set; `time-asc`/`time-desc` use secondary `name` sort for stable ordering
- `VALID_SORT_ORDERS` guard in `scheduleFilterStorage.ts`; fallback to `'time-asc'` on missing/invalid value
- 3 new `IconName` values and SVG paths: `sort-time-asc`, `sort-time-desc`, `sort-alpha`
- Sort button + upward-anchored popover in `BandFilters.tsx`; outside-click closes via `mousedown` listener on document
- `.dayTabsRow` flex wrapper in `BandFilters.module.css` so day tabs and sort button share a row
- 4 aria-label i18n keys in all 4 locale files (`sortLabel`, `sortTimeAsc`, `sortTimeDesc`, `sortAlpha`)

### Changed
- `BandFilters.tsx` — `clearAll()` preserves `sortOrder` (it is a display preference, not a filter)
- `SchedulePage.tsx` — removed hardcoded `.sort()` from `loadBands()` callback; ordering is now fully delegated to `filterBands()`

### Architectural Notes
- Sort is 100% client-side and fully offline: operates on the in-memory band list, preference persisted to `localStorage`. No network dependency.
- `sortOrder` is excluded from the "clear filters" reset path intentionally per spec.

---

## 2026-05-14 (Tweak: lost-together threshold)

### Changed
- **`src/services/badges/registry.ts`** — `lost-together` condition bumped from `count: 5` to `count: 10` (`crew_at_location_min`, location `'lost'`). All other fields (slug, imagePath, year, persist) unchanged.
- **`src/i18n/Badges_br.json`, `Badges_en.json`, `Badges_es.json`, `Badges_de.json`** — `badgeLostTogetherDescription` updated from "15+" to "10+" in all four languages, fixing a pre-existing inconsistency where the descriptions claimed 15+ while the registry required 5.
- **`docs/ai-wiki/badges.md`** — Updated the three `lost-together` mentions (Location Presence inventory bullet, Festival 2026 inventory bullet, Persistent Badges example) from `5` / `5+` to `10` / `10+`. Bumped Last updated.

### Architectural Notes
- Non-breaking tightening. Because `lost-together` is `persist: true`, its slug is stored permanently in `user_metadata.crew_earned_badge_slugs` once earned — existing users who have already triggered the badge keep it regardless of the new threshold. Only future earnings require 10+ crew at the `lost` location simultaneously.

---

## 2026-05-13 (Badges: 6 image-driven festival 2026 additions)

### Added
- **6 new badges** wired up to images that already existed in `public/badges/` but were unreferenced by `BADGES[]`. Inventory grew 29 → 35.
  - `wacken-firefighters` — `band_seen_named: 'Wacken Firefighters'`, year 2026. Tribute to the volunteer parade band that opens Day 1 12:00 (WAK1) and closes Day 4 12:00 (WAK22) on the Wackinger stage. Label kept identical in BR/EN/ES/DE.
  - `gutalax` — `band_seen_named: 'Gutalax'`, year 2026. Goregrind, Wasteland Day 3 21:30 (WAS20). Inside-joke "Osmar" reference preserved across all 4 languages.
  - `heavysaurus` — display label "Mighty Roar" (translated per locale: "Rugido Poderoso" BR/ES, "Mächtiges Brüllen" DE). `band_seen_named: 'Heavysaurus'`, year 2026. Wasteland Day 4 21:30 (WAS28).
  - `wackinger-regular` — display label "Wackinger Viking" (kept identical in all 4 languages). `bands_seen_stage_min: { stage: 'Wackinger', count: 3 }`, year 2026. Description references Amon Amarth thematically.
  - `wasteland-warrior` — kept identical in all 4 languages. `bands_seen_stage_min: { stage: 'Wasteland', count: 1 }`, year 2026. Low threshold ("you went there at all"). Description preserves "Mad Max" as a globally recognized character name.
  - `bullhead-heat` — "Heat" translated per locale, "Bullhead" preserved (it's the proper name of the flaming bullhead landmark between Faster ↔ Harder). `bands_seen_stages_min: { stages: ['Faster', 'Harder'], count: 6 }`, year 2026. "More than 5" interpreted strictly as > 5 → count: 6.
- **6 unit-test groups** in `src/__tests__/badges.test.ts` under `registry — 2026 image-driven badges`. Each group looks up the badge in `BADGES[]` by slug (so the test will fail if the registry entry is removed) and exercises the earn / not-earn paths against a hand-built `BadgeContext`. Total badge tests grew from 54 → 65 (+11).

### Changed
- **`src/services/badges/registry.ts`** — Appended 6 new `BadgeConfig` entries after the location-presence section, grouped by intent: 3 band-named (firefighters, gutalax, heavysaurus), 2 stage-loyalty (wackinger-regular, wasteland-warrior), 1 multi-stage (bullhead-heat).
- **`src/i18n/Badges_br.json`, `Badges_en.json`, `Badges_es.json`, `Badges_de.json`** — 6 label keys × 4 languages = 24 new label strings + 24 new description strings. Naming follows the existing `badge{PascalCase(slug)}` / `badge{PascalCase(slug)}Description` convention; label values for slugs `heavysaurus` and `wackinger-regular` intentionally diverge from the slug PascalCase (display says "Mighty Roar" / "Wackinger Viking" while the keys remain `badgeHeavysaurus` / `badgeWackingerRegular` for backward compatibility with the convention).
- **`docs/ai-wiki/badges.md`** — Inventory total 29 → 35. "Festival 2026" subsection 8 → 14 entries. Bumped Last updated.
- **`src/__tests__/badges.test.ts`** — Imported `BADGES` from the barrel re-export and added the 6 test groups.

### Architectural Notes
- Pure additive change. No migrations, no schema changes, no DB writes, no asset additions — all 6 PNGs already shipped. Verified by listing `public/badges/` against `imagePath` values in `BADGES[]`.
- All 6 badges use existing condition types (`band_seen_named`, `bands_seen_stage_min`, `bands_seen_stages_min`); no engine changes required. Idea 6's plural-form `bands_seen_stages_min` (added earlier the same day) is exercised in production for the first time by `bullhead-heat`.
- Inside jokes / proper names preserved per-locale where culturally meaningful: "Osmar" (Gutalax), "Amon Amarth" (Wackinger Viking), "Mad Max" (Wasteland Warrior), "Bullhead" (Bullhead Heat). The user's intent that `Bullhead` is a **proper noun** (name of the flaming sculpture) — not a translatable common noun — is honored: only "Heat" is localized.

---

## 2026-05-13 (Idea 6: multi-stage / multi-genre badge conditions)

### Added
- **4 new plural-form `BadgeCondition` variants** in `src/services/badges/types.ts`:
  - `bands_picked_stages_min` — `{ stages: string[]; count: number }`
  - `bands_picked_genres_min` — `{ genres: string[]; count: number }`
  - `bands_seen_stages_min` — `{ stages: string[]; count: number }`
  - `bands_seen_genres_min` — `{ genres: string[]; count: number }`
  All four use set-membership (OR-combined within the array). A pick/seen-band counts toward the threshold if its `stage` (or `genre`) is included in the configured array; total matches must reach `count`. Single-element arrays behave identically to the existing singular conditions; empty arrays are never earned for `count > 0`; bands with `genre = null` are skipped in the `*_genres_min` variants.
- **4 new `evaluateBadge` case branches** in `src/services/badges/engine.ts` — each is a one-line `Set` membership filter for O(1) lookup. No changes to `BadgeContext`, `buildBadgeContext`, or any repository: the data the new branches need (`ctx.pickedBands`, `ctx.seenBands`) is already in scope.
- **18 new test cases** across 4 test groups in `src/__tests__/badges.test.ts` (`evaluateBadge — bands_{picked,seen}_{stages,genres}_min (Idea 6)`). Total badge tests grew from 36 → 54, all passing.
- **CONDITION EXAMPLES** block in `src/services/badges/registry.ts` extended with prose-style entries for all 4 new types (Infield Rat / Extreme Devotee / etc. examples) matching the existing comment style.

### Changed
- **`docs/ai-wiki/badges.md`** — Bumped condition-type count 22 → 26. Added full documentation sections for the 4 new types under "BAND PICKS" and "BANDS SEEN" (with semantics, single-element equivalence, empty-array behavior, null-genre handling). Added 4 new rows to the cheat-sheet table. Bumped Last updated.

### Architectural Notes
- This is an additive change — every existing badge in `BADGES[]` (e.g. `death-metal`, `power-metal`, `party-metal`, all stage-min badges) keeps working unchanged. No registry migration, no DB migration, no asset changes.
- TS exhaustiveness on the `BadgeCondition` discriminated union is preserved: `tsc --noEmit` passes after the edit. The `switch` in `evaluateBadge` covers every union variant.
- Semantic decision recorded in `FUTURE_IDEAS.md`: **OR-within-the-array, not AND-across-stages**. "Saw 5 bands across Faster ∪ Harder" means any combination summing to 5; we do **not** also require ≥1 from each stage. A future `*_across_all_stages_min` variant would be a separate condition if ever needed.
- The plural-form pattern (Option A from the design table) is preferred over widening existing fields (`stage: string | string[]`) because it preserves discriminated-union narrowing in the engine and keeps the call site readable (singular = 1, plural = many). The pattern extends naturally to future multi-day or multi-country set-membership badges.
- **Idea 6** is now marked `implemented` in `FUTURE_IDEAS.md` and can be removed from that file in a follow-up cleanup pass.

---

## 2026-05-13 (Badge: roots — Sepultura farewell witness)

### Added
- **`roots` badge** — "Roots, Bloody Roots". Awarded via `band_seen_named: 'Sepultura'`, year 2026. Sepultura plays HAR6 on Day 3 (Friday, July 31, 19:00–20:30) and is on their farewell tour, so this badge commemorates witnessing the goodbye of a legendary Brazilian metal act. Image already present at `public/badges/badge_roots.png`. Internal "Dani" reference in the description is an inside joke for the vira-latas.

### Changed
- **`src/services/badges/registry.ts`** — Appended the `roots` BadgeConfig after `alestorm` (both are `band_seen_named` festival-2026 badges, grouped together).
- **`src/i18n/Badges_br.json`, `Badges_en.json`, `Badges_es.json`, `Badges_de.json`** — Added `badgeRoots` (label, kept as "Roots, Bloody Roots" in all 4 languages per request — it's a song title) and `badgeRootsDescription` (translated description "You saw the farewell of an amazing band, right Dani?" into BR/EN/ES/DE).
- **`docs/ai-wiki/badges.md`** — Bumped inventory count 28 → 29; expanded "Festival 2026" section 7 → 8 entries with the `roots` line referencing the Sepultura HAR6 slot.

### Architectural Notes
- The `roots` condition uses `band_seen_named` (exact case-sensitive match on `Band.name`), the same pattern as `alestorm`. The badge is automatically earned once Sepultura's `end_time` passes and the user has not opted out via the "didn't see" toggle.
- Distinct from any future `groove-metal` genre badge (Sepultura's genre is `Groove Metal` in `supabase/seed/bands.ts`): this badge is band-specific, tied to the farewell-tour narrative rather than the genre.

---

## 2026-05-13 (Docs: badge paths + Party Metal context)

### Changed
- **badges.md** — Refreshed the `party-metal` inventory line to reflect that the genre now belongs to exactly 2 bands (Alestorm + Airbourne), so the badge is a "see both" objective for Day 4. Added a new "Genres present in lineup with NO corresponding badge" section explicitly noting that `Pirate Metal` has no badge (only `Mr. Hurley und die Pulveraffen` carries it). Fixed stale `src/services/badges.ts` path to `src/services/badges/registry.ts`. Bumped Last updated.
- **CLAUDE.md** — Fixed badge section to point at `src/services/badges/registry.ts` (was `src/services/badges.ts`/`src/lib/badges.ts` — both old paths). Expanded i18n note from "br + en" to "br, en, es, de" matching the actual file layout.

### Architectural Notes
- The `party-metal` badge being calibrated to exactly the existing Party-Metal band count is intentional going forward — adding a 3rd Party Metal band to the lineup would make the badge easier to earn without code changes; check this when curating future lineups.

### Changed
- **lineup.md** — Two slot swaps and two genre updates:
  - **Day 3:** Emperor (Black Metal) ↔ Sepultura (Groove Metal). Sepultura now headlines HAR6 (Harder 19:00–20:30); Emperor moves to LOU19 (Louder 22:45–00:00*).
  - **Day 4:** Triptykon (Black / Doom Metal) ↔ Alestorm. Alestorm now plays FAS16 (Faster 19:15–20:45); Triptykon moves to LOU26 (Louder 20:45–22:00).
  - **Alestorm:** genre changed from `Pirate Metal` to `Party Metal`.
  - **Airbourne:** genre changed from `Hard Rock` to `Party Metal`.
- **supabase/seed/bands.ts** — Mirrored all four changes from lineup.md. 173-row total unchanged. Verified no UNIQUE(stage, start_time, name) collisions.

### Architectural Notes
- Band image URLs follow the band when they swap slots, not the slot.
- Badge impact (verified against `src/services/badges/registry.ts`):
  - `party-metal` badge (`bands_seen_genre_min: 'Party Metal', count: 2`) is now perfectly calibrated: exactly 2 bands carry this genre — `Alestorm` (FAS16 Day 4, 19:15–20:45) and `Airbourne` (HAR11 Day 4, 21:00–22:30). The badge effectively requires seeing both. Slots don't overlap, so it's reachable in one Day-4 evening.
  - There is **no** `pirate-metal` badge. The only Pirate Metal band remaining (`Mr. Hurley und die Pulveraffen`, WAK17 Day 3) is not referenced by any badge. The `alestorm` badge uses `band_seen_named` against the band name `Alestorm`, not the genre — unaffected by the genre change.

---

## 2026-05-13 (Seed: bands.ts destructive guarantees hardened)

### Changed
- **supabase/seed/bands.ts** — Rewrote the `seed()` runner to make the destructive replace-all behavior provably correct:
  - Prints existing row count, target Supabase URL, and the full cascade impact (`user_picks`, `user_missed_bands`, `live_band_test_config.band_id`) before doing anything.
  - 5-second abort window (Ctrl-C) before the first DELETE; skip with `--force` for CI/scripts.
  - DELETE filter changed from `.not('id', 'is', null)` to `.gte('start_time', '1900-01-01T00:00:00Z')` — semantically equivalent (matches every row, since `start_time` is `NOT NULL`) but explicit about intent and never confuses the postgrest planner.
  - Post-DELETE verification: aborts if the table is not empty.
  - Post-INSERT verification: aborts if row count doesn't equal `bands.length` (173).
  - File header docs the full destructive contract: which tables cascade, which set null, which records get lost, when not to run it.

### Architectural Notes
- All FKs that reference `bands.id` are accounted for: `user_picks` (CASCADE), `user_missed_bands` (CASCADE), `live_band_test_config.band_id` (SET NULL). No other tables reference `bands.id`, so DELETE cannot be blocked by FK violations.
- The `bands` UNIQUE constraint is `(stage, start_time, name)` — verified that all 173 seed rows have distinct tuples on those three columns, so re-seeding never collides with itself.

---

## 2026-05-13 (Seed: bands.ts rebuilt from lineup.md)

### Changed
- **supabase/seed/bands.ts** — Full rewrite to mirror `docs/ai-wiki/lineup.md` exactly. 173 bands seeded (192 listed in lineup.md minus 19 slots whose band name is literally `TBD`). Slot start/end times pulled directly from `docs/ai-wiki/stages.md` Slot IDs. Bands with `Band Status: TBD` keep their name but use a `PLACEHOLDER` image URL (8 rows). Bands with `Genre: TBD` use a `Generic Metal` fallback genre (42 rows = 38 unique bands, plus recurring acts like `Sir Henry Hot Memorial` ×4 and `Wacken Firefighters` ×2). Each band row is annotated with its Slot ID for cross-reference.

### Architectural Notes
- The fallback genre constant `TBD_GENRE = 'Generic Metal'` lives at the top of `bands.ts` — if the policy for unresolved genres changes, edit that single constant.
- Dropped Slot IDs (band name = TBD, 19 total): Day 1 — `HBA7`, `WAS1`, `WAS2`, `WAS3`, `WAK2`; Day 2 — `WET13`, `WET14`, `WET15`, `WET16`, `HBA13`, `HBA14`, `HBA15`, `WAS8`, `WAS9`, `WAK8`, `WAK9`; Day 4 — `HBA29`, `WAK23`, `WAS23`.
- Name corrections from previous bands.ts to match lineup.md exactly: `Alien Rockin' Explosion` → `Alien Rockin Explosion`, `Broken by the Scream` → `Broken By The Scream`, `Tuxedoo` → `tuXedoo`, `Of Mice & Men` → `Of Mice and Men`, `Sventevith` → `Misþyrming & Nergal`, `Dieter Maschine Birr` → `Dieter "Maschine" Birr`, `Cowgirls From Hell DJ Team` → `Cowgirls From Hell`.
- `WAS26 President` flipped to `Band Status: TBD` in lineup.md → now uses PLACEHOLDER image while keeping `Metal` genre.

---

## 2026-05-13 (Lineup: Day 4 Saturday reorganization — corrected algorithm)

### Changed
- **lineup.md** — Rewrote Day 4 (Saturday, 1 August 2026) band assignments using the corrected importance-rank algorithm from the official Wacken 2026 Saturday poster. Group A (Faster, Harder, Louder = 18 slots) is exhausted completely with bands #1–#18 before any Group B assignment begins. Group B (W.E.T., Headbangers, Wackinger, Wasteland, Jungle = 30 slots) receives bands #19–#45. 45 bands mapped to 48 slots; 3 slots remain TBD (HBA29, WAK22, WAS23). Slot IDs corrected to match stages.md (previous Day 4 used wrong IDs such as HAR16–HAR21, FAS21–FAS34, etc.). Summary updated to 75 CONFIRMED · 94 TBD · 169 total.

### Architectural Notes
- Day 4 Group A headliners: Sabaton → FAS18, Powerwolf → HAR12, Arch Enemy → LOU27. Group A completely absorbs the top 18 importance-ranked bands, meaning all three Louder stage closers (Arch Enemy, Alestorm, Nevermore) are in Group A, not Group B.
- Group B last-slot headliners: Dritte Wahl → WET35, Einherjer → HBA35, Finsterforst → WAK28, Fit For An Autopsy → WAS29, Focus. → JUN8.
- Wacken Firefighters and Sir Henry Hot Memorial appear on both Day 1/2/3 and Day 4 — these are recurring daily acts; they are intentionally kept in all days they appear.

---

## 2026-05-13 (Lineup: Day 3 Friday reorganization — corrected algorithm)

### Changed
- **lineup.md** — Rewrote Day 3 (Friday, 31 July 2026) band assignments using the corrected importance-rank algorithm from the official Wacken 2026 Friday poster. Group A (Faster, Harder, Louder — 17 slots) filled completely first, then Group B (W.E.T., Headbangers, Wackinger, Wasteland, Welcome to the Jungle — 30 slots). All 47 bands placed across 47 Day 3 slots with correct `stages.md` slot IDs (FAS8–FAS12, HAR4–HAR7, LOU13–LOU20, WET23–WET29, HBA22–HBA28, WAK15–WAK21, WAS15–WAS22, JUN5).

### Architectural Notes
- Group A headliner chain: Judas Priest→FAS12, In Flames→HAR7, Running Wild→LOU20; Saxon→FAS11, Emperor→HAR6, Sepultura→LOU19.
- Group B headliner chain: Chaosbay→WET29, Crematory→HBA28, Cruachan→WAK21, Cursed Abyss→WAS22, Deafheaven→JUN5 (only slot).

---

## 2026-05-13 (Wiki: Stages/Lineup Split)

### Added
- **stages.md** (new) — Authoritative reference for the 8 Wacken 2026 stages: stage table (name, abbreviation, category, UI color, hex), stage pairing rule (Harder↔Faster, W.E.T.↔Headbangers physical adjacency), reference keys (stage abbreviations, day codes D1–D4, overnight codes D1n–D4n, slot confirmation status), slot ID scheme (range per stage), all stage schedule grids (start/end times per slot per day for all 8 stages), how stages link to bands (Band type mapping, bands.ts field table), maintenance guides for confirming slot times and adding new slots.

### Changed
- **lineup.md** — Removed stage schedules, reference keys, stage pairing rule, and slot ID scheme (all moved to stages.md). Now focused exclusively on band assignments. Added cross-references to stages.md via Slot IDs throughout. Maintenance guide updated to link out to stages.md for slot and schedule operations.
- **glossary.md** — Added 7 new terms: `Band Assignment`, `Stage`, `Stage Category`, `Stage Pairing`, `Stage Schedule`, `Slot ID`. Updated existing `Band` entry to clarify stage is a string attribute (not a foreign key). Updated `Stage Color` entry with CSS variable detail and reference to stages.md.
- **index.md** — Added "Festival Content" section to Quick Navigation with links to both stages.md and lineup.md. Updated Domain Overview to clarify stage is not a DB entity. Added Stage Colors and Band Seed rows to Key Files table. Updated last edited date.

### Architectural Notes
- Stage is **not a DB entity**: `Band.stage` is a plain string. All stage metadata (colors, schedules, pairing) lives in source constants and wiki docs, not in the database.
- The Slot ID scheme (e.g. `FAS1`, `HAR7`) is the link between `stages.md` (times) and `lineup.md` (bands). When updating either file, keep Slot IDs consistent across both.
- `stageColors.ts` returns CSS variable tokens (`var(--stage-faster)`), not raw hex values; hex lives in `index.css`.

---

## 2026-05-12 (Planning: remaining test stages moved to FUTURE_IDEAS)

### Changed
- `FUTURE_IDEAS.md` — added Ideas 3, 4, 5: unit tests for IDB layer (`lib/db.ts`), hook logic (pure memoized computations), and component/page integration; migrated from `UNIT_TEST_PLAN.md` Stages 4–6 plus the Vitest config threshold block and `fake-indexeddb` requirement.
- `UNIT_TEST_PLAN.md` deleted — completed stages (1–3) are recorded in this changelog; remaining stages (4–6) are now tracked in `FUTURE_IDEAS.md` as Ideas 3–5.

### Architectural Notes
- No code or schema changes in this entry; purely planning/housekeeping.

---

## 2026-05-12 (UNIT_TEST_PLAN Stage 3)

### Added
- `src/__tests__/picksRepository.test.ts` — 26 tests for `toggle()` (online/offline/error), `flushOfflineQueue()` (empty queue, dedup, upsert/delete routing), and `syncCrewFromRemote()`
- `src/__tests__/presenceRepository.test.ts` — 11 tests for `setCampingStatus()` (online/offline), `isTimeWithinMetalPlaceWindow()` (time-range boundary), and `validateAndAutoCheckout()`
- `src/__tests__/announcementsRepository.test.ts` — 7 tests for online post, offline queue, and `flushPendingAnnouncements()`
- `src/__tests__/bandsRepository.test.ts` — 3 tests for `checkAndApplyCacheVersion()` (match/mismatch/no-data)
- `src/__tests__/missedRepository.test.ts` — 4 tests for mark/unmark online and offline

### Architectural Notes
- UNIT_TEST_PLAN Stage 3 complete: 51 new tests, 355 total, 0 failures.
- Mock pattern: `vi.hoisted()` required when vi.mock factory references named mock instances (Vitest hoisting constraint).
- Supabase fluent chains (`.delete().eq().eq()`, `.insert().select().single()`) required explicit nested vi.fn() chains.
- `navigator.onLine` overridden via `Object.defineProperty` with `configurable: true` for per-test reset.

---

## 2026-05-12 (UNIT_TEST_PLAN Stage 2)

### Added
- `src/__tests__/bandTime.test.ts` — 14 tests for `bandDay()` and `formatTime()` from `services/bandTime.ts`; covers CEST rollback boundary (04:00 CEST / 02:00 UTC), midnight crossover, and padding edge cases
- `src/__tests__/bandFilter.test.ts` — 14 tests for `filterBands()` from `services/bandFilter.ts`; covers day/stage/genre/query/upcoming filters, boundary conditions, and combined interactions
- `src/__tests__/scheduleFilterStorage.test.ts` — 12 tests for `loadStoredFilters`/`saveStoredFilters`; covers missing key, corrupted JSON, round-trip, and `query` strip-on-save behavior
- `src/__tests__/deduplicatePickQueue.test.ts` — 8 tests for `deduplicatePickQueue()` from `repositories/picks.ts`; covers keepLast semantics, cross-band/user independence, and empty input
- `src/__tests__/attendees.test.ts` — 8 tests for `computeAttendees()` from `services/attendees.ts`; covers grouping, hydration, missing-crew fallback label, and alphabetical sort
- `src/__tests__/stageColors.test.ts` — 30 tests for `services/stageColors.ts`; covers all 8 stage CSS variable tokens and unknown-stage fallback
- `src/__tests__/i18n.test.ts` — 13 tests for `lib/i18n.ts`; covers br/en/es/de lookup, missing-key fallback, placeholder interpolation, and out-of-provider error

### Architectural Notes
- UNIT_TEST_PLAN Stage 2 complete: 99 new tests, 304 total, 0 failures.
- Key discovery: `stageColors.ts` returns CSS variable strings (`var(--stage-faster)`), not raw hex values — hex lives in `index.css`.
- Key discovery: `t()` function lives inside the `useI18n` hook and requires React context; i18n tests use `renderHook` with a bare `I18nContext.Provider` wrapper.
- Key discovery: `scheduleFilterStorage` never persists `query` to localStorage — stripped on save, reset to `''` on load.

---

## 2026-05-12 (UNIT_TEST_PLAN Stage 1)

### Changed
- Extracted `filterBands(bands, filters, now)` from `SchedulePage.tsx` into `src/services/bandFilter.ts` (pure function, exported)
- Extracted `loadStoredFilters()` / `saveStoredFilters()` from `SchedulePage.tsx` into `src/services/scheduleFilterStorage.ts`
- Extracted `computeAttendees(picks, crewUsers)` from `useBandAttendees.ts` into `src/services/attendees.ts`; exported `BandAttendee` and `AttendeeMap` types
- Exported `deduplicatePickQueue(ops)` as a named pure function from `src/repositories/picks.ts`; `flushOfflineQueue` calls it internally
- Exported `countPicks` as a named pure function from `src/hooks/usePickCounts.ts`
- Rewrote `schedule.test.ts` to import `bandDay`/`formatTime` from real source files instead of duplicating helpers

### Architectural Notes
- UNIT_TEST_PLAN Stage 1 complete: all five low-risk pure function extractions done. No behavior changes. 205 tests pass.
- New testable surface: `bandFilter.ts`, `scheduleFilterStorage.ts`, `attendees.ts`, `deduplicatePickQueue`, `countPicks` are all now importable by unit tests without mounting hooks or pages.

---

## 2026-05-12 (Badge System Refactor)

### Changed
- `src/services/badges.ts` (deleted) — Monolithic 576-line file split into a `src/services/badges/` folder
- `src/services/badges/types.ts` (new) — All 4 type definitions: `BadgeBand`, `BadgeCondition`, `BadgeConfig`, `BadgeContext`
- `src/services/badges/engine.ts` (new) — Pure evaluation logic: `festivalLocalHour` helper, `buildBadgeContext`, `evaluateBadge`, `getEarnedBadges`
- `src/services/badges/registry.ts` (new) — `BADGES[]` array with all 26 badge definitions and the condition-examples developer reference comment block
- `src/services/badges/index.ts` (new) — Barrel re-export preserving all existing `from '…/services/badges'` import paths unchanged
- `docs/ai-wiki/badges.md` — Updated Key Files table to reflect new folder structure

### Architectural Notes
- All four consumers (`badges.test.ts`, `missed.test.ts`, `BadgesDisplay.tsx`, `AssignBadgeModal.tsx`) required zero import changes — the barrel index maintains backward compatibility
- Dependency order is strictly: `types.ts` ← `engine.ts` + `registry.ts` ← `index.ts` (no circular deps)

---

## 2026-05-12 (Password Recovery Flow)

### Added
- `src/pages/ResetPasswordPage.tsx` — New public page at `/reset-password`; listens for Supabase `PASSWORD_RECOVERY` auth event; two password fields (new + confirm) with mismatch validation; calls `supabase.auth.updateUser({ password })` on submit; navigates to `/now` on success; falls back to `getSession()` on page refresh
- i18n keys for forgot-password and reset-password in all 4 languages (`AuthPage_br.json`, `AuthPage_en.json`, `AuthPage_es.json`, `AuthPage_de.json`): `forgotPassword`, `forgotPasswordConfirm`, `sendResetLink`, `sendingResetLink`, `resetLinkSent`, `cancelAction`, `resetPasswordTitle`, `resetPasswordSubtitle`, `newPassword`, `confirmPassword`, `passwordsDoNotMatch`, `resetPasswordAction`, `resetPasswordLoading`, `resetPasswordSuccess`, `resetPasswordNoSession`

### Changed
- `src/pages/LoginPage.tsx` — Added "Forgot password?" link below login form; clicking it reveals an inline 3-step panel: `idle` → `confirm` (email input + Are you sure?) → `sent` (green confirmation); calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: ${origin}/reset-password`
- `src/pages/AuthPage.module.css` — Added `.linkButton`, `.forgotBox`, `.forgotQuestion`, `.forgotActions`, `.buttonSecondary`, `.forgotSent` classes for the forgot-password panel and success state
- `src/App.tsx` — Added public `/reset-password` route (no `PrivateRoute` wrapper)
- `docs/ai-wiki/flows/authentication.md` — Added "Flow: Password Recovery" section (full timeline, Supabase token mechanics, Cassio in-joke note, localization key list); updated Triggers (3 entries), Relevant Source Files (added `ResetPasswordPage.tsx`, i18n files), `onAuthStateChange` events (added `PASSWORD_RECOVERY`), Route Guards (documented public routes), Known Limitations (removed stale "no password reset UI" item, added recovery-link single-use caveat)

### Architectural Notes
- `/reset-password` must be a **public route** — the user arrives unauthenticated from the email link; `PrivateRoute` would redirect them to `/login` before the recovery session is established
- The `PASSWORD_RECOVERY` `onAuthStateChange` event fires only once per tab (when the URL hash token is first exchanged); the `getSession()` fallback handles page refreshes
- "Cassio" is intentionally hard-coded in all 4 language files as a permanent in-joke and must never be replaced with a generic placeholder
- No schema changes required — Supabase manages the recovery token entirely server-side

---

## 2026-05-12 (Phases 13–15: Wiki Documentation Roadmap)

### Added (User Flows — Phase 13)
- **flows/offline-pick-sync.md** (13.C) — Complete queue mechanics: 13-store IDB structure, `OfflinePickOp` shape, online happy path, offline behavior with PendingChip, keepLast dedup algorithm, worked example (5 toggles T=0:10–T=0:30 → 1 Supabase call), sync trigger (login + 'online' event), error recovery table, realtime catch-up after reconnect, 5 edge cases (mid-write offline, concurrent sessions, deleted band, partial flush, large queue), known limitations (no enqueue-time dedup, no backoff, no TTL, `navigator.onLine` unreliability)
- **flows/authentication.md** (13.D) — Login/signup flows, custom IndexedDB auth storage adapter (`getItem`/`setItem`/`removeItem` via `loadSession`/`saveSession`), `handle_new_user()` trigger details and `coalesce()` fix, `useAuth()` lifecycle, session persistence scenarios (PWA open offline, token expiry, concurrent sessions), route guards (`PrivateRoute`), registration gate, test user creation, RLS policy table, offline scenarios, known limitations (no email verification, no password reset, hard-coded godlike email)

### Added (ADRs — Phase 14)
- **decisions/supabase-as-sync-target.md** (14.A) — Decision to use Supabase for auth + DB + realtime + edge functions; alternatives rejected (Firebase NoSQL mismatch, custom Node infra cost, PocketBase no hosted tier, CouchDB no auth); tradeoffs accepted (vendor lock-in, trigger complexity, RLS debugging)
- **decisions/custom-hooks-events-no-redux.md** (14.B) — Decision to use custom hooks + window events instead of Redux/Zustand/Context; rationale (IDB as source of truth requires out-of-React mutation notification); hook lifecycle pattern; when NOT to use (multi-step forms, complex derived state); tradeoffs (no time-travel debugging, no cross-tab sync)
- **decisions/workbox-caching-strategy.md** (14.C) — NetworkFirst for Supabase (24h cache, freshness priority), CacheFirst for Wacken band images (30-day TTL, opaque CORS caching with `statuses: [0, 200]`), precaching for app shell (versioned filenames, `autoUpdate`, `skipWaiting`+`clientsClaim`); alternatives considered; cache invalidation mechanics

### Changed (Glossary — Phase 15.A)
- **glossary.md** expanded from ~100 to 140+ terms: added 40+ new terms covering offline pick lifecycle, keepLast semantics, opaque responses, precache, NetworkFirst, CacheFirst, StaleWhileRevalidate, cache TTL, Service Worker lifecycle, autoUpdate, clientsClaim, content hash, flushPending, draft announcement, server-assigned ID, JWT, refresh token, custom auth storage adapter, handle_new_user trigger, coalesce() fix, security definer, auth state events, LivePlan status, applyLiveBandTestOverride, CrewLiveGroup, Metal Place Window, validateAndAutoCheckout, soft/hard conflict, 3-conflict banner, vendor lock-in, set_user_role RPC, wipeAllLocalData, CacheVersionCheck, emitSyncComplete, graceful degradation, reading path

### Changed (Index — Phase 15.B)
- **index.md** updated: Quick Navigation now lists all 19 wiki documents (11 core + 1 badges + 5 flows + 5 decisions); added "Architectural Decisions" section; 7 reading paths by role (First-Time Engineer, Badge Developer, Offline Expert, Auth & User Management, Announcements/Moderation, Architecture Decision Context, Live Now Page); `Recommended Reading Order` section replaced by detailed `Reading Paths`; `Last Edited` updated to 2026-05-12

### Architectural Notes
- `offline_picks` queue entry `id` format is `${userId}:${bandId}:<crypto-uuid>` — unique even for repeated same-band toggles
- `flushPending()` for announcements replaces draft IDs (crypto.randomUUID client-side) with server-assigned IDs on successful flush
- `handle_new_user()` uses `ON CONFLICT DO UPDATE` to handle re-run (e.g., test user recreation) without overwriting existing roles (except for godlike email)
- Service Worker `CacheFirst` for cross-origin images requires `cacheableResponse: { statuses: [0, 200] }` to cache opaque CORS responses
- Reading paths provide role-based navigation into the wiki, reducing onboarding time from 2–3 days to 30 min–3 hours

---

## 2026-05-11 (Badge Asset Wiring)

### Added
- Wired five badge assets into `BADGES`: `bbq-king-2026`, `dreamer`, `jagger-king`, `live-beast`, and `total-kaput-2026`.
- Added badge localization keys for Brazilian Portuguese, English, Spanish, and German.

### Changed
- Updated the badge inventory to 28 active badges and documented `dreamer` as a persisted 30-pick milestone.
- Updated the `dreamer` badge display copy to use the "I'm Tripping" / "Tô doidão" concept across locales.
- Removed the unused `badge_camping_mob.png` test asset from the active badge asset folder.

### Architectural Notes
- `dreamer` uses the existing `persist: true` badge mechanism so it remains earned after the user later changes picks.
- The new honor badges use the existing `assigned` condition and godlike assignment flow.

## 2026-05-11 (Phase 13.B)

### Added (User Flows)
- **flows/live-now.md** — Live band display: time model (festival-local CEST), current/next band selection algorithm, conflict severity (hard >15min / soft ≤15min), crew grouping (by band → camping → metal place → lost), presence states (camping, metal place time window, auto-checkout), godlike test mode (splice virtual band at now), realtime presence updates (~3s), edge cases (band ends at now, multiple picks both current, timezone wrapping, stale offline state), performance memoization, known limitations (hard-coded CEST, no auto-seen tracking), future improvements

---

## 2026-05-11 (Phase 13.A)

### Added (User Flows)
- **flows/announcements.md** — Complete post lifecycle: happy path (online), offline queueing & flushing, realtime propagation to other users, soft-delete with RLS enforcement, moderation (manager/godlike), edge cases (post-delete race, blocked posters, flaky network, retry idempotency), known issues (blocked poster RLS missing, no dedup on retry), future improvements

---

## 2026-05-11 (Continued)

### Added (Features & Systems)
- **badges.md** — Badge system: 22+ condition types (Wacken history, profile, arrival, band picks/seen, location, assigned), current 30 badges, step-by-step guide to add new badges, localization (4 languages), testing patterns, edge cases, persist vs. conditional badge semantics

### Architectural Discoveries
- IndexedDB has 13 object stores (data + queues + config)
- Queue stores are separate from data stores (offline_picks distinct from user_picks)
- Deduplication groups by (user_id, band_id) and keeps only last action
- Realtime subscriptions are per-hook and clean up on unmount
- Auth session persisted to IndexedDB via custom Supabase storage adapter
- Event emitters (window events) used instead of Redux/Context for state updates
- BandSync runs once on init, not re-run on reconnect (band list immutable)
- Cache version bump wiped all local data, used for lineup invalidation
- Each repository exposes a public interface with sync + queue flush methods
- Workbox caching strategy: NetworkFirst for Supabase, CacheFirst for band images

### Structure
- `/flows/` folder created for user flow documentation
- `/decisions/` folder created for architectural decision records
- Template established for flow documents (Purpose, Trigger, Happy Path, Offline Behavior, Sync Behavior, Source Files, Diagrams, Edge Cases)

---

## 2026-05-11 (Initial Session)

### Added (Core Architecture)
- **index.md** — Navigation hub, system diagram, architecture principles, reading order
- **architecture.md** — 4-layer design, data flows (online/offline/realtime), repositories, offline behavior, sync mechanisms
- **domain-model.md** — Entities (User, Band, UserPick, UserPresence, Announcement, etc.), relationships, business rules by role
- **offline-first.md** — Golden rule (IDB primary), queue design, deduplication mechanics, example lifetimes, guarantees per data type, Service Worker caching
- **sync-engine.md** — Sync orchestration (4 components), queue flush flow, realtime subscription flow, app init flow, key sync functions, error handling, monitoring
- **routes.md** — All 6 routes, page components, navigation flows (login → /now, browse → pick, post announcement), error handling per route
- **testing.md** — Unit/integration/offline testing, manual test scenarios (offline pick/announcement/dedup), testing offline behavior, badge/time logic tests
- **glossary.md** — 100+ terms: architecture, database, React, auth, data, sync, UI, time, badge, role, testing

---

---

**Last updated:** 2026-05-15

---

## 2026-05-15

### Added
- **Melon badge** — new `assigned`-type badge added to `src/services/badges/registry.ts` with slug `melon`, asset `/badges/badge_melon.png`, and i18n keys `badgeMelon` / `badgeMelonDescription`
- **Melon badge i18n** — name ("Melon", untranslated) and description translated in all 4 language files: `Badges_br.json`, `Badges_en.json`, `Badges_es.json`, `Badges_de.json`

### Changed
- **Admin panel action buttons** — replaced generic `.secondaryAction` modifier with semantic per-action CSS classes in `ProfilePage.module.css`: `.actionPromote` (blue), `.actionFriend` (amber), `.actionBadge` (purple), `.actionUnblock` (orange); `.secondaryAction` kept as a no-op for backward compatibility
- **GodlikeAdminPanel** — wired new semantic button classes; role chip moved inside the user info block for better layout; avatar size reduced to 36px
- **ManagerAdminPanel** — wired `.actionUnblock` class on the unblock button
