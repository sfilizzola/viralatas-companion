# Festival Wrap — Teaser banner design (locked)

**Date:** 2026-05-27  
**Status:** ✅ Approved — **Variant B · Vest Chronicle bar**  
**Phase:** 30 · Task 12  
**HTML reference:** `_temp/wrap-banner-proposals/index.html` (section B; gallery only, gitignored)  
**Rejected alternatives:** A (playlist strip), C (inset card), D (gold wash / ’26 circle), B+D hybrid

---

## Purpose

Post-festival discovery strip on **`/now`** and **`/profile`**. Taps through to `/wrap`. Gated by `isFestivalEnded(now(), bands)`; dismiss per device. Same component, same markup, both routes.

---

## Locked layout — Variant B

Full-width horizontal bar (not inset card). Structure:

```
┌─────────────────────────────────────────────[×]┐
│ ████ 4px top bar — solid var(--accent)          │
├─────────────────────────────────────────────────┤
│ [patch pile]  KICKER (mono)                     │
│               HEADLINE (Oswald)                 │
│               cta line (mono, accent-hover)     │
└─────────────────────────────────────────────────┘
```

### Tokens (from `src/index.css`)

| Element | Token / rule |
|---------|----------------|
| Bar background | `--bg-surface` |
| Bottom edge | `1px solid var(--border)` |
| Top accent bar | `4px` height, `background: var(--accent)` — **solid red only** (no gold gradient, no ceremony wash) |
| Kicker | `--font-mono`, 9px, 700, uppercase, `letter-spacing: 0.12em`, `--text-faint` |
| Headline | `--font-display` (Oswald), 15px, 700, uppercase |
| CTA subline | `--font-mono`, 10px, `--accent-hover` (e.g. “Scroll the recap →”) |
| Dismiss | 32×44px min touch target, `--text-muted`, hover `--text` |

### Patch pile (decorative v1)

- **Not** live badge PNGs in the banner (keeps banner light and offline-simple).
- Three absolutely positioned 18×18px squares, stage colors (`--stage-faster`, `--stage-harder`, `--stage-louder` hex from DS), slight rotation — mirrors chaotic vest language.
- Container: ~36×28px, left of copy.

### Interaction

| Action | Behavior |
|--------|----------|
| Tap main area | `navigate('/wrap')` or `<Link to="/wrap">` |
| Tap dismiss | `dismissWrapTeaser()` → `viralatas:wrap-dismissed-2026` |
| Keyboard | `focus-visible` ring on link row (match `PlaylistLaunchButton` pattern) |

### Placement

| Route | Position |
|-------|----------|
| `/now` (`RightNowPage`) | Directly **below** page header (after `liveTestBanner` if present), **above** `<main>` |
| `/profile` (`ProfilePage`) | Below `ProfileHeader`, **above** patches / `BadgesDisplay` section |

Do **not** add to bottom nav. Do **not** gate `/wrap` route on this banner.

### i18n keys (`WrapTeaserBanner` or shared `WrapPage` namespace)

| Key | Role | EN example |
|-----|------|------------|
| `teaserKicker` | Mono kicker | `Wacken 2026 · done` |
| `teaserHeadline` | Oswald title | `Your festival wrap` |
| `teaserCta` | Mono subline | `Scroll the recap →` |
| `teaserDismiss` | `aria-label` on × | `Dismiss recap notice` |

All four locales; user-facing copy uses **vira-latas** where a group label is needed (not “crew”).

### React/CSS files (implementation)

- `src/components/wrap/WrapTeaserBanner.tsx`
- `src/components/wrap/WrapTeaserBanner.module.css` — class names e.g. `.bar`, `.topAccent`, `.linkArea`, `.patches`, `.kicker`, `.headline`, `.cta`, `.dismiss`

Pattern reference for flex + dismiss split: `PlaylistLaunchButton.tsx` / `.module.css` — but **accent palette**, not teal.

---

## Gating (behavior spec)

See `docs/superpowers/specs/2026-05-27-festival-wrap-godlike-qa-design.md`.

- `show = isFestivalEnded(now(), bands) && !isWrapDismissed() && bandsLoaded`
- Listen `viralatas:time-override-changed` on host or inside banner
- Godlike D+1 previews teaser; `/wrap` URL always reachable when logged in

---

## Acceptance (banner-only)

- [ ] Visual match to Variant B in banner HTML gallery (4px accent, patch pile, no gold background, no ’26 circle)
- [ ] Same banner on `/now` and `/profile`
- [ ] Dismiss persists per device
- [ ] 375px width: no overflow; headline truncates with ellipsis if needed
