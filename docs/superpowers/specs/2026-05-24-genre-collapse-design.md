# Genre Collapse — Design Spec

**Date:** 2026-05-24  
**Phase:** 25  
**Status:** Locked for implementation

## Goal

Collapse ~95 distinct Wacken genre strings to **13 canonical filter labels** by renaming band genres in-place. Deploy via `seed:bands:sync --apply` only. Schedule genre filter becomes usable on mobile.

## Canonical genres (13)

Heavy Metal · Black Metal · Death Metal · Thrash Metal · Power Metal · Folk Metal · Doom Metal · Metalcore · Hard Rock · Punk · Party Metal · Metal Battle · Metal

## Constraints

- No new `genreGroup` column — rename into existing-style canonical strings only
- **Party Metal locked** — only Alestorm + Airbourne; `party-metal` badge condition unchanged
- Zero pick loss — verify `user_picks` count before/after sync apply
- Edit `docs/ai-wiki/lineup.md` + `supabase/seed/bands.ts` first; then sync

## Old → new mapping

Implementation: `src/services/genreGuide.ts` (`GENRE_COLLAPSE_MAP` + `collapseGenre()`).

| Canonical | Absorbed tags |
|-----------|---------------|
| Heavy Metal | Traditional Heavy Metal, Speed Metal, Neoclassical Metal |
| Black Metal | Black / Doom Metal, Black Metal (Bathory tribute), Black Metal / Grindcore, Blackgaze, Post-Black Metal, Viking Metal |
| Death Metal | Death Metal / Grindcore, Melodic Death Metal, Goregrind, Grindcore, Deathcore |
| Thrash Metal | Crossover Thrash, Crossover Metal |
| Power Metal | Symphonic Metal |
| Folk Metal | Folk / Brass Metal, Folk, Pirate Metal, Ska / Reggae Metal, Humppa |
| Doom Metal | Gothic Metal, Gothic / Industrial Metal, Sludge Metal, Post-Metal, Stoner Rock, Occult Rock |
| Metalcore | Melodic Hardcore |
| Hard Rock | AOR, AOR / Hard Rock, Rock, Medieval Rock, Alternative Rock |
| Punk | Punk Rock, Punk Metal, Horror Punk, Folk Punk |
| Party Metal | *(unchanged — Alestorm, Airbourne only)* |
| Metal Battle | All `Metal Battle *` country variants + Award Ceremony |
| Metal | TBD / Generic Metal, Alternative Metal, Industrial Metal, Industrial / Gothic, Groove Metal, Nu Metal, Rap Metal, Progressive Metal, Visual Kei Metal, Dark Electronic, Orchestral / Film Music |

## Badge review

- `death-metal`: keep count **3** — more bands merged in, threshold stays fair
- `power-metal`: keep count **3** — Symphonic Metal merged in
- `party-metal`: **unchanged** (genre + count 2)

## UI

See PHASES.md § Design — genre pills + inline GenreGuideCollapsible in filter drawer.

## Out of scope

Per-band "formerly tagged as …" on cards; push notification; blocking banner; search inside guide; stale-filter toast.
