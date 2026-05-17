<!-- Purpose: LLM alert context shape and prompt rules for Edge Functions calling Claude. Load on demand when working on alert Edge Functions or modifying AlertContext. -->

## LLM alert context shape

Every call to the Claude API from an Edge Function must include this context (Phase 6):

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

**Prompt language:** Brazilian Portuguese. **Max length:** 2 sentences. **Tone:** Direct, fun, metal. **Every alert ends with:** 🤘
