# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, key decisions, and completed phase history.

---

## Phase 8 — Badge asset intake & new badge definitions `[PLANNED]`

**Goal:** Read `public/badges/`, identify badge image files that are not currently associated with a `BADGES` entry, then use user input to create new badge definitions and conditions using the existing badge structure only.

**Status:** Planning only. Do not execute yet. Current planning-time inventory shows all existing PNG badge files are already associated with `BADGES`; ignore non-badge files such as `.DS_Store`. Re-run the inventory when Phase 8 execution starts because new files may be added later.

**Non-goals / constraints:**
- Do not change badge display UI, modal behavior, profile metadata forms, or unrelated app behavior.
- Do not create a database migration.
- Do not introduce a new badge engine, new condition evaluator, or new condition types unless explicitly approved as a separate follow-up.
- Do not infer badge meaning from image names alone; ask for user confirmation before adding each badge.

### Existing badge structure to preserve

Badges are configured in `src/lib/badges.ts`:

```ts
export type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;
  condition: BadgeCondition;
};
```

Supported condition types today:
- `wacken_years_exactly`
- `wacken_years_includes`
- `country_is`
- `bands_picked_min`
- `band_attendance_min`

Each badge also needs matching i18n entries in:
- `src/i18n/Badges_br.json`
- `src/i18n/Badges_en.json`

### Execution plan

#### Step 8.1 — Inventory badge assets

- Read `public/badges/`.
- Include only valid badge image files, currently expected to be PNGs named like `badge_*.png`.
- Ignore system files and unrelated assets (`.DS_Store`, hidden files, directories).
- Read `src/lib/badges.ts` and collect every existing `imagePath`.
- Compare folder files against `BADGES[].imagePath`.
- Produce two lists:
  - **Associated assets:** image files already used by a badge.
  - **Unassociated assets:** image files present in `public/badges/` but missing from `BADGES`.

#### Step 8.2 — Collect user input for every unassociated asset

For each unassociated image, ask the user to provide:

| Field | Required? | Notes |
|---|---:|---|
| `slug` | Yes | Stable internal id. Prefer lowercase kebab-case. |
| BR label | Yes | `Badges_br.json` title. |
| EN label | Yes | `Badges_en.json` title. |
| BR description | Yes | Funny modal description. |
| EN description | Yes | Funny modal description. |
| Condition type | Yes | Must use one of the existing supported `BadgeCondition` types. |
| Condition params | Yes | Example: country code, years, minimum count. |

If a desired badge cannot be represented by an existing condition type, record it as blocked and ask whether to defer it or create a separate future phase for new condition support.

#### Step 8.3 — Add approved badges only

For each user-approved badge:
- Append one entry to `BADGES` in `src/lib/badges.ts`.
- Use the existing `imagePath` format: `/badges/<filename>`.
- Add one label key and one description key to `Badges_br.json`.
- Add matching keys to `Badges_en.json`.
- Keep existing badge entries untouched unless the user explicitly asks to revise them.

#### Step 8.4 — Validate

- Verify every `BADGES[].imagePath` exists in `public/badges/`.
- Verify every `labelKey` and `descriptionKey` exists in both BR and EN i18n files.
- Run TypeScript/tests appropriate for the change, at minimum `npx tsc --noEmit`; run `npm test -- --run` if the change touches badge logic.
- Manually inspect the badge modal if new badges are easy to trigger with existing profile metadata/picks.

### Files expected to change during execution

- `src/lib/badges.ts`
- `src/i18n/Badges_br.json`
- `src/i18n/Badges_en.json`

No other files should change unless Phase 8 execution discovers a necessary issue and the user approves expanding scope.

### Acceptance criteria

- [ ] `public/badges/` inventory is documented before edits are made
- [ ] Every unassociated badge image is either added as an approved badge or explicitly deferred
- [ ] New badge entries use the existing `BadgeConfig` shape
- [ ] New badge conditions use only existing `BadgeCondition` types
- [ ] Every new badge has BR + EN label and description keys
- [ ] No unrelated UI, database, or badge-display behavior changes
- [ ] TypeScript/tests pass after implementation

---

## Later ideas

See **[FUTURE_IDEAS.md](FUTURE_IDEAS.md)** for ideas that are nice-to-have and will be implemented if time permits after current planned work is complete.
