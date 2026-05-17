<!-- Purpose: Quick-reference table of key technical decisions. Load on demand when reasoning about why the stack is what it is. -->

## Key technical decisions

| Decision | Choice | Reason |
|---|---|---|
| App type | PWA only | No iOS App Store needed; vira-latas group is ~20 people |
| Offline store | IndexedDB via `idb` library | Structured, async, survives browser close |
| Backend | Supabase | Auth + DB + Realtime in one free-tier service |
| LLM delivery | Proactive only | At a festival, no one is typing into chat |
| Claude context | Full vira-latas picks every call | Vira-latas group is tiny, payload is negligible |
| Alert language | Brazilian Portuguese | It's the Viralatas group, not a global product |
| Role hierarchy | normal / manager / godlike | 3-tier allows moderation without giving everyone power |

**Full architectural decision records** → `docs/ai-wiki/decisions/`
