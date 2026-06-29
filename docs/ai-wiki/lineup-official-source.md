# Wacken Official Running Order — Machine Source

## Purpose

Document how agents and operators fetch the **live** Wacken 2026 music running order without browser scraping, filter it to camping-ground stages, and diff it against [`lineup.md`](lineup.md) before editing seed data.

**Do not commit downloaded JSON.** Feeds change frequently; always fetch at check time.

## Relevant Source Files

| File | Role |
|------|------|
| [`lineup.md`](lineup.md) | Human-editable band assignments + `slot_id` rows (compare target) |
| [`stages.md`](stages.md) | Slot times per `slot_id` (update if official times move) |
| [`lineup-sync.md`](lineup-sync.md) | Apply `lineup.md` → `supabase/seed/bands.ts` via `seed:bands:sync` |
| `supabase/seed/bands.ts` | Seed source applied to the database |

Agent quick pointer: [`.claude/context/lineup-official-source.md`](../../.claude/context/lineup-official-source.md)

---

## Source hierarchy

| Priority | Source | Use for |
|----------|--------|---------|
| **1 — authoritative** | wacken.com JSON (below) | Band name, slot time, stage, image URL, TBA vs confirmed |
| **2 — repo** | `docs/ai-wiki/lineup.md` | Stable `slot_id`, app-only rows, editorial overrides |
| **3 — hint only** | [metal-battle.com](https://www.metal-battle.com/) | Metal Battle country winners; **never overrides wacken.com** when they disagree (e.g. `WET3` Greece: wacken shows `TDB MTB`, metal-battle names I See Red) |

Human UI (SPA — not for scraping):  
https://www.wacken.com/de/line-up/running-order-musik/

---

## JSON endpoints

Embedded in the running-order page `<script>` block (`t3vue.ajaxUrls`). Music running order uses the **concert** feed:

| Feed | URL |
|------|-----|
| **Events (music)** | `https://www.wacken.com/fileadmin/Json/events-concert.json` |
| Stages | `https://www.wacken.com/fileadmin/Json/stages.json` |
| Festival days | `https://www.wacken.com/fileadmin/Json/festivaldays.json` |
| Performances | `https://www.wacken.com/fileadmin/Json/performances.json` |

> If the page ever switches to the full festival feed, look for `events-complete.json` in the same `/fileadmin/Json/` directory. As of 2026-06-29 the music page uses `events-concert.json`.

### Fetch (no browser)

```bash
rtk curl -sL "https://www.wacken.com/fileadmin/Json/events-concert.json" -o /tmp/wacken-events-concert.json
rtk curl -sL "https://www.wacken.com/fileadmin/Json/stages.json" -o /tmp/wacken-stages.json
rtk curl -sL "https://www.wacken.com/fileadmin/Json/festivaldays.json" -o /tmp/wacken-festivaldays.json
```

---

## Filter rules (camping grounds only)

Apply when reducing `events-concert.json` to rows comparable with `lineup.md`:

### Festival year / days

Wacken Open Air 2026 music days — `festivalday.uid`:

| UID | Day |
|-----|-----|
| `34` | Wednesday 29 Jul |
| `35` | Thursday 30 Jul |
| `36` | Friday 31 Jul |
| `37` | Saturday 1 Aug |

Keep events where `event.festivalday.uid` ∈ `{34,35,36,37}`.

### Stages — include / exclude

From `stages.json` (2026 music feed):

| `stage.uid` | Name | Include? |
|-------------|------|----------|
| `21` | **LGH Clubstage** | **NO** — off camping grounds |
| `4` | Faster | YES → `FAS` |
| `5` | Harder | YES → `HAR` |
| `6` | Louder | YES → `LOU` |
| `7` | Headbangers Stage | YES → `HBA` |
| `8` | W:E:T Stage | YES → `WET` |
| `10` | Wackinger Stage | YES → `WAK` |
| `11` | Wasteland Stage | YES → `WAS` |

**Welcome to the Jungle** is not in the official feed. Wiki `JUN1`–`JUN8` placeholders stay until Wacken publishes them.

### `slot_id` assignment

Sort filtered events by `start` ascending, then assign **global** counters per abbreviation (not per day):

```
FAS1, FAS2, … FAS17
HAR1, HAR2, … HAR14
LOU1, … LOU27
WET1, … WET36
HBA1, … HBA36
WAS1, … WAS32
WAK1, … WAK29
```

This matches [`lineup.md`](lineup.md) and `supabase/seed/bands.ts`.

---

## Status mapping (official → wiki)

| Official signal | Wiki `Band Status` | Wiki `Name` |
|-----------------|-------------------|-------------|
| Artist title present, not `Metal Battle tba.` | `CONFIRMED` | Artist title |
| Artist `Metal Battle tba.` or event `title` like `MB Hungary` | `TDB MTB` | `TDB MTB` |
| Event `title` = `Award Ceremony` (Fri W.E.T.) | `TDB MTB` | `TDB MTB` |
| No artist, empty title | `TBD` | `TBD` |
| App-only (see below) | `CEREMONY` or `TBD` | As documented in wiki |

Image URL for `CONFIRMED`: `event.artists[0].assets[0].thumbnail` — prefix `https://www.wacken.com` when path-relative.

Metal Battle region label: often in `event.title` (e.g. `MB Greece`), not `subtitle`.

---

## App-only wiki rows (not in official feed)

These may **differ** from wacken.com by deliberate repo policy. Do not “fix” them to match an empty official slot without checking this table:

| `slot_id` | Wiki policy | Reason |
|-----------|-------------|--------|
| `HAR13` | `CEREMONY` — Farewell & Announcements | Official feed shows empty slot between Arch Enemy and Sabaton; keep ceremony placeholder until wacken names it |
| `JUN1`–`JUN8` | `TBD` | Jungle stage not published in running order yet |

All other camping slots should match the filtered official feed.

---

## Agent checklist (repeat until festival)

1. **Read** [`lineup.md`](lineup.md) summary line and last **Source: … as of YYYY-MM-DD** date.
2. **Fetch** JSON feeds (commands above) — never use committed snapshots.
3. **Filter** with rules in this doc → ~191 camping events (excl. LGH, excl. JUN).
4. **Diff** by `slot_id` against `lineup.md`:
   - Name / status changes (`TDB` → `CONFIRMED`, `TDB MTB` swaps)
   - New empty slots (`TBD`)
   - Image URL updates for `CONFIRMED`
   - Time changes → check [`stages.md`](stages.md) too
5. **Update** `lineup.md` first (bump source date, summary counts, changelog).
6. **Then** `supabase/seed/bands.ts` → [`lineup-sync.md`](lineup-sync.md) dry-run → `--apply`.
7. Optional cross-check [metal-battle.com](https://www.metal-battle.com/) for MB hints only.

### Summary count sanity (2026-06-29 baseline)

After filtering + wiki-only rows, expect **199** total rows in `lineup.md`:

| Status | Typical count |
|--------|----------------|
| `CONFIRMED` | 173 |
| `TDB MTB` | 13 |
| `TBD` | 12 |
| `CEREMONY` | 1 (`HAR13`) |

Counts drift as Wacken confirms bands — update the summary line when syncing.

---

## Cross-references

- [Band Lineup](lineup.md) — assignments table
- [Lineup Sync](lineup-sync.md) — `seed:bands:sync` operator tooling
- [Stage Reference](stages.md) — slot times and stage colors

## Open questions

- `npm run lineup:check-official` — planned helper script to automate fetch + diff (not yet implemented).
