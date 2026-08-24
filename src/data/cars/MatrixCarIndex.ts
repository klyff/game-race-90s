/**
 * Canonical matrix index. Folder `N_hero` / `car_N_hero.png` is the identity.
 *
 * Shop hyphen ids (`car-16`) and clock underscore ids (`car_16`) that share N
 * share this row. Pose of every vitrine is 4h–3h (typical indice[25] = 300°).
 * Do not flip the PNG; rename here when the still is right and the name is wrong.
 *
 * OBSOLETE archive. Live shop is `GARAGE_CATALOG` (spinner only).
 * `garageCarouselIds()` lists leftover matrix sheets still in `cars.json`.
 * Identity rows 1–33 stay here for leftover art. Do not shop or race these.
 */

/** Leftover matrix folders still present on disk / in cars.json. Not shoppable. */
export const AVAILABLE_MATRIX_NUMBERS = [18, 19, 20, 21] as const;

export const MATRIX_CAR_INDEX_SIZE = 33;

export interface MatrixCarIdentity {
  readonly n: number;
  /** Garage carousel id for this folder. */
  readonly carId: string;
  readonly displayName: string;
  readonly archetype: string;
}

function row(n: number, carId: string, displayName: string, archetype: string): MatrixCarIdentity {
  return { n, carId, displayName, archetype };
}

/**
 * Authored from `car_N_hero_300.png` on 2026-08-19. Nicknames that still match
 * the still stay; colour/body mismatches were moved onto the folder that fits.
 */
export const MATRIX_CAR_INDEX: readonly MatrixCarIdentity[] = [
  row(1, 'car-1', 'Marauder', 'Blue police wedge — lightbar, hood guns'),
  row(2, 'car-2', 'LEÃO', 'Magenta hot rod — exposed engine, fat rear tires'),
  row(3, 'car-3', 'Swamp Rat', 'Orange off-road buggy — roof rockets, black stripes'),
  row(4, 'car-4', 'Blue Wing', 'Blue open-wheel — rear wing, side cannons'),
  row(5, 'car-5', 'Sand Viper', 'Pink / cyan off-road hatch — lightning bolt, hood guns'),
  row(6, 'car-6-tank', 'Yellow Haul', 'Yellow combat pickup — roof turret, front plow'),
  row(7, 'car-7-turbo', 'Afterburn', 'Blue muscle — white stripes, hood guns, off-road tires'),
  row(8, 'car-8-strong', 'Iron Fist', 'Tan / green camo SUV — star, hood guns'),
  row(9, 'car-9-turbo', 'Palestrina', 'Green pickup — hood turrets, roof cyan lights'),
  row(10, 'car-10', 'Battle Trak', 'Blue muscle — hood turrets, racing stripes'),
  row(11, 'car-11', 'White Badge', 'White police muscle — blue stripes, lightbar, hood guns'),
  row(12, 'car-12-strong', 'Pink Drop', 'Pink convertible — white stripe, hood guns, roll bars'),
  row(13, 'car-13', 'Pink Rail', 'Pink / cyan 80s sports — centre stripe, hood guns'),
  row(14, 'car-14', 'Green Rack', 'Green pickup — roof spots, hood guns'),
  row(15, 'car-15', 'TRICOLOR', 'White rally — red / blue stripes, gold rims, roof lights'),
  row(16, 'car-16', 'PINK MINI', 'Pink Mini convertible — white stripes, gatling, roll cage'),
  row(17, 'car-17', 'CABULOSO', 'Orange Camaro — black stripe, hood guns'),
  row(18, 'car-18', 'CAMO STAR', 'Tan / green camo tank — star emblem, main cannon'),
  row(19, 'car-19', 'Cyber Pink', 'Pink / cyan street GT — neon stripe, hood gatling'),
  row(20, 'car-20', 'Ash Comet', 'Orange off-road SUV — hood cannons, roof rails'),
  row(21, 'car_21', 'Red Streak', 'Red sports — white stripes, hood guns'),
  row(22, 'car_22', 'AZULÃO', 'White / blue police SUV — star, hood guns, lightbar'),
  row(23, 'car_23', 'MAGENTA', 'Purple sedan — gold trim, hood guns'),
  row(24, 'car_24', 'White Guns', 'White mid-engine — hood guns, sunroof, rear wing'),
  row(25, 'car_25', 'RAPOSÃO', 'Black / gold 190E — gold stripes, gatling'),
  row(26, 'car_26', 'LAION', 'Orange off-road SUV — white stripes, hood gatling, roof bar'),
  row(27, 'car_27', 'Red Hatch', 'Red hatch — yellow stripes, hood guns'),
  row(28, 'car_28', 'CELESTE', 'Cyan off-road SUV — roof crate, hood guns'),
  row(29, 'car_29', 'Blue Muscle', 'Blue muscle — black / red hood stripe, hood guns'),
  row(30, 'car_30', 'VERDÃO', 'Lime Mini — number 77, hood guns, black wing'),
  row(31, 'car_31', 'Black Gold', 'Black / gold sedan — gold kit, gatling'),
  row(32, 'car_32', 'White H', 'White coupe — Honda H, hood gatling, rear wing'),
  row(33, 'car_33', 'Purple Wing', 'Purple sedan — gold rims, hood guns, rear wing'),
];

export function isMatrixCarIndex(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MATRIX_CAR_INDEX_SIZE;
}

export function matrixCarRow(n: number): MatrixCarIdentity {
  const entry = MATRIX_CAR_INDEX[n - 1];
  if (entry === undefined || entry.n !== n) {
    throw new Error(`MatrixCarIndex has no row ${n}`);
  }
  return entry;
}

export function matrixIndexCarId(n: number): string {
  return matrixCarRow(n).carId;
}

/** Identity walk of every authored row (including parked folders). */
export function tourIndexCarIds(): readonly string[] {
  return MATRIX_CAR_INDEX.map(entry => entry.carId);
}

/** Leftover matrix sheets still listed in cars.json. Not the live garage. */
export function garageCarouselIds(): readonly string[] {
  const available = MATRIX_CAR_INDEX.filter(entry =>
    (AVAILABLE_MATRIX_NUMBERS as readonly number[]).includes(entry.n),
  ).map(entry => entry.carId);
  return [...available, 'delorean'];
}

export function matrixCarName(n: number): string {
  return matrixCarRow(n).displayName;
}
