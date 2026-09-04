# Viralatas Metaleiros

Festival companion PWA for the Viralatas vira-latas. Domain language for multi-festival attendance, badges, Wacken-specific grounds features, and post-festival archival.

## Language

### Festivals & attendance

**Festival**:
A concrete event instance with its own lineup, dates, attendees, and mural — e.g. Wacken Open Air 2026 or Hellfest 2027. Not a repeating brand, and not the badge “festival year.”
_Avoid_: Festival cycle (for this meaning), event brand, venue, trip

**Festival membership**:
The fact that a signed-in **vira-lata** has opted into a specific **Festival** (“I’m going”). Required to see that Festival’s lineup social surfaces (picks of others, mural, `/now` crew). Distinct from having an account.
_Avoid_: Attendee record (unless speaking casually), enrollment, RSVP, crew join

**Vira-lata**:
A person with an account in the Viralatas companion — the group identity. Not the same as **Festival membership**; a vira-lata may be on zero, one, or many Festivals.
_Avoid_: Crew member (ambiguous), user (in product copy), attendee

**Active Festival**:
Which **Festival** a given **vira-lata** is currently working in — a personal preference (switcher), not a global app mode. Schedule, picks, mural, and `/now` social are scoped to it. The device keeps an offline pack for the Active Festival only; switching to another Festival requires network to load that pack.
_Avoid_: Current festival (ambiguous with badge year), selected event, home festival

**Festival crew**:
The set of **vira-latas** who have **Festival membership** on the **Active Festival**. `/now`, popular, and who’s-going social views use this set (still applying friend/camping rules inside it). Not the global account roster.
_Avoid_: Crew (unqualified), everyone, all users, attendees at large

**Leave Festival**:
Ending **Festival membership** for a Festival (“Leave”). The vira-lata loses Festival-crew access to that Festival’s social surfaces. Picks (and related per-band records) are **kept** in storage so opting in again restores them — not a hard wipe. Those kept picks do **not** count in popularity / who’s-going / `/now` for others until the picker has membership again (**membership-gated counts**). Mural posts the vira-lata already made **remain** visible to the Festival crew (not auto-hidden or auto-deleted on Leave).
_Avoid_: Unsubscribe, delete festival data, hard leave

**Membership-gated counts**:
Attendance aggregates for a Festival (popular, going counts, `/now` others) only include pickers who currently have **Festival membership** on that Festival.
_Avoid_: Ghost picks, raw pick-row counts, historical attendance (for live social)

**Festival catalog**:
The list of **Festivals** available to opt into (created by ops/seed, not in-app). Before **Festival membership**, a vira-lata sees **metadata only** (name, dates, timezone — not lineup, picks, or mural).
_Avoid_: Festival directory with full schedule preview, public lineup browser (v1)

**Festival feature**:
An optional capability on a **Festival** (e.g. Metal Place, map, duck, camp, wrap, remote lineup). Core schedule / picks / `/now` / mural are not Festival features — they exist for every Festival. Wacken 2026 simply has more features enabled. **Lineup era** is also not a Festival feature — every Festival has one.
_Avoid_: Wacken grounds pack (as the umbrella name), module (unless speaking engineering), add-on product, running order (for this meaning)

**Band**:
A named act on a **Festival**’s lineup. Identity is the act, not a stage or time slot. In **Announcement Lineup** the Festival knows the Band; in **Schedule Lineup** it also knows day, time, and stage. When laptop sync matches one announced name to one official slot, it is still the same Band — picks stay.
_Avoid_: Slot, set, performance (when meaning the act itself)

**Pick**:
A vira-lata’s interest marker on a **Band** — not a commitment. Same Pick in **Announcement Lineup** and **Schedule Lineup**; identity follows the Band, not the slot. In Announcement Lineup, Popular and My Picks still show those Picks (counts / name-only rows). They do not use a **trusted clock**.
_Avoid_: RSVP, ticket, commitment, hiding picks until Schedule Lineup

**Name match**:
Laptop sync pairing an announced **Band** to an official slot by normalized name (trim, collapse space, Unicode NFKC, case-insensitive) inside one Festival. A unique pair keeps the same Band. An **ambiguous name cluster** is skipped (other names still apply; sync exits non-zero). Laptop `seed:bands:sync` only — not **Remote lineup sync**.
_Avoid_: Slot match, remote lineup sync, fuzzy match (beyond that normalize), auto-merge, first slot wins, phone name-match

**Ambiguous name cluster**:
Two or more announced **Bands** sharing a normalized name, or two or more official slots sharing that name, in the same Festival. **Name match** does not pick a winner. Sync reports the cluster, skips it, applies the rest, and fails the exit code.
_Avoid_: Auto-merge, duplicate picks onto both slots, abort entire apply

**Official-only slot**:
A complete slot in the **Lineup wiki** (day, time, stage) with no matching announced **Band**. Laptop sync **INSERT**s a new Band with zero picks. Not a leftover (that is live-without-wiki).
_Avoid_: Skip until announced, dummy announced row

**Lineup era**:
Which of two Lineup states a **Festival** is in: **Announcement Lineup** or **Schedule Lineup**. Every Festival has a Lineup era — not only Wacken. A newly catalogued Festival starts in **Announcement Lineup** until a **Lineup era flip**. Wacken 2026 and Summer Breeze 2026 start in **Schedule Lineup**. Not a **Festival feature**, and not **Official running order**.
_Avoid_: Festival feature (for this meaning), running-order flag (in product talk), official running order (for this meaning)

**Announcement Lineup**:
The Lineup era where the Festival has published **who** is playing (named **Bands**) but not trustworthy day, time, or stage. Vira-latas pick by name. Rumored days stay **Lineup wiki** footnotes — not on the Band, not in the app list.
_Avoid_: Planning list, TBA schedule, untimed festival, announcement (the mural), rumored day as data

**Schedule Lineup**:
The Lineup era where the Festival has published day, time, and stage for **Bands**. Timed schedule, conflicts, and live/next use this era.
_Avoid_: Official running order (the Wacken feed), timed festival (as the era name)

**Trusted clock**:
Day, time, and stage the app may use for live/next, conflicts, and map. Exists only in **Schedule Lineup**, and only for a **Band** that actually has those fields. In **Announcement Lineup**, clocks are untrusted even if the database already has times. `/now` live/next uses trusted clocks only — it is not the Announcement Lineup planning list (`/schedule` is).
_Avoid_: Inferring from filled columns, “has start_time”, untimed (as the era name), planning `/now` (until a later phase)

**Lineup wiki**:
The committed wiki page for a Festival’s lineup. Human source of truth when building the seed script that updates live **Bands**. In **Announcement Lineup**, one normalized name per Festival — do not author duplicate announced rows. In **Schedule Lineup**, a Band missing day, time, or stage is omitted from the wiki and is not **added** to live. Distinct from **Official running order** (Wacken feed). The wiki does not auto-delete live rows that it no longer lists — those are **leftover Bands**.
_Avoid_: Live database as the authoring source, script as the human SoT, wiki as a live wipe

**Leftover Band**:
A live **Band** that is not in the current **Lineup wiki** (typical: announced name with no slot after the Festival enters **Schedule Lineup**). Laptop sync **reports** it and never auto-deletes. Until an operator deletes it by hand, it stays name-only — no **trusted clock**. Picks stay. It still appears on Lineup, Popular, and My Picks (not slotted-only).
_Avoid_: Auto-delete leftover, hide leftover, ghost band, schedule-only leftovers

**Lineup era flip**:
Godlike changing the **Active Festival** between **Announcement Lineup** and **Schedule Lineup** (either direction) in the PWA, online. The laptop seed script updates **Bands**; it does not flip era. Filling times does not enter Schedule Lineup. Flipping back to Announcement Lineup drops **trusted clock** even if old times remain in the database. Other vira-latas pick up the new era on the next **Festival cache version** check (pack + **Festival catalog** reload) — they may see the old era until then. Not Realtime.
_Avoid_: Auto-flip on sync, script sets era, global app setting, one-way era, instant era for every phone

**Official running order**:
Wacken's live JSON feed (wacken.com) — authoritative source when building a remote lineup plan during the festival. Repo seed files may lag until **laptop reconcile**. A Wacken-only operator feed; it is not **Lineup era** and does not apply to every Festival.
_Avoid_: Official lineup, Wacken feed (too generic), Schedule Lineup (for this meaning), running order (unqualified)

**Active Festival pack**:
The offline IndexedDB dataset for the **Active Festival**: bands, picks, mural, announcement reactions, missed bands, and ratings (the full core social pack). Cleared and reloaded when the Active Festival changes. Not a cache of every Festival the vira-lata has joined.
_Avoid_: Global IDB roster, multi-festival warm cache

**Membership backfill**:
A one-time cutover that grants **Festival membership** on `wacken-2026` to existing accounts so the app keeps working after migrate-in-place. Not the steady-state join path — ongoing joins remain self opt-in from the **Festival catalog**. New accounts after cutover start with **no** memberships and Join from the catalog.
_Avoid_: Auto-enroll forever, silent join for every new Festival, default festival for new signups

**Godlike (multi-festival)**:
Godlike does **not** bypass **Festival membership** for normal PWA reads/writes. To use a Festival in-app, godlike Joins like anyone else. Cross-Festival or pre-join ops stay on laptop/seed/service role.
_Avoid_: Implicit member of every Festival, godlike catalog spectator without Join

**Viralatas App Pack (v1 multi-festival)**:
Sister PWAs (Setlist / MoshSplit) stay linked as today — **not** Festival-scoped in v1.
_Avoid_: Per-Festival playlist space (until those products support it)

**Crew profile cache**:
The `crew_users` IndexedDB store used for social display. For multi-festival, it holds the **Festival crew** for the **Active Festival** (not every account in the app). UI reads this store first; reconnect sync replaces it for the Active Festival.
_Avoid_: Crew IDB, users cache, global roster cache

**Badge consolidation**:
A one-time, godlike-triggered snapshot that copies each vira-lata's earned year-specific badges into `user_badge_history` at the end of a festival cycle. Test vira-latas (`is_test_user = true`) are excluded.
_Avoid_: Year freeze, badge freeze, historical badge migration

**Live vest**:
The vest patch display on `/profile` and `/now` — badges earned or persisted for the **current festival cycle** plus evergreen identity badges.
_Avoid_: Active badges, current badges

**Previously Achieved** (`Conquistas Anteriores`):
A profile section showing frozen badges from past festival years, read from `user_badge_history`. The sole home for year-specific wins after consolidation and festival reset. Archived badges render in a read-only grid grouped by year; tap opens the same overlay patch modal as the live vest (label + year chip only — no description, no fullscreen zoom).
_Avoid_: Historical badges, archived vest, badge history section

**Evergreen badge**:
A badge with no `year` field on `BadgeConfig` — identity or cross-year milestones (e.g. country, OG, 5-Wackens). Stays on the live vest every festival; never consolidated.
_Avoid_: Permanent badge, non-year badge

**Year badge**:
A badge with `BadgeConfig.year` set to a festival year (e.g. `2026`). Earned from picks, seen bands, location, or assignment during that Wacken. Consolidated into `user_badge_history` at cycle end; not shown on the live vest after reset.
_Avoid_: Festival badge, seasonal badge, historical badge

**Registry rollover**:
At each new Wacken cycle, year-badge entries keep the same slug but bump `BadgeConfig.year` (and conditions/artwork as needed). The live engine evaluates only evergreen badges plus entries where `year === CURRENT_FESTIVAL_YEAR`.
_Avoid_: Year-suffixed slugs, registry accumulation

**Frozen badge snapshot**:
One row in `user_badge_history` per earned year-badge, storing `slug`, `image_path`, and `label_key` as they were at consolidation time. Previously Achieved renders from these frozen fields, not from the live registry.
_Avoid_: Badge archive row, historical badge record

**Badge asset immutability**:
Badge PNG files in `public/badges/` are never overwritten once consolidation may reference them. When art changes for a new Wacken cycle, add a new versioned file (e.g. `badge_medic-27.png`) and point the live registry at it; old files remain for frozen history rows.
_Avoid_: In-place image replace, badge image overwrite

**Badge history cache**:
The client's copy of `user_badge_history` rows in IndexedDB. UI reads this store first; a sync-on-profile-load pulls from Supabase when online and replaces local rows for the signed-in user.
_Avoid_: Badge history IDB, offline badge archive

**Social snapshot**:
The derived social state for the **Active Festival** shared by `/now` and the live vest — **Festival crew** plans and groups, plus Wacken-grounds fields (Metal Place window, camping/lost) when those features apply. Built from IDB inputs for the Active Festival.
_Avoid_: Live preview state, crew cache DTO

**Metal Place**:
The crew’s physical meetup spot at Wacken (BBQ / hangout). Not a stage — a location vira-latas can check into when a window is open. Enabled only when the Active Festival has the Metal Place **Festival feature**.
_Avoid_: Venue, metal bar, BBQ zone (in user copy “Metal Place” is the product name)

**Presence**:
A vira-lata’s live location state for Festival-crew `/now` groups (camping vs Metal Place, etc.). Not core to every Festival — it belongs with camping / Metal Place **Festival features**. Festivals without those features have no Presence UI.
_Avoid_: Check-in (generic), GPS presence, always-on status

**Metal Place window**:
A godlike-configured interval on one festival day (D1–D4) when check-in is allowed — same calendar day only, start before end, end by 23:59. Multiple windows may exist across the festival; at most one may be active at any instant (overlaps forbidden). Zero windows means Metal Place is off.
_Avoid_: Slot, session, event block

**Metal Place check-in**:
A vira-lata setting `is_at_metal_place` true while a window is active. Ends on manual toggle, auto-checkout when the window closes, or camping/band rules that clear location flags.
_Avoid_: RSVP, attendance mark

**Metal Place location visit**:
One increment to `location_visits.metal_place` per check-in session — each false→true transition on `is_at_metal_place`, including a second check-in later the same festival day after auto-checkout. Not capped per day or per window.
_Avoid_: Window visit, daily visit

**Consolidation window**:
The operator period after `isFestivalEnded()` is true and before the next `festival:reset`. Badge consolidation for a festival year may only run inside this window; re-runs within it are idempotent. Godlike users may bypass the gate via existing time override or an explicit admin force action for QA.
_Avoid_: Freeze window, archive period

**Festival ended**:
True for the **Active Festival** when the current instant is past the latest `end_time` among that Festival’s non-ceremony bands (i.e. the bands in the active offline pack). Gates wrap discovery / consolidation UX for whatever is Active — not a global “all Festivals over” flag.
_Avoid_: Festival over, post-festival, any-festival-ended

**Transition overlap**:
Between consolidation and the next `festival:reset`, the same year-badge may appear on both the live vest and in Previously Achieved. This duplication is acceptable and requires no cross-store dedup logic.
_Avoid_: Badge dedup, duplicate patch hiding

**Current festival year**:
The active Wacken cycle year, derived at runtime as the maximum `BadgeConfig.year` across the live badge registry. The live vest evaluates only evergreen badges (`year` omitted) plus year-badges matching this value.
_Avoid_: CURRENT_FESTIVAL_YEAR constant, festival year config

**Campground** (camp location):
The crew’s fixed physical campsite GPS — one lat/lng pair set by godlike on arrival, stable for the rest of that Wacken cycle, surfaced on the Mural and `/map` as a Maps deep link. Not live presence; not who is at camp. Godlike may **one-tap clear** coordinates before the festival to hide surfaces while testing (no confirm dialog).
_Avoid_: Vira-Latas HQ (that label on `/now` is the **camping presence group** only), camp HQ card, HQ pin

**Camping presence group** (`Vira-Latas HQ` on `/now`):
The live `/now` bucket listing vira-latas currently checked in at camping. Unrelated to Campground coordinates.
_Avoid_: Campground, camp pin, GPS card

**Remote lineup sync**:
A godlike-only operator action in the PWA: fetch Wacken's **Official running order**, preview a **lineup plan** against production `bands`, then apply after explicit confirm. Does not update git-tracked seed files. Requires the `remote_lineup` **Festival feature** (Wacken); it is not how a Festival enters **Schedule Lineup**. Matches by slot, never by **name match**.
_Avoid_: Phone seed, mobile bands sync, remote seed, flipping Lineup era, phone name-match

**Lineup plan**:
The dry-run diff between the official running order and production `bands`, classified into UPDATE, MOVE, INSERT, and DELETE buckets with pick-impact counts. Preview is read-only; apply executes the plan and bumps `cache_version`.
_Avoid_: Sync diff, bands diff, migration plan


**Slot move**:
A CONFIRMED band that Wacken relocated to a different `slot_id`. Picks and missed-band records follow the band, not the slot — repointed using a **move pick snapshot** (vira-lata `user_id`s on the source band at preview time). TBD / TDB MTB / ceremony slots are never auto-moved. When multiple moves ship in one plan, pick repoints and metadata updates finish before vacated slot rows are removed.
_Avoid_: Band swap, pick transfer, bands-move (CLI script name)

**Move pick snapshot**:
The per-table sets of vira-lata `user_id`s who held a pick or missed-band record on the source band when the lineup plan was previewed (`pickUserIds` and `missedUserIds` on each move). Apply repoints only these users in each table — never all current rows on a shared destination band.
_Avoid_: Pick list, repoint set, mover IDs

**Blocked move**:
A detected slot move withheld from apply because the destination slot's current band still has picks (or missed-band records) and that displaced band is not accounted for elsewhere in the same lineup plan (no matching MOVE or DELETE for it). Operator must resolve from laptop or adjust the official feed before apply.
_Avoid_: Failed move, move error, stuck move

**Partial lineup apply**:
Applying only the safe buckets from a lineup plan — UPDATE, INSERT, and non-blocked MOVE/DELETE rows — while skipping blocked moves (and blocked deletes unless `DELETE` confirmed). Successful partial apply still bumps `cache_version`. A **plan token** is single-use: any successful apply burns it; operator must preview again before the next apply. Success UI states applied and skipped counts separately.
_Avoid_: Half sync, incremental apply, apply subset

**Plan token**:
A short-lived (10 min) credential issued on preview that binds a lineup plan hash to a point in time. The hash covers the **full** plan — applicable and blocked rows alike. Apply re-fetches the official feed, rebuilds the plan, and rejects with `plan_stale` if the hash no longer matches. Consumed after one successful apply (full or partial). Integrity relies on apply-time revalidation, not a shared signing secret (v1).
_Avoid_: Sync token, preview token, lineup JWT

**Laptop reconcile**:
Post-festival CLI workflow (`lineup:check-official --complete` then `seed:bands:sync` dry-run) to bring `lineup.md` and `bands.ts` back in line with production after remote sync during the festival.
_Avoid_: Git sync, seed reconcile

**Festival reset**:
An ops wipe of pre-event / stale social state for **one** **Festival** (announcements and related state for that Festival; optional bands re-seed for that Festival only). Must not destroy other Festivals’ picks or lineups. Distinct from **Leave Festival** (a vira-lata action).
_Avoid_: Global nuke once multiple Festivals exist, app reinstall, cache-only bump

**Festival cache version**:
A per-**Festival** invalidation token. When it changes for the **Active Festival**, the client clears and reloads that Festival’s offline pack. Changing another Festival’s version must not wipe a vira-lata’s Active Festival pack.
_Avoid_: Global cache_version as the only lineup invalidation once multiple Festivals exist

## Flagged ambiguities

**Festival vs festival cycle / current festival year**:
**Festival** = event instance (multi-festival product). **Festival cycle** / **current festival year** remain Wacken-badge-year language until the badge vest is redesigned. Do not use “festival cycle” to mean opting into Hellfest.

**Lineup era vs Official running order vs Festival feature**:
**Announcement Lineup** / **Schedule Lineup** = every Festival’s Lineup era (who is known vs day/time/stage known). **Official running order** = Wacken’s JSON feed only. **Festival features** = optional extras (map, duck, …). Do not say “running order” for any of these without the qualifier. **Trusted clock** follows Lineup era, not whether time columns are filled.

**Friend (`is_friend`)**:
Stays a **global** vira-lata flag for v1 (camping/Arrival/presence exclusions). Not modeled per **Festival**. Revisit if someone is Friend at one Festival and full crew at another.

**Global `cache_version` (legacy)**:
Pre-multi-festival single app_config token. Superseded in product language by **Festival cache version**; migration plan must replace or namespace the global wipe behavior.

## Example dialogue

**Dev:** Can Beto plan Hellfest and Wacken in the same app?

**Expert:** Yes. Each is a **Festival**. He **Joins** both (**Festival membership**), then sets **Active Festival** to whichever he’s working on. Only that Festival’s **Active Festival pack** is on the phone offline.

**Dev:** Hellfest posted band names but no times. Wacken already has stages. Same app?

**Expert:** Same **Band** idea on both. Hellfest is in **Announcement Lineup** (we know **Bands**). Wacken is in **Schedule Lineup** (we know day, time, and stage). Every Festival has a **Lineup era**. Wacken’s **Official running order** feed is unrelated — that’s only remote lineup sync.

**Dev:** Ops pasted Hellfest times into the database but left it in Announcement Lineup. Does `/now` show live sets?

**Expert:** No. No **trusted clock** until the Festival is in **Schedule Lineup**. Filled columns do not override the era.

**Dev:** Local Hero was announced and picked. The Schedule **Lineup wiki** dropped them — no slot. Does sync wipe them?

**Expert:** No. That’s a **leftover Band**. Dry-run reports it. No auto-delete. Picks stay until someone deletes the row by hand.

**Dev:** I applied Hellfest slots with the laptop script. Is `/now` live yet?

**Expert:** No. **Lineup era flip** is godlike in the PWA on the **Active Festival**. The script does not flip era.

**Dev:** Summer Breeze republished stages. Times in the DB are wrong.

**Expert:** Godlike flips that **Active Festival** back to **Announcement Lineup**. No **trusted clock** until they flip to Schedule again. The script can fix rows later.

**Dev:** Maria picked announced Gojira. Wiki later puts Gojira on FAS1. Same band?

**Expert:** Yes — **name match**. One announced name, one official slot: same **Band**, her pick stays. `"  Gojira "` still matches.

**Dev:** Official has Gojira twice. One announced Gojira with picks. What happens?

**Expert:** **Ambiguous name cluster** — skip that name. Rest of the lineup still applies. Fix the wiki, re-run. Don’t copy her pick onto both slots.

**Dev:** Bloodbath was never announced. Wiki now has them on a full slot.

**Expert:** **Official-only slot** — INSERT a new **Band**, zero picks. Wiki had day, time, and stage, so it is a valid add.

**Dev:** Press says Gojira is Sunday. Do we put day on the Band?

**Expert:** No. Announcement Lineup is who, not when. Footnote the rumor in the **Lineup wiki**. The app list stays flat.

**Dev:** I flipped Hellfest to Schedule Lineup. Beto still sees posters.

**Expert:** Until his phone’s **Festival cache version** check reloads pack + catalog. Same lag as a lineup sync. No live era push.

**Dev:** We just added Hellfest 2027. Timed UI?

**Expert:** No — new Festivals start in **Announcement Lineup**. Wacken and Summer Breeze start in **Schedule Lineup**. Godlike flips when times are published.

**Dev:** Hellfest is still announcement. Does Popular work?

**Expert:** Yes. A **Pick** is still “I want this Band.” Popular is counts then name. My Picks lists them without times. `/now` does not become a second planning list.

**Dev:** We flipped to Schedule Lineup. Local Hero never got a slot. Gone from Lineup?

**Expert:** No. **Leftover Band** — still on Lineup as name-only, plus Popular and My Picks, until you delete by hand.

**Dev:** Maria Left Hellfest. Do her Bloodbath picks still bump popular?

**Expert:** No — **membership-gated counts**. The pick rows can stay, but she doesn’t count until she Joins again. Her mural posts from last week still show.

**Dev:** Wacken swaps Skyline and Thundermother between FAS5 and LOU3. I preview on phone — two moves. What happens to pickers?

**Expert:** Preview snapshoots who picked each band. Apply repoints only those users, updates metadata, deletes vacated rows **after** both repoints. Thundermother pickers don't silently become Skyline pickers.

**Dev:** LOU3 has Thundermother picks but official dropped her — Skyline moves into LOU3. Can I apply?

**Expert:** **Blocked move** — banner + report, not in move chip. You can **partial apply** safe UPDATEs. Re-preview after fixing on laptop.

**Dev:** Beto earned `dreamer` and `roots` at Wacken 2026. Consolidation ran in August. It's March 2027 — picks are empty and `festival:reset` cleared persist metadata. Where do those patches show?

**Expert:** Only in **Previously Achieved**, under "Wacken 2026". The **live vest** shows evergreen badges plus whatever Beto earns for the 2027 cycle — not last year's year-badges. (Badge multi-Festival vest is not defined yet.)

**Dev:** What about `pais-tropical`?

**Expert:** That's an **evergreen badge** — still on the live vest every year. Consolidation ignores it.
