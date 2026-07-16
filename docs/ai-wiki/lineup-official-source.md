# Wacken Official Running Order — Machine Source

## Purpose

Document how agents and operators fetch the **live** Wacken 2026 music running order without browser scraping, filter it to camping-ground stages, and diff it against [`lineup.md`](lineup.md) before editing seed data.

**Do not commit downloaded JSON.** Feeds change frequently; always fetch at check time.

## Relevant Source Files

| File | Role |
|------|------|
| `supabase/seed/lineup-check-official.ts` | CLI entry — modes, confirms, exit codes |
| `src/lib/lineup-official-source.ts` | Fetch, filter, `slot_id` map, parse/diff/patch `lineup.md` and `bands.ts` |
| `src/__tests__/lineup-official-source.test.ts` | Unit tests for classify, diff, patch (no network) |
| [`lineup.md`](lineup.md) | Human-editable band assignments + `slot_id` rows (compare target) |
| [`stages.md`](stages.md) | Slot times per `slot_id` (update if official times move) |
| [`lineup-sync.md`](lineup-sync.md) | Apply `bands.ts` → database via `seed:bands:sync` |
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

Prefer the operator script (see **Script usage** below). Manual curl for debugging only:

```bash
rtk curl -sL "https://www.wacken.com/fileadmin/Json/events-concert.json" -o /tmp/wacken-events-concert.json
rtk curl -sL "https://www.wacken.com/fileadmin/Json/stages.json" -o /tmp/wacken-stages.json
rtk curl -sL "https://www.wacken.com/fileadmin/Json/festivaldays.json" -o /tmp/wacken-festivaldays.json
```

---

## Script usage (`npm run lineup:check-official`)

Implements fetch → filter → `slot_id` map → diff → optional patch. No `.env.local` required (network only until DB apply).

### Three modes

| Command | Writes | Behavior |
|---------|--------|----------|
| `npm run lineup:check-official` | None | Fetch wacken.com JSON, diff vs `lineup.md`, print report |
| `npm run lineup:check-official -- --lineup` | `docs/ai-wiki/lineup.md` | Above + preview patches + y/N confirm → update summary line, per-day **Source:** dates, table rows |
| `npm run lineup:check-official -- --complete` | `lineup.md` + `supabase/seed/bands.ts` | `--lineup` flow, then second y/N confirm → patch seed `name`/`image_url` by `slot_id` |

Always shows exact slot changes before prompting. Cancelling a confirm writes nothing (or leaves `lineup.md` saved if user declined only the `bands.ts` step in `--complete` mode).

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | In sync; or apply succeeded; or user cancelled after review |
| `1` | Diffs found (default check mode only) |
| `2` | Fetch failure or uncaught runtime error |

### Patch policy

- **Authority:** wacken.com `events-concert.json` + `stages.json` (see filter rules above).
- **`HAR13`:** never patched from official feed — wiki keeps `CEREMONY` / Farewell & Announcements.
- **`bands.ts`:** updates `name`/`image_url` for slots with seed rows; skips ceremony and orphan TBD rows with no seed entry.
- **Images:** patch `image_url` only when a slot becomes newly confirmed (`PLACEHOLDER` → URL) or when **name/status** changes — ignore thumbnail vs poster path drift on already-confirmed bands.

### End-to-end workflow

1. `npm run lineup:check-official` — read diff report.
2. `npm run lineup:check-official -- --lineup` — apply wiki when ready.
3. `npm run lineup:check-official -- --complete` — sync seed file (or edit `bands.ts` manually for edge cases).
4. [`lineup-sync.md`](lineup-sync.md) — `npm run seed:bands:sync` dry-run → `--apply` to push to Supabase.

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
| `13` | Welcome To The Jungle | YES → `JUN` |

Jungle is compared like other camping stages. Wed–Sat only via day UIDs `34`–`37`; Sun/Mon/Tue Jungle events are filtered out.

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
JUN1, … JUN14
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

`lineup:check-official` only proposes **image** updates when a slot becomes newly confirmed (`PLACEHOLDER` → URL) or when **name/status** changes — not for thumbnail vs poster path drift on already-confirmed bands.

Metal Battle region label: often in `event.title` (e.g. `MB Greece`), not `subtitle`.

---

## App-only wiki rows (not in official feed)

These may **differ** from wacken.com by deliberate repo policy. Do not “fix” them to match an empty official slot without checking this table:

| `slot_id` | Wiki policy | Reason |
|-----------|-------------|--------|
| `HAR13` | `CEREMONY` — Farewell & Announcements | Official feed shows empty slot between Arch Enemy and Sabaton; keep ceremony placeholder until wacken names it |

All other camping slots (including Jungle `JUN*`) should match the filtered official feed.

---

## Agent checklist (repeat until festival)

1. **Read** [`lineup.md`](lineup.md) summary line and last **Source: … as of YYYY-MM-DD** date.
2. **Run** `npm run lineup:check-official` — fetches live JSON (never use committed snapshots).
3. **Review** diff report: name/status, new `TBD` slots, image updates, time changes → check [`stages.md`](stages.md) too.
4. **Apply wiki:** `npm run lineup:check-official -- --lineup` (or edit manually), then changelog if needed.
5. **Apply seed:** `npm run lineup:check-official -- --complete` or hand-edit `supabase/seed/bands.ts`.
6. **Apply DB:** [`lineup-sync.md`](lineup-sync.md) — `seed:bands:sync` dry-run → `--apply`.
7. Optional cross-check [metal-battle.com](https://www.metal-battle.com/) for MB hints only.

### Summary count sanity (2026-07-07 baseline)

After filtering + wiki-only rows, expect **199** total rows in `lineup.md`:

| Status | Typical count |
|--------|----------------|
| `CONFIRMED` | 185 |
| `TDB MTB` | 1 (`WET23`) |
| `TBD` | 12 |
| `CEREMONY` | 1 (`HAR13`) |

Counts drift as Wacken confirms bands — update the summary line when syncing.

---

## Cross-references

- [Band Lineup](lineup.md) — assignments table
- [Lineup Sync](lineup-sync.md) — `seed:bands:sync` operator tooling
- [Flow: Remote Lineup Sync](flows/lineup-remote-sync.md) — godlike phone preview/apply (Phase 46)
- [Stage Reference](stages.md) — slot times and stage colors

## Open questions

- _(none)_

**Last updated:** 2026-07-07 — Summary counts after 12 Metal Battle UNCONFIRMED→CONFIRMED promotions; cross-ref [flows/lineup-remote-sync.md](flows/lineup-remote-sync.md) for godlike phone apply.
