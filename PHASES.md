# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`
**Upcoming ideas** → `FUTURE_IDEAS.md`

---

## Phase 23 — MoshSplit Balance Section

**Status:** 🙈 Part 1 hidden — awaiting review; Part 2 ready to implement (API docs resolved)

**Goal:** Add a self-contained collapsible `MoshSplitSection` component to the Profile page that shows the user's net balance from **MoshSplit** (`split.viralatas.org`) — the festival finance app used by the vira-latas at Wacken. Shipped in two parts: Part 1 (mocked UI for approval), Part 2 (real API connection).

**Design:** `_temp/moshsplit-section-design.html` · Spec: `docs/superpowers/specs/2026-05-22-phase23-moshsplit-section-design.md`

**Architectural shape:** Single self-contained component `MoshSplitSection` — accepts only `userEmail: string`, fetches own data, manages own states. No `t()` prop. Placed after `<ConflictSection>`, before `<EditProfileForm>`. Part 1 uses hardcoded mock data with `setTimeout(200ms)` to simulate latency. Part 2 replaces mock with real `fetch` using `VITE_MOSHSPLIT_TOKEN` + user email.

**Auth (Part 2):** Balance read via app token (`VITE_MOSHSPLIT_TOKEN` in Vercel env) + user email. Redirect CTA opens plain `https://split.viralatas.org` in new tab (confirmed fallback — `/v1/auth/external-login` exists for token exchange but redirect URL shape not yet confirmed; use plain URL for now).

**Four render states:**
- `loading` — spinner in header, no content
- `not_found` — `return null`, component invisible
- `settled` (balance = 0) — teal "Quitado" chip + "Tudo acertado 🤘" + CTA button
- `active` (balance ≠ 0) — balance chip (red if owes, teal if owed) + amount row + CTA button

**Part 1 Deliverables:**

- `src/components/profile/MoshSplitSection.tsx` — full component, mock data, all 4 states; `ACTIVE_MOCK` constant for state switching during review
- `src/components/profile/MoshSplitSection.module.css` — existing CSS tokens only (`--bg-elevated`, `--border`, `--signal-ok`, `--accent`, `--font-display`, `--font-mono`, `--s-*`, `--r-*`); no new custom properties
- `src/pages/ProfilePage.tsx` — insert `<MoshSplitSection userEmail={user.email ?? ''} />` after `<ConflictSection>`, before `<EditProfileForm>`
- `public/Design System.html` — document component in profile section

**MoshSplit API (Part 2) — resolved:**

- **Base URL:** `https://split.viralatas.org`
- **Auth header:** `Authorization: Bearer <VITE_MOSHSPLIT_TOKEN>` (token format: `sat_...`)
- **Balance endpoint:** `POST /v1/balances/external-summary`
  - Request body: `{ "email": "string" }`
  - Response `200`: `{ "event_name": string, "items": [{ "amount_cents": number, "title": string }], "total_balance_cents": number }`
  - `404` → user/event not found → render `not_found` state (component returns `null`)
  - `401` → invalid token → treat as error state
  - `400` → bad request → treat as error state
  - Network failure → treat as error state
- **Amounts are in cents.** Divide by 100 for display. Negative = user owes; positive = user is owed; zero = settled.
- **Redirect auth endpoint:** `POST /v1/auth/external-login` — exchanges API token for a Sentinel session. Redirect URL shape not yet confirmed; use plain `https://split.viralatas.org` for the CTA for now.
- **Spec docs:** `https://split.viralatas.org/pitboss/docs/external/#/External/external_summary`

**Part 2 Deliverables:**

- `src/components/profile/MoshSplitSection.tsx` — replace mock with real `fetch` to `/v1/balances/external-summary`; add error state ("Could not load MoshSplit data" + CTA still visible)
- `.env.local` — `VITE_MOSHSPLIT_TOKEN` already added (not committed) ✓
- Vercel project settings — add `VITE_MOSHSPLIT_TOKEN`
- README — document `VITE_MOSHSPLIT_TOKEN` in env var section

**Collapsible pattern:** uses `<Collapsible trigger={...}>` from `src/ui` — identical to `ConflictSection`. `defaultOpen={false}`. Wrapper has `margin: var(--s-3) var(--s-4)` and max-width 400px aligned to center.

**Balance chip:** `rgba(--accent, 0.20)` background + `rgba(--accent, 0.40)` border for negative; `rgba(--signal-ok, 0.20)` + border for positive; attenuated teal for settled. Font mono 11px tabular-nums.

**CTA button:** full-width, "Abrir MoshSplit →", red-tinted (`rgba(--accent, 0.08)` bg), opens `https://split.viralatas.org` in new tab. Present in all visible states.

**Acceptance criteria (Part 1):**
- [x] `not_found` mock → component not visible on profile page
- [x] `settled` mock → component visible, "All settled 🤘" visible, no balance row, CTA visible
- [x] `owes` mock → collapsible visible, chip red with negative amount, expanded shows amount row + CTA
- [x] `owed` mock → collapsible visible, chip teal with positive amount, expanded shows amount row + CTA
- [x] Component collapses/expands on header tap
- [x] CTA cycles mock states during review (real URL wired in Part 2)
- [x] `loading` mock → spinner in header, no content, not clickable
- [x] Build passes, no linter errors

**Acceptance criteria (Part 2):**
- [ ] Real balance loaded from `POST /v1/balances/external-summary` using user email + `VITE_MOSHSPLIT_TOKEN`
- [ ] `404` response → `not_found` state (component invisible)
- [ ] Network / `4xx` error → error state (warning message visible, CTA still available)
- [ ] Amounts displayed in EUR converted from cents (`total_balance_cents / 100`)
- [ ] CTA "OPEN MoshSplit →" opens `https://split.viralatas.org` in new tab
- [ ] `VITE_MOSHSPLIT_TOKEN` documented in README env var section
- [ ] Build passes, no linter errors

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. Update the status line above to the next phase number.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
