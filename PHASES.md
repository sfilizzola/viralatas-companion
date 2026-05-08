# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, and key decisions.

---

## Phase 6 — Metal Place `[COMPLETE]`

**Goal:** Festival-day feature for crew members at Metal Place (beer garden in Wacken city). Godlike controls when Metal Place is "active" (which festival day); crew can flag attendance and see who else is there.

**Context:** Viralatas attends Wacken Open Air with a weak festival lineup on certain days. Metal Place is a popular off-site beer garden for the crew during those days. The feature is one-off, event-specific — not a recurring camping/band-tracking system.

**Status:** ✅ All acceptance criteria met. End-to-end verification in test mode pending real-world walkthrough; revisit if issues surface during the festival.

---

### Feature Design

#### Data model

**`user_presence` table** — add one column:
```sql
ALTER TABLE user_presence ADD COLUMN is_at_metal_place boolean NOT NULL DEFAULT false;
```

**New `metal_place_config` table** (single-row config, godlike-only editable):
```sql
CREATE TABLE metal_place_config (
  id                integer PRIMARY KEY DEFAULT 1,
  festival_day      integer,                        -- 1|2|3|4 or null (not active)
  start_time        time,                           -- e.g. '12:00'
  end_time          time,                           -- e.g. '23:00'
  label             text DEFAULT 'Metal Place',
  test_override_day integer,                        -- 1|2|3|4 or null (testing mode off)
  updated_by        uuid REFERENCES users(id),
  updated_at        timestamptz DEFAULT now()
);
-- RLS: everyone SELECT; only godlike can INSERT/UPDATE
```

**Test mode logic:**
- If `test_override_day IS NOT NULL` → use it as the active festival day (for testing)
- If `test_override_day IS NULL` → use actual festival day matching (normal mode)

**IndexedDB** — version bump to 6, add `metal_place_config` store.

---

#### Mutual exclusion

Setting `is_at_metal_place = true` clears `is_camping = false`, and vice versa — enforced in the client layer (presence.ts).

---

#### Card behavior

- Card only renders in the crew grid when **at least 1 person** has `is_at_metal_place = true`.
- Unlike camping/lost (which always render), Metal Place card is **conditional**.
- Card shows below the lost card (end of crew grid).

**Style — Party/Metal vibes:**
- Dark amber/beer colors: border `rgba(184, 134, 11, 0.8)`, gradient background with golden accents
- Card header: 🍺 emoji + "Metal Place" label + time range (if configured)
- Shimmer animation for festive effect
- Each crew member shows as a pill avatar (same pattern as camping/lost pills)

---

#### Dedicated check-in card

A prominent card renders above the crew grid **only when Metal Place is active** (configured day matches today OR test mode enabled):
- Large "🍺 Metal Place" title with time display
- "Check In" button — toggles user's Metal Place status
- Button shows active state when user is checked in
- Supports the same dark amber beer aesthetic as the crew grid card

---

#### Test mode (for godlike)

Godlike can toggle test mode in the Profile Metal Place config section:
- **Normal mode:** Toggle/card only shows on the configured `festival_day` when that day is today
- **Test mode:** Toggle/card appears as if today is the configured day, regardless of actual date
- Shows hint: "🧪 Testing as Day X" when test mode is active
- Allows godlike to verify functionality before the actual event

---

### Files to Create / Modify

#### Migration
`supabase/migrations/20260507000008_phase6_metal_place.sql`
- `ALTER TABLE user_presence ADD COLUMN is_at_metal_place boolean NOT NULL DEFAULT false;`
- `CREATE TABLE metal_place_config (...)` with RLS (godlike-only writes)
- `metal_place_config` added to `supabase_realtime` publication

#### Types — `src/types/index.ts`
- Add `is_at_metal_place: boolean` to `UserPresence`
- Add `MetalPlaceConfig` type

#### DB layer — `src/lib/db.ts`
- Bump to version 6
- Add `metal_place_config` store (keyPath: `'id'`)
- Add `saveMetalPlaceConfig(config)`, `loadMetalPlaceConfig()` helpers

#### Presence layer — `src/lib/presence.ts`
- Update `setCampingStatus()` to auto-clear `is_at_metal_place` when enabling camping
- Add `setMetalPlaceStatus(userId, isAt: boolean)`: mirrors setCampingStatus
- Add `syncMetalPlaceConfig()`: fetch from Supabase → save to IDB
- Add `saveMetalPlaceConfigRemote(config)`: godlike-only upsert to Supabase
- Update `flushPresenceQueue()` to include `is_at_metal_place` field

#### Live preview — `src/lib/livePreview.ts`
- Add `isAtMetalPlace: boolean` to `CrewLivePlan`
- Update `mapCrewLivePlans()` to read presence `is_at_metal_place`
- Update `groupCrewLivePlans()`: add `metalPlace` group kind (conditional, only when ≥1 member)

#### RightNowPage — `src/pages/RightNowPage.tsx`
- Load Metal Place config from IDB on mount; subscribe to Realtime config changes
- Render dedicated Metal Place check-in card when active
- Handle check-in button → `setMetalPlaceStatus()` + mutual exclusion with camping
- Render Metal Place card in crew grid when `metalPlace` group is non-empty
- Display time range from config in both cards

#### RightNowPage CSS — `src/pages/RightNowPage.module.css`
- Add `.metalPlace` card style (crew grid): dark amber borders, gradient background, shimmer animation
- Add `.metalPlaceCheckInCard`, `.metalPlaceCheckInButton`, `.metalPlaceCheckInTitle` styles for dedicated card

#### ProfilePage — `src/pages/ProfilePage.tsx`
- In the godlike section: Metal Place config block with:
  - Day selector (1–4 or unset)
  - Start time + end time inputs
  - Test mode toggle: simple boolean "🧪 Enable for Today (Test Mode)"
  - Save / Clear buttons
  - When test mode is on, shows hint: "Metal Place will appear as if it's Day X today"

#### ProfilePage CSS — `src/pages/ProfilePage.module.css`
- Add `.metalPlaceSection`, `.metalPlaceForm`, input styles, button styles

#### i18n — `src/i18n/RightNowPage_br.json`, `RightNowPage_en.json`
- Add keys: `metalPlace`, `metalPlaceGroupTitle`, `metalPlaceGroupEmpty`, `metalPlaceCheckIn`, etc.

---

### Acceptance criteria

- [x] Migration creates `metal_place_config` table and adds column to `user_presence`
- [x] Godlike can configure Metal Place day, start time, end time via Profile
- [x] Godlike can enable test mode to preview Metal Place on any day
- [x] Check-in card appears only when Metal Place is active (configured day OR test mode)
- [x] Check-in button toggles user's Metal Place status
- [x] Toggling Metal Place on auto-disables camping, and vice versa
- [x] Metal Place crew card appears only when ≥1 crew member is checked in
- [x] Crew grid card displays time range from config
- [x] Card styling is dark amber/beer aesthetic, distinct from camping (yellow) and lost (red)
- [x] Realtime subscription syncs config changes across browser tabs/windows within 3s
- [x] Offline: Metal Place status and config persist in IndexedDB; queue flushes on reconnect
- [x] Test team can verify functionality without waiting for actual festival day (test mode)

---

## Phase 7 — Profile polish, godlike tooling & useful links `[COMPLETE]`

**Goal:** Round out the profile experience with a richer badge modal, godlike-only band live-test tooling, collapsible admin sections, and a JSON-driven "useful links" surface. None of these depend on each other — each stage ships independently.

**Status:** ✅ Stages 7.1–7.4 complete.

**Stages overview:**

| Stage | Topic | Touches | Risk | Status |
|---|---|---|---|---|
| 7.1 | Badge modal redesign + funny texts | `BadgesDisplay.tsx`, `badges.ts`, `Badges_*.json` | Low (cosmetic + i18n) | ✅ Done |
| 7.2 | Godlike Live Band Test | New migration, `liveBandTest.ts`, `livePreview.ts`, `RightNowPage.tsx`, `ProfilePage.tsx` | Medium (new table + Realtime) | ✅ Done |
| 7.3 | Collapsible Godlike & Manager sections | `ProfilePage.tsx`, `ProfilePage.module.css` | Low (UI only) | ✅ Done |
| 7.4 | Useful Viralatas Links | `public/useful-links.json`, `AnnouncementsPage.tsx` + CSS, i18n | Low (static fetch) | ✅ Done |

---

### Stage 7.1 — Badge modal redesign + funny descriptions `[COMPLETE]`

**Status:** ✅ Done. Modal now opens with title row, large image + funny one-liner; new `descriptionKey` wired through `BadgeConfig` and both i18n files. Adding a future badge requires only image + `BADGES` entry + 2 i18n keys.

**Current:** Tap a badge → modal shows enlarged image + label only.

**Target:** Tap a badge → small windowed modal with:
- **Top:** Localized title (`labelKey`)
- **Left:** Larger badge image (so details are legible)
- **Right (or below on narrow screens):** A short funny one-liner pulled from a new `descriptionKey`

#### Data model changes

`src/lib/badges.ts` — add `descriptionKey: string` to `BadgeConfig`. Wire each existing badge to a key.

```ts
export type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;   // ← new
  condition: BadgeCondition;
};
```

For each new badge added in the future the only requirement is to define both `labelKey` and `descriptionKey` and add their entries to both `Badges_br.json` and `Badges_en.json`. No other code changes needed — `BadgesDisplay.tsx` reads both keys generically.

#### Proposed funny texts (drafted from meaning — please edit before approval)

| Badge | BR draft | EN draft |
|---|---|---|
| `puppy` | "Primeira vez no Wacken — bem-vindo à matilha, au." | "First Wacken? Welcome to the pack, au." |
| `pack-member` | "Onde tem 10+ viralatas, tem você. Latindo junto." | "Wherever 10+ stray dogs gather, you're there." |
| `pais-tropical` | "Brasil sil sil — suor, calor e metal pesado." | "Brazil baby — sunshine, sweat, and heavy metal." |
| `deutscher` | "Ein Bier, bitte! Você joga em casa." | "Ein Bier, bitte! You're playing on home turf." |
| `america-fuck-yeah` | "Coming again to save the motherfucking day, yeah!" | "Coming again to save the motherfucking day, yeah!" |
| `og` | "Estava lá quando tudo começou. Respeito eterno." | "You were there when it all started. Eternal respect." |
| `mud-survivor` | "Lama de 2023 e 2025 — Voce sobreviveu pra contar a história." | "Survived the 2023 AND 2025 mud. Lived to tell the tale." |

#### Files to create / modify

- **`src/lib/badges.ts`** — add `descriptionKey` to type + each badge entry
- **`src/components/BadgesDisplay.tsx`** — render new modal layout (title row, image-left/text-right split, close button as today)
- **`src/components/BadgesDisplay.module.css`** — new `.modalCardLayout`, `.modalImageLarge`, `.modalDescription` styles; image bumped from current preview size to ~140px; modal max-width ~360px so it stays a "small window"; stack vertically when viewport < 380px
- **`src/i18n/Badges_br.json`** + **`Badges_en.json`** — add 7 new `*Description` keys (one per existing badge)

#### Acceptance criteria

- [x] Each earned badge tap opens the new modal with title, large image, and description text
- [x] All 7 existing badges have a `descriptionKey` and matching BR + EN i18n entries
- [x] Adding a future badge requires only: image in `public/badges/`, entry in `BADGES`, two i18n entries — no `BadgesDisplay.tsx` changes
- [x] Modal renders cleanly on a 320px-wide viewport (badge image stacks above text)
- [x] Backdrop click and ✕ button both close the modal (existing behavior preserved)

---

### Stage 7.2 — Godlike "Live Band Test" `[COMPLETE]`

**Status:** ✅ Done. Migration + IDB v7 store added; `livePreview.ts` exposes `applyLiveBandTestOverride()` and threads `liveTestBandId` through `findLivePlan()` / `mapCrewLivePlans()`. `ProfilePage` shows a popularity-sorted band picker with mutual-exclusion confirmation against Metal Place test mode; `RightNowPage` loads/realtime-syncs the config and shows a 🧪 banner while active. Verified with `npm test` (128 tests passing) and `npm run build`.

**Goal:** Godlike picks a band from a popularity-sorted list and toggles "make it live now." All clients see that band as the user's/crew's current band — useful to validate `RightNowPage` behavior, crew grid grouping, and (in Phase 8+) LLM alert flows without waiting for the festival.

#### Behavior

- New godlike block on Profile page, modeled after the Metal Place config block
- Band picker: list rendered popularity-descending (uses same data that powers `/popular`); selecting one and saving sets it as the "live test band"
- Effect: while a live test band is set, `findLivePlan()` (and friends) treat **that band's start_time/end_time as if they shifted to wrap `now`** for **all crew members**, so any user who picked the band sees it as `current` and any user who didn't gets `lost`/`empty` as today
- Disable cleanly: clearing the band returns app to normal time-driven logic
- Mutual safety: cannot be enabled at the same time as Metal Place test mode (same kind of override could confuse the crew grid). Saving one disables the other with a confirmation prompt

#### Data model

New single-row table mirroring `metal_place_config`:

```sql
create table public.live_band_test_config (
  id            integer primary key default 1 check (id = 1),
  band_id       uuid references public.bands(id) on delete set null,
  enabled       boolean not null default false,
  updated_by    uuid references public.users(id),
  updated_at    timestamptz not null default now()
);
-- RLS: authenticated SELECT; godlike-only INSERT/UPDATE
-- Realtime: add to supabase_realtime publication
```

**IndexedDB:** bump `DB_VERSION` from 6 → 7, add `live_band_test_config` store (keyPath `'id'`).

#### How "live now" override works

In `src/lib/livePreview.ts`, accept an optional `liveTestBandId` param (sourced from config). When set:

1. Find the band in `bands` by id
2. Synthesize a virtual `Band` with `start_time = now - 5min`, `end_time = now + bandDurationMs - 5min` (preserves original duration)
3. Splice the virtual band into the bands array passed to `findLivePlan()`, replacing the original by id
4. Result: any crew member who picked this band shows `current`; others fall through normal logic

This keeps the override **purely derived** — no DB writes to `bands`, no migration to time-shift real data, easy to disable.

#### Files to create / modify

**Migration** — `supabase/migrations/20260508000000_phase7_live_band_test.sql`
- Create `live_band_test_config` table + RLS + Realtime publication entry

**Types** — `src/types/index.ts`
- Add `LiveBandTestConfig` type

**DB layer** — `src/lib/db.ts`
- Bump to v7, add `live_band_test_config` store
- Add `loadLiveBandTestConfig()` / `saveLiveBandTestConfig()` helpers
- Add `LIVE_BAND_TEST_CONFIG_CHANGED_EVENT` window event (matches Metal Place pattern)

**Sync layer** — `src/lib/presence.ts` (or new `src/lib/liveBandTest.ts` if it fits cleaner)
- `syncLiveBandTestConfig()`: fetch from Supabase → save to IDB
- `saveLiveBandTestConfigRemote(config)`: godlike upsert
- Subscribe to Realtime config changes, dispatch local event

**Live preview** — `src/lib/livePreview.ts`
- Add optional `liveTestBandId?: string` parameter to `mapCrewLivePlans()` and `findLivePlan()`
- Implement virtual-time-shift override

**RightNowPage** — `src/pages/RightNowPage.tsx`
- Load `live_band_test_config` on mount, subscribe to its changed event
- Pass `liveTestBandId` into `mapCrewLivePlans()` / `findLivePlan()`
- Small dev banner "🧪 Live test: <band name>" visible to all users while active

**Profile page** — `src/pages/ProfilePage.tsx`
- New `LiveBandTestSection` inside `GodlikeSection`
- Loads bands sorted by popularity (reuse `loadBands()` + pick counts from `loadAllUserPicks()`)
- Dropdown with `<option>` per band: `<band name> — <pick count>` ordered desc
- Save / Clear buttons; show currently-active band; disable Metal Place test mode if active and warn

**Profile CSS** — `src/pages/ProfilePage.module.css`
- Reuse `.metalPlaceForm` patterns; new `.liveBandTestSection` if a distinct visual is wanted

**i18n** — `ProfilePage_br.json` + `ProfilePage_en.json`
- `liveBandTestTitle`, `liveBandTestDescription`, `liveBandTestSelect`, `liveBandTestSave`, `liveBandTestClear`, `liveBandTestActive`, `liveBandTestConflictWithMetalPlace`

**RightNowPage i18n** (only if banner is added) — `liveTestBanner`

#### Acceptance criteria

- [x] Migration creates `live_band_test_config` with godlike-only RLS and Realtime
- [x] Godlike sees a "Live Band Test" block in Profile, listing all bands ordered by current popularity (most picks first)
- [x] Selecting a band + saving makes that band appear as `current` for every crew member who picked it (across all open browser tabs within ~3s)
- [x] Crew members who didn't pick it remain on their real status (no false-positives)
- [x] Clearing the override returns the app to real-time-driven `RightNowPage` logic
- [x] Cannot enable simultaneously with Metal Place test mode — saving one disables the other with confirmation
- [x] Non-godlike users have no UI surface for this feature
- [x] Offline: config persists in IndexedDB and applies on reload; queue not needed (godlike-only writes)

---

### Stage 7.3 — Collapsible Godlike & Manager sections `[COMPLETE]`

**Status:** ✅ Done. Both admin sections now collapse via the `ConflictSection` chevron pattern. Added shared `.collapsibleCard` CSS class; reused existing `.conflictsHeader`, `.chevron`, `.open`, `.conflictsContent`, `.conflictsInner` styles. Default state is collapsed for both. Verified with `npx tsc --noEmit` and `npm test -- --run` (128 tests passing).

**Goal:** Both admin sections in `ProfilePage` are growing long. Wrap each in a simple chevron-expand container, mirroring the existing `ConflictSection` pattern at [ProfilePage.tsx:370-386](src/pages/ProfilePage.tsx#L370-L386).

#### Behavior

- `🤘 GODLIKE POWERS` header is a button; tapping toggles a chevron (▼ / ▲) and shows/hides body
- Same for `🔧 MANAGER POWERS`
- Default state: **collapsed** (so the page loads short)
- No animation library — reuse the existing `.chevron` + `.open` CSS already used by ConflictSection

#### Files to modify

- **`src/pages/ProfilePage.tsx`**
  - Wrap the inner content of `GodlikeSection` in a `{isOpen && (...)}` block (or use the same `.content`/`.open` pattern as ConflictSection for transition smoothness)
  - Same wrap for `ManagerSection`
  - `useState(false)` for `isOpen` in each
- **`src/pages/ProfilePage.module.css`** — only add new classes if needed; ideally reuse `.conflictsHeader`, `.chevron`, `.open`, `.conflictsContent` styling renamed/aliased

#### Acceptance criteria

- [x] Tapping the godlike header toggles its body open/closed; chevron rotates accordingly
- [x] Tapping the manager header toggles its body open/closed; chevron rotates accordingly
- [x] Both sections start collapsed on page load
- [x] All existing functionality inside each section continues to work unchanged when expanded
- [x] No visual regression when both are collapsed (page is noticeably shorter)

---

### Stage 7.4 — Useful Viralatas Links `[COMPLETE]`

**Status:** ✅ Done. The Mural page now shows a JSON-driven Useful Links section above the composer/feed. Initial seed links are Splitwise and Instagram only, per current request; more links can be added later by editing `public/useful-links.json` and redeploying. The JSON is included in the VitePWA precache via `vite.config.ts` so it survives offline after first load.

**Goal:** A surface where any crew member can find shared resources (Splitwise, spreadsheets, Instagram, group docs, etc.) without opening a new top-level page. Source list is a static JSON so adding/removing links is a single-file edit + redeploy.

#### Source format

`public/useful-links.json` (fetched at runtime, cached by service worker on first load):

```json
{
  "links": [
    { "title": "Splitwise — Wacken 2026", "url": "https://www.splitwise.com/...", "icon": "💸" },
    { "title": "Itinerário (Google Sheets)", "url": "https://docs.google.com/...", "icon": "📋" },
    { "title": "Instagram @viralatasmetaleiros", "url": "https://instagram.com/...", "icon": "📸" }
  ]
}
```

Schema (kept minimal — no nesting, no per-link i18n; titles can include both languages or use BR by default):

```ts
type UsefulLink = { title: string; url: string; icon?: string };
type UsefulLinksFile = { links: UsefulLink[] };
```

Adding a link = append a new object. Removing = delete the object. No code or migration changes.

#### Placement

A clearly-titled section at the **top of the AnnouncementsPage** (above the post composer / feed). Renders as a simple horizontal-scroll row of pill-shaped link buttons (or a 2-column grid on mobile):

```
┌─────────────────────────────────────────┐
│ 🔗 Links Úteis                          │
│  [💸 Splitwise]  [📋 Itinerário]  [📸…] │
└─────────────────────────────────────────┘
```

Each pill is an `<a target="_blank" rel="noopener noreferrer">`. Clicking opens the link in a new tab.

If the JSON file is missing, returns 404, or has zero entries → the section simply doesn't render (no error UI).

#### Files to create / modify

- **`public/useful-links.json`** — new file, ships with seed entries (Splitwise + Instagram; group docs can be appended later)
- **`src/lib/usefulLinks.ts`** — small fetch helper: `loadUsefulLinks(): Promise<UsefulLink[]>`. Caches result in module-level memo to avoid double fetches; tolerates 404 by returning `[]`
- **`src/types/index.ts`** — add `UsefulLink` type
- **`src/pages/AnnouncementsPage.tsx`** — render `<UsefulLinksRow />` above the existing announcements UI; `useEffect` loads the JSON once on mount
- **`src/pages/AnnouncementsPage.module.css`** — `.usefulLinksRow`, `.usefulLinkPill`, `.usefulLinksTitle`
- **`vite.config.ts`** — ensure `/useful-links.json` is precached or cache-first so it survives offline (this repo uses VitePWA, not a tracked `src/workers/sw.ts`)
- **`src/i18n/AnnouncementsPage_br.json`** + **`_en.json`** — add `usefulLinksTitle` key (`"Links Úteis"` / `"Useful Links"`)

#### Acceptance criteria

- [x] `useful-links.json` exists with 2 requested seed entries (Splitwise + Instagram)
- [x] Announcements page renders a "Useful Links" section above announcements when the JSON has ≥1 entry
- [x] Each link opens in a new tab with `rel="noopener noreferrer"`
- [x] Empty / missing JSON → section silently disappears, no error
- [x] After first online load, links work offline via VitePWA precache (`dist/sw.js` includes `useful-links.json`)
- [x] Updating an entry in `useful-links.json` and redeploying surfaces the change with no other code edits

---

### Phase 7 cross-cutting checks

- [x] All 4 stages keep the offline-first invariant: each feature still loads from IDB / static cache when offline
- [x] No new client-side use of API keys or LLM calls (Phase 7 is purely UI + tooling)
- [x] Dark mode preserved across all new UI surfaces
- [x] Existing 128 tests still pass; `npm test -- --run` verified after Stage 7.4

---

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for Phase 6+ features (LLM proactive alerts, Polish & pre-festival) that are nice-to-have and will be implemented if time permits after Phase 5 and Phase 6 (Metal Place) are complete.
