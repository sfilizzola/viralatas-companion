# PHASES.md — Active Development

Current phase and upcoming work for Viralatas Metaleiros. See CLAUDE.md for project context, constraints, and key decisions.

**Completed phase history** → `docs/ai-wiki/phases-history.md`  
**Upcoming ideas** → `FUTURE_IDEAS.md`  
**Design spec** → `docs/superpowers/specs/2026-06-26-camp-location-design.md`  
**Implementation plan** → `docs/superpowers/plans/2026-06-26-camp-location.md` (includes grill decisions 2026-06-26)  
**Domain glossary** → `CONTEXT.md` (Campground vs `/now` Vira-Latas HQ presence group)  
**UI variants** → `variants-v2.html` — **Locked: Mural C+ · Map D1**

---

## Phase 45 — Camp HQ Geolocation

**Goal:** Godlike sets **Campground** GPS on arrival (stable for the festival). Vira-latas open Maps from **Mural C+ strip** or **map D1 dock** (outside minimap). No UI on `/now`. Strip title = **Campground** — not “Vira-Latas HQ” (`/now` keeps HQ for the camping presence group).

### Grill decisions (2026-06-26)

| Topic | Decision |
|-------|----------|
| Title | **Campground** (en) · Acampamento · Campamento · Campingplatz |
| Lifecycle | Set on godlike arrival; no mid-festival edits expected |
| Sync | No Realtime v1; other devices refresh on load |
| Admin clear | **One-tap**, no confirm (pre-festival QA) |
| `festival:reset` | Preserve camp coordinates |
| Desktop | Tap → Maps only |
| Admin input | Decimal pair only |
| Map hint | Map-specific (`campMapHint`) |
| Blocked posters | Still see/use Campground strip |
| Sheet title | Campground |

Full detail → plan § Grill session decisions · `CONTEXT.md`

### Deliverables

**Data**
- [ ] Migration: `app_settings.camping_latitude`, `app_settings.camping_longitude` (nullable)
- [ ] IndexedDB store `camp_location` (DB version 13)
- [ ] `campLocationRepository` — sync, save, clear
- [ ] `CAMP_LOCATION_CHANGED_EVENT` for live refresh

**Services & hooks**
- [ ] `src/services/campLocation.ts` — parse, validate, URL, `openCampInMaps`
- [ ] `useCampLocation`, `useLongPress`, `useCampLocationActions`

**UI**
- [ ] `CampNavStrip` / `CampHqCard` on `/announcements` — **C+** (strip + green gaffer tape)
- [ ] `CampMapDock` on `MapPage` — **D1** strip below minimap (not on map image)
- [ ] `CampLocationSheet` — long-press: copy + open Maps
- [ ] `CampPinIcon` — tent + pin, camping green
- [ ] `CampingLocationAdminSection` in Godlike Tools

**i18n**
- [ ] `CampLocation_{br,en,es,de}.json` — title **Campground**; mural + map hints; sheet heading
- [ ] GodlikeAdmin camp-location keys (4 locales)

**Docs**
- [ ] `docs/ai-wiki/flows/camp-location.md`
- [ ] `supabase-schema.md`, `routes.md`, `changelog.md`
- [ ] `public/vira-lata-ds.html` — camp location section + manifest

### Interaction (locked)

| Gesture | Action |
|---------|--------|
| Tap | Open native maps at coordinates |
| Long-press (mobile) | Sheet titled **Campground** with copy + “Open in Maps” |
| Desktop | Tap only → Maps (no sheet, no `⋯`) |
| Coords unset | Hide all affordances |
| Admin clear | One-tap clear, no confirm dialog |

### Acceptance criteria

- [ ] Godlike paste/save/**one-tap clear** in admin; invalid input shows inline errors; decimal pair only
- [ ] Mural **C+** strip titled **Campground** and map D1 dock appear only when coords set
- [ ] Tap opens correct maps URL; long-press sheet (mobile) titled Campground + copy works
- [ ] **No** camp UI on `/now`; **no** overlay on minimap crew dots
- [ ] Blocked posters still see and use Campground strip on Mural
- [ ] Coords cached in IndexedDB; tap works offline after first sync
- [ ] `festival:reset` preserves camp coordinates (`app_settings` untouched)
- [ ] Build green · all tests green

### Out of scope

- `/now` surfaces, custom Maps label, Metal Place coords, embedded map, mural auto-post, multiple pins
- Realtime camp-coord sync, Maps URL parsing in admin, confirm on clear, desktop sheet affordance, in-map minimap marker

---

## When completing a phase

1. Append the phase entry to `docs/ai-wiki/phases-history.md` (not here, not in CLAUDE.md).
2. **Remove all completed phase content from this file.** Replace with either the next phase spec OR `## No active phased work` with `**Next phase:** N+1`.
3. Update `docs/ai-wiki/changelog.md` with a dated entry.
4. Commit all phase changes in a single commit; push to the active branch.
