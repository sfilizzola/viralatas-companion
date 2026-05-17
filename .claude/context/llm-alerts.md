<!-- Purpose: LLM alert context shape and prompt rules for Edge Functions calling Claude. Load on demand when working on alert Edge Functions or modifying AlertContext. Status: forward spec — the alerts pipeline ships in a future phase. The Phase 1 placeholder lives in src/services/alerts.ts. The only Edge Function calling Claude today is documented in docs/ai-wiki/supabase-schema.md (process-alerts contract). -->

## LLM alert context shape

Every call to the Claude API from an Edge Function must include this context:

```typescript
type AlertContext = {
  currentTime: string;          // ISO 8601
  festivalDay: number;          // 1 | 2 | 3 | 4
  triggeringUserId: string;
  crewPicks: {
    userId: string;
    displayName: string;
    picks: {
      bandId: string;
      bandName: string;
      stage: string;
      startTime: string;
      endTime: string;
    }[];
  }[];
  fullSchedule: Band[];
};
```

`crewPicks` is the field the existing `process-alerts` Edge Function consumes today (`POST /functions/v1/process-alerts` with `{ userId, crewPicks }` — see `docs/ai-wiki/supabase-schema.md`). The rest of the shape is the agreed forward contract.

## Prompt rules (non-negotiable)

- **Language:** Brazilian Portuguese.
- **Max length:** 2 sentences.
- **Tone:** Direct, fun, metal.
- **Every alert ends with:** 🤘

## Server-side guarantees

- **API key never on client.** `ANTHROPIC_API_KEY` lives in Supabase secrets; only Edge Functions can read it. Verify with `grep -r "ANTHROPIC\|sk-" src/` — must return nothing.
- **No alert spam.** Each alert type has a cooldown. **Enforce the cooldown in the Edge Function**, not on the client — a malicious or replayed client request must not be able to bypass it. See `PHASES.md` for per-type cooldown values.
