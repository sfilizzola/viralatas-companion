# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 21 — TBD

*Next phase to be defined.*

---

## Phase 20 — The Duck 🦆 ✅ Complete

**Goal:** Add a social rubber-duck button to live band cards. When a user who has picked a band presses the duck during the band's live set, a floating duck notification is broadcast to all other users who also picked that band — delivered in-app via Supabase Realtime and as a Web Push notification for background/closed app users. Each user has a 90-second per-band cooldown shown as a non-numeric visual drain animation. Offline presses are queued and flushed on reconnect.

---

### Acceptance Criteria

- Duck button is visible on a `BandCard` only when the band is **currently live** AND the logged-in user has **picked** that band
- Pressing the duck fires a notification to all other users who picked the same band; the user does **not** receive their own quack
- In-app notification: a floating rubber duck image + band name appears globally (any page), auto-dismisses after ~3s
- Background notification: a Web Push system notification is delivered via VAPID to users with the app closed or backgrounded
- A 90-second cooldown is enforced per user per band; during cooldown the duck button shows a visual drain animation (no numeric label) and cannot be pressed again
- Other users' cooldowns are independent (each user tracks only their own)
- Offline presses are queued to `offline_duck_quacks` (IndexedDB) and flushed on reconnect

---

### Deliverables

**Database (migration)**

- `public.duck_quacks` table: `id uuid PK`, `user_id uuid FK`, `band_id uuid FK`, `quacked_at timestamptz`; Realtime enabled; RLS: INSERT own, SELECT all
- `public.push_subscriptions` table: `id uuid PK`, `user_id uuid FK`, `endpoint text UNIQUE`, `p256dh text`, `auth text`, `created_at`; RLS: INSERT/DELETE own, SELECT own only

**Design System**

- `public/Design System.html` §11 — DuckButton states (ready · cooldown drain), DuckToast (entrance/exit), live card full simulation (8 crew · "I am weak" · duck button), visibility conditions

**Asset**

- `public/rubber-duck.png` 

**IndexedDB**

- New `offline_duck_quacks` store added to `src/lib/db.ts` (DB version bump); same shape as `duck_quacks` row

**Push subscription setup**

- `src/lib/pushSubscription.ts` — `subscribeToPush()`: requests `Notification` permission, creates `PushSubscription` via Service Worker, upserts to `push_subscriptions` table; called once on login
- Service Worker push event listener (via `vite.config.ts` custom SW) — shows system notification with duck image and band name; `notificationclick` focuses or opens the app

**Repository**

- `src/repositories/duck.ts` — `quackBand(userId, bandId)`: writes to Supabase or queues offline; `flushOfflineDucks()`: flushes `offline_duck_quacks` on reconnect; wired into sync engine alongside existing flush calls

**Hooks**

- `src/hooks/useDuckQuack.ts` — manages cooldown state (`localStorage` key `duck_cooldown:userId:bandId`), calls `duck.quackBand()`, returns `{ quack, isOnCooldown, cooldownUntil }`
- `src/hooks/useDuckNotifications.ts` — Supabase Realtime subscription on `duck_quacks` INSERT filtered to user's picked bands; ignores own quacks; emits `viralatas:duck-quack` window event

**Components**

- `src/components/DuckButton.tsx` + `DuckButton.module.css` — duck PNG button; accepts `onDuck`, `isOnCooldown`, `cooldownUntil`; renders circular CSS clip-path drain animation during cooldown
- `src/components/DuckToast.tsx` + `DuckToast.module.css` — global floating duck image + band name; listens to `viralatas:duck-quack` window event; animated in/out, auto-dismisses after ~3s

**BandCard integration**

- `src/components/BandCard.tsx` — new optional props `onDuck?: () => void` and `duckCooldownUntil?: number`; renders `<DuckButton>` when `onDuck` is provided

**Page integration**

- `/now` page (and `/schedule` if applicable) — passes `onDuck` to `BandCard` when `isBandLive && isPicked` for that band; uses `useDuckQuack` hook per live band

**App-level wiring**

- `src/App.tsx` — mounts `<DuckToast />` globally; calls `subscribeToPush()` after authentication; mounts `<DuckNotificationsListener />` (or integrates `useDuckNotifications` at top level)

**Edge Function**

- `supabase/functions/send-duck-push/index.ts` — Triggered by Supabase Database Webhook on `duck_quacks` INSERT; queries `user_picks` for band pickers (excluding quacker); queries `push_subscriptions` for those users; sends Web Push via `npm:web-push` (Deno); VAPID keys stored in Supabase secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); notification payload: `{ title: band.name, body: "🦆", icon: "/rubber-duck.png" }`

**i18n**

- Duck-related keys added to all 4 locale files (`br`, `en`, `de`, `es`): cooldown accessibility label, push notification permission prompt text

**Docs**

- `docs/ai-wiki/changelog.md` — dated entry for Phase 20
- `docs/ai-wiki/phases-history.md` — Phase 20 entry appended on completion
- Relevant wiki pages updated (`domain-model.md`, `sync-engine.md`, `index.md` event list)

---

### Known Edge Cases / Notes

- If a user reconnects after a concert ends, queued ducks are still flushed and Web Push is sent (stale but harmless)
- Web Push requires HTTPS; dev testing uses `localhost` (browsers allow push on localhost)
- The duck button must never appear for `category === 'ceremony'` bands
- Push subscription is per-device; users with multiple devices receive multiple notifications (acceptable for ~20 users)

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.

