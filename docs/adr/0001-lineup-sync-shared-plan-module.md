# Lineup-sync Edge Function imports shared plan module from `src/lib`

Phase 46 puts `buildLineupPlan` and `applyLineupPlan` in `src/lib/`. The `lineup-sync` Edge Function imports those files via a relative path into `src/` rather than maintaining a Deno-only duplicate under `supabase/functions/`.

**Considered options:** (A) direct import only, (B) vendored duplicate in the function folder, (C) direct import plus a CI guard that the function can resolve the same module/fixtures as Vitest.

**Decision:** C. One source of truth in `src/lib/`; Vitest remains the behavioral contract. CI or `supabase functions serve` smoke catches import breakage. Duplicate `planCore.ts` only as a last resort if Supabase deploy blocks `src/` imports.
