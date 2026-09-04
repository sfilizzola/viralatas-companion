# Lineup era is the trusted-clock wall

A Festival’s **Lineup era** decides whether day/time/stage may drive live/next, conflicts, and map. **Announcement Lineup** never has a **trusted clock**, even if `bands` already stores times. Inferring from filled columns would fake **Schedule Lineup** after a premature sync.

**Rejected:** Treat any Band with start/end as timed; use era only for `/schedule` chrome.
