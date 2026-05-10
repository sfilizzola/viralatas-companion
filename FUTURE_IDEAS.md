# FUTURE_IDEAS.md — Nice-to-Have Features

Ideas and features that would enhance the app but are not critical for launch. These will be implemented if time permits after Phase 5 (Announcements & user roles) is complete.

---

## Phase 6 (Future) — LLM proactive alerts

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

#### 6a — Conflict alert
- **Trigger:** 30 minutes before a time slot where the user has two picks on different stages simultaneously
- **Offline capable:** Yes — runs from cached picks + schedule, no API call needed
- **Cooldown:** Once per conflicting pair per festival day
- **Example message:** "Você marcou Blind Guardian e Powerwolf ao mesmo tempo. Qual palco vai rolar? 🤘"

#### 6b — Crew split alert
- **Trigger:** When crew picks for the next time slot split across 3 or more stages
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per hour
- **Example message:** "Crew dividida em 4 palcos agora. Ponto de encontro: portão principal às 22h? 🤘"

#### 6c — Discovery nudge
- **Trigger:** User has a gap of 45+ minutes with no picks; a band the crew loves is starting soon
- **Offline capable:** No — requires Claude API
- **Cooldown:** Once per gap window
- **Example message:** "Você tem 50 min livre. Fernanda e Beto adoraram Bloodbath — começam em 10 min no HARDER STAGE 🤘"

#### 6d — Day recap
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

## Phase 7 (Future) — Polish and pre-festival

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

## Phase 10c — Year freeze for historical badges

**Goal:** Snapshot each user's earned badges at the end of a festival year so 2026 wins are still visible in 2027 alongside fresh badge content.

**When:** Defer until ~late July 2026 (post-festival). Needs to land before the crew goes home so the snapshot is taken while festival state is still live.

**Schema:**
```sql
alter table public.users
  add column historical_badges jsonb not null default '[]'::jsonb;
```

Each entry: `{ slug: string; year: number; earnedAt: string }`.

**`BadgeConfig` extension** (stub `yearBound` already allowed in 10a/10b badge configs — no code change needed when this ships):
```ts
type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;
  condition: BadgeCondition;
  yearBound?: number;  // present on 10a/10b badges that depend on a specific festival year
};
```

Existing badges (`puppy`, `pais-tropical`, `belga`, etc.) leave `yearBound` undefined → they remain evergreen.

**Freeze mechanism:** Godlike-only Edge Function `supabase/functions/freeze-year-badges/index.ts`. Request body: `{ year: 2026 }`.

1. Verify caller is godlike.
2. For every user: load picks + missed records + metadata, build a server-side `BadgeContext`, evaluate all badges with `yearBound === year`, collect earned slugs.
3. Upsert into `users.historical_badges`: append new `{ slug, year, earnedAt: now }` entries; de-dupe by `(slug, year)`.
4. Idempotent on re-run.

**UI:**
- New section in `/profile` (godlike only) — single "Freeze badges for year YYYY" button with confirmation modal.
- `BadgesDisplay` / patches grid: year chip (`'26`-style mono, bottom-right corner) on any historically-frozen patch. Chip is already stubbed (skipped when `historical_badges` is absent) from Phase G of the design migration.

**Files:** `supabase/migrations/<date>_phase10c_historical_badges.sql`, `supabase/functions/freeze-year-badges/index.ts`, `src/lib/badges.ts`, `src/lib/supabase.ts`, `src/components/BadgesDisplay.tsx`, `src/pages/ProfilePage.tsx`, `src/i18n/Badges_*.json`.

**Acceptance criteria:**
- [ ] `historical_badges` migration applies cleanly on a live Supabase project.
- [ ] Godlike "Freeze year" action snapshots correctly and is idempotent.
- [ ] Frozen badges stay visible after their underlying live condition changes (e.g. user unpicks a band) with a "Wacken YYYY" chip.
- [ ] Non-godlike users cannot call the freeze Edge Function (403 returned).

---

## Alert cooldown reference

| Alert | Cooldown |
|---|---|
| Conflict alert | Once per conflicting pair per day |
| Crew split | Once per hour |
| Discovery nudge | Once per gap window |
| Day recap | Once per festival day |
