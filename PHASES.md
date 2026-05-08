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

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for Phase 6+ features (LLM proactive alerts, Polish & pre-festival) that are nice-to-have and will be implemented if time permits after Phase 5 and Phase 6 (Metal Place) are complete.
