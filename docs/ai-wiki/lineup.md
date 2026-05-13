# Wacken Open Air 2026 — Band Lineup Reference

> **This file is the human-editable source of truth for band assignments.**
> For stage schedules (slot times, stage colors, day codes, pairing rules), see [stages.md](stages.md).
>
> To update the lineup:
> 1. Edit this file
> 2. Apply changes to `supabase/seed/bands.ts`
> 3. Run `npm run seed:bands`

**Summary:** 166 bands CONFIRMED · 26 bands TBD · 192 total

---

## Reference Keys

### Stage Abbreviations

See [stages.md](stages.md) for full stage reference (colors, categories, pairing rules, physical layout). Quick abbreviation lookup:

| Abbrev | Full Name |
|--------|-----------|
| `HAR` | Harder |
| `FAS` | Faster |
| `LOU` | Louder |
| `WET` | W.E.T. |
| `HBA` | Headbangers |
| `WAS` | Wasteland |
| `WAK` | Wackinger |
| `JUN` | Welcome to the Jungle |

### Slot ID

Each slot has a unique ID (e.g. `FAS1`, `HAR7`). Use it to look up the **time** for that slot in [stages.md](stages.md#stage-schedules). Slot IDs link this file to the stage schedule grid.

### Band Status

- **`CONFIRMED`** = Band has a real image URL from wacken.com
- **`TBD`** = Placeholder — no confirmed image yet

---

## Band Assignments

> Stage order within each day: Harder · Faster · Louder · W.E.T. · Headbangers · Wasteland · Wackinger · Welcome to the Jungle
>
> For slot start/end times, look up the Slot ID in [stages.md](stages.md#stage-schedules).

---

## Day 1 — Wednesday, 29 July 2026

> **Note:** Harder stage is closed on Day 1. Faster starts at 16:00 (Doors: 15:30). Louder, W.E.T., Headbangers, Wasteland, Wackinger, and Welcome to the Jungle stages open earlier (from ~11:00–14:00).
>
> **Band placement algorithm:** Importance rank #1 → last slot of rank-1 stage (Faster), then rank #3 stage (Louder, rank-2 Harder is closed), then stages 4–8 in rank order. Repeat from 2nd-to-last slots inward.

### Harder Stage

*Closed — opens Thursday.*

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| The Gathering | Gothic Metal | FAS1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/2/csm_The_Gathering-WOA26_57ded7843d.jpg |
| Lovebites | Heavy Metal | FAS2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/d/csm_lovebites_26b_38ca926080.jpg |
| Electric Bassboy | TBD | FAS3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/3/csm_electric_bassboy26_c1af9b52ad.jpg |
| Gagamania | TBD | FAS4 | TBD | PLACEHOLDER |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Alien Rockin Explosion | Rock | LOU1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/4/csm_alien_rockin_explosion_26_dba5a44bfe.jpg |
| 5th Avenue | TBD | LOU2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/f/csm_5th_Avenue25_9d44c97386.jpg |
| Lacuna Coil | Gothic Metal | LOU3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/3/csm_lacuna_coil_26_289f52868d.jpg |
| Rose Tattoo | Hard Rock | LOU4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg |
| TBS | TBD | LOU5 | TBD | PLACEHOLDER |
| Hämatom | Industrial Metal | LOU6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| E.N.D. | TBD | WET1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/a/csm_end_26_cc8178d602.jpg |
| Elvicho | TBD | WET2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/f/csm_elchivo_26_576ae82fc4.jpg |
| Force | TBD | WET3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/c/csm_force_26_9eb5006911.jpg |
| Given By The Flames | TBD | WET4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/7/csm_given_by_the_flames_26_a72a8cc764.jpg |
| I See Red | TBD | WET5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/7/csm_i_see_red_26_740c88bbf9.jpg |
| Maschine's Late Night Show | TBD | WET6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/9/csm_maschine_2019_8c7405dcc6.jpg |
| Midhaven | TBD | WET7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/9/csm_midhaven_26_ad2bc280fa.jpg |
| Vanir | Viking Metal | WET8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg |
| The Hardkiss | Rock | WET9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/8/csm_The_Hardkiss-WOA26_2db7165b54.jpg |
| Poison The Preacher | Metal | WET10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/c/csm_poison_the_preacher_26_719f682a4a.jpg |
| Dirty Shirt | Crossover Metal | WET11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/d/csm_dirty_Shirt_26_d6b1aa60da.jpg |
| Ballroom Hamburg DJ Team | TBD | WET12 | TBD | PLACEHOLDER |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Novelization | TBD | HBA1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/3/csm_novelization_26_6842acc391.jpg |
| Sinamort | TBD | HBA2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/7/csm_sinamort_26_76b1458fee.jpg |
| Speak in Whispers | TBD | HBA3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/9/csm_speak_in_whispers_26_157b14e684.jpg |
| The Butcher Sisters | TBD | HBA4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/a/csm_the_butcher_sisters26_63acf7d891.jpg |
| Thomas Nicholas Band | TBD | HBA5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/6/csm_thomas_nicholas_26_d2983140b2.jpg |
| Vreid | TBD | HBA6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/0/csm_vreid_26_f92e6e9af1.jpg |
| TBD | TBD | HBA7 | TBD | PLACEHOLDER |
| Velvet Rush | AOR | HBA8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/c/csm_velvet_rush_26_79ee43e0e7.jpg |
| The Troops Of Doom | Thrash Metal | HBA9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/6/csm_troops_of_doom26_13f1c1c107.jpg |
| Ricky Warwick | Hard Rock | HBA10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/d/csm_ricky_warwick26c_9f35eea5b5.jpg |
| Expellow | TBD | HBA11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/b/csm_expellow_26b_f274263240.jpg |
| Battlecreek | TBD | HBA12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/e/csm_Battlecreek-WOA26_ebdf45051d.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS1 | TBD | PLACEHOLDER |
| TBD | TBD | WAS2 | TBD | PLACEHOLDER |
| TBD | TBD | WAS3 | TBD | PLACEHOLDER |
| Unzucht | Industrial / Gothic | WAS4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg |
| Sir Henry Hot Memorial | TBD | WAS5 | TBD | PLACEHOLDER |
| Mambo Kurt | TBD | WAS6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/4/csm_mambo_kurt_25_d25410db45.jpg |
| Crypt Sermon | Doom Metal | WAS7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/4/csm_crypt_sermon_26_25a80f0eed.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Wacken Firefighters | TBD | WAK1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/6/csm_wacken_firefighters_25_5f6d39317e.jpg |
| TBD | TBD | WAK2 | TBD | PLACEHOLDER |
| Visions of Atlantis | Symphonic Metal | WAK3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/6/csm_visions_of_atlantis_26_2bfe817394.jpg |
| Thundermother | Rock | WAK4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg |
| Sacred Steel | Power Metal | WAK5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/0/csm_sacred_steel_26_78f1daf932.jpg |
| Kadavar | Stoner Rock | WAK6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg |
| Broken By The Scream | Visual Kei Metal | WAK7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/5/csm_Broken_By_The_Scream-WOA26_8ad83f8245.jpg |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Phantom | Heavy Metal | JUN1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/7/csm_phantom_26_2946b95d36.jpg |
| Diabolisches Werk | TBD | JUN2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/3/csm_diabolisches_werk_26_584e2240f9.jpg |

---

## Day 2 — Thursday, 30 July 2026

> **Band placement algorithm:** Group A (Faster, Harder, Louder) filled completely first — cycling last→2nd-to-last→… in rank order until all Group A slots exhausted. Then Group B (W.E.T., Headbangers, Wackinger, Wasteland, Welcome to the Jungle) filled the same way. All 8 stages open on Day 2.

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Therapy? | Alternative Rock | HAR1 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg |
| Turbonegro | Punk Rock | HAR2 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg |
| Savatage | Heavy Metal | HAR3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| P.O.D. | Nu Metal | FAS5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg |
| Yngwie Malmsteen | Neoclassical Metal | FAS6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg |
| Def Leppard | Hard Rock | FAS7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Anaal Nathrakh | Black Metal / Grindcore | LOU7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_AnaalNathrakh1_1706ff6610.jpg |
| Alien Ant Farm | Alternative Rock | LOU8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/b/csm_alien_ant_farm_26_f4695d8f52.jpg |
| 9mm Headshot | TBD | LOU9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/c/csm_9mm_26_b14cffe6c2.jpg |
| Life of Agony | Alternative Metal | LOU10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg |
| Uli Jon Roth | Rock | LOU11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg |
| Europe | Hard Rock | LOU12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WET13 | TBD | PLACEHOLDER |
| TBD | TBD | WET14 | TBD | PLACEHOLDER |
| TBD | TBD | WET15 | TBD | PLACEHOLDER |
| TBD | TBD | WET16 | TBD | PLACEHOLDER |
| Wüstenberg | TBD | WET17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/1/csm_wuestenberg_26_7a5a7ede3d.jpg |
| Misþyrming & Nergal | Black Metal | WET18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/c/csm_Sventevith-Logo-2_da655748b4.jpg |
| Sir Henry Hot Memorial | TBD | WET19 | TBD | PLACEHOLDER |
| Manntra | Folk Metal | WET20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/3/csm_manntra_26_a22fae1fff.jpg |
| Evil Jared & Krogi | TBD | WET21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/5/csm_evil_jared_krogi26_9d4bb77d9d.jpg |
| Black Tish | TBD | WET22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_black_tish_26_9887b0d604.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | HBA13 | TBD | PLACEHOLDER |
| TBD | TBD | HBA14 | TBD | PLACEHOLDER |
| TBD | TBD | HBA15 | TBD | PLACEHOLDER |
| Year of the Goat | Occult Rock | HBA16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/e/csm_year_of_the_goat_26_f271ba4dd9.jpg |
| Temple of the Absurd | TBD | HBA17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/a/csm_temple_of_the_absurd_26_ad20ecb9ce.jpg |
| Skyline | TBD | HBA18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/5/csm_skyline_2024_a76c70015c.jpg |
| Misery Index | Death Metal / Grindcore | HBA19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/a/csm_Misery_Index-WOA26_477d278139.jpg |
| Firespawn | Death Metal | HBA20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/3/csm_Firespawn-WOA26_b9d52bcc7e.jpg |
| Blood Red Throne | Death Metal | HBA21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/a/csm_blood_red_throne26_98867522b5.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS8 | TBD | PLACEHOLDER |
| TBD | TBD | WAS9 | TBD | PLACEHOLDER |
| Wytch Hazel | Traditional Heavy Metal | WAS10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/5/csm_Wytch_Hazel-WOA26_3a3c5566d4.jpg |
| Storm Seeker | Folk Metal | WAS11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg |
| Saviourself | TBD | WAS12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/5/csm_saviourself_26_2359155f97.jpg |
| Katerfahrt | Rock | WAS13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/0/csm_Katerfahrt-WOA26_4213c9f3a0.jpg |
| Cowgirls From Hell | TBD | WAS14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/0/csm_cowgirls_from_hell_26_30a60185cc.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAK8 | TBD | PLACEHOLDER |
| TBD | TBD | WAK9 | TBD | PLACEHOLDER |
| Vogelfrey | Folk Metal | WAK10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg |
| Spectral Wound | Black Metal | WAK11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/e/csm_spectral_wound26_3263ad4710.jpg |
| Sagenbringer | Folk Metal | WAK12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/2/csm_sagenbringer_26_b57d26c84d.jpg |
| H-Blockx | Rap Metal | WAK13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg |
| Brunhilde | Folk Metal | WAK14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Kupfergold | TBD | JUN3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/c/csm_Kupfergold-WOA26_1d73350ab6.jpg |
| Craft | Black Metal | JUN4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/d/csm_Craft_cropped_size_-_photo_by_Soile_Siirtola_fabe03b40f.jpg |

---

## Day 3 — Friday, 31 July 2026

> **Band placement algorithm:** Group A (Ranks 1–3: Faster, Harder, Louder) filled completely first — last slot of each in rank order, then 2nd-to-last, cycling until all Group A slots exhausted. Then Group B (Ranks 4–8) filled with the same pattern.

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Animals as Leaders | Progressive Metal | HAR4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/b/csm_animals_as_leaders26_0a9b3dfbf5.jpg |
| Danko Jones | Hard Rock | HAR5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg |
| Sepultura | Groove Metal | HAR6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg |
| In Flames | Melodic Death Metal | HAR7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Arroganz | Metal | FAS8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/f/csm_arroganz_26b_b0fc829592.jpg |
| Alfahanne | Black Metal | FAS9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg |
| Black Label Society | Heavy Metal | FAS10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg |
| Saxon | Heavy Metal | FAS11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg |
| Judas Priest | Heavy Metal | FAS12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Blood Fire Death | Black Metal (Bathory tribute) | LOU13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg |
| Bleed from Within | Metalcore | LOU14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg |
| Blaas of Glory | Folk / Brass Metal | LOU15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/5/csm_blaas_of_glory_26_f53a31927e.jpg |
| Bear McCreary | Orchestral / Film Music | LOU16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/e/csm_bear_mccreary_26b_802dfd47bf.jpg |
| Any Given Day | Metalcore | LOU17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg |
| Alcest | Post-Black Metal | LOU18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/2/csm_alcest_26_ca67b9d832.jpg |
| Emperor | Black Metal | LOU19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg |
| Running Wild | Speed Metal | LOU20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Subway to Sally | Medieval Rock | WET23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/3/csm_subway_to_sally_26_c89a7c04fa.jpg |
| Paradise Lost | Gothic Metal | WET24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg |
| Mantar | Doom Metal | WET25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg |
| Hatebreed | Metalcore | WET26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg |
| Faun | Folk | WET27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg |
| Divlje Jagode | Hard Rock | WET28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/0/csm_divlje_jagode_26_e0a2c64203.jpg |
| Chaosbay | Melodic Death Metal | WET29 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Ten56. | Metalcore | HBA22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg |
| Pig Destroyer | Grindcore | HBA23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg |
| Metaklapa | Folk | HBA24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/7/csm_metaklapa_2024_ec19d5fd80.jpg |
| Heartless Human Harvest | Death Metal | HBA25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/9/csm_heartless_human_harvest_26_5c7a455a4e.jpg |
| Future Palace | Metalcore | HBA26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_Future_Palace-WOA26_03d8bb4d08.jpg |
| Dubioza Kolektiv | Ska / Reggae Metal | HBA27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/8/csm_dubioza_kollektiv26_190126a762.jpg |
| Crematory | Gothic / Industrial Metal | HBA28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/c/csm_crematory_26_8ae2e22d82.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| tuXedoo | Heavy Metal | WAS15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/b/csm_tuxedoo_26_2cbaa64988.jpg |
| Trold | Black Metal | WAS16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/2/csm_trold_26_e2d88c204e.jpg |
| Skynd | Dark Electronic | WAS17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/3/csm_skynd26_fdaccaa45e.jpg |
| Paleface Swiss | Metal | WAS18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg |
| Luna Kills | Symphonic Metal | WAS19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/3/csm_Luna_Kills-WOA26_9c2715ab09.jpg |
| Gutalax | Goregrind | WAS20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg |
| Employed to Serve | Metalcore | WAS21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg |
| Cursed Abyss | Black Metal | WAS22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/d/csm_cursed_abyss_26_924d9b9653.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| The Haunted | Melodic Death Metal | WAK15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg |
| Sir Henry Hot Memorial | TBD | WAK16 | TBD | PLACEHOLDER |
| Mr. Hurley und die Pulveraffen | Pirate Metal | WAK17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/0/csm_mr_hurley_und_die_pulveraffen_26_39b0d12506.jpg |
| Insanity Alert | Crossover Thrash | WAK18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg |
| Grand Magus | Heavy Metal | WAK19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg |
| Eläkeläiset | Humppa | WAK20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/d/csm_Elaekelaeiset-WOA26_0517340ca3.jpg |
| Cruachan | Folk Metal | WAK21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/0/csm_cruachan_26_fe9f62c6a3.jpg |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Deafheaven | Blackgaze | JUN5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/0/csm_deafheaven_26_4d801d532f.jpg |

---

## Day 4 — Saturday, 1 August 2026

> **Band placement algorithm (corrected):** Group A (Faster, Harder, Louder) is filled completely first — last slot of each in rank order, then 2nd-to-last, cycling until all 18 Group A slots are exhausted. Only then Group B (W.E.T., Headbangers, Wackinger, Wasteland, Jungle) is filled with the same pattern. Source poster: Saturday August 1, 2026.

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Corrosion of Conformity | Sludge Metal | FAS13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg |
| Asrock | Metal | FAS14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/a/csm_asrock_26_85c4a23518.jpg |
| Ad Infinitum | Symphonic Metal | FAS15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg |
| Alestorm | Party Metal | FAS16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg |
| Lamb of God | Groove Metal | FAS17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg |
| Sabaton | Power Metal | FAS18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg |

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Blood Command | Punk Metal | HAR8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg |
| Allt | Black Metal | HAR9 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg |
| Thy Art Is Murder | Deathcore | HAR10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg |
| Airbourne | Party Metal | HAR11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_Airborn-WOA26_24e9c1f588.jpg |
| Powerwolf | Power Metal | HAR12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Dieter "Maschine" Birr | TBD | LOU21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/5/csm_dieter_maschine_birr_26b_a569706c0c.jpg |
| Crimson Glory | Progressive Metal | LOU22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg |
| Castle Rat | Heavy Metal | LOU23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg |
| Angelus Apatrida | Thrash Metal | LOU24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg |
| Nevermore | Progressive Metal | LOU25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg |
| Triptykon | Black / Doom Metal | LOU26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/c/csm_Triptykon-WOA26_0599ad9698.jpg |
| Arch Enemy | Melodic Death Metal | LOU27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Thrown | Post-Metal | WET30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg |
| Sir Henry Hot Memorial | TBD | WET31 | TBD | PLACEHOLDER |
| Of Mice and Men | Metalcore | WET32 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/2/csm_of_mice_and_men_26_26aab5f25c.jpg |
| Kittie | Heavy Metal | WET33 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg |
| Guilt Trip | Metal | WET34 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg |
| Dritte Wahl | Punk | WET35 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | HBA29 | TBD | PLACEHOLDER |
| Vended | Nu Metal | HBA30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg |
| Stonem | Metal | HBA31 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/9/csm_stonem_26_e1ff4b71dd.jpg |
| Orbit Culture | Melodic Death Metal | HBA32 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg |
| Kärbholz | Folk Punk | HBA33 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/4/csm_kaerbholz_26_85a563b793.jpg |
| Hackneyed | Death Metal | HBA34 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg |
| Einherjer | Viking Metal | HBA35 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Wacken Firefighters | TBD | WAK22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/6/csm_wacken_firefighters_25_5f6d39317e.jpg |
| TBD | TBD | WAK23 | TBD | PLACEHOLDER |
| The Limit | TBD | WAK24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/6/csm_the_limit_26_954965f6df.jpg |
| Our Promise | Metal | WAK25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg |
| Lagwagon | Melodic Hardcore | WAK26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg |
| Hardline | AOR / Hard Rock | WAK27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/5/csm_hardline_26_73180980cd.jpg |
| Finsterforst | Folk Metal | WAK28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/8/csm_finsterforst_26_1eb394d15b.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS23 | TBD | PLACEHOLDER |
| Zeltinger Band | TBD | WAS24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/0/csm_zeltinger_26_74420c1905.jpg |
| The Other | Horror Punk | WAS25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/8/csm_the_other_26_bb6a90d46d.jpg |
| President | Metal | WAS26 | TBD | PLACEHOLDER |
| Minotaurus | TBD | WAS27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/0/csm_minotaurus_26_1ab67a12ae.jpg |
| Heavysaurus | Children's Metal | WAS28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg |
| Fit For An Autopsy | Death Metal | WAS29 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Municipal Waste | Thrash Metal | JUN6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg |
| Kim Dracula | Alternative Metal | JUN7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg |
| Focus. | TBD | JUN8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/9/csm_focus_26_a98ab7e760.jpg |

---

## Removed Placeholder Bands

The following bands were in the previous version of this file as fake/guessed placeholders and have been **removed** because they do not appear on any official Wacken 2026 poster. They must also be removed from `supabase/seed/bands.ts` and the database.

| Band | Reason |
|------|--------|
| AC/DC | Placeholder guess — not on any official poster |
| Accept | Placeholder guess — not on any official poster |
| Amon Amarth | Placeholder guess — not on any official poster |
| Angel Witch | Placeholder guess — not on any official poster |
| Apocalyptica | Placeholder guess — not on any official poster |
| Archgoat | Placeholder guess — not on any official poster |
| Archspore | Placeholder guess — not on any official poster |
| At the Gates | Placeholder guess — not on any official poster |
| Autopsy | Placeholder guess — not on any official poster |
| Avantasia | Placeholder guess — not on any official poster |
| Bathory (multiple fake entries) | Placeholder guess — not on any official poster |
| Behemoth | Placeholder guess — not on any official poster |
| Belphegor | Placeholder guess — not on any official poster |
| Blind Guardian | Placeholder guess — not on any official poster |
| Bloodbath | Placeholder guess — not on any official poster |
| Burzum | Placeholder guess — not on any official poster |
| Cannibal Corpse | Placeholder guess — not on any official poster |
| Carcass | Placeholder guess — not on any official poster |
| Carnage | Placeholder guess — not on any official poster |
| Celtic Frost | Placeholder guess — not on any official poster |
| Cradle of Filth | Placeholder guess — not on any official poster |
| Cynic | Placeholder guess — not on any official poster |
| Dark Funeral | Placeholder guess — not on any official poster |
| Darkthrone | Placeholder guess — not on any official poster |
| Deicide | Placeholder guess — not on any official poster |
| Delain | Placeholder guess — not on any official poster |
| Demilich | Placeholder guess — not on any official poster |
| Destruction | Placeholder guess — not on any official poster |
| Dimmu Borgir | Placeholder guess — not on any official poster |
| Dying Fetus | Placeholder guess — not on any official poster |
| Electric Callboy | Placeholder guess — not on any official poster |
| Enslaved | Placeholder guess — not on any official poster |
| Entombed | Placeholder guess — not on any official poster |
| Epica | Placeholder guess — not on any official poster |
| Evanescence | Placeholder guess — not on any official poster |
| Exhumed | Placeholder guess — not on any official poster |
| Exodus | Placeholder guess — not on any official poster |
| Goatmoon | Placeholder guess — not on any official poster |
| Gojira | Placeholder guess — not on any official poster |
| Grave | Placeholder guess — not on any official poster |
| Guns N' Roses | Placeholder guess — not on any official poster |
| Gwar | Placeholder guess — not on any official poster |
| Heilung | Placeholder guess — not on any official poster |
| Helloween | Placeholder guess — not on any official poster |
| Immortal | Placeholder guess — not on any official poster |
| Infected Rain | Placeholder guess — not on any official poster |
| Iron Maiden | Placeholder guess — not on any official poster |
| Kreator | Placeholder guess — not on any official poster |
| Manowar | Placeholder guess — not on any official poster |
| Mastodon | Placeholder guess — not on any official poster |
| Meshuggah | Placeholder guess — not on any official poster |
| Metallica | Placeholder guess — not on any official poster |
| Morbid Angel | Placeholder guess — not on any official poster |
| Motorhead | Placeholder guess — not on any official poster |
| Napalm Death | Placeholder guess — not on any official poster |
| Neurosis | Placeholder guess — not on any official poster |
| Nile | Placeholder guess — not on any official poster |
| Norsemen | Placeholder guess — not on any official poster |
| Nothing More | Had real image URL but does not appear on any official poster |
| Obituary | Placeholder guess — not on any official poster |
| Opeth | Placeholder guess — not on any official poster |
| Possessed | Placeholder guess — not on any official poster |
| Primal Fear | Placeholder guess — not on any official poster |
| Sarcófago | Placeholder guess — not on any official poster |
| Satyricon | Placeholder guess — not on any official poster |
| Skalds | Placeholder guess — not on any official poster |
| Slayer | Placeholder guess — not on any official poster |
| Sodom | Placeholder guess — not on any official poster |
| Spawn of Possession | Placeholder guess — not on any official poster |
| Stratovarius | Placeholder guess — not on any official poster |
| Suffocation | Placeholder guess — not on any official poster |
| Svartsot | Placeholder guess — not on any official poster |
| The Agonist | Placeholder guess — not on any official poster |
| Testament | Placeholder guess — not on any official poster |
| Týr | Placeholder guess — not on any official poster |
| Ulver | Placeholder guess — not on any official poster |
| Unleash | Placeholder guess — not on any official poster |
| Unleashed | Placeholder guess — not on any official poster |
| Venom | Placeholder guess — not on any official poster |
| Venom Inc | Placeholder guess — not on any official poster |
| Wardruna | Placeholder guess — not on any official poster |
| Watain | Placeholder guess — not on any official poster |
| Within Temptation | Placeholder guess — not on any official poster |

---

## Maintenance Guide

### How to add a new confirmed band image

1. In the Band Assignments section above, change `TBD` → `CONFIRMED` and replace `PLACEHOLDER` with the full image URL from wacken.com
2. In `supabase/seed/bands.ts`, find the matching entry by `name` + `stage` + `start_time` and update `image_url` with the same URL
3. Run `npm run seed:bands` to apply the change to the database

### How to move a band to a different stage or day

This file maps directly to `bands.ts`. See [stages.md](stages.md#how-stages-link-to-bands) for the field mapping table.

**Steps to move a band:**
1. Update the day section and stage section in this file
2. Update the stage schedule in [stages.md](stages.md) if the slot time changes
3. In `bands.ts`, update the `stage` constant and the date variable prefix in `start_time`/`end_time`
4. Run `npm run seed:bands` (this cascades to `user_picks`, so picks for that band will be cleared)

### How to confirm a slot's official time

See [stages.md — How to Confirm a Slot's Official Time](stages.md#how-to-confirm-a-slots-official-time).

### How to add a new slot

See [stages.md — How to Add a New Slot](stages.md#how-to-add-a-new-slot). Once the slot exists in stages.md, add the band row here referencing the new Slot ID.
