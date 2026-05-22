# Flow: MoshSplit Balance Section

## Purpose

Documents how the **MoshSplit** collapsible section on `/profile` shows a vira-lata's net festival balance from **MoshSplit** (`split.viralatas.org`) — the pack's expense-splitting app — and deep-links them to the external app.

**Phase 23 status:** Part 1 (mocked UI) is implemented but **hidden** (`ACTIVE_MOCK = not_found`). Part 2 (real API) is blocked on MoshSplit API docs.

---

## Trigger

User navigates to `/profile`. `ProfilePage` renders `<MoshSplitSection userEmail={user.email ?? ''} />` after `<ConflictSection>`, before `<EditProfileForm>`.

On mount, the component loads balance data (mock in Part 1, real fetch in Part 2) and renders one of four states.

---

## Happy Path (Online — Part 2, planned)

```
User opens /profile
        │
        ▼
MoshSplitSection useEffect
  ├─ setLoadState('loading') — spinner in header
  ├─ fetch balance API (VITE_MOSHSPLIT_TOKEN + userEmail)
  └─ Map response → render state
        │
        ├─ not_found  → return null (invisible)
        ├─ settled    → teal "Quitado" chip + "Tudo acertado 🤘" + CTA
        └─ active     → owes (red) or owed (teal) chip + amount row + CTA
        │
        ▼
User taps "Abrir MoshSplit →"
        │
        ▼
Opens https://split.viralatas.org (new tab)
  └─ Part 2 may add token exchange for authenticated redirect (TBD)
```

---

## Happy Path (Part 1 — current, mock)

```
Mount → setTimeout(200ms) simulates latency
     → applyMock(ACTIVE_MOCK, ...)
     → ACTIVE_MOCK = MOCKS.not_found (hidden by default)
```

Godlike can change `ACTIVE_MOCK` in source during review to cycle `owes` / `owed` / `settled` / `loading`. Dev CTA tap cycles mock states for UI review.

---

## Offline Behavior (Disconnected)

**Part 1:** Mock data loads locally after 200ms — offline has no effect on mock path.

**Part 2 (planned):**
- Balance fetch requires network (`VITE_MOSHSPLIT_TOKEN` + email).
- On failure → error state: warning message + CTA still visible (user can open MoshSplit manually).
- No IndexedDB cache for balance — not part of offline-first core data.

---

## Sync Behavior (Reconnect)

No sync queue. Balance is fetched fresh on each profile page mount (Part 2). User must revisit `/profile` to refresh.

---

## Relevant Source Files

| File | Role |
|------|------|
| `src/components/profile/MoshSplitSection.tsx` | Four states, mock data, collapsible UI |
| `src/components/profile/MoshSplitSection.module.css` | Chip palette, CTA, layout tokens |
| `src/pages/ProfilePage.tsx` | Mount point after ConflictSection (~line 104) |
| `src/ui/Collapsible.tsx` | Same collapsible pattern as ConflictSection |

**Design spec:** `docs/superpowers/specs/2026-05-22-phase23-moshsplit-section-design.md`

**Env (Part 2):** `VITE_MOSHSPLIT_TOKEN` in Vercel / `.env.local` (not committed)

---

## Data Flow Diagram

```
┌─────────────────┐
│ ProfilePage     │
│ user.email      │
└────────┬────────┘
         │ userEmail prop
         ▼
┌─────────────────┐     Part 1: mock      ┌──────────────┐
│ MoshSplitSection│ ────────────────────► │ setTimeout   │
└────────┬────────┘                       │ + ACTIVE_MOCK│
         │                                └──────────────┘
         │ Part 2: fetch (planned)
         ▼
┌─────────────────┐
│ split.          │  External app — separate DB/auth
│ viralatas.org   │
└─────────────────┘
```

---

## Four Render States

| State | Condition | UI |
|-------|-----------|-----|
| `loading` | Fetch in progress | Spinner chip in header, shimmer body, not expandable |
| `not_found` | No MoshSplit account for email | `return null` — component invisible |
| `settled` | `balance === 0` | Teal "Quitado" chip, "Tudo acertado 🤘", CTA |
| `active` | `balance !== 0` | Red chip if owes, teal if owed; festival + amount row; CTA |

**Collapsible:** `defaultOpen={false}`. Header shows logo, label, sub-label (`split.viralatas.org`), balance chip.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty email | Passed as `''`; Part 2 API likely returns `not_found` |
| `ACTIVE_MOCK = not_found` | Entire section absent from DOM |
| Logo load failure | Inline SVG wallet fallback |
| BRL vs EUR currency | `formatAmount()` handles both display formats |
| Part 2 API timeout/error | Planned error state with CTA preserved |

---

## Important Hooks / Services / Repositories

- **No custom hook** — self-contained component, single `useEffect` on mount.
- **No repository layer** — Part 2 will use direct `fetch` inside component (same self-contained pattern as `PlaylistLaunchButton`).
- **`<Collapsible>`** from `src/ui` — shared with `ConflictSection`.

---

## Open Questions

- MoshSplit API endpoint shape and auth for balance read (Part 2 blocker).
- Token exchange vs plain URL for authenticated redirect to `split.viralatas.org`.
- Should balance refresh on Realtime or poll while profile is open? Current design: mount-only.
- When to flip `ACTIVE_MOCK` from `not_found` to a visible state for production review?

---

**Last updated:** 2026-05-22
