<!-- Purpose: handle_new_user() trigger contract and the coalesce() warning. Load on demand when touching auth, signup, or the users table trigger. -->

## Auth & trigger notes

The `handle_new_user()` database trigger fires on every `auth.signUp()`:

```sql
-- CRITICAL: Use coalesce() for is_test_user, NOT direct = 'true' comparison
coalesce(new.raw_user_meta_data->>'is_test_user' = 'true', false)
-- If field missing: null → coalesce → false ✓
-- (Previous bug: null = 'true' → null → NOT NULL violation)
```

**Do NOT revert** this to `new.raw_user_meta_data->>'is_test_user' = 'true'`. It caused production failures where signup succeeded but the users table insertion failed silently.

The trigger also:
1. Sets `role = 'godlike'` for `sfilizzola@gmail.com`
2. Sets `role = 'normal'` for all other users
3. Sets `preferred_language` from metadata (default: `'br'`)
4. Handles upserts without overwriting existing roles
