# Matrix car index

**Source of truth in code:** `src/data/cars/MatrixCarIndex.ts`  
**Vitrine:** `N_hero/car_N_hero.png` (do not flip / overwrite)  
**Garage still:** `car_N_hero_300.png`  
**Pose:** 4h–3h (typical `indice[25] = 4:00 = 300°`)

Garage carousel walks **available** folders only (`1`, `18`–`21` + Delorean). Parked cars live in `x_{N}_hero` and stay out of the shop. Identity rows 1–33 stay in `MatrixCarIndex.ts`. Tour (`?tour=1` or type TOUR) lights the available stills.

| N | Garage id | Name | Still |
|--:|-----------|------|-------|
| 1 | `car-1` | Marauder | Blue police wedge, lightbar |
| 2 | `car-2` | LEÃO | Magenta hot rod, exposed engine · **parked** `x_2_hero` |
| 3 | `car-3` | Swamp Rat | Orange off-road, roof rockets · **parked** `x_3_hero` |
| 4 | `car-4` | Blue Wing | Blue open-wheel |
| 5 | `car-5` | Sand Viper | Pink / cyan off-road hatch |
| 6 | `car-6-tank` | Yellow Haul | Yellow pickup, roof turret |
| 7 | `car-7-turbo` | Afterburn | Blue muscle, white stripes |
| 8 | `car-8-strong` | Iron Fist | Camo SUV, star |
| 9 | `car-9-turbo` | Palestrina | Green pickup |
| 10 | `car-10` | Battle Trak | Blue muscle, hood turrets |
| 11 | `car-11` | White Badge | White police muscle |
| 12 | `car-12-strong` | Pink Drop | Pink convertible |
| 13 | `car-13` | Pink Rail | Pink / cyan 80s sports |
| 14 | `car-14` | Green Rack | Green pickup, roof spots |
| 15 | `car-15` | TRICOLOR | White rally, red / blue stripes |
| 16 | `car-16` | PINK MINI | Pink Mini, gatling |
| 17 | `car-17` | CABULOSO | Orange Camaro |
| 18 | `car-18` | CAMO STAR | Camo tank |
| 19 | `car-19` | Cyber Pink | Pink / cyan street GT |
| 20 | `car-20` | Ash Comet | Orange SUV |
| 21 | `car_21` | Red Streak | Red sports, white stripes |
| 22 | `car_22` | AZULÃO | White / blue police SUV |
| 23 | `car_23` | MAGENTA | Purple sedan, gold trim |
| 24 | `car_24` | White Guns | White mid-engine |
| 25 | `car_25` | RAPOSÃO | Black / gold 190E |
| 26 | `car_26` | LAION | Orange SUV, white stripes |
| 27 | `car_27` | Red Hatch | Red hatch, yellow stripes |
| 28 | `car_28` | CELESTE | Cyan off-road SUV |
| 29 | `car_29` | Blue Muscle | Blue muscle, hood stripe |
| 30 | `car_30` | VERDÃO | Lime Mini, #77 |
| 31 | `car_31` | Black Gold | Black / gold sedan |
| 32 | `car_32` | White H | White coupe, Honda H |
| 33 | `car_33` | Purple Wing | Purple sedan |
| — | `delorean` | Delorean | Special 1 — stainless flux wedge, 4:00 hero |

Yaw clock (a000…a029) stays in `RELOGIO.md`. This file is car identity, not frame yaw.

**Available now:** `1_hero`, `18_hero`–`21_hero`, `delorean_hero`.  
**Parked (out of shop):** `x_2_hero`, `x_3_hero`–`x_17_hero`, `x_22_hero`–`x_33_hero` — vitrine kept; reopen only with ≥25 frames. See [`INVENTORY.md`](./INVENTORY.md).

**Delorean** is not folder `1` (that is Marauder). It lives in `delorean_hero/`: vitrine `delorean_hero.png`, garage `delorean_hero_300.png`, frames `delorean_a000`…`a029`, strip `delorean_strip_64.png`.
