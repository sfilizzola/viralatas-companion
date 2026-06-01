# Skill routing — Viralatas Metaleiros

On-demand context for Claude Code agents and subagents. **CLAUDE.md** is the fast index; this file is the full routing + artifact layout reference.

---

## Artifact layout (local scratch vs committed truth)

**Gitignored local scratch** — entire `docs/superpowers/` tree; never commit.

| Subfolder | Skill / use | Naming |
|-----------|-------------|--------|
| `specs/` | `brainstorming` | `YYYY-MM-DD-<topic>-design.md` |
| `plans/` | `writing-plans`, `executing-plans` | `YYYY-MM-DD-<feature>.md` |
| `prototypes/<feature-slug>/` | `huashu-design`, wireframes, HTML variants | kebab-case folder; any `.html` / `.png` inside |

Use the same `<feature-slug>` across specs, plans, and prototypes when they belong to one effort.

### Project overrides (global skills)

| Global skill default | This project |
|---------------------|--------------|
| `huashu-design` → `_temp/design-demos/demo-*.html` | **`docs/superpowers/prototypes/<feature-slug>/`** |
| `brainstorming` → `docs/superpowers/specs/` | Same (already aligned) |
| `writing-plans` → `docs/superpowers/plans/` | Same (already aligned) |

When a global skill path conflicts with this table, **this project wins**.

### Committed truth after ship

| What | Where |
|------|--------|
| Architecture, flows, decisions | `docs/ai-wiki/` (+ `changelog.md`) |
| Shipped UI spec | `public/vira-lata-ds.html` |
| Phase tracking | `PHASES.md`, `FUTURE_IDEAS.md` |

Local scratch may be kept or deleted after ship — never required in git. Committed docs must not depend on local spec paths for essential understanding.

### `public/` rule

Shippable assets only: DS, badges, fonts, maps, manifest JSON. Do **not** add exploration HTML under `public/`. Exception: updates to `public/vira-lata-ds.html`.

Prototype HTML may reference fonts via relative paths (e.g. `../../../../public/fonts/…`).

### Deprecated scratch locations

Repo-root `_*.html`, `docs/design/`, `docs/wireframes/`, `_temp/` (removed). Throwaway **code** prototypes (`prototype` skill) stay next to target modules in `src/` with clear `Prototype` naming.

### Lifecycle

```
specs/ + prototypes/  →  design approved
plans/                →  plan written
implement src/        →  ship
ai-wiki/ + vira-lata-ds.html  →  committed truth
```

Local inventory (optional): `docs/superpowers/README.md` (gitignored).

---

## Skill trigger matrix

| Trigger | Skill | Primary output path |
|---------|--------|---------------------|
| New feature / scope unclear / `/brainstorming` | `brainstorming` | `docs/superpowers/specs/` |
| Spec or plan needed; edit `PHASES.md` or `FUTURE_IDEAS.md` | `writing-plans` | `docs/superpowers/plans/` |
| Design exploration, wireframes, HTML variants | `huashu-design` | `docs/superpowers/prototypes/<feature-slug>/` |
| Locked design → production React | `frontend-design` | `src/` + `public/vira-lata-ds.html` |
| Plan in `docs/superpowers/plans/` or execute `PHASES.md` phase | `executing-plans` | `src/` (read plan from `plans/`) |
| Close phase / branch wrap-up | `finishing-a-development-branch` | git + wiki |
| Bug, failing tests, regression | `diagnose` or `systematic-debugging` | fix in `src/` |

**UI pipeline:** `huashu-design` (prototypes folder) → user locks variant → `frontend-design` (implement + DS).

**User-direct (never auto-suggest; `/skill` only):** `grill-me`, `grill-with-docs`, `handoff`, `humanize-writing`, `prototype`, `tdd`.

---

## Handoffs

| From | To | When |
|------|-----|------|
| `brainstorming` | `writing-plans` | Design approved; spec in `specs/` |
| `writing-plans` | `executing-plans` | Plan saved to `plans/` |
| `huashu-design` | `frontend-design` | User locks HTML variant |
| `frontend-design` | `wiki-curator` (subagent) | Meaningful UI ship — update wiki + DS |
| Any code change | `wiki-curator` | Before phase close |

After ship, **wiki-curator** updates `docs/ai-wiki/` and `public/vira-lata-ds.html`; do not commit `docs/superpowers/`.

---

## Default comms (`caveman` mode)

Use **caveman** skill for token savings when possible.

**Exceptions** — use normal prose:

- `brainstorming`, `grill-me`, `humanize-writing`
- Production DB / destructive ops warnings
- User says “normal mode”

---

## Examples

**New badge feature**

1. `/brainstorming` → `docs/superpowers/specs/2026-06-15-my-badge-design.md`
2. `writing-plans` → `docs/superpowers/plans/2026-06-15-my-badge.md`
3. Optional: `huashu-design` → `docs/superpowers/prototypes/my-badge/index.html`
4. `executing-plans` → implement in `src/services/badges/`
5. Wiki + DS update on ship

**HTML wireframe only**

1. `huashu-design` → `docs/superpowers/prototypes/schedule-filter/` (not `public/`, not `_temp/`)
2. After lock → `frontend-design` + `vira-lata-ds.html` section

**Invoke reminder (any skill)**

> Use project artifact layout: specs/plans/prototypes under `docs/superpowers/`; see `.claude/context/skill-routing.md`.

---

## Related context files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Always-on rules + § Artifact layout |
| `.cursor/rules/artifact-layout.mdc` | Cursor always-apply rule (same paths) |
| `docs/ai-wiki/index.md` | Architecture wiki entry |
| `PHASES.md` | Current phase acceptance criteria |
