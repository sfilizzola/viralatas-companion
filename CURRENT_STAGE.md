# CURRENT_STAGE.md — Phase 5: Announcements & user roles

**Goal:** Mural-style board for big crew-wide messages with a three-tier trust hierarchy (normal / manager / godlike).  
**Status:** Scaffold complete — migration, types, DB stores, data layer, and page all created. Run the migration and test the full flow.

---

## Acceptance criteria

- [ ] Any logged-in, non-blocked user can post; message appears immediately for all online users
- [ ] A manager can delete any announcement; it disappears for all clients within 3 s
- [ ] A blocked user sees no post box and cannot post (enforced client-side and by RLS)
- [ ] Godlike profile section shows all registered users; promoting to manager works immediately
- [ ] `/announcements` renders from IndexedDB with no network after first load
- [ ] Live page shows the latest announcement in the hero when the user is in "lost" or "empty" state
- [ ] Soft-deleted announcements never reappear after a cache refresh

---

## Deliverables

| # | Task | Status |
|---|---|---|
| 1 | Migration: `role` column, `announcements` table, `blocked_posters` table, RLS, RPC | Done |
| 2 | `users.role` seeded as `godlike` for sfilizzola@gmail.com (migration + handle_new_user trigger) | Done |
| 3 | `src/types/index.ts` — `UserRole`, `Announcement`, `BlockedPoster`, updated `User` | Done |
| 4 | `src/lib/supabase.types.ts` — new tables and role column | Done |
| 5 | `src/lib/db.ts` — version 5; `announcements` + `pending_announcements` IDB stores | Done |
| 6 | `src/lib/announcements.ts` — full data layer (sync, post, delete, flush, role, block, setRole) | Done |
| 7 | `src/pages/AnnouncementsPage.tsx` — mural UI with post box, cards, delete for managers | Done |
| 8 | `src/pages/AnnouncementsPage.module.css` — mural styles | Done |
| 9 | `src/lib/i18n.ts` — `AnnouncementsPage` added to registry | Done |
| 10 | i18n: `AnnouncementsPage_br.json`, `AnnouncementsPage_en.json` | Done |
| 11 | `src/components/BottomNav.tsx` — Mural tab added | Done |
| 12 | `src/App.tsx` — `/announcements` route + `AnnouncementSync` component | Done |
| 13 | `src/pages/RightNowPage.tsx` — latest announcement shown in hero when lost/empty | Done |
| 14 | Profile page — godlike section: promote/demote managers | **Pending** |
| 15 | Profile page — manager section: view and unblock blocked users | **Pending** |

Items 14 and 15 extend `ProfilePage.tsx`. The data layer functions (`setUserRole`, `blockUser`, `unblockUser`, `fetchAllUsers`, `fetchBlockedPosters`) are already in `src/lib/announcements.ts`.

---

## Files created / modified this phase

### New files
- `supabase/migrations/20260504000004_phase5_announcements.sql`
- `src/lib/announcements.ts`
- `src/pages/AnnouncementsPage.tsx`
- `src/pages/AnnouncementsPage.module.css`
- `src/i18n/AnnouncementsPage_br.json`
- `src/i18n/AnnouncementsPage_en.json`

### Modified files
- `src/types/index.ts` — added `UserRole`, `Announcement`, `BlockedPoster`; updated `User`
- `src/lib/supabase.types.ts` — added `announcements`, `blocked_posters`; added `role` to `users`
- `src/lib/db.ts` — version 4 → 5; new stores + CRUD helpers
- `src/lib/i18n.ts` — `AnnouncementsPage` added to `TranslationFile` union and translations map
- `src/App.tsx` — `/announcements` route + `AnnouncementSync`
- `src/components/BottomNav.tsx` — Mural tab
- `src/i18n/BottomNav_br.json` / `BottomNav_en.json` — `mural` key
- `src/pages/RightNowPage.tsx` — latest announcement in lost/empty hero
- `src/pages/RightNowPage.module.css` — announcement hero card styles
- `src/i18n/RightNowPage_br.json` / `RightNowPage_en.json` — `latestNews` key

---

## Offline contract

```
Fetch announcements on load
  → cache full list in IndexedDB announcements store (newest first)
  → display from cache when offline

Post announcement
  → if online: write to Supabase; server ID lands via Realtime INSERT
  → if offline: save with local UUID to announcements + pending_announcements
  → on reconnect: flushPendingAnnouncements() → syncAnnouncements() corrects IDs

Delete announcement (managers / godlike)
  → optimistic remove from IDB immediately
  → supabase UPDATE deleted_at when online
  → Realtime UPDATE event removes from other clients' caches
```

---

## Step to run after pulling

```bash
supabase db push   # or paste migration into Supabase SQL editor
```

Then verify:
1. `users` table has a `role` column; your row shows `godlike`
2. `announcements` and `blocked_posters` tables exist
3. `set_user_role` RPC appears in Supabase Functions
