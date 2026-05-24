# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 24 — Non-Destructive Lineup Sync

**Status:** 🔜 Planning

**Goal:** Replace destructive `npm run seed:bands` as the default path for lineup edits. Introduce stable `slot_id` identity and `npm run seed:bands:sync` so genre, timeslot, name, and image changes reach prod **without wiping user picks**.

**Design source:** [`docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md`](docs/superpowers/specs/2026-05-20-non-destructive-lineup-sync-design.md)

**Deliverables:**
- `supabase/migrations/*_bands_slot_id_*.sql` — add, backfill, lock `slot_id` on `public.bands`
- [`supabase/seed/bands.ts`](supabase/seed/bands.ts) — `slot_id` on every row (from existing `// FAS1`-style comments)
- `supabase/seed/bands-sync.ts` + `npm run seed:bands:sync` — dry-run by default; `--apply` writes UPDATE/INSERT/DELETE by `slot_id` and bumps `cache_version`
- Optional: `npm run seed:bands:move` for slot-to-slot pick transfer (narrow tool from design)
- Wiki: lineup maintenance guide points at sync as default; destructive seed recharacterized as festival-reset only

**Backfill note:** First population of `slot_id` on existing rows requires **one** destructive `seed:bands --force` (or dedicated backfill). That is a **one-time identity bootstrap** — picks reset once. All edits after Phase 24 close use sync.

**Acceptance criteria:**
- [ ] Every band row has unique `slot_id` in DB and `bands.ts`
- [ ] `npm run seed:bands:sync` dry-run exits 0 with empty plan on freshly synced DB
- [ ] Changing one field in `bands.ts` → sync shows 1-row UPDATE; `--apply` preserves `user_picks` count
- [ ] `cache_version` bumps on `--apply`
- [ ] Destructive `seed:bands` banner warns to use sync for small edits
- [ ] Build + tests green; wiki + changelog updated

**Next phase:** Phase 25 (genre collapse) depends on Phase 24 complete.

---

## Phase 25 — Genre Collapse

**Status:** 🔜 Planning (blocked on Phase 24)

**Goal:** Collapse ~95 distinct genre strings down to **13 canonical labels** by renaming band genres in-place. Deploy via `seed:bands:sync --apply` only. Schedule genre filter becomes usable on mobile.

**Design source:** [`docs/superpowers/specs/2026-05-24-genre-collapse-design.md`](docs/superpowers/specs/2026-05-24-genre-collapse-design.md) (to be written)

**Canonical genres (13):** Heavy Metal · Black Metal · Death Metal · Thrash Metal · Power Metal · Folk Metal · Doom Metal · Metalcore · Hard Rock · Punk · Party Metal · Metal Battle · Metal

**Constraints:**
- No new `genreGroup` column — rename into existing-style canonical strings only
- **Party Metal locked** — only Alestorm + Airbourne; `party-metal` badge condition unchanged
- Zero pick loss — verify `user_picks` count before/after sync apply
- Edit [`docs/ai-wiki/lineup.md`](docs/ai-wiki/lineup.md) + [`supabase/seed/bands.ts`](supabase/seed/bands.ts) first; then sync

**Deliverables:**
- Genre rename mapping applied in `lineup.md` + `bands.ts` (`TBD_GENRE` → `Metal`; 31 `Metal Battle *` → `Metal Battle`)
- `seed:bands:sync` dry-run → `--apply` for prod
- Badge threshold review for `death-metal` / `power-metal` only (`party-metal` untouched)
- **Genre guide UI** — inform vira-latas what was collapsed (see below)
- Wiki: canonical genre list + full old→new mapping in `domain-model.md` / `lineup.md`; changelog

### Genre guide UI (inform users what collapsed)

Vira-latas used to ~95 filter labels; now ~13. UI must explain the mapping without spamming.

**Recommended design:**
- **Location:** Schedule filter drawer ([`BandFilters.tsx`](src/components/BandFilters.tsx)), below genre `<select>` — link or chevron row: *"What do these genres mean?"* / i18n equivalent
- **Interaction:** Expands inline accordion **or** small modal listing each **canonical genre** with merged subgenres as secondary text, e.g.:
  - **Death Metal** — includes Melodic Death Metal, Grindcore, Goregrind, Deathcore, …
  - **Party Metal** — Alestorm, Airbourne (unchanged)
- **Data:** Static map in `src/services/genreGuide.ts` (or similar) — single source aligned with collapse spec; not computed from live band list
- **i18n:** All 4 locales (`SchedulePage_{br,en,es,de}.json`)
- **Design System:** Document accordion/modal pattern in [`public/Design System.html`](public/Design System.html)
- **Out of scope:** Per-band "formerly tagged as …" on cards; push notification; one-time blocking banner

**Acceptance criteria:**
- [ ] Distinct genre strings in seed ≤ 13
- [ ] Schedule genre filter dropdown ≤ 13 options
- [ ] `party-metal` badge unchanged; Alestorm + Airbourne remain `Party Metal`
- [ ] Zero pick loss after `seed:bands:sync --apply`
- [ ] Genre guide reachable from schedule filters; shows all 13 canonical labels and what each absorbed
- [ ] `lineup.md` + `bands.ts` in sync with live DB
- [ ] Build + tests green; wiki + changelog updated

**Open decisions:**
- Death Metal badge count — keep 3 or bump after merge?
- Doom absorbs Gothic — acceptable?

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
