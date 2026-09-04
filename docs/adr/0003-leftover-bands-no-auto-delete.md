# Leftover Bands are reported, never auto-deleted

When a Festival’s **Lineup wiki** becomes **Schedule Lineup**, names that were live in **Announcement Lineup** but have no slot are omitted from the wiki (do not **add** incomplete Bands). Laptop sync must **not** DELETE those live rows: they are **leftover Bands**. Dry-run lists them; an operator may delete by hand if they want wiki = live. Until then they stay name-only on Lineup, Popular, and My Picks.

**Rejected:** Wiki-strict DELETE of leftovers (destroys picks); hide-but-keep; block entering Schedule Lineup until every announced name has a slot; hide leftovers from `/schedule`.
