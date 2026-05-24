# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 25 — Genre Collapse

**Status:** 🔜 Planning

**Goal:** Collapse ~95 distinct genre strings down to **13 canonical labels** by renaming band genres in-place. Deploy via `seed:bands:sync --apply` only. Schedule genre filter becomes usable on mobile.

**Design source:** [`docs/superpowers/specs/2026-05-24-genre-collapse-design.md`](docs/superpowers/specs/2026-05-24-genre-collapse-design.md)

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
- **Genre filter UX** — replace native `<select>` with single-select pills (see Design below)
- **Genre guide UI** — inform vira-latas what was collapsed (see below)
- Wiki: canonical genre list + full old→new mapping in `domain-model.md` / `lineup.md`; changelog

### Design (huashu-design review — locked for implementation)

Vira-latas built mental models around ~95 filter labels; after collapse, cards show canonical names only. The guide answers: *"Where did the label I used to filter by go?"* — reference content, not onboarding.

#### Genre filter — pills, not `<select>`

At 13 options, reuse existing [`BandFilters.module.css`](src/components/BandFilters.module.css) `.genrePill` / `.pillRow` (same pattern as stage pills and the "Upcoming bands" toggle). Single-select with `aria-pressed`; clear in section head unchanged.

- Sort: alphabetical; optionally pin `Metal Battle` last (festival bucket)
- Do **not** keep the native `<select>` — it wastes the mobile usability win

#### Genre guide — inline `Collapsible`, not nested modal

- **Location:** Filter drawer ([`BandFilters.tsx`](src/components/BandFilters.tsx)), directly below genre pill row, above "Upcoming bands"
- **Trigger:** Text link + chevron row — *"What do these genres mean?"* / i18n (`genreGuideTrigger`); closed by default
- **Component:** Reuse [`Collapsible`](src/ui/Collapsible.tsx) — **not** a second bottom sheet or `Modal` on top of the filter drawer (z-index stacking feels broken on mobile)
- **Content:** One flat scrollable list of 13 rows — **not** 13 nested accordions. If guide + drawer exceeds `75dvh`, cap guide list at `max-height: ~28dvh; overflow-y: auto` so Apply stays reachable

**Row anatomy (two lines, no icons, no per-genre colors — stage colors own color semantics):**

```
DEATH METAL                          ← font-mono, 11px, uppercase, --text
inclui Melodic Death Metal, Grindcore… ← font-mono, 10–11px, --text-faint; line-clamp 2 on mobile
```

**Exception rows (footnote copy, not just subgenre lists):**

| Canonical | Secondary line |
|-----------|----------------|
| Party Metal | Alestorm, Airbourne — unchanged |
| Metal Battle | Wacken Metal Battle competition bands |
| Metal | Catch-all for uncategorized / TBD tags |

**Visual tokens:** guide trigger = mono 10px uppercase `--text-muted` → hover `--accent-hover`; chevron = existing `Icon name="chevron"`; collapsible wrapper = border-top divider only (no full `.wrap` card inside drawer)

**Anti-slop (explicit don'ts):** no "95 → 13" stat banner; no emoji per genre; no 13-color genre palette; no decorative metal icons

#### Data & i18n

- **Data:** Static map in `src/services/genreGuide.ts` — single source aligned with collapse spec; not computed from live band list; works offline
- **i18n:** All 4 locales (`SchedulePage_{br,en,es,de}.json`). Translate trigger, intro, `"includes"` prefix, exception footnotes. **Do not translate** absorbed subgenre names (proper nouns: Grindcore, Goregrind, …)
- **Suggested keys:** `genreGuideTrigger`, `genreGuideIntro`, `genreGuideIncludes`, `genreGuidePartyMetalNote`, `genreGuideMetalBattleNote`, `genreGuideMetalNote`

#### Design System

Document in [`public/Design System.html`](public/Design System.html): genre filter pills (replacing select demo), `GenreGuideCollapsible` trigger + expanded states, row anatomy, Party Metal / Metal Battle exceptions, i18n key names. Reference Profile `Collapsible` usage as precedent.

#### Out of scope

Per-band "formerly tagged as …" on cards; push notification; one-time blocking banner; search inside guide; stale-filter toast (optional future: *"Genre filter reset — Melodic Death Metal is now under Death Metal"*)

**Acceptance criteria:**
- [ ] Distinct genre strings in seed ≤ 13
- [ ] Schedule genre filter uses **pills** (not native `<select>`); ≤ 13 options
- [ ] `party-metal` badge unchanged; Alestorm + Airbourne remain `Party Metal`
- [ ] Zero pick loss after `seed:bands:sync --apply`
- [ ] Genre guide reachable in ≤1 tap from open filter drawer (inline collapsible)
- [ ] Guide shows all 13 canonical labels and what each absorbed; Party Metal exception copy visible
- [ ] Guide usable at 375px width with Apply button still reachable
- [ ] Pattern documented in Design System
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
