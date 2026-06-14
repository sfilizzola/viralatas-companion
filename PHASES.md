# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`  
**Design spec** → `docs/superpowers/specs/2026-06-14-mural-reactions-design.md`  
**Implementation plan** → `docs/superpowers/plans/2026-06-14-mural-reactions.md`

---

## Phase 43 — Mural Reactions

> **Execution mode:** subagent-driven-development. Fresh implementer subagent per sub-phase.  
> Steps use checkbox syntax for tracking.

**Goal:** Add emoji reactions to announcements on `/announcements`. Users tap one of 8 fixed emojis to react to a post. Tapping again removes the reaction. Reactions are optimistic (IDB-first), sync to Supabase, propagate via Realtime, and queue offline exactly like band ratings (toggle) with duck-style reconnect flush.

**Closest precedents:**
- `ratingsRepository` — toggle INSERT/DELETE, `byId` offline dedup, Realtime, `syncCrewFromRemote`
- `duckRepository` — offline queue flush in `runReconnectSync()`
- Read `docs/ai-wiki/flows/duck.md` and `src/repositories/ratings.ts` before Task 1

**Tech stack:** Supabase PostgreSQL + RLS + Realtime, IndexedDB (idb), React + CSS Modules, i18n (br/en/es/de), Vitest.

---

### Locked decisions — do not re-open

| Decision | Value |
|---|---|
| Emoji set | Fixed 8: 🤘 🍺 🐶 💀 🔥 😂 👎 👍 — no open picker |
| Toggle semantics | Same user + same emoji + same post = DELETE existing row |
| Composite PK | `(announcement_id, user_id, emoji)` |
| Aggregate strategy | Client-side: derive counts from raw IDB rows |
| Reaction on own post | Allowed |
| Reactions on deleted posts | Hidden with post (CASCADE + local purge) |
| Offline behaviour | Queue to `offline_announcement_reactions`; flush in `runReconnectSync()` |
| Offline dedup | `byId` on `${announcement_id}\|${user_id}\|${emoji}` (ratings pattern) |
| Realtime | Subscribe in `RealtimeSync.tsx` |
| UI placement | Below `styles.body`, above mod controls |
| Pill sort | Count descending; ties → fixed emoji-set order |

---

### Prerequisites (read before 43.A)

1. `docs/ai-wiki/flows/announcements.md`
2. `docs/ai-wiki/flows/duck.md`
3. `docs/ai-wiki/supabase-schema.md`
4. `src/repositories/ratings.ts`
5. `src/repositories/announcements.ts`
6. `src/hooks/useAnnouncements.ts`
7. `src/components/sync/RealtimeSync.tsx`
8. `src/lib/syncCoordinator.ts` (not `services/time.ts`)
9. `src/lib/db/connection.ts`

---

### 43.A — Database + IDB stores

**Files:**
- Create: `supabase/migrations/20260614000000_phase43_announcement_reactions.sql`
- Create: `src/lib/db/reactions.ts`
- Modify: `src/lib/db/types.ts`, `connection.ts`, `index.ts`

- [ ] Create `announcement_reactions` table with CHECK, index, RLS (SELECT authenticated, INSERT/DELETE own), Realtime publication
- [ ] Bump IDB version 11 → 12
- [ ] Add `announcement_reactions` store — key `[announcement_id, user_id, emoji]`, index `by_announcement`
- [ ] Add `offline_announcement_reactions` store — key `id`, fields `op: 'add' | 'remove'`
- [ ] IDB tests in `db.test.ts`
- [ ] Delegate `migration-validator` subagent

---

### 43.B — Repository + offline queue

**Files:**
- Create: `src/repositories/reactions.ts`
- Modify: `src/repositories/index.ts`, `src/lib/syncCoordinator.ts`
- Modify: `src/repositories/announcements.ts` — orphan reaction purge on delete
- Create: `src/__tests__/reactionsRepository.test.ts`

- [ ] `reactionsRepository.toggle()` — IDB optimistic INSERT/DELETE, Supabase or offline queue
- [ ] `flushOfflineQueue()` — `createOptimisticQueue` with `byId` dedup
- [ ] `syncFromRemote()` — full pull → `replaceAllAnnouncementReactions()`
- [ ] `subscribeToRealtime()` — INSERT/DELETE → IDB + `ANNOUNCEMENTS_CHANGED_EVENT`
- [ ] `syncCoordinator`: flush announcements **then** reactions; pull announcements **then** reactions
- [ ] Include `reactionsFlushed` in reconnect toast total
- [ ] TDD: toggle online/offline, flush, realtime handlers

---

### 43.C — Hook extension

**Files:**
- Modify: `src/hooks/useAnnouncements.ts`
- Modify: `src/services/announcementsDisplay.ts` (summary builder)
- Test: `src/__tests__/useAnnouncements.test.ts`

- [ ] `AnnouncementReactionSummary` type with `emoji`, `count`, `reactedByMe`, `reactors[]`
- [ ] Extend feed announcements with `reactions[]`
- [ ] `buildReactionSummaries()` — count-desc sort, A→Z reactor names
- [ ] Expose `toggleReaction(announcementId, emoji)`
- [ ] Re-run on `ANNOUNCEMENTS_CHANGED_EVENT`

---

### 43.D — UI components

**Files:**
- Create: `src/components/announcements/ReactionBar.tsx` + `.module.css`
- Create: `src/components/announcements/EmojiPicker.tsx` + `.module.css`
- Modify: `src/pages/AnnouncementsPage.tsx`
- Modify: `src/i18n/{br,en,es,de}.ts`

- [ ] ReactionBar: pills (count ≥ 1) + `＋`; accent if `reactedByMe`; `title` + long-press tooltip
- [ ] EmojiPicker: 4×2 grid, active indicator for user's reactions, inline above bar
- [ ] Mount between post body and mod controls
- [ ] i18n aria: `reactionAdd`, `reactionCount`, `reactionPicker`

---

### 43.E — Realtime + reconnect

**Files:**
- Modify: `src/components/sync/RealtimeSync.tsx`
- Test: `src/__tests__/RealtimeSync.test.tsx`, `syncCoordinator.test.ts`

- [ ] Mount `reactionsRepository.subscribeToRealtime()` in `RealtimeSync`
- [ ] Verify offline → reconnect → crew sees reaction within ~3s

---

### 43.F — Wiki + close

- [ ] Delegate `wiki-curator`: changelog, announcements flow, supabase-schema, architecture, `vira-lata-ds.html` (remove "no reactions")
- [ ] Delegate `offline-sync-auditor` on db/reactions + repository + syncCoordinator
- [ ] Delegate `phase-closer`: build + tests, commit, version bump
- [ ] Append `phases-history.md`; reset this file to **Next phase: 44**

---

### Acceptance criteria

- [ ] Tapping 🤘 shows highlighted pill within 50ms (optimistic IDB)
- [ ] Tapping 🤘 again removes reaction (toggle)
- [ ] Crew sees reaction within ~3s (Realtime)
- [ ] Reaction survives offline → reconnect
- [ ] Deleted posts hide reactions (no orphans)
- [ ] Zero reactions → only `＋` visible
- [ ] Pill order: count desc, ties → emoji order
- [ ] All 4 locales have aria strings
- [ ] `migration-validator` passes
- [ ] All new tests pass; no regressions

---

### Out of scope (v1)

- Reactions on Popular or Wrap
- Push on reaction
- Reaction badges
- Open emoji picker
- Godlike admin analytics

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
