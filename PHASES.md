# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Active development

### Phase 36 — Duck button redesign (QuackStrip + QuackGhostRow)

**Status:** 🔲 Ready to implement  
**Design spec:** `docs/superpowers/specs/2026-05-31-duck-button-redesign-design.md`  
**Implementation plan:** `docs/superpowers/plans/2026-05-31-duck-button-redesign.md`  
**Prototype:** `_temp/duck-button-redesign.html`

**Goal:** Replace the prominent 64×64 duck tile with two lighter, contextually appropriate components. Delete `DuckButton` entirely.

| Location | Old | New |
|---|---|---|
| `/now` group card | 64×64 tile in count column | `QuackStrip` — 34px strip attached below card |
| `/schedule` band card | 64px extra grid column | `QuackGhostRow` — ghost row inside card body |
| `/my-picks` band card | 64×64 tile in duckRow | `QuackGhostRow` — ghost row inside card body |

**Key decisions:**
- Two focused components (`QuackStrip`, `QuackGhostRow`) with shared prop contract `{ onDuck, cooldownUntil }`
- `DuckButton.tsx` + `.module.css` + 4 locale files fully deleted
- Countdown remains explicit (MM:SS + progress fill/underline) — UX requirement
- Godlike admin test panel: **out of scope**
- `/rubber-duck.png` asset: user will replace with a more compact variant independently

**Subphases:**

- **36.A** — i18n: create `QuackStrip` + `QuackGhostRow` locale files (8 JSON), register in `i18n.ts`, delete `DuckButton` locale files
- **36.B** — Create `QuackStrip` component + CSS + tests
- **36.C** — Create `QuackGhostRow` component + CSS + tests
- **36.D** — Wire `QuackStrip` into `CrewGroupsSection` + `RightNowPage.module.css` cleanup
- **36.E** — Wire `QuackGhostRow` into `BandCard` + `BandCard.module.css` cleanup
- **36.F** — Delete `DuckButton.tsx` + `.module.css`
- **36.G** — Update `public/vira-lata-ds.html` design system, phase close

**Acceptance criteria:**
- `/now` group card shows no tile; discreet strip below with progress + MM:SS countdown during cooldown
- `/schedule` + `/my-picks` band cards show no extra column; ghost row inside body with underline progress + MM:SS
- `DuckButton` and all its files fully removed
- Build and all tests green

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update this file so the active section points at the next phase (or “no active phased work” when the backlog is empty).
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
