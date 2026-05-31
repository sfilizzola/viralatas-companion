# Godlike Admin Tool — Separate Web App Design

**Status:** Design approved (2026-05-31)  
**Scope:** Separate web app for godlike user to manage all admin configuration currently in `/profile` GodlikeAdminPanel  
**Tech Stack:** React + Vite (lightweight), Supabase JS SDK, plain CSS modules  
**Deployment:** Separate Git repo, separate domain, independent CI/CD  

---

## Overview

A dedicated admin web application for the godlike user (`sfilizzola@gmail.com`) to configure festival settings, run tests, and manage data. Separate from the main app to achieve:
- **Architectural separation:** Admin tooling isolated from user-facing features
- **Independent deployment:** Can host on separate domain/infrastructure
- **Simplified auth:** Reuses Supabase email/password auth from main app

---

## Architecture & Deployment Model

### Repo Structure
- **Separate Git repository** (e.g., `viralatas-admin`)
- **Independent build pipeline** (Vite configuration separate from main app)
- **Independent deployment** (GitHub Actions, deploy to admin domain)

### Authentication
- **Auth method:** Supabase email/password (reuses godlike user credentials)
- **Session management:** Supabase JS SDK handles session persistence
- **Access control:** On app load, check if logged-in user email matches hardcoded godlike email (`sfilizzola@gmail.com`)
  - If match: unlock all admin features
  - If no match or not logged in: show "access denied" screen with login form
- **Logout:** Standard logout flow clears Supabase session

### Hosting & Deployment
- **Domain:** Separate from main app (e.g., `admin.viralatas.com` or `admin-panel.viralatas.com`)
- **Host:** Netlify, Vercel, or same infrastructure as main app (separate deployment)
- **CI/CD:** GitHub Actions workflow in admin repo
  - Trigger: push to `main` branch
  - Steps: lint → build → test → deploy
  - Pre-flight checks: build passes, tests pass, no secrets in code
- **Rollback:** Independent — rolling back admin app does not affect main app

### Shared Backend
- **Supabase:** Same project as main app
- **Tables accessed:** `metal_place_config`, `live_band_test_config`, `user_badge_history`, `users`
- **Realtime:** Subscriptions to `metal_place_config` and `live_band_test_config` for live updates
- **Environment variables:** Same as main app (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) + new `VITE_GODLIKE_EMAIL`

---

## UI Organization & Navigation

### Layout
- **Single-column, desktop-first** (admin tool, not mobile-optimized)
- **Header:** App title, godlike user email, logout button
- **Main content:** 4 collapsible sections, each with brief description

### Section A: Testing Tools (6 functions)
**Description:** Trigger events, configure test modes, and validate features.

1. **Test Quack** — Send a test duck notification to self (cooldown: 15s)
2. **Test Push** — Send a test web push notification (shows "Sent ✓" or error)
3. **Time Travel** — Shift festival date forward/backward to test schedules and badge conditions
4. **Live Band Test** — Configure which band is "live now" for testing presence/alerts
5. **Metal Place Test** — Toggle metal place test mode on/off + configure test settings
6. **Feature Flags** — Toggle duck notification feature globally (affects all users)

**Interaction:** Each has a button, toggle, or form input. Results show instant feedback or error messages.

### Section B: Data Management (2 functions)
**Description:** Manage cache and data consolidation.

1. **Cache Reset** — Clear IndexedDB cache (shows confirmation + timestamp)
2. **Badge Consolidation** — Merge duplicate badges for a user

**Interaction:** Buttons with confirmation dialogs. Results show "Success" or error.

### Section C: Badge Testing (1 function)
**Description:** Add test badges to verify badge rendering and conditions.

1. **Test Badges** — Create test badges on godlike user's account (select badge, optionally set year)

**Interaction:** Dropdown to select badge, button to add. Shows success confirmation.

### Section D: User Management (1 function)
**Description:** Manage test user accounts (servants).

1. **Manage Servants** — List, create, and delete test user accounts for testing vira-lata interactions

**Interaction:** Table of test users with "create" and "delete" buttons. Shows confirmation on delete.

---

## Data Flow & Supabase Integration

### Read Operations
- **`metal_place_config`** (Realtime subscribed) — Read test mode status, zone configuration
- **`live_band_test_config`** (Realtime subscribed) — Read active band ID, test mode status
- **`users`** — List test users for management
- **`user_badge_history`** — View badges on godlike user

### Write Operations
- **`metal_place_config`** — Toggle test mode, update zone config
- **`live_band_test_config`** — Set active band ID, toggle test mode
- **`user_badge_history`** — Add test badges
- **`users`** — Create/delete test users (via Edge Function or direct insert)

### Realtime Sync
- Admin app subscribes to `metal_place_config` and `live_band_test_config`
- When main app or another admin instance updates these tables, changes reflect instantly in UI
- No polling; Supabase Realtime handles subscriptions

### Edge Functions (for complex operations)
- **Time Travel** — May invoke a custom Edge Function to shift festival date (TBD)
- **Cache Reset** — May invoke an Edge Function to clear distributed caches (TBD)
- **Test Push** — Invokes existing `send-test-push` Edge Function from main app

### Result Display
- **Toggle operations** (feature flags, test modes) → Instant visual feedback (button state changes)
- **Test notifications** → Success/error message displayed for 5–6 seconds
- **Data mutations** (add badge, delete user) → Confirmation message + data refresh
- **Errors** → Show error message with reason (e.g., "User not found", "Network error")

---

## Tech Stack & Build Configuration

### Core Dependencies
- **React** 18+ (same version as main app for consistency)
- **Vite** (same build tool and config style as main app)
- **TypeScript** (same language discipline)
- **@supabase/supabase-js** — Auth + database client
- **Plain CSS modules** or **Tailwind CSS** (minimal, no component library bloat)

### Excluded (vs. Main App)
- Service Worker / PWA layer (admin tool, not offline-first)
- IndexedDB (Supabase is single source of truth)
- Workbox / offline caching
- i18n (English-only for admin)
- Design system / badge components (admin has simple UI)

### Build Output
- Target: **~300–400 KB gzipped** (lightweight, but not minimal)
- Tree-shaking: Aggressive (remove unused React/Supabase code)
- Minification: Enabled
- Source maps: Included for debugging

### Environment Variables
```
VITE_SUPABASE_URL=<same as main app>
VITE_SUPABASE_ANON_KEY=<same as main app>
VITE_GODLIKE_EMAIL=sfilizzola@gmail.com
```

### Code Reuse Strategy
**Start:** Copy relevant utilities from main app (e.g., `src/lib/supabase.ts`, auth hooks)
**Later:** If admin app grows, extract shared code into private npm package and publish to npm registry
**Never:** Share source code via Git submodules or monorepo (keep repos independent)

---

## Deployment & CI/CD Pipeline

### Repository
- **Name:** `viralatas-admin` (suggested; user decides)
- **Visibility:** Private (admin tool, not public)
- **Default branch:** `main`

### GitHub Actions Workflow
**Trigger:** Push to `main` branch

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies (`npm ci`)
4. Lint code (`npm run lint`)
5. Build (`npm run build`)
6. Run tests (`npm run test`)
7. Deploy to hosting (Netlify/Vercel/custom)

**Failure handling:** If any step fails, deployment stops and notifies (email, Slack, etc.)

**Deployment target:**
- **Domain:** Admin domain (e.g., `admin.viralatas.com`)
- **SSL/HTTPS:** Required
- **Environment variables:** Injected at deploy time (not in repo)

### Rollback
- **Manual:** Go to Netlify/Vercel dashboard, select previous deployment, click "Rollback"
- **Automatic:** Not set up initially; can add if needed later

### Frequency
- No scheduled deployments
- Deploy on demand (push to `main`)

---

## Testing Strategy

### Unit Tests (Vitest)
- Auth logic: Supabase session setup, email check, access control
- Component behavior: Button clicks, form submissions, state changes
- Data transformation: Time travel calculations, badge conditions, etc.
- Error handling: Network failures, validation errors

### Integration Tests
- **Auth flow:** Log in with godlike email → features unlock; log in with non-godlike email → access denied
- **Realtime sync:** Update `metal_place_config` in admin app → verify change in Supabase and vice versa
- **Data mutations:** Add test badge → verify it appears in user's badge history
- **Error handling:** Network timeout → show error message; user recovers by retrying

### Manual Testing Checklist (Before Release)
- [ ] All 10 functions work end-to-end
- [ ] Realtime sync works with main app (if applicable)
- [ ] Non-godlike user sees "access denied"
- [ ] Logout flow works
- [ ] All error messages are clear
- [ ] No console errors or warnings
- [ ] Performance is acceptable (page load < 3s)

### CI/CD Includes Tests
- Tests run on every push (before deployment)
- Deployment fails if tests fail
- No manual approval gate (fully automated)

---

## Dependencies & Constraints

### Must-Have (All 10 Functions)
All 10 admin functions are critical and must be included in initial release:
1. Test Quack
2. Test Push
3. Time Travel
4. Live Band Test
5. Metal Place Test
6. Feature Flags
7. Cache Reset
8. Badge Consolidation
9. Test Badges
10. User Management

### Nice-to-Have (Future)
- Admin audit log (track who made changes and when)
- Scheduled tasks (e.g., auto-reset cache daily)
- Role-based access (multiple admin users with different permissions)
- Dark/light mode toggle

### Known Constraints
- **Single godlike user:** Currently hardcoded (`sfilizzola@gmail.com`). Extending to multiple admins requires future work.
- **No offline support:** Admin tool requires internet connection (not a PWA)
- **English-only:** No i18n for now
- **Desktop-first:** Not optimized for mobile

---

## Success Criteria

1. ✅ Admin app deploys to separate domain independently
2. ✅ Godlike user can log in with email/password
3. ✅ All 10 functions are accessible and functional
4. ✅ Real-time changes sync with main app (where applicable)
5. ✅ Build passes and tests pass on every push
6. ✅ Error messages are clear and actionable
7. ✅ Load time < 3 seconds on typical connection
8. ✅ No secrets leaked in code or logs

---

## Next Steps

1. **Design approval** ← you are here
2. **Write implementation plan** (breaking into phases/tasks)
3. **Create admin repo** with initial Vite + React setup
4. **Implement each of the 10 functions** (in priority order)
5. **Write integration tests** and manual test checklist
6. **Deploy to staging** and validate end-to-end
7. **Deploy to production** (admin domain)

---

## Notes & Open Questions

- **Time travel Edge Function:** Does this exist yet, or do we need to create it?
- **Cache reset:** Which caches are we resetting (IndexedDB only, or also Redis/CDN)?
- **User management:** Should we allow bulk operations (e.g., create 10 test users at once)?
- **Audit logging:** Nice-to-have, but should we design for it now?

**Add notes/questions as you iterate on this plan.**
