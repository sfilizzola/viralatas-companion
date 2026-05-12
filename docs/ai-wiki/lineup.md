# Wacken Open Air 2026 — Band Lineup Reference

> **This file is the human-editable source of truth for the Wacken 2026 band lineup.**
> To update the lineup:
> 1. Edit this file
> 2. Apply changes to `supabase/seed/bands.ts`
> 3. Run `npm run seed:bands`

**Summary:** 75 bands CONFIRMED · 85 bands TBD · 160 total

---

## Stage Key

| Short | Full Name |
|-------|-----------|
| `WET` | W.E.T. |
| `HARDER` | Harder |
| `LOUDER` | Louder |
| `FASTER` | Faster |
| `HEADBANGERS` | Headbangers |
| `WASTELAND` | Wasteland |
| `WACKINGER` | Wackinger |
| `JUNGLE` | Welcome to the Jungle |

## Day Key

| Code | Calendar Date | Day of Week |
|------|--------------|-------------|
| `D1` | 2026-07-29 | Wednesday |
| `D2` | 2026-07-30 | Thursday |
| `D3` | 2026-07-31 | Friday |
| `D4` | 2026-08-01 | Saturday |

After-midnight slots (shows crossing midnight) use the **next** calendar date in `bands.ts`:

| Overnight Code | Calendar Date |
|---------------|--------------|
| `D1n` | 2026-07-30 |
| `D2n` | 2026-07-31 |
| `D3n` | 2026-08-01 |
| `D4n` | 2026-08-02 |

Times are **CEST (UTC+2)**. Slots marked `*` cross midnight into the next calendar date.

## Status Key

- `CONFIRMED` — Band has a real image URL from wacken.com
- `TBD` — Band is a placeholder (uses the dummy/fallback image in `bands.ts`)

---

## Day 1 — Wednesday, 29 July 2026

> **Note:** Headbangers, Wasteland, Wackinger, and Welcome to the Jungle stages open later on Day 1 (from ~16:00). Faster stage also starts later (16:00). Louder and Harder run full-day from ~12:00.

### W.E.T. Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Ricky Warwick | Hard Rock | 14:00 | 15:00 | TBD | PLACEHOLDER |
| The Hardkiss | Rock | 16:30 | 17:30 | TBD | PLACEHOLDER |
| Rose Tattoo | Hard Rock | 19:00 | 20:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg |
| Velvet Rush | AOR | 21:30 | 22:30 | TBD | PLACEHOLDER |

### Harder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Lovebites | Heavy Metal | 12:30 | 13:30 | TBD | PLACEHOLDER |
| Sacred Steel | Power Metal | 14:30 | 15:30 | TBD | PLACEHOLDER |
| Phantom | Heavy Metal | 16:30 | 17:30 | TBD | PLACEHOLDER |
| Thundermother | Rock | 18:30 | 19:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg |
| The Troops of Doom | Thrash Metal | 20:30 | 21:30 | TBD | PLACEHOLDER |
| Poison the Preacher | Metal | 22:30 | 23:30 | TBD | PLACEHOLDER |

### Louder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Crypt Sermon | Doom Metal | 12:00 | 13:00 | TBD | PLACEHOLDER |
| Broken by the Scream | Visual Kei Metal | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Dirty Shirt | Crossover Metal | 15:15 | 16:15 | TBD | PLACEHOLDER |
| Alien Rockin' Explosion | Rock | 17:00 | 18:00 | TBD | PLACEHOLDER |
| Vanir | Viking Metal | 19:00 | 20:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg |
| The Gathering | Gothic Metal | 21:00 | 22:30 | TBD | PLACEHOLDER |

### Faster Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Visions of Atlantis | Symphonic Metal | 16:00 | 17:00 | TBD | PLACEHOLDER |
| Hämatom | Industrial Metal | 17:45 | 18:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg |
| Kadavar | Stoner Rock | 19:45 | 21:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg |
| Unzucht | Industrial / Gothic | 22:00 | 00:00* | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg |

### Headbangers Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| TBS | TBD | 16:00 | 17:00 | TBD | PLACEHOLDER |
| Battlecreek | TBD | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Diabolisches Werk | TBD | 21:00 | 22:30 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Expellow | TBD | 16:00 | 17:00 | TBD | PLACEHOLDER |
| 5th Avenue | TBD | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Lacuna Coil | Gothic Metal | 21:00 | 22:30 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Mambo Kurt | TBD | 16:00 | 17:00 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Gagamania | TBD | 20:30 | 21:30 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Electric Bassboy | Electronic | 16:30 | 17:30 | TBD | PLACEHOLDER |
| Ballroom Hamburg DJ Team | TBD | 19:00 | 20:00 | TBD | PLACEHOLDER |
| Wacken Firefighters | TBD | 21:30 | 22:30 | TBD | PLACEHOLDER |

---

## Day 2 — Thursday, 30 July 2026

### W.E.T. Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Kupfergold | TBD | 12:00 | 13:00 | TBD | PLACEHOLDER |
| Uli Jon Roth | Rock | 14:00 | 15:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg |
| Skyline | TBD | 15:30 | 16:30 | TBD | PLACEHOLDER |
| Yngwie Malmsteen | Neoclassical Metal | 17:00 | 18:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg |
| Sir Henry Hot Memorial | TBD | 20:00 | 21:30 | TBD | PLACEHOLDER |
| Def Leppard | Hard Rock | 23:30 | 01:00* | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg |

### Harder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Katerfahrt | Rock | 12:00 | 13:00 | TBD | PLACEHOLDER |
| Black Tish | TBD | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Life of Agony | Alternative Metal | 17:00 | 18:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg |
| Europe | Hard Rock | 18:30 | 19:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg |
| Turbonegro | Punk Rock | 20:15 | 21:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg |
| Savatage | Heavy Metal | 22:00 | 23:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg |

### Louder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Saviourself | TBD | 12:00 | 12:45 | TBD | PLACEHOLDER |
| Alien Ant Farm | Alternative Rock | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Therapy? | Alternative Rock | 15:00 | 16:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg |
| Wytch Hazel | Traditional Heavy Metal | 17:00 | 18:00 | TBD | PLACEHOLDER |
| Evil Jared & Krogi | TBD | 19:30 | 20:30 | TBD | PLACEHOLDER |
| Sagenbringer | Folk Metal | 21:30 | 22:30 | TBD | PLACEHOLDER |
| H-Blockx | Rap Metal | 23:00 | 00:00* | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg |

### Faster Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Storm Seeker | Folk Metal | 12:00 | 12:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg |
| Vogelfrey | Folk Metal | 13:00 | 13:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg |
| Brunhilde | Folk Metal | 14:00 | 14:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg |
| 9mm Headshot | TBD | 15:30 | 16:30 | TBD | PLACEHOLDER |
| P.O.D. | Nu Metal | 17:00 | 17:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg |
| Manntra | Folk Metal | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Wüstenberg | TBD | 20:00 | 20:45 | TBD | PLACEHOLDER |
| Year of the Goat | Occult Rock | 21:30 | 22:30 | TBD | PLACEHOLDER |

### Headbangers Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Anaal Nathrakh | Black Metal / Grindcore | 15:00 | 16:00 | TBD | PLACEHOLDER |
| Craft | Black Metal | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Misery Index | Death Metal / Grindcore | 21:30 | 22:30 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Blood Red Throne | Death Metal | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Firespawn | Death Metal | 16:30 | 17:30 | TBD | PLACEHOLDER |
| Spectral Wound | Black Metal | 20:00 | 21:00 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Sventevith | Black Metal | 14:30 | 15:30 | TBD | PLACEHOLDER |
| Temple of the Absurd | TBD | 17:30 | 18:30 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Cowgirls From Hell DJ Team | TBD | 21:00 | 22:00 | TBD | PLACEHOLDER |

---

## Day 3 — Friday, 31 July 2026

### W.E.T. Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Bear McCreary | Orchestral / Film Music | 12:00 | 13:00 | TBD | PLACEHOLDER |
| Animals as Leaders | Progressive Metal | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Grand Magus | Heavy Metal | 15:00 | 16:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg |
| Saxon | Heavy Metal | 16:30 | 17:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg |
| Running Wild | Speed Metal | 18:00 | 19:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg |
| Judas Priest | Heavy Metal | 19:30 | 21:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg |
| Emperor | Black Metal | 21:15 | 22:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg |
| In Flames | Melodic Death Metal | 00:00* | 01:30* | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg |

### Harder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Blood Fire Death | Black Metal (Bathory tribute) | 12:00 | 12:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg |
| Danko Jones | Hard Rock | 13:00 | 13:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg |
| Faun | Folk | 14:00 | 14:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg |
| Mantar | Doom Metal | 15:00 | 16:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg |
| Sepultura | Groove Metal | 16:15 | 17:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg |
| Black Label Society | Heavy Metal | 17:45 | 19:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg |
| The Haunted | Melodic Death Metal | 19:15 | 20:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg |
| Paradise Lost | Gothic Metal | 21:30 | 22:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg |

### Louder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Alcest | Post-Black Metal | 12:00 | 12:45 | TBD | PLACEHOLDER |
| Future Palace | Metalcore | 13:30 | 14:15 | TBD | PLACEHOLDER |
| Alfahanne | Black Metal | 15:00 | 16:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg |
| Pig Destroyer | Grindcore | 17:00 | 18:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg |
| Employed to Serve | Metalcore | 19:30 | 20:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg |
| Hatebreed | Metalcore | 21:30 | 22:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg |

### Faster Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Gutalax | Goregrind | 12:00 | 12:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg |
| Mr. Hurley und die Pulveraffen | Pirate Metal | 13:00 | 13:45 | TBD | PLACEHOLDER |
| Chaosbay | Melodic Death Metal | 14:30 | 15:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg |
| Any Given Day | Metalcore | 15:45 | 16:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg |
| Insanity Alert | Crossover Thrash | 17:00 | 17:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg |
| Paleface Swiss | Metal | 18:00 | 18:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg |
| Bleed from Within | Metalcore | 20:00 | 21:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg |
| Ten56. | Metalcore | 21:30 | 22:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg |

### Headbangers Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Arroganz | Metal | 13:00 | 13:45 | TBD | PLACEHOLDER |
| Crematory | Gothic / Industrial Metal | 14:30 | 15:30 | TBD | PLACEHOLDER |
| Deafheaven | Blackgaze | 16:30 | 17:30 | TBD | PLACEHOLDER |
| Cursed Abyss | Black Metal | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Trold | Black Metal | 21:00 | 22:15 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Heartless Human Harvest | Death Metal | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Divlje Jagode | Hard Rock | 16:00 | 17:00 | TBD | PLACEHOLDER |
| Skynd | Dark Electronic | 18:30 | 19:30 | TBD | PLACEHOLDER |
| Tuxedoo | Heavy Metal | 21:30 | 22:30 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Cruachan | Folk Metal | 13:00 | 14:00 | TBD | PLACEHOLDER |
| Eläkeläiset | Humppa | 15:00 | 16:00 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | 17:30 | 18:30 | TBD | PLACEHOLDER |
| Subway to Sally | Medieval Rock | 20:00 | 21:00 | TBD | PLACEHOLDER |
| Metaklapa | Folk | 22:00 | 23:00 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Blaas of Glory | Folk / Brass Metal | 14:00 | 15:00 | TBD | PLACEHOLDER |
| Dubioza Kolektiv | Ska / Reggae Metal | 17:00 | 18:00 | TBD | PLACEHOLDER |
| Luna Kills | Symphonic Metal | 21:30 | 22:30 | TBD | PLACEHOLDER |

---

## Day 4 — Saturday, 1 August 2026

### W.E.T. Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Hardline | AOR / Hard Rock | 12:00 | 13:00 | TBD | PLACEHOLDER |
| The Other | Horror Punk | 14:30 | 15:30 | TBD | PLACEHOLDER |
| Stonem | Metal | 17:30 | 18:30 | TBD | PLACEHOLDER |
| Arch Enemy | Melodic Death Metal | 20:30 | 22:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg |
| Powerwolf | Power Metal | 23:00 | 00:30* | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg |

### Harder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Triptykon | Black / Doom Metal | 12:00 | 13:00 | TBD | PLACEHOLDER |
| Finsterforst | Folk Metal | 13:30 | 14:30 | TBD | PLACEHOLDER |
| Airbourne | Hard Rock | 15:30 | 16:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/e/csm_Airborn-WOA26_24e9c1f588.jpg |
| Crimson Glory | Progressive Metal | 17:30 | 18:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg |
| Kittie | Heavy Metal | 19:00 | 20:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg |
| Lamb of God | Groove Metal | 21:00 | 22:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg |

### Louder Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Hackneyed | Death Metal | 12:00 | 12:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg |
| Heavysaurus | Children's Metal | 13:00 | 13:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg |
| Ad Infinitum | Symphonic Metal | 14:00 | 14:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg |
| Municipal Waste | Thrash Metal | 15:00 | 16:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg |
| Fit For An Autopsy | Death Metal | 16:15 | 17:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg |
| Corrosion of Conformity | Sludge Metal | 17:15 | 18:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg |
| Of Mice & Men | Metalcore | 18:30 | 19:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/5/2/csm_of_mice_and_men_26_26aab5f25c.jpg |
| Kim Dracula | Alternative Metal | 19:45 | 20:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg |
| Nevermore | Progressive Metal | 21:00 | 22:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg |
| Thy Art Is Murder | Deathcore | 22:45 | 23:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg |
| Einherjer | Viking Metal | 23:45 | 00:30* | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg |

### Faster Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Allt | Black Metal | 12:00 | 12:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg |
| Thrown | Post-Metal | 13:00 | 13:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg |
| Dritte Wahl | Punk | 14:00 | 14:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg |
| President | Metal | 14:45 | 15:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/9/e/csm_president26_527cb5b2ae.jpg |
| Blood Command | Punk Metal | 15:30 | 16:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg |
| Castle Rat | Heavy Metal | 16:15 | 17:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg |
| Lagwagon | Melodic Hardcore | 17:00 | 17:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg |
| Angelus Apatrida | Thrash Metal | 17:45 | 18:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg |
| Our Promise | Metal | 18:30 | 19:15 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg |
| Vended | Nu Metal | 19:15 | 20:00 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg |
| Guilt Trip | Metal | 20:00 | 20:45 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg |
| Sabaton | Power Metal | 20:45 | 21:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg |
| Alestorm | Pirate Metal | 21:30 | 22:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg |
| Orbit Culture | Melodic Death Metal | 22:30 | 23:30 | CONFIRMED | https://www.wacken.com/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg |

### Headbangers Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Asrock | Metal | 13:00 | 14:00 | TBD | PLACEHOLDER |
| Dieter Maschine Birr | TBD | 15:30 | 16:30 | TBD | PLACEHOLDER |
| Minotaurus | TBD | 19:00 | 20:00 | TBD | PLACEHOLDER |

### Wasteland Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Focus. | TBD | 14:30 | 15:30 | TBD | PLACEHOLDER |
| The Limit | TBD | 18:00 | 19:00 | TBD | PLACEHOLDER |

### Wackinger Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Kärbholz | Folk Punk | 15:00 | 16:00 | TBD | PLACEHOLDER |
| Sir Henry Hot Memorial | TBD | 17:30 | 18:30 | TBD | PLACEHOLDER |

### Welcome to the Jungle Stage

| Name | Genre | Start | End | Status | Image URL |
|------|-------|-------|-----|--------|-----------|
| Wacken Firefighters | TBD | 16:00 | 17:00 | TBD | PLACEHOLDER |
| Zeltinger Band | TBD | 20:00 | 21:00 | TBD | PLACEHOLDER |

> `*` = slot crosses midnight into the next calendar date. In `bands.ts`, the `end_time` (and `start_time` for 00:xx slots) uses the **next** day's date variable (e.g. `D1n`, `D2n`, `D3n`, `D4n`).

---

## Removed placeholder bands

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

1. In this file, change `TBD` → `CONFIRMED` and replace `PLACEHOLDER` with the full image URL from wacken.com
2. In `supabase/seed/bands.ts`, find the matching entry by `name` + `stage` + `start_time` and update `image_url` with the same URL (and remove the `// TBD` comment if present)
3. Run `npm run seed:bands` to apply the change to the database

### How to move a band to a different stage or day

This file maps directly to `bands.ts` as follows:

| This file | `bands.ts` field | Notes |
|-----------|-----------------|-------|
| Stage heading (`### W.E.T. Stage`) | `stage: STAGES.WET` | Use the constant from the `STAGES` object at the top of `bands.ts` |
| Day heading (`## Day 1`) | `start_time: new Date(\`${D1}T15:30:00\`)` | `D1`/`D2`/`D3`/`D4` are date string variables defined at the top of the seed file |
| After-midnight slot (`*`) | Uses `D1n`, `D2n`, `D3n`, or `D4n` | These are the *next* calendar date strings, also defined at the top of the file |
| `Start` / `End` columns | `start_time` / `end_time` in ISO 8601 | Combine the day variable + `THH:MM:00` |

**Steps to move a band:**
1. Update the day section and stage section in this file
2. In `bands.ts`, update the `stage` constant and the date variable prefix in `start_time`/`end_time`
3. Run `npm run seed:bands` (this cascades to `user_picks`, so picks for that band will be cleared)
