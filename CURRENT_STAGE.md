# CURRENT_STAGE.md — Phase 1 Local Run Verification

**Goal:** Confirm that Phase 1 acceptance criteria are fully met before moving to Phase 2.  
**Status:** Scaffolding complete. Needs environment wiring and manual smoke-test.

---

## Phase 1 acceptance criteria (from MAIN_STAGES.md)

- [ ] User can register and log in
- [ ] On second visit with DevTools → Network → Offline, the app shell loads without errors
- [ ] No unhandled promise rejections in the console

---

## What is already done

| Item | Status |
|---|---|
| Vite 7 + React + TypeScript project | Done |
| `vite-plugin-pwa` + Workbox generateSW | Done |
| Supabase client with IndexedDB-backed session | Done |
| `src/lib/db.ts` — IndexedDB helpers | Done |
| `src/lib/supabase.ts` — custom storage adapter | Done |
| `src/lib/supabase.types.ts` — hand-written DB types | Done |
| Login / Register / Profile pages (dark theme, CSS Modules) | Done |
| `PrivateRoute` component | Done |
| `src/hooks/useAuth.ts` | Done |
| `supabase/migrations/…_initial_schema.sql` | Done |

---

## Steps to run locally

### 1. Create a Supabase project (if not done yet)
- Go to supabase.com → New project
- Note your **Project URL** and **anon key** (Settings → API)

### 2. Apply the migration
```bash
# Option A — Supabase CLI (preferred)
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# Option B — paste manually
# Copy supabase/migrations/20240101000000_initial_schema.sql
# into the Supabase dashboard → SQL editor → Run
```

### 3. Create `.env.local`
Create a file at the project root with:
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Start the dev server
```bash
npm run dev
```
Open http://localhost:5173

### 5. Smoke-test register + login
- [ ] Go to `/register` → create an account → redirects to profile
- [ ] Log out → go to `/login` → sign in → redirects to profile
- [ ] Profile page shows display name / avatar initial
- [ ] No console errors or unhandled promise rejections

### 6. Verify offline shell
- [ ] In Chrome DevTools → Network tab → throttle to **Offline**
- [ ] Reload the page — app shell (login screen) must load without errors
- [ ] No network requests should be failing (Service Worker serves the cached shell)

> Note: the dev server does not register the Service Worker by default.  
> Run `npm run build && npm run preview` to get a production build with the SW active,  
> then test offline with the preview server.

---

## Known blockers

| Blocker | Owner |
|---|---|
| `.env.local` not created — app cannot connect to Supabase | You |
| Supabase migration not applied — register/login will fail | You |

---

## Ready to move to Phase 2?

Check all boxes above and confirm:
- Registration and login work end-to-end
- Offline shell loads after `npm run preview` with DevTools → Offline
- No console errors

Once confirmed, mark Phase 1 complete in `MAIN_STAGES.md` and update `CURRENT_STAGE.md` for Phase 2.
