# Wacken Open Air 2026 — Band Lineup Reference

> **This file is the human-editable source of truth for band assignments.**
> For stage schedules (slot times, stage colors, day codes, pairing rules), see [stages.md](stages.md).
>
> To update the lineup:
> 1. Edit this file
> 2. Apply changes to `supabase/seed/bands.ts`
> 3. Run `npm run seed:bands`

**Summary:** 75 bands CONFIRMED · 94 bands TBD · 169 total

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
| The Gathering | Gothic Metal | FAS1 | TBD | PLACEHOLDER |
| Lovebites | Heavy Metal | FAS2 | TBD | PLACEHOLDER |
| Electric Bassboy | TBD | FAS3 | TBD | PLACEHOLDER |
| Gagamania | TBD | FAS4 | TBD | PLACEHOLDER |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Alien Rockin' Explosion | Rock | LOU1 | TBD | PLACEHOLDER |
| 5th Avenue | TBD | LOU2 | TBD | PLACEHOLDER |
| Lacuna Coil | Gothic Metal | LOU3 | TBD | PLACEHOLDER |
| Rose Tattoo | Hard Rock | LOU4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg |
| TBS | TBD | LOU5 | TBD | PLACEHOLDER |
| Hämatom | Industrial Metal | LOU6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WET1 | TBD | PLACEHOLDER |
| TBD | TBD | WET2 | TBD | PLACEHOLDER |
| TBD | TBD | WET3 | TBD | PLACEHOLDER |
| TBD | TBD | WET4 | TBD | PLACEHOLDER |
| TBD | TBD | WET5 | TBD | PLACEHOLDER |
| TBD | TBD | WET6 | TBD | PLACEHOLDER |
| TBD | TBD | WET7 | TBD | PLACEHOLDER |
| Vanir | Viking Metal | WET8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg |
| The Hardkiss | Rock | WET9 | TBD | PLACEHOLDER |
| Poison the Preacher | Metal | WET10 | TBD | PLACEHOLDER |
| Dirty Shirt | Crossover Metal | WET11 | TBD | PLACEHOLDER |
| Ballroom Hamburg DJ Team | TBD | WET12 | TBD | PLACEHOLDER |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | HBA1 | TBD | PLACEHOLDER |
| TBD | TBD | HBA2 | TBD | PLACEHOLDER |
| TBD | TBD | HBA3 | TBD | PLACEHOLDER |
| TBD | TBD | HBA4 | TBD | PLACEHOLDER |
| TBD | TBD | HBA5 | TBD | PLACEHOLDER |
| TBD | TBD | HBA6 | TBD | PLACEHOLDER |
| TBD | TBD | HBA7 | TBD | PLACEHOLDER |
| Velvet Rush | AOR | HBA8 | TBD | PLACEHOLDER |
| The Troops of Doom | Thrash Metal | HBA9 | TBD | PLACEHOLDER |
| Ricky Warwick | Hard Rock | HBA10 | TBD | PLACEHOLDER |
| Expellow | TBD | HBA11 | TBD | PLACEHOLDER |
| Battlecreek | TBD | HBA12 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS1 | TBD | PLACEHOLDER |
| TBD | TBD | WAS2 | TBD | PLACEHOLDER |
| Wacken Firefighters | TBD | WAS3 | TBD | PLACEHOLDER |
| Unzucht | Industrial / Gothic | WAS4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg |
| Sir Henry Hot Memorial | TBD | WAS5 | TBD | PLACEHOLDER |
| Mambo Kurt | TBD | WAS6 | TBD | PLACEHOLDER |
| Crypt Sermon | Doom Metal | WAS7 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAK1 | TBD | PLACEHOLDER |
| TBD | TBD | WAK2 | TBD | PLACEHOLDER |
| Visions of Atlantis | Symphonic Metal | WAK3 | TBD | PLACEHOLDER |
| Thundermother | Rock | WAK4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg |
| Sacred Steel | Power Metal | WAK5 | TBD | PLACEHOLDER |
| Kadavar | Stoner Rock | WAK6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg |
| Broken by the Scream | Visual Kei Metal | WAK7 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Phantom | Heavy Metal | JUN1 | TBD | PLACEHOLDER |
| Diabolisches Werk | TBD | JUN2 | TBD | PLACEHOLDER |

---

## Day 2 — Thursday, 30 July 2026

> **Band placement algorithm:** Importance rank #1 → last slot of rank-1 stage (Faster), rank-2 (Harder), rank-3 (Louder), then ranks 4–8 (W.E.T., Headbangers, Wackinger, Wasteland, Welcome to the Jungle). Repeat from 2nd-to-last slots inward. All 8 stages open on Day 2.

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Evil Jared & Krogi | TBD | HAR1 | TBD | PLACEHOLDER |
| 9mm Headshot | TBD | HAR2 | TBD | PLACEHOLDER |
| Savatage | Heavy Metal | HAR3 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Craft | Black Metal | FAS5 | TBD | PLACEHOLDER |
| Life of Agony | Alternative Metal | FAS6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg |
| Def Leppard | Hard Rock | FAS7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Wytch Hazel | Traditional Heavy Metal | LOU7 | TBD | PLACEHOLDER |
| Spectral Wound | Black Metal | LOU8 | TBD | PLACEHOLDER |
| Misery Index | Death Metal / Grindcore | LOU9 | TBD | PLACEHOLDER |
| Firespawn | Death Metal | LOU10 | TBD | PLACEHOLDER |
| Alien Ant Farm | Alternative Rock | LOU11 | TBD | PLACEHOLDER |
| Europe | Hard Rock | LOU12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WET13 | TBD | PLACEHOLDER |
| TBD | TBD | WET14 | TBD | PLACEHOLDER |
| TBD | TBD | WET15 | TBD | PLACEHOLDER |
| TBD | TBD | WET16 | TBD | PLACEHOLDER |
| Wüstenberg | TBD | WET17 | TBD | PLACEHOLDER |
| Storm Seeker | Folk Metal | WET18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg |
| Sagenbringer | Folk Metal | WET19 | TBD | PLACEHOLDER |
| H-Blockx | Rap Metal | WET20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg |
| Anaal Nathrakh | Black Metal / Grindcore | WET21 | TBD | PLACEHOLDER |
| Yngwie Malmsteen | Neoclassical Metal | WET22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | HBA13 | TBD | PLACEHOLDER |
| TBD | TBD | HBA14 | TBD | PLACEHOLDER |
| TBD | TBD | HBA15 | TBD | PLACEHOLDER |
| Year of the Goat | Occult Rock | HBA16 | TBD | PLACEHOLDER |
| Sventevith | Black Metal | HBA17 | TBD | PLACEHOLDER |
| Saviourself | TBD | HBA18 | TBD | PLACEHOLDER |
| Katerfahrt | Rock | HBA19 | TBD | PLACEHOLDER |
| Black Tish | TBD | HBA20 | TBD | PLACEHOLDER |
| Turbonegro | Punk Rock | HBA21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS8 | TBD | PLACEHOLDER |
| TBD | TBD | WAS9 | TBD | PLACEHOLDER |
| Vogelfrey | Folk Metal | WAS10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg |
| Skyline | TBD | WAS11 | TBD | PLACEHOLDER |
| Manntra | Folk Metal | WAS12 | TBD | PLACEHOLDER |
| Brunhilde | Folk Metal | WAS13 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg |
| P.O.D. | Nu Metal | WAS14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAK8 | TBD | PLACEHOLDER |
| TBD | TBD | WAK9 | TBD | PLACEHOLDER |
| Temple of the Absurd | TBD | WAK10 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | WAK11 | TBD | PLACEHOLDER |
| Kupfergold | TBD | WAK12 | TBD | PLACEHOLDER |
| Blood Red Throne | Death Metal | WAK13 | TBD | PLACEHOLDER |
| Uli Jon Roth | Rock | WAK14 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Cowgirls From Hell DJ Team | TBD | JUN3 | TBD | PLACEHOLDER |
| Therapy? | Alternative Rock | JUN4 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg |

---

## Day 3 — Friday, 31 July 2026

> **Band placement algorithm:** Importance rank #1 → last slot of rank-1 stage (Faster), #2 → rank-2 (Harder), #3 → rank-3 (Louder), then ranks 4–8. Repeat from 2nd-to-last inward.

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Dubioza Kolektiv | Ska / Reggae Metal | HAR4 | TBD | PLACEHOLDER |
| Blood Fire Death | Black Metal (Bathory tribute) | HAR5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg |
| Alfahanne | Black Metal | HAR6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg |
| In Flames | Melodic Death Metal | HAR7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg |

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Gutalax | Goregrind | FAS8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg |
| Divlje Jagode | Hard Rock | FAS9 | TBD | PLACEHOLDER |
| Bleed from Within | Metalcore | FAS10 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg |
| Alcest | Post-Black Metal | FAS11 | TBD | PLACEHOLDER |
| Judas Priest | Heavy Metal | FAS12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Trold | Black Metal | LOU13 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | LOU14 | TBD | PLACEHOLDER |
| Metaklapa | Folk | LOU15 | TBD | PLACEHOLDER |
| Hatebreed | Metalcore | LOU16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg |
| Eläkeläiset | Humppa | LOU17 | TBD | PLACEHOLDER |
| Chaosbay | Melodic Death Metal | LOU18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg |
| Animals as Leaders | Progressive Metal | LOU19 | TBD | PLACEHOLDER |
| Running Wild | Speed Metal | LOU20 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Skynd | Dark Electronic | WET23 | TBD | PLACEHOLDER |
| Mr. Hurley und die Pulveraffen | Pirate Metal | WET24 | TBD | PLACEHOLDER |
| Heartless Human Harvest | Death Metal | WET25 | TBD | PLACEHOLDER |
| Employed to Serve | Metalcore | WET26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg |
| Crematory | Gothic / Industrial Metal | WET27 | TBD | PLACEHOLDER |
| Any Given Day | Metalcore | WET28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg |
| Saxon | Heavy Metal | WET29 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Subway to Sally | Medieval Rock | HBA22 | TBD | PLACEHOLDER |
| Paleface Swiss | Metal | HBA23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg |
| Insanity Alert | Crossover Thrash | HBA24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg |
| Faun | Folk | HBA25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg |
| Cruachan | Folk Metal | HBA26 | TBD | PLACEHOLDER |
| Arroganz | Metal | HBA27 | TBD | PLACEHOLDER |
| Emperor | Black Metal | HBA28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Tuxedoo | Heavy Metal | WAS15 | TBD | PLACEHOLDER |
| The Haunted | Melodic Death Metal | WAS16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg |
| Pig Destroyer | Grindcore | WAS17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg |
| Mantar | Doom Metal | WAS18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg |
| Grand Magus | Heavy Metal | WAS19 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg |
| Deafheaven | Blackgaze | WAS20 | TBD | PLACEHOLDER |
| Blaas of Glory | Folk / Brass Metal | WAS21 | TBD | PLACEHOLDER |
| Black Label Society | Heavy Metal | WAS22 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Ten56. | Metalcore | WAK15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg |
| Paradise Lost | Gothic Metal | WAK16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg |
| Luna Kills | Symphonic Metal | WAK17 | TBD | PLACEHOLDER |
| Future Palace | Metalcore | WAK18 | TBD | PLACEHOLDER |
| Cursed Abyss | Black Metal | WAK19 | TBD | PLACEHOLDER |
| Bear McCreary | Orchestral / Film Music | WAK20 | TBD | PLACEHOLDER |
| Sepultura | Groove Metal | WAK21 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Danko Jones | Hard Rock | JUN5 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg |

---

## Day 4 — Saturday, 1 August 2026

> **Band placement algorithm:** Importance rank fills last slot of rank-1 stage (Faster), then rank-2 (Harder), then rank-3 (Louder), then ranks 4–8. Repeat from 2nd-to-last slots inward. Source poster: Saturday August 1, 2026.

### Faster Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Stonem | Metal | FAS13 | TBD | PLACEHOLDER |
| Minotaurus | TBD | FAS14 | TBD | PLACEHOLDER |
| Hackneyed | Death Metal | FAS15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg |
| Crimson Glory | Progressive Metal | FAS16 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg |
| Nevermore | Progressive Metal | FAS17 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg |
| Sabaton | Power Metal | FAS18 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg |

### Harder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Municipal Waste | Thrash Metal | HAR8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg |
| Hardline | AOR / Hard Rock | HAR9 | TBD | PLACEHOLDER |
| Dieter Maschine Birr | TBD | HAR10 | TBD | PLACEHOLDER |
| Ad Infinitum | Symphonic Metal | HAR11 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg |
| Powerwolf | Power Metal | HAR12 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg |

### Louder Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Zeltinger Band | TBD | LOU21 | TBD | PLACEHOLDER |
| The Limit | TBD | LOU22 | TBD | PLACEHOLDER |
| Of Mice & Men | Metalcore | LOU23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/2/csm_of_mice_and_men_26_26aab5f25c.jpg |
| Heavysaurus | Children's Metal | LOU24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg |
| Dritte Wahl | Punk | LOU25 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg |
| Allt | Black Metal | LOU26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg |
| Arch Enemy | Melodic Death Metal | LOU27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg |

### W.E.T. Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| The Other | Horror Punk | WET30 | TBD | PLACEHOLDER |
| Orbit Culture | Melodic Death Metal | WET31 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg |
| Kim Dracula | Alternative Metal | WET32 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg |
| Einherjer | Viking Metal | WET33 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg |
| Angelus Apatrida | Thrash Metal | WET34 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg |
| Lamb of God | Groove Metal | WET35 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg |

### Headbangers Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | HBA29 | TBD | PLACEHOLDER |
| Thrown | Post-Metal | HBA30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg |
| Our Promise | Metal | HBA31 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg |
| Kittie | Heavy Metal | HBA32 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg |
| Finsterforst | Folk Metal | HBA33 | TBD | PLACEHOLDER |
| Asrock | Metal | HBA34 | TBD | PLACEHOLDER |
| Airbourne | Hard Rock | HBA35 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_Airborn-WOA26_24e9c1f588.jpg |

### Wackinger Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAK22 | TBD | PLACEHOLDER |
| Vended | Nu Metal | WAK23 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg |
| President | Metal | WAK24 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/e/csm_president26_527cb5b2ae.jpg |
| Kärbholz | Folk Punk | WAK25 | TBD | PLACEHOLDER |
| Fit For An Autopsy | Death Metal | WAK26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg |
| Blood Command | Punk Metal | WAK27 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg |
| Alestorm | Pirate Metal | WAK28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg |

### Wasteland Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| TBD | TBD | WAS23 | TBD | PLACEHOLDER |
| Wacken Firefighters | TBD | WAS24 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | WAS25 | TBD | PLACEHOLDER |
| Lagwagon | Melodic Hardcore | WAS26 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg |
| Focus. | TBD | WAS27 | TBD | PLACEHOLDER |
| Castle Rat | Heavy Metal | WAS28 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg |
| Triptykon | Black / Doom Metal | WAS29 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Slot | Band Status | Image URL |
|------|-------|------|-------------|-----------|
| Guilt Trip | Metal | JUN6 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg |
| Corrosion of Conformity | Sludge Metal | JUN7 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg |
| Thy Art Is Murder | Deathcore | JUN8 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg |

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
