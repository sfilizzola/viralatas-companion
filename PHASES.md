# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 46 — Godlike Remote Lineup Sync

**Status:** 🚧 In progress

**Goal:** Godlike previews and applies Wacken official lineup changes to production `public.bands` from `/profile` on a phone — dry-run first, explicit confirm, slot moves migrate picks, `cache_version` bump. Solves camping scenario: Wacken updates running order, operator has no laptop.

**Local design artifacts (gitignored):**
- Spec: `docs/superpowers/specs/2026-07-07-godlike-remote-lineup-sync-design.md`
- Plan: `docs/superpowers/plans/2026-07-07-godlike-remote-lineup-sync.md`
- UI prototype: `docs/superpowers/prototypes/godlike-lineup-sync/lineup-sync-states.html`

**Operator flow (after ship):**
1. Godlike → Profile → Godlike Tools → **Lineup sync** (first section, above Clear cache)
2. **Check official lineup** → preview (no writes)
3. Review chips + optional accordion report + warnings
4. **Apply to production** → Edge Function applies plan + bumps `cache_version`

**Post-festival laptop reconcile (documented, not automated):**
```bash
npm run lineup:check-official -- --complete
npm run seed:bands:sync          # dry-run — should be empty
```

### UI (locked)

- **Ops strip** + **light B** accordion — amber godlike panel (`--role-godlike`), ~400px Tools width
- First child in Godlike Tools collapsible, above `CacheResetSection`
- Summary chips (**applicable counts only**); blocked rows in warnings + report only
- Accordion **Review details** — default collapsed when total changes > 3
- Applicable MOVE → warning banner; blocked MOVE → separate amber banner (partial apply still allowed)
- blocked DELETE → type `DELETE` before apply
- Success: applied + skipped counts; re-check nudge when skipped > 0
- States: idle, offline, loading, in sync, preview, applying, success, error/stale
- **Godlike-only** UI (same gate as Godlike Tools)

### Deliverables

| Area | Files |
|------|--------|
| Plan builder | `src/lib/lineup-remote-plan.ts` |
| Apply + pick migration | `src/lib/lineup-remote-apply.ts` |
| Tests | `src/__tests__/lineup-remote-plan.test.ts`, `lineup-remote-apply.test.ts` |
| Edge Function | `supabase/functions/lineup-sync/` (`preview` / `apply`, godlike-only) |
| UI | `src/components/profile/LineupSyncSection.tsx`, `GodlikeAdminPanel.tsx`, `ProfilePage.module.css` |
| i18n | `src/i18n/GodlikeAdmin_{br,en,es,de}.json` |
| DS | `public/vira-lata-ds.html` — `#ds-godlike-lineup-sync` |
| Wiki | `docs/ai-wiki/flows/lineup-remote-sync.md`, `lineup-sync.md` cross-link, `changelog.md` |

### Implementation tasks

1. **Types + mapping** — `slotIdToStageName`, unix→ISO, image policy, plan types
2. **`buildLineupPlan`** — UPDATE bucket (same `slot_id` metadata diff vs official feed)
3. **`buildLineupPlan`** — MOVE detection + **blocked moves** (destination picks unaccounted for)
4. **`buildLineupPlan`** — INSERT / DELETE; block deletes when picks/missed > 0
5. **Report + hash** — full plan hash (incl. blocked rows); 10 min single-use plan token
6. **`applyLineupPlan`** — snapshotted repoints, deferred MOVE deletes, **partial apply**; bump `cache_version`
7. **Edge Function** — godlike JWT; import `src/lib/` (+ CI serve smoke per ADR-0001)
8. **`LineupSyncSection`** — Ops strip UI per prototype; invoke Edge Function
9. **i18n** — 4 locales
10. **DS + wiki** — flow page, changelog, reconcile note
11. **Verify** — `rtk npm run build`, `rtk npm test`; edge-function-reviewer + offline-sync-auditor; manual godlike smoke on staging/prod

### Acceptance criteria

- [ ] Godlike-only: non-godlike gets 403 from Edge Function
- [ ] Preview fetches wacken.com JSON, diffs vs `public.bands`, writes nothing
- [ ] Preview shows UPDATE / MOVE / INSERT / DELETE buckets + pick impact
- [ ] Apply requires prior preview; stale official feed rejected (`plan_stale`)
- [ ] MOVE uses per-table pick snapshots (`pickUserIds`, `missedUserIds`) + deferred source deletes (swap-safe)
- [ ] Blocked moves detected when destination picks unaccounted for; excluded from apply + chip counts
- [ ] Partial apply skips blocked moves/deletes; success shows applied + skipped counts
- [ ] Plan token single-use; hash covers full plan; no HMAC secret (v1)
- [ ] Apply failure mid-run: best-effort sequential (CLI parity); operator re-previews
- [ ] MOVE repoints `user_picks`, `user_missed_bands`, `live_band_test_config`; deferred source row delete
- [ ] DELETE with picks blocked unless typed `DELETE` + `confirmDeletes: true`
- [ ] Successful apply bumps `app_config.cache_version`
- [ ] Policy parity: skip `HAR13`, `JUN*`; image patch rules match `lineup:check-official`
- [ ] `LineupSyncSection` first in Godlike Tools; matches locked UI / prototype states
- [ ] Unit tests cover plan buckets + move detection
- [ ] `rtk npm run build` + `rtk npm test` green
- [ ] Wiki + DS updated; post-festival laptop reconcile documented

### Out of scope

- Git writes (`lineup.md`, `bands.ts`) from phone
- Audit log table, push notify vira-latas, Realtime on `bands`
- Refactoring CLI `bands-sync` / `bands-move` to shared module (optional follow-up)

### Architectural notes

- **Source at apply time:** live wacken.com JSON vs `public.bands` — not local seed files; repo may drift until laptop reconcile
- **Offline-first unchanged:** UI does not read bands from Supabase; clients pick up lineup via existing `cache_version` invalidation on next load
- **Service role:** only in Edge Function — never on client
- **Apply order:** MOVE repoints + destination UPDATEs → deferred MOVE source DELETEs → UPDATEs → INSERTs → DELETEs
- **Partial apply:** safe buckets only; blocked moves/deletes skipped; `cache_version` bumps if anything applied
- **Blocked move:** destination band has picks/missed and is not elsewhere in plan → report only, not in chip count
- **Move pick snapshot:** per-table `user_id` sets captured at preview; repoint only snapshotted users (swap-safe)
- **Plan token:** 10 min TTL; hash + exp (no HMAC v1); full-plan hash; single-use; `plan_stale` on official drift only
- **Edge Function imports:** `src/lib/` direct + CI serve smoke (`docs/adr/0001-lineup-sync-shared-plan-module.md`)
- **Concurrency:** no DB revision gate — operator discipline (CLI parity)
- **Failure:** best-effort sequential apply; re-preview on error
- **Domain glossary:** `CONTEXT.md` — Remote lineup sync, Slot move, Blocked move, Partial lineup apply, Plan token

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.

**Next phase after 46:** 47
