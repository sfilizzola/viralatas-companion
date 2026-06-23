# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`  
**Design spec** → `docs/superpowers/specs/2026-06-23-metal-place-multi-window-design.md`

---

## Phase 44 — Metal Place Multi-Window Configuration

**Goal:** Replace the single festival-day + time window on `metal_place_config` with multiple configurable slots (e.g. D1 14:00–16:00, D2 11:00–14:00). Companion app only — godlike configures via `/profile`; admin app update is a follow-up.

**Locked decisions:** auto-checkout at each window end; same-day slots only (`end ≤ 23:59`); no overlaps per day; zero slots = disabled; remove `test_override_day` (use Time Travel); auto-migrate existing config → slot #1; max 8 slots.

---

### 44.A — Schema migration

**File:** `supabase/migrations/20260623000000_phase44_metal_place_windows.sql`

1. Create `public.metal_place_windows` (`id uuid`, `festival_day`, `start_time`, `end_time`, `sort_order`, timestamps).
2. CHECK: `start_time < end_time`, `end_time <= '23:59'`, `festival_day IN (1,2,3,4)`.
3. RLS: authenticated SELECT; godlike INSERT/UPDATE/DELETE (mirror `metal_place_config` policies).
4. Add table to `supabase_realtime` publication.
5. **Data migration:** if `metal_place_config` row `id=1` has non-null `festival_day` **and** both `start_time` and `end_time` set → insert one window row (`sort_order = 0`). **Any other legacy shape** (null day, null times, or only partial fields) → **zero windows** (Metal Place off). No invented defaults.
6. Alter `metal_place_config`: drop `festival_day`, `start_time`, `end_time`, `test_override_day`; keep `label` (unused in companion UI — reserved), `updated_by`, `updated_at`.
7. **`festival:reset`:** preserve `metal_place_windows` (same as `metal_place_config` today) — update script comment + `docs/ai-wiki/festival-reset.md` in 44.F; do not add a wipe step.

**Validate with:** `migration-validator` subagent before merge.

---

### 44.B — Types, policy, validation helpers

**Files:** `src/types/index.ts`, `src/services/presencePolicy.ts`, new `src/services/metalPlaceValidation.ts` (or inline in policy module)

1. Add `MetalPlaceWindow` type; extend `MetalPlaceConfig` with `windows: MetalPlaceWindow[]`.
2. Change `isMetalPlaceWindowActive(config, now)` to accept config with `windows[]` — active if **any** slot matches (day + `[start, end)` in Europe/Berlin).
3. Remove all `test_override_day` branches from policy.
4. Add pure helpers:
   - `findActiveMetalPlaceWindow(windows, now)` → active slot or `null` (for crew subtitle)
   - `validateMetalPlaceWindows(windows)` → errors for cap (>8), bad times, same-day overlaps
5. Update `shouldAutoCheckout` to use new window list semantics (unchanged outcome: outside all slots → checkout).

**Tests:** `src/__tests__/presencePolicy.test.ts` — multi-slot active/inactive, gap between slots, no test_override cases, exclusive end bound, wrong day.

---

### 44.C — IndexedDB + repository + Realtime

**Files:** `src/lib/db/config.ts`, `src/repositories/presence.ts`, `src/lib/supabase.types.ts` (regenerate if typed)

1. `loadMetalPlaceConfig` / `saveMetalPlaceConfig` — store `{ label, windows[], updated_at, … }` at key `'current'`.
2. **IDB read shim (offline upgrade):** if cached object has legacy `festival_day` + both times but no `windows[]`, synthesize one window in memory (same rules as SQL migration). Online sync overwrites with server truth.
2. `saveMetalPlaceConfigRemote` — replace-all strategy:
   - Upsert metadata row `id=1`
   - Upsert windows by stable `id` (existing rows keep server UUID; **Add window** assigns `crypto.randomUUID()` client-side)
   - Delete server rows whose `id` is not in the payload
   - Write `sort_order` from auto-sort (`festival_day`, `start_time`) on each save
3. `syncMetalPlaceConfig` — fetch metadata + `metal_place_windows` ordered by `festival_day`, `start_time` (canonical order; `sort_order` written on save to match).
4. Realtime: subscribe to `metal_place_windows` and `metal_place_config`; on event, re-fetch full config → IDB → emit `METAL_PLACE_CONFIG_CHANGED_EVENT`.
5. Remove `test_override_day` from all sync paths.

**Tests:** `src/__tests__/db.test.ts` (config save/load shape); `presenceRepository.test.ts` if remote save changes.

---

### 44.D — Godlike admin UI

**File:** `src/components/profile/MetalPlaceAdminSection.tsx` (+ `ProfilePage.module.css` if needed)

1. Replace single day/time form with **slot list UI**:
   - Row: Day selector (1–4) · `<input type="time">` start · end · Delete
   - **Add window** button (disabled at 8 slots)
2. Save: run `validateMetalPlaceWindows`; show inline errors; call `saveMetalPlaceConfigRemote` (**batch only** — local draft until Save; one atomic replace-all write, no per-row auto-save). **On Save, assign `sort_order` from auto-sort:** `festival_day` asc, then `start_time` asc.
3. Delete last slot: confirm dialog (“Metal Place will be disabled”).
4. Remove test-mode checkbox, hint, and `autoCheckoutAllUsers` on test-mode-off branch.
5. **Remove Live Band Test ↔ Metal Place mutual exclusion entirely** — delete `MetalPlaceBridge`, `previousTestModeRef`, both conflict confirm dialogs (`MetalPlaceAdminSection` + `LiveBandTestAdminSection`), and `liveBandTestConflictWithMetalPlace` i18n keys. Live Band Test and Metal Place windows are independent; Time Travel covers Metal Place QA.
6. i18n: `GodlikeAdmin_{br,en,es,de}.json` — add strings for add/delete/validation errors; remove test-mode strings.

**DS:** update `public/vira-lata-ds.html` godlike Metal Place section if layout changes.

---

### 44.E — Consumer call sites

**Files:** (non-exhaustive — grep `MetalPlaceConfig`, `isMetalPlaceWindowActive`, `metalPlaceConfig`)

| Area | Change |
|------|--------|
| `useMetalPlaceConfig` | Return config with `windows[]` |
| `usePresenceAutoSync` / `useNowData` | Pass new config shape to policy/service |
| `PresenceToggle` | `metalPlaceAvailable` = any active window |
| `CrewGroupsSection` | Subtitle from `findActiveMetalPlaceWindow`, not single `start_time`/`end_time` on config root |
| `livePreview.ts` / `socialSnapshot.ts` | Window check uses `windows[]` |
| `useBadgeContext` / badge engine | No badge rule changes; ensure window helper used |
| `minimapPlacement.ts` | Unchanged logic path; verify window gate |
| `livePreview.ts` / `CrewGroupsSection` | Metal Place crew card still only when `≥1` member checked in; toggle when any window active (unchanged) |

No changes to `user_presence` schema or `is_at_metal_place` semantics.

---

### 44.F — Tests, wiki, phase close

1. Extend scenario tests: `liveNowScenarios.test.ts`, `useNowData.test.ts` — two-slot fixture if needed.
2. Wiki: `supabase-schema.md`, `domain-model.md`, `flows/live-now.md` (remove/fix overnight window doc; document multi-slot + zero-slots-off).
3. `docs/ai-wiki/changelog.md` dated entry.
4. Build + full test suite green.
5. Append Phase 44 to `phases-history.md`; reset this file to `## No active phased work` / `**Next phase:** 45`.

---

## Acceptance criteria

- [ ] Migration auto-creates one slot from legacy row; empty legacy → zero slots
- [ ] Godlike can configure 3–5 typical windows across days; cap 8 enforced
- [ ] Same-day overlap rejected on save
- [ ] `start >= end` or `end > 23:59` rejected on save
- [ ] Each window opens toggle at start; auto-checkout at end; gap = off
- [ ] Zero slots → no Metal Place toggle, no `/now` metal place group
- [ ] `/now` subtitle shows active slot times only
- [ ] `test_override_day` fully removed (DB, types, UI, policy)
- [ ] Realtime window change re-runs auto-checkout (existing behavior)
- [ ] Badges and minimap unchanged in intent
- [ ] Build green · all tests green

---

## Out of scope / follow-ups

| Item | Notes |
|------|-------|
| **Admin app** (`viralatas-companion-admin`) | `MetalPlaceConfig` card reads old columns — breaks until a separate admin phase rewrites against `metal_place_windows` |
| Overnight windows | Explicitly unsupported; wiki corrected |
| Mid-window edits | Operational policy: don’t edit during live window; no new grace-period code |
| **Grill session (2026-06-23)** | Location visit = per check-in session (B) · Live Band Test independent (A) · batch Save (A) · strict SQL migration (A) · IDB read shim (A) · `festival:reset` preserves windows (A) · crew card only when ≥1 member (A) · `label` column kept, no UI (A) · auto-sort windows (A) · stable window UUIDs (A) |

---

## Relevant source files

| Layer | Files |
|-------|--------|
| Migration | `supabase/migrations/20260623000000_phase44_metal_place_windows.sql` |
| Policy | `src/services/presencePolicy.ts` |
| Service | `src/services/presenceService.ts` |
| Repository | `src/repositories/presence.ts` |
| IDB | `src/lib/db/config.ts` |
| Hook | `src/hooks/useMetalPlaceConfig.ts` |
| UI | `src/components/profile/MetalPlaceAdminSection.tsx` |
| Live view | `src/components/now/CrewGroupsSection.tsx`, `src/hooks/useNowData.ts`, `src/components/PresenceToggle.tsx` |
| Tests | `src/__tests__/presencePolicy.test.ts`, `src/__tests__/presenceRepository.test.ts`, `src/__tests__/db.test.ts` |

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
