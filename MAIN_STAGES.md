# MAIN_STAGES.md — Viralatas Metaleiros Dev Plan 🤘

Full feature specification and phased development plan.
Agents: read the current phase before starting any task. Do not work ahead of the phase marked **[CURRENT]**.

---

## App overview

**Viralatas Metaleiros** is a PWA for a Brazilian metal crew at Wacken Open Air.

Core loop: each crew member picks bands → sees where the crew is going → receives proactive AI alerts that help them navigate the festival together.

Works fully offline after first load. LLM features (Claude API) sync opportunistically when signal is available.

---

## Phases

---

### Phase 1 — Foundation `[DONE]`

**Goal:** A working app shell with auth and offline baseline. Nothing fancy — just the skeleton every other phase builds on.

**Deliverables:**

- [x] Supabase project initialised with schema migration for `users`, `bands`, `user_picks`
- [x] React + Vite project scaffolded with TypeScript
- [x] `vite-plugin-pwa` installed and configured — Service Worker caches app shell on install
- [x] Supabase Auth wired up: register, login, logout
- [x] JWT session persisted in IndexedDB (survives app close)
- [x] Basic profile screen: display name, avatar initial
- [x] App renders and navigates with zero network after first visit

**Acceptance criteria:**
- User can register and log in
- On second visit with DevTools → Network → Offline, the app shell loads without errors
- No unhandled promise rejections in the console

**Out of scope for this phase:** band data, picks, realtime, LLM

---

### Phase 2 — Band schedule `[DONE]`

**Goal:** The full Wacken lineup is in the app and browsable offline.

**Deliverables:**

- [x] `bands` table seeded via import script (`supabase/seed/bands.ts`)
- [x] Schedule view: cards with band name, image, stage badge, start/end time
- [x] Filter bar: by stage, by day, by time window
- [x] On first authenticated load, full band list written to IndexedDB
- [x] Schedule renders from IndexedDB — works offline after first sync

**Data shape per band:**
```typescript
type Band = {
  id: string;
  name: string;
  stage: string;        // e.g. "W:STAGE", "HARDER STAGE", "LOUDER STAGE"
  startTime: string;    // ISO 8601
  endTime: string;      // ISO 8601
  imageUrl: string;
  genre: string;
};
```

**Acceptance criteria:**
- All bands visible in schedule view
- Filtering works without network
- Images are cached (precached or lazy-cached by Service Worker)

---

### Phase 3 — Picks and social counts `[DONE]`

**Goal:** Users pick bands. The crew can see who's going where. Live counts update in real time.

**Deliverables:**

- [x] Tap a band card to toggle pick on/off
- [x] Pick written to IndexedDB immediately (optimistic)
- [x] Pick synced to `user_picks` in Supabase when online
- [x] Offline pick queue: unpersisted picks flushed on reconnect
- [x] Supabase Realtime subscription on `user_picks` → updates local band pick counts
- [x] Each band card shows count: "X going"
- [x] "Most popular" view: bands sorted by total crew picks, live-updated
- [x] "My picks" view: filtered list of the current user's picks

**Realtime architecture:**
```
user picks band
  → write IndexedDB (instant)
  → if online: write Supabase user_picks
  → Supabase broadcasts change via Realtime
  → all connected clients update their local count
```

**Acceptance criteria:**
- Picking a band on one device reflects within 3 seconds on another
- Picking while offline queues correctly and syncs on reconnect
- Pick count never goes negative

---

### Phase 4 — Live preview `[DONE]`

**Goal:** At any moment during the festival, a user can see where they planned to be and where the crew is right now.

**Deliverables:**

- [x] "Right now" screen — hero card showing the band the current user should be watching based on their picks and current time
- [x] If no pick overlaps current time: show next upcoming pick
- [x] Crew grid: one tile per crew member, showing their current or next band
- [x] All logic runs from cached picks + schedule — no network required
- [x] Make an importable lineup file so final adjusted bands, stages, and times are easy to update and reseed; previous test picks may be erased when this runs.

**Time logic:**
```typescript
// Current band = pick whose startTime <= now < endTime
// Next band = pick with earliest startTime > now
// If multiple overlapping picks: show the one with latest startTime (most recently started)
```

**Acceptance criteria:**
- "Right now" screen is accurate to current device time
- Works in Airplane Mode after prior sync
- Crew grid updates automatically as time passes (no manual refresh)

---

### Phase 4B — Camping / LOST live state `[DONE]`

**Goal:** The live view is the first thing crew members see, with a quick way to say they are at camping.

**Deliverables:**

- [x] Initial authenticated landing page opens the live "Agora" view
- [x] "Estou no camping" switch on the live page
- [x] Camping status is stored offline-first and synced through Supabase when online
- [x] Crew state cards group users as live band(s), Camping, then `LOST`
- [x] If a current picked band overlaps the current time, that band overrides camping and turns camping off

**Acceptance criteria:**
- Login/register sends the user to `/now`
- Camping switch works offline and flushes on reconnect
- A user with camping enabled and no current band appears in the Camping card
- A user with camping disabled and no current band appears as `LOST` in the live view
- A user with camping enabled and a current picked band appears on the band, with camping set back to off
- Multiple live picked bands render as separate band cards before Camping and `LOST`

---

### Phase 5 — Announcements & user roles

**Goal:** Give the crew a mural-style board for big crew-wide messages, with a simple trust hierarchy so managers can moderate.

---

**User roles**

| Role | Who | Powers |
|---|---|---|
| `normal` | Everyone by default | Post announcements |
| `manager` | Promoted by godlike | Delete any announcement; block/unblock users from posting |
| `godlike` | `sfilizzola@gmail.com` only (hard-coded) | All manager powers + promote/demote managers |

Role is stored in the `users` table (`role` column, enum `normal / manager / godlike`). The `godlike` role is seeded at first-login and cannot be granted or revoked through the UI — only through a migration or seed script.

---

**Schema additions**

```sql
-- add to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'normal'
  CHECK (role IN ('normal', 'manager', 'godlike'));

-- announcements mural
CREATE TABLE announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ               -- soft-delete; managers / godlike set this
);

-- per-user posting block
CREATE TABLE blocked_posters (
  user_id     UUID PRIMARY KEY REFERENCES users(id),
  blocked_by  UUID NOT NULL REFERENCES users(id),
  blocked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Row-level security:
- Any authenticated user can INSERT into `announcements` unless their `user_id` is in `blocked_posters`
- Only `manager` / `godlike` can set `deleted_at` on any row (soft-delete)
- `blocked_posters` inserts/deletes require `manager` or `godlike`
- `users.role` can only be updated by `godlike` (enforced via RLS policy checking caller's role)

---

**Deliverables**

- [ ] Migration: `role` column on `users`, `announcements` table, `blocked_posters` table, RLS policies
- [ ] Seed: set `role = 'godlike'` for `sfilizzola@gmail.com` on every upsert (trigger or seed script)
- [ ] Announcements page (`/announcements`): full-width mural cards, large text, newest-first
- [ ] Post box at the top of the mural: large textarea, submit button; hidden if user is blocked
- [ ] Delete button on each card visible only to `manager` / `godlike` (soft-delete sets `deleted_at`)
- [ ] Offline-first: announcements written to IndexedDB on fetch; new posts queued if offline and flushed on reconnect (same pattern as picks)
- [ ] Supabase Realtime subscription on `announcements` — new and deleted announcements propagate live
- [ ] Profile page — godlike section: searchable list of registered users with a toggle to promote/demote to `manager`
- [ ] Profile page — manager section: list of currently blocked users with an unblock button
- [ ] Live page: replace the "LOST / Lost at camp…" static card header with the most recent non-deleted announcement card (falls back to the LOST card if no announcements exist)

---

**Offline behaviour**

```
fetch announcements on load
  → cache full list in IndexedDB (keyed by created_at DESC)
  → display from cache when offline

post announcement
  → if online: write to Supabase immediately
  → if offline: queue in IndexedDB pending-posts store
  → on reconnect: flush queue in order, then pull latest

delete announcement (managers / godlike)
  → optimistic soft-delete in local cache
  → sync to Supabase when online
```

---

**Acceptance criteria**

- Any logged-in, non-blocked user can post; message appears immediately for all online users
- A manager can delete any announcement; it disappears for all clients within 3 s
- A blocked user sees no post box and cannot post (enforced client-side and RLS)
- Godlike profile section shows all registered users; promoting to manager works immediately
- `/announcements` renders from IndexedDB with no network after first load
- Live page shows the latest announcement instead of the LOST card header when at least one announcement exists
- Soft-deleted announcements never reappear after a cache refresh

---

### Phase 6 — LLM proactive alerts

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

**Alert types:**

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

**Edge Function prompt template:**
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

**Deliverables:**

- [ ] `supabase/functions/check-alerts/index.ts` Edge Function
- [ ] Alert cooldown tracking in `user_alerts` table (alert_type, user_id, fired_at)
- [ ] Client-side alert scheduler (Service Worker periodic sync or polling fallback)
- [ ] In-app alert banner component (non-blocking, dismissible)
- [ ] Web Push notification support (when app is backgrounded)
- [ ] Offline conflict alert runs without API call

**Acceptance criteria:**
- Conflict alert fires correctly 30 min before a clash
- No alert fires twice within its cooldown window
- API key is never present in client bundle (verify with `grep -r "ANTHROPIC" src/`)
- Alerts arrive in Brazilian Portuguese

---

### Phase 7 — Polish and pre-festival

**Goal:** Production-ready. Installable. Dark. Fast.

**Deliverables:**

- [ ] PWA install prompt on first visit (tested on iOS Safari + Android Chrome)
- [ ] Dark mode (mandatory — it's a metal app)
- [ ] Loading skeletons on band cards
- [ ] Error boundary with friendly fallback
- [ ] Final Wacken 2025 lineup imported and verified
- [ ] Lighthouse PWA score ≥ 90
- [ ] README with setup instructions for the crew

**Acceptance criteria:**
- App installs cleanly on an iPhone via Safari
- App installs cleanly on Android via Chrome
- Full offline run-through: install → pick bands → enter Airplane Mode → browse schedule → check "right now" — no crashes

---

## Alert cooldown reference

| Alert | Cooldown |
|---|---|
| Conflict alert | Once per conflicting pair per day |
| Crew split | Once per hour |
| Discovery nudge | Once per gap window |
| Day recap | Once per festival day |

---

## Key decisions log

| Decision | Choice | Reason |
|---|---|---|
| App type | PWA only | No iOS App Store needed; crew is small |
| Offline store | IndexedDB via idb library | Structured, async, survives browser close |
| Backend | Supabase | Auth + DB + Realtime in one free-tier service |
| LLM delivery | Proactive only | At a festival nobody is typing into a chat |
| Claude context | Full crew picks every call | Crew is ~7 people, payload is tiny |
| Alert language | Brazilian Portuguese | It's the Viralatas crew, not a global product |
