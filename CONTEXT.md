# Viralatas Metaleiros

Festival companion PWA for the Viralatas vira-latas crew at Wacken Open Air. Domain language for badges, festival cycles, and post-festival archival.

## Language

**Badge consolidation**:
A one-time, godlike-triggered snapshot that copies each vira-lata's earned year-specific badges into `user_badge_history` at the end of a festival cycle. Test vira-latas (`is_test_user = true`) are excluded.
_Avoid_: Year freeze, badge freeze, historical badge migration

**Live vest**:
The vest patch display on `/profile` and `/now` — badges earned or persisted for the **current festival cycle** plus evergreen identity badges.
_Avoid_: Active badges, current badges

**Previously Achieved** (`Conquistas Anteriores`):
A profile section showing frozen badges from past festival years, read from `user_badge_history`. The sole home for year-specific wins after consolidation and festival reset. Archived badges render in a read-only grid grouped by year; tap opens the same overlay patch modal as the live vest (label + year chip only — no description, no fullscreen zoom).
_Avoid_: Historical badges, archived vest, badge history section

**Evergreen badge**:
A badge with no `year` field on `BadgeConfig` — identity or cross-year milestones (e.g. country, OG, 5-Wackens). Stays on the live vest every festival; never consolidated.
_Avoid_: Permanent badge, non-year badge

**Year badge**:
A badge with `BadgeConfig.year` set to a festival year (e.g. `2026`). Earned from picks, seen bands, location, or assignment during that Wacken. Consolidated into `user_badge_history` at cycle end; not shown on the live vest after reset.
_Avoid_: Festival badge, seasonal badge, historical badge

**Registry rollover**:
At each new Wacken cycle, year-badge entries keep the same slug but bump `BadgeConfig.year` (and conditions/artwork as needed). The live engine evaluates only evergreen badges plus entries where `year === CURRENT_FESTIVAL_YEAR`.
_Avoid_: Year-suffixed slugs, registry accumulation

**Frozen badge snapshot**:
One row in `user_badge_history` per earned year-badge, storing `slug`, `image_path`, and `label_key` as they were at consolidation time. Previously Achieved renders from these frozen fields, not from the live registry.
_Avoid_: Badge archive row, historical badge record

**Badge asset immutability**:
Badge PNG files in `public/badges/` are never overwritten once consolidation may reference them. When art changes for a new Wacken cycle, add a new versioned file (e.g. `badge_medic-27.png`) and point the live registry at it; old files remain for frozen history rows.
_Avoid_: In-place image replace, badge image overwrite

**Badge history cache**:
The client's copy of `user_badge_history` rows in IndexedDB. UI reads this store first; a sync-on-profile-load pulls from Supabase when online and replaces local rows for the signed-in user.
_Avoid_: Badge history IDB, offline badge archive

**Social snapshot**:
The derived festival-social state shared by `/now` and the live vest — crew plans, crew groups (camping / Metal Place / lost / at band), Metal Place window flag, live test band id, and crew location counts. Built by `buildSocialSnapshot()` from IDB inputs.
_Avoid_: Live preview state, crew cache DTO

**Metal Place**:
The crew’s physical meetup spot at Wacken (BBQ / hangout). Not a stage — a location vira-latas can check into when a window is open.
_Avoid_: Venue, metal bar, BBQ zone (in user copy “Metal Place” is the product name)

**Metal Place window**:
A godlike-configured interval on one festival day (D1–D4) when check-in is allowed — same calendar day only, start before end, end by 23:59. Multiple windows may exist across the festival; at most one may be active at any instant (overlaps forbidden). Zero windows means Metal Place is off.
_Avoid_: Slot, session, event block

**Metal Place check-in**:
A vira-lata setting `is_at_metal_place` true while a window is active. Ends on manual toggle, auto-checkout when the window closes, or camping/band rules that clear location flags.
_Avoid_: RSVP, attendance mark

**Metal Place location visit**:
One increment to `location_visits.metal_place` per check-in session — each false→true transition on `is_at_metal_place`, including a second check-in later the same festival day after auto-checkout. Not capped per day or per window.
_Avoid_: Window visit, daily visit

**Crew profile cache**:
The `crew_users` IndexedDB store — roster fields including `is_friend` and `special_badges`. Synced from Supabase on reconnect; UI reads this store for display, not live `users` queries.
_Avoid_: Crew IDB, users cache

**Consolidation window**:
The operator period after `isFestivalEnded()` is true and before the next `festival:reset`. Badge consolidation for a festival year may only run inside this window; re-runs within it are idempotent. Godlike users may bypass the gate via existing time override or an explicit admin force action for QA.
_Avoid_: Freeze window, archive period

**Festival ended**:
True when the current instant is past the latest `end_time` among non-ceremony bands. Shared helper in `time.ts`; gates godlike consolidation for normal operation and will later gate `/wrap` discovery. Godlike may bypass via time override or an explicit `force` flag on the consolidate action (server validates godlike role).
_Avoid_: Festival over, post-festival

**Transition overlap**:
Between consolidation and the next `festival:reset`, the same year-badge may appear on both the live vest and in Previously Achieved. This duplication is acceptable and requires no cross-store dedup logic.
_Avoid_: Badge dedup, duplicate patch hiding

**Current festival year**:
The active Wacken cycle year, derived at runtime as the maximum `BadgeConfig.year` across the live badge registry. The live vest evaluates only evergreen badges (`year` omitted) plus year-badges matching this value.
_Avoid_: CURRENT_FESTIVAL_YEAR constant, festival year config

**Campground** (camp location):
The crew’s fixed physical campsite GPS — one lat/lng pair set by godlike on arrival, stable for the rest of that Wacken cycle, surfaced on the Mural and `/map` as a Maps deep link. Not live presence; not who is at camp. Godlike may **one-tap clear** coordinates before the festival to hide surfaces while testing (no confirm dialog).
_Avoid_: Vira-Latas HQ (that label on `/now` is the **camping presence group** only), camp HQ card, HQ pin

**Camping presence group** (`Vira-Latas HQ` on `/now`):
The live `/now` bucket listing vira-latas currently checked in at camping. Unrelated to Campground coordinates.
_Avoid_: Campground, camp pin, GPS card

## Flagged ambiguities

_(none yet)_

## Example dialogue

**Dev:** Beto earned `dreamer` and `roots` at Wacken 2026. Consolidation ran in August. It's March 2027 — picks are empty and `festival:reset` cleared persist metadata. Where do those patches show?

**Expert:** Only in **Previously Achieved**, under "Wacken 2026". The **live vest** shows evergreen badges plus whatever Beto earns for the 2027 cycle — not last year's year-badges.

**Dev:** What about `pais-tropical`?

**Expert:** That's an **evergreen badge** — still on the live vest every year. Consolidation ignores it.
