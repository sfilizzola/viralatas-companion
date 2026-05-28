# Skill routing

How agents choose and apply **global skills** (Superpowers, huashu-design, etc.) in this project. Skills define *how* the main agent works; **subagents** (`.claude/agents/`) define *who* reviews delegated slices. Both can apply in the same task.

Full trigger matrix and examples live here. CLAUDE.md carries a compact index.

---

## Hybrid activation (default)

1. **Classify** the user request against the tables below.
2. **Auto-suggest + confirm** for pipeline and context-triggered skills:
   > “This looks like **huashu-design** work (explore variants + update Design System). Proceed?”
3. **Skip confirmation** when the user typed `/skill-name` or explicitly named the skill (“use executing-plans”).
4. **No skill** for routine work: existing-pattern bugfix, copy/i18n tweak, test fix, wiki typo — CLAUDE.md + AI Wiki only.

**Explicit beats auto:** `/brainstorming`, `/grill-me`, etc. are full consent.

---

## Default communication — `caveman`

**When possible, always use `caveman` mode** for token savings. Read `caveman` SKILL.md and apply its rules to user-facing replies by default in this project.

| Still caveman | Pause caveman (full prose) |
|---------------|----------------------------|
| Status updates, code explanations, diffs, bug fixes, plan execution chatter | `brainstorming`, `grill-me`, `grill-with-docs`, `humanize-writing` — need readable prose |
| Confirmations for routine skill switches | Production DB safety, irreversible/destructive ops, security warnings |
| RTK/build/test output summaries | Multi-step sequences where fragment order risks misread |
| | User says “normal mode”, “stop caveman”, or asks to clarify/repeat |

**Stacks with other skills** — e.g. `executing-plans` + caveman for step updates; `huashu-design` + caveman for progress, full prose only for design rationale when user needs it.

`/caveman` or “use caveman” → enforce if drifted. “Normal mode” / “stop caveman” → turn off until user re-enables.

---

## Pipeline skills (auto-suggest in order)

Use these in sequence for feature and UI work. Do not skip upstream steps when the task is exploratory or undefined.

| Step | Skill | Trigger |
|------|--------|---------|
| 1 | `brainstorming` | New feature, “what if…”, scope unclear, user invokes `/brainstorming` |
| 2 | `writing-plans` | Spec approved and need an implementation plan; **adding or editing `PHASES.md` or `FUTURE_IDEAS.md`**; promoting an idea to a phase |
| 3 | `huashu-design` | Design exploration, challenge/improve existing UI, HTML prototypes, **creativity and updates to `public/vira-lata-ds.html`** |
| 4 | `frontend-design` | Ship **locked** design into production React (`src/pages/`, `src/components/`, `src/ui/`) after huashu + DS are settled |
| 5 | `executing-plans` | Plan file under `docs/superpowers/plans/` exists; **implementing current phase acceptance criteria from `PHASES.md`** |
| 6 | `finishing-a-development-branch` | “Close phase N”, branch wrap-up, all tasks done — verify tests/build and present merge options |

### UI handoff (huashu → frontend)

```text
brainstorming (optional)
    ↓
huashu-design  — explore, challenge, HTML in _temp/, update vira-lata-ds.html
    ↓  [user approves locked variant]
frontend-design  — implement in src/ from DS + spec/HTML reference
    ↓
wiki-curator (subagent) — sync wiki/changelog; DS should already reflect huashu pass
```

**Rules**

- **`huashu-design` owns creativity and Design System changes** — not throwaway-only.
- **`frontend-design` assumes design is locked** — implements; does not re-open variant exploration unless user asks.
- **Routine UI** (existing component, pattern already in DS) → **no skill**; follow Design System + wiki.

**Anti-pattern:** Jumping to `frontend-design` for “make X look better” when the ask is exploratory — suggest `huashu-design` first.

### Planning handoff (PHASES / FUTURE_IDEAS / superpowers)

```text
brainstorming → idea refined
    ↓
writing-plans → docs/superpowers/specs/ and/or PHASES.md / FUTURE_IDEAS.md edits
    ↓  [user approves]
writing-plans → docs/superpowers/plans/ (when implementation steps are needed)
    ↓
executing-plans → implement plan or PHASES.md acceptance criteria
    ↓
finishing-a-development-branch → close phase / wrap branch
```

**PHASES.md**

- Define, restructure, or edit phase scope → `writing-plans`
- “Implement phase N” / work against acceptance criteria → `executing-plans`

**FUTURE_IDEAS.md**

- Add or flesh out an idea → `writing-plans` (often after `brainstorming`)
- Promote idea to active phase → `writing-plans` for both FUTURE_IDEAS and PHASES entries

---

## Context-triggered skills (auto-suggest + confirm)

| Skill | Trigger |
|-------|---------|
| `systematic-debugging` or `diagnose` | Bug report, unexpected behavior, failing tests, performance regression |

Prefer project `diagnose` skill when available; otherwise Superpowers `systematic-debugging`.

---

## User-direct skills (never auto-suggest)

Activate **only** when the user invokes `/skill-name` or names the skill. **No confirmation step** — invocation is consent.

| Skill | When the user reaches for it |
|-------|------------------------------|
| `grill-me` | Stress-test a plan or design through relentless Q&A |
| `grill-with-docs` | Same, grounded in project docs and domain language |
| `handoff` | Compact the session into a handoff doc for another agent |
| `humanize-writing` | De-AI user-facing copy (announcements, i18n strings, mural text) |
| `prototype` | Throwaway prototype to sanity-check an idea before committing |
| `tdd` | Red-green-refactor when the user wants test-first development |

---

## Skills vs subagents

| Layer | Role | Location |
|-------|------|----------|
| **Skills** | Workflow, checkpoints, quality bars for the **main** agent | Global skill dirs; routing rules here |
| **Subagents** | Delegated audit/review on specific file paths or keywords | `.claude/agents/` |

They **stack**. Example: `executing-plans` on sync-engine work → still delegate `offline-sync-auditor` when `src/lib/db/**` or repositories change.

Subagent triggers remain in CLAUDE.md § Subagent locations — not replaced by this doc.

---

## Examples

| User says | Suggest | Confirm? |
|-----------|---------|----------|
| “Explore three banner layouts for /now” | `huashu-design` | Yes |
| “Implement variant B in React” (after huashu lock) | `frontend-design` | Yes |
| “Add phase 31 to PHASES.md for playlist v2” | `writing-plans` | Yes |
| “Execute phase 30 from PHASES.md” | `executing-plans` | Yes |
| “Implement docs/superpowers/plans/2026-05-27-festival-wrap-plan.md” | `executing-plans` | Yes |
| “Close phase 30” | `finishing-a-development-branch` | Yes |
| “Tests fail after my pick sync change” | `diagnose` | Yes |
| “/grill-me this wrap spec” | `grill-me` | No |
| “Fix typo in announcements i18n” | *(none)* | — |
| “Add RLS policy to new migration” | *(none)* + `migration-validator` subagent | Subagent per CLAUDE.md |

---

## Reading a skill

When a skill is activated, read its `SKILL.md` fully before proceeding. Skills may chain (e.g. brainstorming → writing-plans only after design approval).

---

## Changelog

- **2026-05-28** — Initial skill routing spec (hybrid activation, huashu/frontend split, PHASES/FUTURE_IDEAS triggers, user-direct tier).
- **2026-05-28** — Default `caveman` communication when possible (token savings).
