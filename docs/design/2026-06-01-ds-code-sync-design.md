# Design: Design System sync (code → DS)

**Status:** Approved (brainstorming 2026-06-01)  
**Owner:** Viralatas Metaleiros  
**Canonical DS file:** `public/vira-lata-ds.html` (`#ds-manifest`)  
**Local superpowers copy:** `docs/superpowers/specs/2026-06-01-ds-code-sync-design.md` (gitignored)

---

## Problem

`public/vira-lata-ds.html` is the living UI spec, but it has drifted from production:

- Token tables and governance checklist describe work already done in `src/index.css` (e.g. motion tokens).
- Font delivery differs (DS HTML uses Google Fonts CDN; app uses self-hosted `/public/fonts`).
- Token naming diverges (`--white` vs `--text-white`, richer DS-only tokens vs app-only tokens like `--grit-toner`).
- `#ds-manifest` `components[]` is incomplete vs `src/components/**` and `src/ui/**`.
- §12 audit score (72/100) and priority actions are stale relative to May 2026 code.

Agents and humans cannot trust the DS as an accurate map of what ships.

---

## Goals

1. **Code is source of truth** — audit React/CSS modules first; update DS to match.
2. **Full surface in one program** — tokens, primitives, shared components, every shipped route layout, governance/manifest refresh.
3. **Verifiable** — structured §12 checklist (human) + `npm run ds:audit` drift script (automation).
4. **Preserve stable anchors** — do not renumber DS sections or change section `id`s referenced across docs.

## Non-goals

- Refactoring production CSS to rename tokens for DS nostalgia (document aliases instead).
- Storybook or a second parallel design-system file.
- Visual pixel-diff CI in v1.
- Parsing every CSS module for hardcoded hex in v1 (manual checklist item; script v2 optional).

---

## Approach: vertical slices (recommended execution)

Deliver in reviewable PRs/sessions. Each slice:

1. Read authoritative `src/` files.
2. Fill or update §12 checklist rows for touched components/routes.
3. Patch relevant DS sections + `#ds-manifest`.
4. Run `npm run ds:audit` until slice is clean.
5. Append `docs/ai-wiki/changelog.md` when slice completes (batch one entry at phase end is acceptable for pure parity work).

**Not** a single 6k-line HTML rewrite in one commit unless explicitly requested.

---

## Source-of-truth matrix

| Layer | Authority | DS destination |
|-------|-----------|----------------|
| Tokens | `src/index.css` `:root` + typography utility classes | §01 Color, §02 Type, §03 Spacing & Radius |
| Primitives | `src/ui/*` + `*.module.css` | §04 Components (demos + prop/state tables) |
| Feature components | `src/components/**` | §04 / §08 / §10 / §11 / §13 as appropriate |
| Page compositions | `src/pages/*`, `App.tsx` routes | §05 Page layouts (one block per shipped route) |
| Index | Derived from above | `#ds-manifest` `tokens` + `components[]` |

**Manifest rule:** Every `components[]` entry must map to a real `src/` file (fuzzy: `BandCard` → `BandCard.tsx`). No ghost components. New shipped UI must add manifest + section in the same PR as code (after baseline is green).

---

## Slice order

| # | Slice | Primary paths | DS targets |
|---|--------|---------------|------------|
| 1 | Foundation | `src/index.css`, `/public/fonts` | §01–03; masthead font note (self-hosted) |
| 2 | Primitives | `src/ui/*` | §04: Button, Input, Chip, Modal, Select, Switch, SegmentedControl, Collapsible, Avatar |
| 3 | Core festival UI | `BandCard`, `BandDetailModal`, `PresenceToggle`, `BandFilters`, `BottomNav`, `OfflineBanner` | §04, §08 |
| 4 | `/now` cluster | `RightNowPage`, `LiveCardSheet`, `CrewGroupsSection`, `UpcomingBandCard`, duck components | §05 (partial), §11 |
| 5 | Social / profile | Announcements, `BadgesDisplay`, `BadgeHistorySection`, `ProfileHeader`, profile admin sections | §04, §08 |
| 6 | Remaining routes | Schedule, My Picks, Popular, Wrap, Map, Login/Register (minimal) | §05, §08 |
| 7 | Governance | N/A (meta) | §12 + manifest + changelog strip stale TODOs |

Skip routes that only redirect or have no distinct layout worth documenting.

---

## §12 checklist schema (per component or route)

| Column | How to fill |
|--------|-------------|
| Component | Exported React name |
| Path | `src/...` file path |
| Variants / states | Props + CSS module class names |
| Tokens | `var(--*)` used in associated `.module.css` |
| DS section | Stable anchor (`#components`, `#additional`, etc.) |
| Verified | ISO date (optional initials) |

**Audit score:** Replace fixed 72/100 with **completion %** = documented checklist rows / total rows in manifest scope. Update score when slices land.

---

## Automation: `scripts/ds-audit.mjs`

**Command:** `npm run ds:audit` → `node scripts/ds-audit.mjs`

**Reads (read-only):**

- `src/index.css` — custom properties in `:root`
- `public/vira-lata-ds.html` — `#ds-manifest` JSON; optional `:root` in embedded `<style>`
- `src/ui/*.tsx`, `src/components/**/*.tsx` — `export function|const Name` heuristics

**Reports:**

1. **Token drift** — in code, not in manifest `tokens` buckets; in manifest, not in code; optional **alias hints** (e.g. `--white` / `--text-white`) as documentation-only warnings.
2. **Component drift** — TSX exports without manifest entry; manifest names without plausible file match.

**Exit code:** `1` if any hard drift; `0` if clean.

**CI:** Optional `ds:audit --strict` on `main` only after baseline pass (slice 7 complete).

**v2 (later):** flag hardcoded hex in `*.module.css` against token list.

Existing `scripts/ds-extract-section-styles.mjs` remains for DS HTML maintenance only; unrelated to drift detection.

---

## Process rules

- **Wiki:** Meaningful behavioral doc changes → relevant `docs/ai-wiki/*` pages; always dated `changelog.md` entry when phase closes.
- **CLAUDE.md (follow-up):** After implementation plan ships, add agent rule: run `npm run ds:audit` on UI PRs; update DS + manifest when touching documented components.
- **PR size:** Prefer one slice per PR.
- **Section numbers:** Never renumber §01–§13; retired §09 stays retired.

---

## Success criteria

- [ ] `npm run ds:audit` exits 0 on `main`.
- [ ] `#ds-manifest` `tokens` matches `src/index.css` names (aliases documented in §12 where names differ).
- [ ] Every shipped route in `App.tsx` has a §05 block or explicit “minimal / shared layout” note.
- [ ] §12 checklist covers all manifest `components[]` with Verified dates.
- [ ] Governance no longer lists completed work (motion tokens, etc.) as open priorities.
- [ ] DS masthead documents self-hosted fonts, not Google CDN as production path.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large HTML diff hard to review | Vertical slices; section-scoped commits |
| Demos diverge again | `ds:audit` in CI + PR habit |
| Manifest false positives on naming | Fuzzy match + allowlist for internal-only helpers |

---

## Next step

Invoke **writing-plans** to produce an implementation plan with tasks per slice, file touch list, and acceptance checks per PR.
