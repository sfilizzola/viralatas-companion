# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 25 — Genre Collapse

**Status:** 🔜 Planning

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
