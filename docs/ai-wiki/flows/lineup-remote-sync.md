# Flow: Remote Lineup Sync (Godlike)

## Purpose

Let the godlike operator preview and apply Wacken's official running order against production `public.bands` from the PWA — without a laptop. Supports dry-run preview, partial apply (safe buckets only), slot moves with snapshotted pick repoints, and `cache_version` bump so all vira-latas refresh on next load.

## Relevant Source Files

| File | Role |
|------|------|
| `src/components/profile/LineupSyncSection.tsx` | Godlike UI — preview / apply |
| `src/components/profile/GodlikeAdminPanel.tsx` | Mounts section first in Godlike Tools |
| `src/lib/lineup-remote-plan.ts` | `buildLineupPlan`, report, hash |
| `src/lib/lineup-remote-apply.ts` | `applyLineupPlan`, cache bump |
| `src/lib/lineup-official-source.ts` | Fetch/filter official JSON |
| `supabase/functions/lineup-sync/index.ts` | Edge Function — `preview` / `apply`, godlike gate |
| `supabase/functions/lineup-sync/auth.ts` | Shared godlike JWT check |
| `supabase/seed/bands-move.ts` | Pick repoint reference (CLI) |
| `docs/ai-wiki/lineup-sync.md` | Laptop CLI operator tooling |
| `CONTEXT.md` | Domain glossary — Remote lineup sync, Slot move, Plan token |

## Flow

1. Godlike opens `/profile` → **Godlike Powers** → **Lineup sync** (first tool, above Clear cache).
2. **Check official lineup** → Edge Function `preview`:
   - Fetches wacken.com JSON + loads `bands`, picks, missed bands
   - Builds lineup plan (UPDATE / MOVE / INSERT / DELETE + blocked rows)
   - Returns summary chips (**applicable counts only**), report, `planToken` (10 min, single-use)
3. Operator reviews warnings (moves, blocked moves/deletes) and optional accordion report.
4. **Apply to production** → Edge Function `apply`:
   - Re-fetches official feed, rebuilds plan, compares hash to token (`plan_stale` if mismatch)
   - Partial apply: runs non-blocked buckets; skips blocked moves; skips blocked deletes unless typed `DELETE` + `confirmDeletes`
   - MOVE phase: snapshotted repoints → destination UPDATE → deferred source DELETEs
   - Bumps `app_config.cache_version`
5. Success UI shows applied + skipped counts. Operator must preview again before next apply.

**Offline:** Check/apply disabled when `!navigator.onLine`.

**CLI parity:** Plan builder shares `lineup-official-source.ts` with `lineup:check-official` — `namesEquivalent` for band names; `Name=TBD` official slots are not INSERTed (wiki/seed omit them; see `isDroppedTbdOfficialSlot`). Jungle is **not** policy-skipped (only `HAR13`). When CLI dry-runs are empty, godlike preview should report in sync unless a real MOVE/DELETE is pending.

## Safety rails

| Risk | Mitigation |
|------|------------|
| Non-godlike access | Edge Function 403; UI hidden |
| Accidental apply | Preview then apply; no auto-run |
| Stale official feed | `plan_stale` on hash mismatch at apply |
| Displaced-band corruption | Blocked moves when destination picks unaccounted |
| DELETE pick loss | Blocked by default; typed `DELETE` |
| Swap pick collisions | Per-move pick snapshots at preview time |
| Service role on client | Edge Function only |

## Post-festival laptop reconcile

Remote sync updates production DB only. Git-tracked files may drift until:

```bash
npm run lineup:check-official -- --complete
npm run seed:bands:sync          # dry-run — should be empty
```

## Testing

- Unit: `src/__tests__/lineup-remote-plan.test.ts`, `lineup-remote-apply.test.ts`
- Edge: non-godlike → 403; preview → no DB writes; apply → `cache_version` bump
- Manual: preview on prod (read-only); first **apply** on staging; SQL pick counts before/after

## Cross-references

- [lineup-sync.md](../lineup-sync.md) — CLI `seed:bands:sync` / `bands-move`
- [lineup-official-source.md](../lineup-official-source.md) — JSON policy
- `docs/adr/0001-lineup-sync-shared-plan-module.md` — Edge imports `src/lib/`

## Open questions

- _(none — apply semantics locked grill session 2026-07-07)_

**Last updated:** 2026-07-07 — CLI parity: `namesEquivalent` name diffs; skip TBD INSERTs (`isDroppedTbdOfficialSlot`).
