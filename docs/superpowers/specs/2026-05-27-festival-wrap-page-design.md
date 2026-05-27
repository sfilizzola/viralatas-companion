# Festival Wrap — `/wrap` page design (locked)

**Date:** 2026-05-27  
**Status:** ✅ Approved — **A2 · Vest Chronicle**  
**Phase:** 30 · Sub-phases 30.C–30.D  
**HTML reference:** `_temp/wrap-proposals/variant-a2-vest-chronicle.html` (design-only; gitignored)  
**Product spec:** `FUTURE_IDEAS.md` § Idea 7 (stats + sections table)

---

## Purpose

Single private route `/wrap` — one scrollable recap (Spotify Wrapped energy). **Personal stats first**, **1–2 vira-latas highlights** at the end. No LLM prose. All numbers from IndexedDB via `buildFestivalWrapStats()`.

---

## Locked layout — A2 Vest Chronicle

### Shell

- Full viewport scroll container, optional `scroll-snap-type: y mandatory`
- Fixed **5-dot progress bar** at top; active dot from `IntersectionObserver` on five `<section data-wrap-section>`
- Document root sets `--stage` from user's **top stage** (`stageColorVar(topStage)` from `src/services/stageColors.ts`)

### Five sections (full viewport each)

| # | Section | Content (locked) |
|---|---------|------------------|
| 1 | **Hero** | Giant **bands seen**; secondary: picked · skipped · stages visited |
| 2 | **Personality** | Top genre + top stage; stage-colored pill (`{stage} · {n} visited`) |
| 3 | **Chaos** | Horizontal meters: weak skips, hard conflicts, badges earned |
| 4 | **Crew** | Pick twin (name + overlap %); vira-latas #1 band (name + pick count + active count) |
| 5 | **Patches** | Chaotic earned-badge pile on denim (`loadPatchesBackground()`); CTA **Open vest** → `/profile` |

### Visual system (per section card)

| Rule | Value |
|------|--------|
| Page tokens | `--bg`, `--bg-surface`, `--text`, `--text-muted`, `--accent` |
| Typography | Oswald display, IBM Plex Sans body, JetBrains Mono kickers |
| Section card top bar | **4px** `background: var(--stage)` (fallback `var(--accent)`) |
| CTA buttons/links | `--accent` / `--accent-hover` |
| Finale vest | Reuse `buildStackPoses` + `stackStyle` from `stackLayout.ts`; decorative only (no modal) |

### States

| State | UX |
|-------|-----|
| Loading | Mono kicker + short wait copy |
| Empty picks (`!hasPicks`) | Friendly empty — no broken five-section layout |
| Ready | All five sections populated from `FestivalWrapStats` |
| Friend user | Never show location-toggle stats |

### Route

- `/wrap` in `App.tsx` behind `PrivateRoute`
- **No** `isFestivalEnded()` guard on the page (teaser is discovery; direct URL / godlike QA)

### React/CSS files (implementation)

- `src/pages/WrapPage.tsx`
- `src/pages/WrapPage.module.css`
- `src/components/wrap/WrapProgress.tsx`
- `src/i18n/WrapPage_{br,en,es,de}.json`

---

## Out of scope (page v1)

- Carousel or modal multi-step flow
- LLM-generated copy
- Public share URL / screenshot server persistence
- Duck quack stats
- Bottom-nav entry for wrap

---

## Acceptance (page-only)

- [ ] Five full-viewport sections with scroll-snap + 5-dot progress
- [ ] A2 visual language: stage bar, meters, denim patch finale
- [ ] Stats match badge engine semantics (see implementation plan Task 2–4)
- [ ] Offline after first IDB load
- [ ] Design System section documents page anatomy (Task 13)
