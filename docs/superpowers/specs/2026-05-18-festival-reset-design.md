# Festival Reset Script — Design

**Date:** 2026-05-18
**Status:** Approved — ready to implement
**Owner:** sfilizzola
**Target:** Run once before/at Wacken 2026 festival start (2026-07-29)

---

## Problem

When Wacken 2026 actually starts, the production database is full of pre-festival exploratory state: practice picks, achievement badges earned against placeholder bands, manually assigned badges, announcement-board posts that were written before "go time," and presence check-ins from people testing the camping/Metal Place flow. The crew needs a clean slate at festival start so that the live counts, badges, and announcement mural reflect the festival itself rather than two months of pre-game.

In parallel, the band lineup needs to be re-seeded with the real (finalized) data from `docs/ai-wiki/lineup.md`.

---

## Goals

1. Wipe pre-festival "user activity" state without touching profile data.
2. Re-seed the bands table with the finalized lineup as part of the same operation (opt-in).
3. Be safe to run once, safe to re-run, and obviously destructive (so it can't be triggered casually).
4. Keep the surface area of this one-time operation off the in-product UI — no permanent godlike button that someone could fat-finger from a phone at the festival.
5. Make clients converge automatically (no "hard refresh required" instructions to the crew).

## Non-goals

- Building any in-product reset UI.
- Modifying the existing godlike "Reset all data" cache-version bump button (it stays as-is).
- Migrating data, archiving anything, or providing an undo path. This is destructive by design.
- Resetting godlike-set operational config (`metal_place_config`, `live_band_test_config`) — godlike will set those fresh in the days leading up to the festival.
- Adding new badge logic, new Edge Functions, or new migrations.

---

## Architecture

Single Node-runnable script in `supabase/seed/`, executed via npm, holding the service-role key from `.env.local`. Communicates with Supabase over the standard JS client using the admin auth API for `auth.users` and standard PostgREST writes for `public.*` tables. No new server-side code, no migrations, no UI.

```
operator's laptop
     │
     ▼
npm run festival:reset [--with-bands] [--dry-run] [--force]
     │
     ▼
supabase/seed/festival-reset.ts
     │  (service-role key)
     ▼
Supabase
  ├── public.announcements        DELETE all
  ├── public.blocked_posters      DELETE all
  ├── public.user_presence        DELETE all
  ├── public.users                UPDATE special_badges = '{}'
  ├── auth.users (raw_user_meta_data)
  │       strip: achieved_badge_slugs, crew_earned_badge_slugs, location_visits
  │       keep:  everything else (wacken_years, wacken_arrival_day, push subs, …)
  ├── public.cache_version        BUMP
  └── (optional) public.bands     replaced via existing bands.ts seed
                                  └─ CASCADE wipes user_picks + user_missed_bands
```

Clients converge through two mechanisms:
- **Realtime publications** on `announcements`, `user_presence`, `user_picks` push the DELETEs to connected sessions immediately.
- **`cache_version` bump** forces clients to re-fetch on next app load, catching anything that fell through (e.g. badges, which are derived from `auth.users` metadata and don't have their own realtime publication).

---

## Command surface

**File:** `supabase/seed/festival-reset.ts`

**`package.json` addition:**

```json
"festival:reset": "tsx supabase/seed/festival-reset.ts"
```

**Invocations:**

| Command | Behavior |
|---|---|
| `npm run festival:reset` | State-only wipe (badges + announcements + blocked + presence + cache bump). 5-second countdown. No band changes. |
| `npm run festival:reset -- --with-bands` | State wipe **then** bands re-seed using the finalized lineup. |
| `npm run festival:reset -- --dry-run` | Pre-flight summary only. Writes nothing. Countdown skipped. Compatible with `--with-bands` (shows what bands.ts would do without invoking it). |
| `npm run festival:reset -- --force` | Skip the 5-second countdown. Combinable with `--with-bands`. |

Flag combinations are commutative.

---

## Execution sequence

1. **Env load** — read `.env.local`, require `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Hard-fail with a clear error if either is missing.
2. **Pre-flight summary** — query and print:
   - Total users (auth + public)
   - Announcements row count
   - Blocked posters row count
   - User presence row count
   - Users with non-empty `special_badges`
   - Users with at least one of the three persistent badge keys in their metadata
   - (If `--with-bands`) current bands row count
3. **Confirmation barrier** — unless `--force` or `--dry-run`, print a banner explaining what's about to be destroyed and sleep 5 seconds with a visible countdown.
4. **Wipe announcements** — `DELETE FROM public.announcements`. Assert post-condition: count = 0.
5. **Wipe blocked posters** — `DELETE FROM public.blocked_posters`. Assert count = 0.
6. **Wipe user presence** — `DELETE FROM public.user_presence`. Assert count = 0.
7. **Clear assigned badges** — `UPDATE public.users SET special_badges = '{}'`. Assert: no rows with non-empty `special_badges`.
8. **Strip persistent badge metadata** — for every user returned by `supabase.auth.admin.listUsers()` (paginated):
   - Read `user.user_metadata`.
   - Build a copy with `achieved_badge_slugs`, `crew_earned_badge_slugs`, and `location_visits` keys removed (do NOT overwrite the whole object — preserve everything else).
   - If the metadata changed, call `supabase.auth.admin.updateUserById(id, { user_metadata: stripped })`.
   - Skip the API call when no relevant keys exist (avoids unnecessary writes).
   - Track success/skip/fail counts; surface failures at the end of the run.
9. **Bump `cache_version`** — reuse the Phase 4 mechanism that the godlike "Reset all data" button uses. Verified storage shape: `public.app_config` row with `key = 'cache_version'` and `value = <ISO timestamp string>`. The script writes a fresh timestamp directly:
   ```ts
   await supabase
     .from('app_config')
     .update({ value: new Date().toISOString() })
     .eq('key', 'cache_version');
   ```
   The script does NOT call `bandsRepository.invalidateCacheForAllUsers()` because that function also wipes the operator's local IndexedDB — irrelevant and undesirable from a Node script.
10. **If `--with-bands`** — import the bands seed's main function and run it with `force: true` (the festival reset has already done its own confirmation). The bands script wipes `bands` → CASCADEs to `user_picks` + `user_missed_bands` → inserts new lineup. If invocation by import is not trivial, fall back to spawning `tsx supabase/seed/bands.ts --force` as a subprocess; either approach is acceptable.
11. **Final summary** — print before/after counts and exit code 0 on success. Exit non-zero on any post-condition failure.

In `--dry-run` mode: steps 4-10 are skipped; the script prints "would delete N announcements / would clear N assigned-badge arrays / would strip metadata from N users / would bump cache_version / (would re-seed bands)" and exits 0.

---

## Scope guard — explicit lists

**Wiped (intended):**
- `public.announcements` (all rows)
- `public.blocked_posters` (all rows)
- `public.user_presence` (all rows)
- `public.users.special_badges` (cleared for all users, row preserved)
- `auth.users.raw_user_meta_data.achieved_badge_slugs` (key removed)
- `auth.users.raw_user_meta_data.crew_earned_badge_slugs` (key removed)
- `auth.users.raw_user_meta_data.location_visits` (key removed)
- `public.cache_version` (bumped, not wiped)
- **Only with `--with-bands`:** `public.bands` (replaced), and via CASCADE: `public.user_picks` + `public.user_missed_bands`

**Preserved (never touched):**
- `public.users` row itself (no deletes)
- `public.users` columns: `role`, `display_name`, `email`, `avatar_url`, `country`, `is_friend`, `crew_role`, every other column
- `auth.users` rows themselves (no deletes; only metadata patched)
- `auth.users.raw_user_meta_data` keys: `wacken_years`, `wacken_arrival_day`, push subscription fields, language preference, every key not on the strip list
- `public.bands` (without `--with-bands`)
- `public.user_picks` (without `--with-bands`)
- `public.user_missed_bands` (without `--with-bands`)
- `public.metal_place_config`
- `public.live_band_test_config`
- Any new table added in future phases not listed here

When implementing, the strip list for `auth.users` metadata must be a positive allow-list inversion: literally `delete copy.achieved_badge_slugs; delete copy.crew_earned_badge_slugs; delete copy.location_visits;` — never `setUserMetadata({ wacken_years, wacken_arrival_day })`. The latter would silently drop any future metadata key.

---

## Edge cases and failure modes

| Scenario | Behavior |
|---|---|
| `.env.local` missing service role key | Hard-fail with clear "missing SUPABASE_SERVICE_ROLE_KEY" before any writes |
| Script run with no `auth.users` (empty project) | Steps 4-7 affect 0 rows, step 8 lists 0 users, step 9 still bumps cache, exits 0 |
| `supabase.auth.admin.listUsers()` returns more than 1 page | Paginate; the crew is ~20 people so 1 page in practice, but implementation must paginate defensively |
| `updateUserById` fails for a single user (network blip) | Log and continue; surface count of failures at the end; non-zero exit code if any failure |
| Re-run after a successful run | Pre-flight shows zeros, all DELETEs return 0, step 8 finds no users with the stripped keys (skips API calls), cache_version still bumps once. Idempotent. |
| `--with-bands` invoked but `lineup.md` / `bands.ts` has a syntax error | The state wipe still completes; bands re-seed fails loudly; operator can re-run with `--with-bands` after fixing |
| User has push subscription stored in `user_metadata` (Phase ??) | Preserved — those keys are not on the strip list |
| Realtime client receives DELETE event mid-festival reset | UI updates immediately. Briefly clients may see "0 announcements" before the operator finishes the reset, but that's fine — the reset is a deliberate festival-start event the crew is aware of |
| Two operators run the script concurrently | DELETEs are idempotent and conflict-free; metadata strip uses last-write-wins per user. Worst case is a double cache_version bump. Don't recommend it but it won't corrupt anything |
| `app_config` row missing or schema changed | The script's `.update().eq('key', 'cache_version')` returns 0 affected rows; emit a loud warning but don't fail the run (the data wipe already succeeded; clients will eventually catch up on natural reload) |

---

## Implementation notes

- **Pattern source:** model the script on `supabase/seed/bands.ts` — same env loader, same `--force` semantics, same "verify post-condition" pattern, same exit codes.
- **No new dependencies.** `@supabase/supabase-js` is already a dep; the admin API ships with it.
- **Logging style:** match the existing seed scripts (banner, sectioned output, ✓ markers per step are fine but optional — match what `bands.ts` does).
- **No CLI parsing library.** `process.argv.includes('--force')` etc., consistent with the codebase.
- **No tests required.** This is a destructive ops script with no pure logic worth unit-testing; the post-condition assertions inside the script are the verification.
- **Single file, single concern.** No helpers extracted into `src/lib/`.

---

## Risk assessment

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Accidental run by another developer | Low | Catastrophic (irreversible wipe) | Service-role key required (not in repo); 5s countdown; loud banner; descriptive script name |
| Strip-list overshoot drops a future metadata key | Low | High | Positive-strip pattern (delete known keys) instead of allow-list overwrite |
| Bands seed runs against wrong env | Low | Catastrophic | Inherits bands.ts's existing safety; festival-reset just passes through |
| Cache version bump fails silently | Medium | Medium (clients show stale state until manual refresh) | Verify post-condition; warn loudly on failure |
| Forgotten table added in future not wiped | Medium | Low (stale state for that table only) | Listed scope guard above + wiki page documenting the contract |
| Operator runs without `--with-bands` and forgets to seed separately | Medium | Medium (badges/announcements wiped but bands stale until they remember) | Print a reminder in the final summary when `--with-bands` was NOT passed |

---

## Documentation deliverables (per CLAUDE.md)

After implementation:

- **`docs/ai-wiki/changelog.md`** — dated entry under `### Added` describing the new script and its scope.
- **New wiki page `docs/ai-wiki/festival-reset.md`** — short page (~1 screen) covering:
  - What the script does and when to run it
  - Exact scope guard (what's wiped vs preserved)
  - Flag matrix
  - Pointer to this design doc
  - Linked from `docs/ai-wiki/index.md` under operational tooling
- **No `Design System.html` update** — zero UI surface area.
- **No migration files.**
- **No PHASES.md change** unless the operator decides to bundle this as Phase 22's first deliverable.

---

## Subagent delegation plan

Per CLAUDE.md's "delegate when the trigger matches" rule:

| Subagent | Trigger match? | Use during this work? |
|---|---|---|
| `wiki-curator` | "After any meaningful code change and before phase close" — exact match | **Yes** — after implementation, before commit, to sync changelog + new wiki page |
| `migration-validator` | "Any change under `supabase/migrations/`" — no migrations created | No |
| `edge-function-reviewer` | "Changes under `supabase/functions/`" — no Edge Functions | No |
| `badge-author` | "Add badge X" or `src/services/badges/` changes — only clears badge state, doesn't add | No |
| `offline-sync-auditor` | "Changes to `src/lib/db.ts`, sync engine, or repositories" — script is outside `src/` | No |
| `pwa-auditor` | "Changes to `src/workers/sw.ts`, manifest" — none | No |
| `phase-closer` | "On 'close phase N'" — only if user explicitly closes a phase containing this work | Maybe later |

---

## Acceptance criteria

1. `npm run festival:reset -- --dry-run` runs end-to-end and prints a complete pre-flight summary without writing.
2. `npm run festival:reset -- --force` (against a non-empty dev database) wipes the four data domains, strips the three metadata keys from every user, bumps cache_version, preserves every other state listed in the "Preserved" scope guard, and exits 0.
3. `npm run festival:reset -- --with-bands --force` does all of the above and then runs the bands re-seed, ending with the finalized lineup in `public.bands`.
4. Running the script twice in a row succeeds both times.
5. After a run, an active client session sees realtime DELETEs for announcements/presence and re-fetches user data on next reload (cache version bump verified).
6. Wiki page exists and matches the script's actual behavior. Changelog updated.
