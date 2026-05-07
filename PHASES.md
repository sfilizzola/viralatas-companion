# PHASES.md — Remaining Development

Current phase and upcoming work for Viralatas Metaleiros. Refer to CLAUDE.md for project context, constraints, and key decisions.

---

## Phase 5 — Announcements & user roles `[CURRENT]`

**Goal:** Mural-style board for crew-wide messages with a three-tier trust hierarchy (normal / manager / godlike).

**Status:** 🔄 Near complete — migration, types, DB stores, data layer, AnnouncementsPage, and godlike section all done. Remaining: ProfilePage manager section (view blocked users, unblock button).

---

### Acceptance criteria

- [x] Any logged-in, non-blocked user can post; message appears immediately for all online users
- [x] A manager can delete any announcement; it disappears for all clients within 3 s
- [x] A blocked user sees no post box and cannot post (enforced client-side and by RLS)
- [ ] A manager/godlike can block a user by clicking a "block" button on their announcement card
- [ ] A blocked user's previous announcements remain visible, but they cannot post new ones
- [ ] Godlike profile section shows all users; can promote/demote managers AND unblock any user
- [ ] Manager profile section shows ONLY blocked users; can unblock from there
- [ ] Blocking/unblocking works immediately (optimistic + server sync)
- [ ] `/announcements` renders from IndexedDB with no network after first load
- [ ] Live page shows the latest announcement in the hero when the user is in "lost" or "empty" state
- [ ] Soft-deleted announcements never reappear after a cache refresh
- [ ] Blocked users can still view schedule, picks, live preview, and announcements (only posting blocked)

---

### Deliverables

| # | Task | Status |
|---|---|---|
| 1 | Migration: `role` column, `announcements` table, `blocked_posters` table, RLS, RPC | ✅ Done |
| 2 | `users.role` seeded as `godlike` for sfilizzola@gmail.com (migration + trigger) | ✅ Done |
| 3 | `src/types/index.ts` — `UserRole`, `Announcement`, `BlockedPoster`, updated `User` | ✅ Done |
| 4 | `src/lib/supabase.types.ts` — new tables and role column | ✅ Done |
| 5 | `src/lib/db.ts` — version 5; `announcements` + `pending_announcements` IDB stores | ✅ Done |
| 6 | `src/lib/announcements.ts` — full data layer (sync, post, delete, flush, role, block, setRole) | ✅ Done |
| 7 | `src/pages/AnnouncementsPage.tsx` — mural UI with post box, cards, delete for managers | ✅ Done |
| 8 | `src/pages/AnnouncementsPage.module.css` — mural styles | ✅ Done |
| 9 | `src/lib/i18n.ts` — `AnnouncementsPage` added to registry | ✅ Done |
| 10 | i18n: `AnnouncementsPage_br.json`, `AnnouncementsPage_en.json` | ✅ Done |
| 11 | `src/components/BottomNav.tsx` — Mural tab added | ✅ Done |
| 12 | `src/App.tsx` — `/announcements` route + `AnnouncementSync` component | ✅ Done |
| 13 | `src/pages/RightNowPage.tsx` — latest announcement shown in hero when lost/empty | ✅ Done |
| 14 | Profile page — godlike section: promote/demote managers, plus unblock button for each user | ✅ Done |
| 15 | Profile page — manager section: view blocked users only, with unblock button | **Pending** |
| 16 | AnnouncementsPage — block user button on each card (managers/godlike only) | **Pending** |

Data layer functions (`setUserRole`, `blockUser`, `unblockUser`, `fetchAllUsers`, `fetchBlockedPosters`) are already in `src/lib/announcements.ts`. GodlikeSection is fully implemented in ProfilePage.tsx.

---

### Offline contract

```
Fetch announcements on load
  → cache full list in IndexedDB (newest first)
  → display from cache when offline

Post announcement
  → if online: write to Supabase; server ID lands via Realtime INSERT
  → if offline: save with local UUID to announcements + pending_announcements
  → on reconnect: flushPendingAnnouncements() → syncAnnouncements() corrects IDs

Delete announcement (managers / godlike)
  → optimistic remove from IDB immediately
  → Supabase UPDATE deleted_at when online
  → Realtime UPDATE event removes from other clients' caches
```

---

### How to run the migration

```bash
supabase db push
```

Or paste `supabase/migrations/20260504000004_phase5_announcements.sql` into Supabase SQL editor.

Verify:
1. `users` table has a `role` column; your row shows `godlike`
2. `announcements` and `blocked_posters` tables exist
3. `set_user_role` RPC appears in Supabase Functions

---

## Phase 6 — LLM proactive alerts

**Goal:** Claude proactively taps the crew on the shoulder at key festival moments. No user needs to ask — the app just knows.

**Architecture:**
```
Client (Service Worker timer or Realtime event)
  → POST /functions/v1/check-alerts
  → Edge Function builds AlertContext
  → Calls Claude API (claude-sonnet-4-6)
  → Returns alert payload { type, message, targetUserIds }
  → Client displays push notification or in-app banner
```

---

### Alert types

#### 5a — Conflict alert
- **Trigger:** 30 minutes before a time slot where the user has two picks on different stages simultaneously
- **Offline capable:** Yes — runs from cached picks + schedule, no API call needed
- **Cooldown:** Once per conflicting pair per festival day
- **Example message:** "Você marcou Blind Guardian e Powerwolf ao mesmo tempo. Qual palco vai rolar? 🤘"

#### 5b — Crew split alert
- **Trigger:** When crew picks for the next time slot split across 3 or more stages
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per hour
- **Example message:** "Crew dividida em 4 palcos agora. Ponto de encontro: portão principal às 22h? 🤘"

#### 5c — Discovery nudge
- **Trigger:** User has a gap of 45+ minutes with no picks; a band the crew loves is starting soon
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per gap window
- **Example message:** "Você tem 50 min livre. Fernanda e Beto adoraram Bloodbath — começam em 10 min no HARDER STAGE 🤘"

#### 5d — Day recap
- **Trigger:** 30 minutes after the last scheduled band on each festival day
- **Offline capable:** No — requires Claude API, cached for offline reading after delivery
- **Cooldown:** Once per festival day
- **Example message:** "Viralatas viram 14 bandas hoje. Mais popular: Rammstein (6/7). Mais dividida: Tool (4 foram, 3 fugiram) 🤘"

---

### Edge Function prompt template

```
Você é o assistente da crew Viralatas Metaleiros no Wacken.
Hora atual: {currentTime}. Dia do festival: {festivalDay}.

PICKS DA CREW:
{crewPicks as compact JSON}

SCHEDULE COMPLETO:
{fullSchedule as compact JSON}

Tipo de alerta solicitado: {alertType}

Regras:
- Responda APENAS com a mensagem de notificação
- Máximo 2 frases
- Tom: direto, divertido, metal
- Idioma: português brasileiro
- Termine com 🤘
```

---

### Deliverables

- [ ] `supabase/functions/check-alerts/index.ts` Edge Function
- [ ] Alert cooldown tracking in `user_alerts` table (alert_type, user_id, fired_at)
- [ ] Client-side alert scheduler (Service Worker periodic sync or polling fallback)
- [ ] In-app alert banner component (non-blocking, dismissible)
- [ ] Web Push notification support (when app is backgrounded)
- [ ] Offline conflict alert runs without API call

### Acceptance criteria

- [ ] Conflict alert fires correctly 30 min before a clash
- [ ] No alert fires twice within its cooldown window
- [ ] API key is never present in client bundle (verify with `grep -r "ANTHROPIC" src/`)
- [ ] Alerts arrive in Brazilian Portuguese

---

## Phase 7 — Polish and pre-festival

**Goal:** Production-ready. Installable. Dark. Fast.

### Deliverables

- [ ] PWA install prompt on first visit (tested on iOS Safari + Android Chrome)
- [ ] Dark mode (mandatory — it's a metal app)
- [ ] Loading skeletons on band cards
- [ ] Error boundary with friendly fallback
- [ ] Final Wacken 2026 lineup imported and verified
- [ ] Lighthouse PWA score ≥ 90
- [ ] README with setup instructions for the crew

### Acceptance criteria

- [ ] App installs cleanly on an iPhone via Safari
- [ ] App installs cleanly on Android via Chrome
- [ ] Full offline run-through: install → pick bands → enter Airplane Mode → browse schedule → check "right now" — no crashes

---

## Alert cooldown reference

| Alert | Cooldown |
|---|---|
| Conflict alert | Once per conflicting pair per day |
| Crew split | Once per hour |
| Discovery nudge | Once per gap window |
| Day recap | Once per festival day |
