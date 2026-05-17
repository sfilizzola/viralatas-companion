<!-- Purpose: handle_new_user() trigger contract and the coalesce() warning. Load on demand when touching auth, signup, or the users table trigger. Long-form flow and full migration history → docs/ai-wiki/flows/authentication.md. -->

## Auth & trigger notes

The `handle_new_user()` database trigger fires `AFTER INSERT ON auth.users` (i.e. on every `auth.signUp()`) and provisions the corresponding `public.users` row. It runs `SECURITY DEFINER` so it can insert on behalf of a user that does not yet exist as far as RLS is concerned.

```sql
-- CRITICAL: Use coalesce() for is_test_user, NOT direct = 'true' comparison
coalesce(new.raw_user_meta_data->>'is_test_user' = 'true', false)
-- If field missing: null = 'true' → null → coalesce → false ✓
-- (Previous bug: null = 'true' → null → NOT NULL violation on public.users.is_test_user
--  → auth.users insert succeeded, public.users insert failed silently)
```

**Do NOT revert** this to `new.raw_user_meta_data->>'is_test_user' = 'true'`. It caused production failures where signup succeeded in `auth.users` but the `public.users` row was never created. Fix lives in migration `20260504000005_fix_handle_new_user_trigger.sql`.

## The four behaviors

1. **Inserts a `public.users` row** mirroring `auth.users`, copying `display_name`, `avatar_url`, and `preferred_language` from `raw_user_meta_data` (default `preferred_language = 'br'`).
2. **Sets `is_test_user`** from metadata via `coalesce(... = 'true', false)` (default `false`).
3. **Assigns `role`**: `'godlike'` for `sfilizzola@gmail.com`, `'normal'` for everyone else. The godlike email is hard-coded in the trigger — changing it requires a new migration.
4. **`ON CONFLICT (id) DO UPDATE`**: on re-run (e.g. test-user recreation), forces `role = 'godlike'` when `email = 'sfilizzola@gmail.com'`, otherwise **preserves the existing role** (so a promoted manager is not demoted back to normal).
