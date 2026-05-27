# Viralatas Metaleiros

Festival companion PWA for the Viralatas vira-latas crew at Wacken Open Air. Domain language for badges, festival cycles, and post-festival archival.

## Language

**Badge consolidation**:
A one-time, godlike-triggered snapshot that copies each vira-lata's earned year-specific badges into `user_badge_history` at the end of a festival cycle. Test vira-latas (`is_test_user = true`) are excluded.
_Avoid_: Year freeze, badge freeze, historical badge migration

**Live vest**:
The kutte patch display on `/profile` and `/now` — badges earned or persisted for the **current festival cycle** plus evergreen identity badges.
_Avoid_: Active badges, current badges

**Previously Achieved** (`Conquistas Anteriores`):
A profile section showing frozen badges from past festival years, read from `user_badge_history`. The sole home for year-specific wins after consolidation and festival reset. Archived badges render in a read-only grid grouped by year; tap opens the same overlay patch modal as the live kutte (label + year chip only — no description, no fullscreen zoom).
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

## Flagged ambiguities

_(none yet)_

## Example dialogue

**Dev:** Beto earned `dreamer` and `roots` at Wacken 2026. Consolidation ran in August. It's March 2027 — picks are empty and `festival:reset` cleared persist metadata. Where do those patches show?

**Expert:** Only in **Previously Achieved**, under "Wacken 2026". The **live vest** shows evergreen badges plus whatever Beto earns for the 2027 cycle — not last year's year-badges.

**Dev:** What about `pais-tropical`?

**Expert:** That's an **evergreen badge** — still on the live vest every year. Consolidation ignores it.
