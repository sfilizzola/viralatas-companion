<!-- Purpose: Standard section structure every docs/ai-wiki/ page should follow. Load on demand when authoring or refactoring a wiki page. Two templates: one for core architecture/system pages, one for flow pages — both verified against existing wiki pages on 2026-05-17. -->

## Documentation standards

Pick the template that matches the page type, and use the **exact** section names below (real pages already use them — don't invent variants).

---

### Template A — Core architecture / system pages

Use for: `architecture.md`, `sync-engine.md`, `offline-first.md`, `domain-model.md`, `supabase-schema.md`, `routes.md`, `testing.md`, `badges.md`, decisions/, etc.

1. **Purpose** — What question does this page answer?
2. **Relevant Source Files** — Which files implement this? (paths + key line ranges)
3. **High-Level Explanation** — The mental model in 1–3 paragraphs.
4. **Data Flow Diagrams** — ASCII or mermaid; how data moves through the system.
5. **Important Hooks / Services / Repositories** — Main abstractions and what they own.
6. **Offline Behavior** — What happens when the user is offline?
7. **Synchronization Behavior** — How does Supabase sync work?
8. **Risks / Caveats** — What could go wrong? Edge cases, footguns.
9. **Open Questions** — What's still unclear, undecided, or pending a future phase?

---

### Template B — Flow pages (`docs/ai-wiki/flows/*.md`)

Use for any user-facing action documented in `flows/` (pick-band, announcements, live-now, offline-pick-sync, authentication, duck, …). This is the template printed in `docs/ai-wiki/index.md` → "Template: Flow Documents", expanded with the sections every existing flow page already uses.

1. **Purpose** — Brief description of what the user is doing.
2. **Trigger** — When does this flow happen?
3. **Happy Path (Online, Connected)** — Step-by-step what happens with network.
4. **Offline Behavior (Disconnected)** — What changes when offline?
5. **Sync Behavior (Reconnect)** — What happens when the connection returns?
6. **Relevant Source Files** — File paths with key lines.
7. **Data Flow Diagram** — ASCII or mermaid.
8. **Edge Cases** — Things that could go wrong (race conditions, conflicts, stale state).
9. **Important Hooks / Services / Repositories** — Main abstractions involved.
10. **Open Questions** — What's still unclear.

---

### Rules of thumb

- **Don't restate `.claude/context/` content** in the wiki. Wiki explains the *why*; `.claude/context/` documents operational rules and quick contracts. Link both ways.
- **Source files first, prose second.** Every claim that touches code should cite a file path so future readers can verify it hasn't drifted.
- **Update `docs/ai-wiki/changelog.md`** with a dated entry whenever you change a wiki page (Added / Changed / Architectural Notes).
