# Lineup official source — agent pointer

**Full procedure:** `docs/ai-wiki/lineup-official-source.md`

## When to read

User asks to check / sync / compare Wacken lineup, running order, or official band changes.

## Fetch (no browser)

```bash
rtk curl -sL "https://www.wacken.com/fileadmin/Json/events-concert.json" -o /tmp/wacken-events-concert.json
rtk curl -sL "https://www.wacken.com/fileadmin/Json/stages.json" -o /tmp/wacken-stages.json
```

Human page (context only): https://www.wacken.com/de/line-up/running-order-musik/

**Never commit JSON.** Always fetch live.

## Quick filters

- Days: `festivalday.uid` ∈ `{34,35,36,37}` (2026 Wed–Sat) — Sun/Mon/Tue Jungle filtered out
- **Exclude** `stage.uid === 21` (LGH Clubstage)
- **Include** `stage.uid === 13` → `JUN` (Welcome To The Jungle), same as other camping stages
- `slot_id`: global counter per abbrev (`FAS1`… / `JUN1`…), sort events by `start`

## Source priority

1. **wacken.com JSON** — authoritative
2. **`docs/ai-wiki/lineup.md`** — `slot_id` + app overrides
3. **metal-battle.com** — hint only; does not override wacken

## App overrides (do not auto-delete)

| Slot | Keep in wiki |
|------|----------------|
| `HAR13` | `CEREMONY` Farewell & Announcements (official feed may show empty slot) |

## Workflow

1. Diff official feed vs `lineup.md` by `slot_id`
2. `npm run lineup:check-official` (or `--lineup` / `--complete` to apply)
3. Edit changelog if manual follow-up needed
4. `npm run seed:bands:sync` → `--apply`

See also: `docs/ai-wiki/lineup-sync.md`, `docs/ai-wiki/stages.md`
