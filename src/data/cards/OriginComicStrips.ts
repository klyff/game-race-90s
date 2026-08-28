/**
 * Cartoon comic-strip lines for the origin entry pages.
 * Picked at random every time the player enters OriginComic.
 * Voice matches each driver card bio — short, punchy, 90s arcade.
 */

export type ComicVoiceId =
  | 'aline'
  | 'enzo'
  | 'emma'
  | 'klyff'
  | 'carol'
  | 'dave'
  | 'razor'
  | 'flufe'
  | 'diego'
  | 'luna'
  | 'blaze'
  | 'kira'
  | 'snake'
  | 'rio'
  | 'jett'
  | 'nova'
  | 'cruz'
  | 'ash'
  | 'zara'
  | 'vince'
  | 'ruby'
  | 'hex'
  | 'viktor'
  | 'seamus'
  | 'negao'
  | 'luca'
  | 'zor9';

/** Splash / origin page order → voice bank. */
export const ORIGIN_VOICE_BY_CARD: readonly ComicVoiceId[] = [
  'aline',
  'enzo',
  'emma',
  'klyff',
];

export interface GossipLine {
  readonly about: string;
  readonly line: string;
}

export interface ComicVoiceBank {
  readonly id: ComicVoiceId;
  readonly displayName: string;
  /** ~10 first-person (or signature) cartoon lines. */
  readonly lines: readonly string[];
  /** Chimbler only: dirt on the rest of the grid. */
  readonly gossip?: readonly GossipLine[];
}

/** How many stacked comic panels draw on the left of each origin page. */
export const ORIGIN_STRIP_PANEL_COUNT = 3;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = items[i];
    const b = items[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    items[i] = b;
    items[j] = a;
  }
}

export const COMIC_VOICE_BANKS: readonly ComicVoiceBank[] = [
  {
    id: 'aline',
    displayName: 'ALINE',
    lines: [
      'Beauty. Speed. Style. Pick two? Girl, I brought all three.',
      'I drive like I am late for a photoshoot. Because I am.',
      'RunnersCity Beauty Empire does not do second place. Or split ends.',
      'Salon neon, purple coupe, gold chain — the recipe writes itself.',
      'Shopping bags in the back. Nitro in the front. Priorities.',
      'Weight training, then racing. Then more shopping. Then racing again.',
      'Santa Monica Blvd knows my name. The asphalt knows my lipstick.',
      'If the mirror says go, the green light is just confirming.',
      'Pink tracksuit. Black top. Zero chill on the last corner.',
      'Crown on the jacket. Crown on the podium. Matching set.',
    ],
  },
  {
    id: 'enzo',
    displayName: 'ENZO',
    lines: [
      'Prodigy? I was stealing Dad\'s car at seven. This is just homework.',
      'Hack. Shift. Win. In that order. Usually.',
      'Five gold stars on the card. Zero brakes in the car.',
      'Born Brazil. Adopted USA. Defending both at 140.',
      'They said nobody can hold me. They were not wrong.',
      'Laptop in the bag. Plate says STOLEN. Vibe check: passed.',
      'Hollywood Hills at night is my classroom. The road is the quiz.',
      'Braces, freckles, tongue out — still faster than your adulting.',
      'FAST. CODE. WIN. Also: do not ask about the data centers.',
      'Teenager with a racing jacket and a warrant for your lap time.',
    ],
  },
  {
    id: 'emma',
    displayName: 'CHIMBLER',
    lines: [
      'Coffee. Gas. Gossip. The holy trinity of Chimbler Cafe.',
      'Information is power. Discretion is profit. Tail wags are free.',
      'Looks harmless. Drives like a lunatic on four fluffy wheels.',
      'No names. Only numbers. Members only. Paw print required.',
      'Secrets for sale. Find anyone, anywhere. Tip jar accepts nitro.',
      'Ride fast. Talk less. Unless the tip is juicy — then talk more.',
      'FILES / LEADS / LIES — pick a crate, any crate.',
      'Espresso, engine oil, and espionage. Same chalkboard.',
      'I am the Secret Keeper of every side in RunnersCity. Woof.',
      'Plate reads CHMBLR. The Camaro knows too much already.',
    ],
    gossip: [
      // Core four (2 each about the other splash faces + self-adjacent)
      { about: 'ALINE', line: 'Aline? She timed a salon blowout to a canyon run. Still won both.' },
      { about: 'ALINE', line: 'Heard Aline\'s purple coupe gets waxed more than some racers get sleep.' },
      { about: 'ENZO', line: 'Enzo\'s "stolen" plate is a joke. The firewalls he cracked were not.' },
      { about: 'ENZO', line: 'Kid coded a shift map at 2 a.m. and still made first practice. Braces and all.' },
      { about: 'KLYFF', line: 'Klyff doubled the DeLorean motor. The pub still has his reserved stool.' },
      { about: 'KLYFF', line: 'He built the circus. He still races it. Barbecue after. Non-negotiable.' },
      // Rest of the grid — 2 each
      { about: 'CAROL', line: 'Carol steals setlists and racing lines. Same grin. Same crime.' },
      { about: 'CAROL', line: 'Fire hair, wild laugh — guitar shops lock the doors when she revs.' },
      { about: 'DAVE', line: 'Dave Bown changes hair color like gears. The lightning stays put.' },
      { about: 'DAVE', line: 'He sings to the engine. The engine, shamefully, sings back.' },
      { about: 'RAZOR', line: 'Razor turned a switchblade into a wheel. South Central still applauds.' },
      { about: 'RAZOR', line: 'Green mohawk, all teeth laughing — never lifts, never blinks.' },
      { about: 'FLUFE', line: 'Flufe looks like a doll. She knows every secret I sell. Awkward.' },
      { about: 'FLUFE', line: 'Same keeper, two faces. Her fluff coat is louder than my bark.' },
      { about: 'DIEGO', line: 'Diego blesses bikes and curses cops. Eastside chaplain energy.' },
      { about: 'DIEGO', line: 'Santa Muerte on the vest. Soft smile. Hard eyes. Tip him in nitro.' },
      { about: 'LUNA', line: 'Luna inks half the grid. If your car has a name, she spelled it.' },
      { about: 'LUNA', line: 'Silver buzz, black lipstick — Melrose queues for her needle and her line.' },
      { about: 'BLAZE', line: 'Blaze\'s Camaro smells like bourbon. His mullet smells like victory.' },
      { about: 'BLAZE', line: 'Rock burnout with a flaming guitar on his chest. Still late to the bar.' },
      { about: 'KIRA', line: 'Kira: nine piercings, zero patience, Tokyo-to-LA snarl.' },
      { about: 'KIRA', line: 'Pink-black pigtails. She loves the corner that hates her back.' },
      { about: 'SNAKE', line: 'Snake is never in a hurry — except the last lap. Gold tooth, cold clock.' },
      { about: 'SNAKE', line: 'Python ink, silk shirt, half-lidded stare. Downtown owes him favors.' },
      { about: 'RIO', line: 'Rio treats every straight like Copacabana. The boardwalk agrees.' },
      { about: 'RIO', line: 'Afro-Brazilian street queen. Huge laugh. Yellow buggy. No survivors.' },
      { about: 'JETT', line: 'Jett lives on gas-station coffee and guitar strings. Both hands horns.' },
      { about: 'JETT', line: 'Skinny legend. Tongue out. Dumpster alley is his red carpet.' },
      { about: 'NOVA', line: 'Nova races after last call and still looks like a hologram.' },
      { about: 'NOVA', line: 'One gold canine. Glitter freckles. Rooftop helicopters jealous.' },
      { about: 'CRUZ', line: 'Cruz\'s Impala is a shrine. The rosary is not a decoration.' },
      { about: 'CRUZ', line: 'Chicano old-school. Chin up. East LA garage dusk. Amen.' },
      { about: 'ASH', line: 'Ash\'s patches are older than the car. Smile older than the lie.' },
      { about: 'ASH', line: 'Non-binary punk. Crooked grin. Harbor lights. Anarchy orange.' },
      { about: 'ZARA', line: 'Zara does not enter a room. She arrives. Rodeo Drive clears a lane.' },
      { about: 'ZARA', line: 'Nigerian-British glam metal. Lion laugh. Leopard coat. Gold everything.' },
      { about: 'VINCE', line: 'Vince: two seats, one man, zero apologies. Dockside pie neon forever.' },
      { about: 'VINCE', line: 'The fat one is roaring. The hog is suffering. The race is his.' },
      { about: 'RUBY', line: 'Ruby wink-and-smirk. Rockabilly blood. Diner heart. Cherry ink.' },
      { about: 'RUBY', line: 'Indigenous American chrome dream. Victory rolls. Route 66 pulse.' },
      { about: 'HEX', line: 'Hex treats the last lap like a séance. White contacts. Deadpan win.' },
      { about: 'HEX', line: 'Goth racer. Coffin pendant. Purple fog. The coupe listens.' },
      { about: 'VIKTOR', line: 'Viktor does not race for points. He races so you remember who owns night.' },
      { about: 'VIKTOR', line: 'Pakhan in a fur collar. Ice eyes. Snow on the warehouse. Quiet tip.' },
      { about: 'SEAMUS', line: 'Seamus crashed twice today. Still first to the bar. Still into the corner.' },
      { about: 'SEAMUS', line: 'Crazy Irish. Pint raised. Missing tooth. Full send anyway.' },
      { about: 'NEGAO', line: 'Negão Brasil — carnival in a man\'s body. Yellow muscle incoming.' },
      { about: 'NEGAO', line: 'João Barbosa laughs warm and dangerous. Hollywood never saw him coming.' },
      { about: 'LUCA', line: 'Don Luca. Calm butcher\'s eyes. Town car always has a full tank.' },
      { about: 'LUCA', line: 'Old-world gangster, West Coast hours. Cigar. Rose. Vine Street.' },
      { about: 'ZOR9', line: 'Zor9 crash-landed on the Walk of Fame. Grid > Earth. I Want To Believe.' },
      { about: 'ZOR9', line: 'Alien in a suit one size too small. Saucer parked like a lowrider. Facts.' },
    ],
  },
  {
    id: 'klyff',
    displayName: 'KLYFF',
    lines: [
      'I built this circus. I still show up to race it.',
      'Straight line. Firm fist. Unbeatable on the wheel.',
      'Family. Barbecue. Pub court with the car-prep crew. Then podium.',
      'Only original DeLorean on the grid. Motor doubled. Attitude stock.',
      'OUTLAW Garage neon. LIVE FAST RIDE HARD. Not a suggestion.',
      'Bald. Stubble. Cuban link. Flaming skull. Business as usual.',
      'Walk the line. Defend the shop. Leave rubber as a signature.',
      'Creator of the game. Still taking names on the last lap.',
      'Nitro, bikes, and a reserved stool. Some thrones have four wheels.',
      'They call it underground. I call it opening night every night.',
    ],
  },
  {
    id: 'carol',
    displayName: 'CAROL',
    lines: [
      'Fire hair. Wild laugh. Your setlist is already mine.',
      'I steal racing lines the way I steal choruses — loud.',
      'Guitar-shop neon and a pink convertible. Match my energy.',
      'Irish-American freckles. Red lipstick. Zero apologies.',
      'Tongue out, leather on, tempo redlined.',
      'Rock girl. Street girl. Same volume knob: broken.',
      'If the amp hums, the engine should too.',
      'Hollywood nights. Torn band tee. Full send chorus.',
      'I do not ask for the mic. I take the apex.',
      'Laugh first. Pass second. Encore optional.',
    ],
  },
  {
    id: 'dave',
    displayName: 'DAVE',
    lines: [
      'Lightning on the face. Star in the chest. Still touring asphalt.',
      'I sing to the engine. It changes key with every gear.',
      'Hair color is a gear. Makeup is a statement. Speed is the album.',
      'Sunset Strip billboard energy. Roadster chrome chorus.',
      'Heterochromia stare. Thin smile. Thick ambition.',
      'Glam never retired. It just learned to drift.',
      'Copper and platinum mullet — two eras, one lap.',
      'Starbursts behind me. Rubber in front. Cue the solo.',
      'Tribute? No. Continuity. The bolt stays lit.',
      'Change lanes like costumes. Keep the lightning.',
    ],
  },
  {
    id: 'razor',
    displayName: 'RAZOR',
    lines: [
      'Switchblade became a wheel. South Central still nods.',
      'Green liberty spikes. All the teeth. None of the lift.',
      'Laughing loud enough to rattle your rearview.',
      'Punk height. Leather studs. Neck ink. Full volume.',
      'Never lifts. Never soft. Purple night preferred.',
      'If the corner flinches, I lean harder.',
      'Harley heartbeat. Street gospel. Razor sermon.',
      'Scar energy in the brow. Victory energy everywhere else.',
      'Gold chains, septum ring, zero chill.',
      'I turned a threat into a throttle. You\'re welcome.',
    ],
  },
  {
    id: 'flufe',
    displayName: 'FLUFE',
    lines: [
      'Secret Keeper of every side. Looks harmless. Is not.',
      'Doll eyes. Carnival lights. Information desk is open.',
      'Pink choker. Too many rings. Exactly enough dirt.',
      'If you need to know something, find me. Bring coffee.',
      'Giggle first. Leverage later. Pier Ferris wheel approved.',
      'Tiny frame. Huge network. Fluffy coat as camouflage.',
      'Human face today. The dog card knows the rest.',
      'Peace sign up. Secrets down. Fair trade.',
      'East-Asian sparkle. Blonde curls. Quiet power.',
      'Members only — but I already know your lap times.',
    ],
  },
  {
    id: 'diego',
    displayName: 'DIEGO',
    lines: [
      'Biker chaplain of the Eastside. Bless the bikes.',
      'Curse the cops. Amen and amen.',
      'Santa Muerte on the vest. Soft smile. Hard eyes.',
      'Bandana up. Shades on the forehead. Chain ready.',
      'Garage amber. Chopper prayers. Rubber hymns.',
      'I do not preach speed. I consecrate it.',
      'Drop earring. Throat ink. Night garage gospel.',
      'Eastside roads remember who paid respect.',
      'Blessing takes a second. Overtaking takes less.',
      'Chaplain\'s rules: ride clean, race mean, tip fair.',
    ],
  },
  {
    id: 'luna',
    displayName: 'LUNA',
    lines: [
      'I ink half the grid. Your car name? My spelling.',
      'Silver buzz. Black lipstick. One-eyebrow smirk.',
      'Melrose neon. Lowrider shadow. Needle steady.',
      'If it lasts on skin, it lasts on asphalt.',
      'Tattooer by day. Technician of the racing line by night.',
      'Gold cross, gold hoops, zero patience for ugly lines.',
      'Throat ink glowing under parlor lights. Same as the finish.',
      'Korean-American precision. Street poetry on sleeves.',
      'Bring a design or bring a dare. Both get inked.',
      'I do not chase trends. I chase apexes.',
    ],
  },
  {
    id: 'blaze',
    displayName: 'BLAZE',
    lines: [
      'Mullet perfect. Camaro bourbon-scented. Still first sometimes.',
      'Rock-and-roll burnout with a flaming guitar on the chest.',
      'Hawaiian shirt open. Aviators on. Laugh unlocked.',
      'Sunset pier is my stage. Orange paint is my encore.',
      'Beer-gut laugh, nitro lungs. Balance.',
      'I retired from touring. Not from corners.',
      'Gold chain. Thick mustache. Soft brakes? Never heard of her.',
      'Flame job on the car. Flame job on the attitude.',
      'Late to the bar. Early to the apex. Priorities.',
      'Burnout life. Still lighting the strip.',
    ],
  },
  {
    id: 'kira',
    displayName: 'KIRA',
    lines: [
      'Tokyo to LA. Nine piercings. Zero patience.',
      'Pink-black pigtails. Snarl with love.',
      'Little Tokyo wet asphalt. Tiny hatch. Huge attitude.',
      'Spiked collar. Tartan. Gold buckles. Full send.',
      'I am snarling and loving it. Keep up.',
      'White-hot eyes. Cheek studs. No small talk.',
      'Patience is for traffic. I am not traffic.',
      'Punk passport stamped in rubber.',
      'If the alley echoes, that is just my exhaust applauding.',
      'Zero chill. Nine metals. One racing line.',
    ],
  },
  {
    id: 'snake',
    displayName: 'SNAKE',
    lines: [
      'West Coast gangster. Cool half-lidded stare.',
      'Gold tooth. Python ink. Never in a hurry — until lap last.',
      'Silk shirt unbuttoned. Downtown windows watching.',
      'Lowriders and palms. My tempo. Your problem.',
      'Half smile. Full threat. Yellow-grey silhouette energy.',
      'I glide until it matters. Then I strike.',
      'Filipino-Mexican cool. Spotted silk. Night business.',
      'Hydraulics optional. Respect mandatory.',
      'Last lap is the only appointment I keep early.',
      'Gangster clock: slow until the flag.',
    ],
  },
  {
    id: 'rio',
    displayName: 'RIO',
    lines: [
      'Every straight is Copacabana. Treat it that way.',
      'Afro-Brazilian street queen. Huge laugh. Yellow buggy.',
      'Gold headband. Coastal twilight. No mercy, lots of joy.',
      'Venice boardwalk energy with race-day teeth.',
      'Orange crop. Thick chain. Carnival in the throttle.',
      'I do not pass quietly. I pass celebrating.',
      'Braids, gold wrap, athletic shoulders — built for the coast.',
      'Palms, headlights, laugh that ends rivalries.',
      'Street queen title is not elected. It is taken at speed.',
      'Joyful and dangerous. Same package.',
    ],
  },
  {
    id: 'jett',
    displayName: 'JETT',
    lines: [
      'The skinny one. Tongue out. Both hands throwing horns.',
      'Gas-station coffee and guitar strings. That is the diet.',
      'Bowl cut. Safety pins. Dumpster alley red carpet.',
      'Exaggerated 90s face. Exaggerated 90s speed.',
      'Black nails. Leopard neck ink. Volume forever.',
      'I am not big. My attitude rented a warehouse.',
      'Horns up. Brakes down. Coffee lukewarm. Perfect.',
      'Matte-black bike dreams. Skinny-legend reality.',
      'If the alley claps, it is just tin cans cheering.',
      'Live skinny. Race loud. Sleep never.',
    ],
  },
  {
    id: 'nova',
    displayName: 'NOVA',
    lines: [
      'Club kid after last call. Still looks like a hologram.',
      'One gold canine. Soft smirk. Hard rooftop laps.',
      'Holo visor up. Glitter freckles. Purple sky.',
      'Androgynous chrome. Helicopter soundtrack included.',
      'I race when the clubs die. The night is warmer then.',
      'Holographic jacket. Heart pendant. Zero dull moments.',
      'South Asian sparkle. Spiky hair. Soft menace.',
      'Kasbah rooftops. Neon prayers. Rubber answers.',
      'If you blink, I pixelate past you.',
      'Last call is my green light.',
    ],
  },
  {
    id: 'cruz',
    displayName: 'CRUZ',
    lines: [
      'The Impala is a shrine. The rosary is not a decoration.',
      'Chicano old-school. Proud chin-up grin.',
      'Pompadour. White tank. East LA garage dusk.',
      'Script ink on both arms. Faith in the line.',
      'Old-school means the car is family. Treat it holy.',
      'Smirk earned. Hydraulics optional. Respect required.',
      'Blue cars in the back. History in the front.',
      'I do not flex. I arrive already proud.',
      'Rosary swing. Apex swing. Same rhythm.',
      'Eastside chrome gospel. Amen and pass.',
    ],
  },
  {
    id: 'ash',
    displayName: 'ASH',
    lines: [
      'Patches older than the car. Smile older than the lie.',
      'Non-binary punk. Crooked grin. Harbor lights.',
      'Bleached buzz. Industrial piercings. Anarchy orange.',
      'Rusted rally heart. Echo Park nights.',
      'I do not polish the past. I race it.',
      'Horseshoe choker. Freckles. Full honesty, half brakes.',
      'Patched vest over grey tee. Attitude over gloss.',
      'Crooked smile means the joke is already on you.',
      'Pier lights. Salt air. No surrender.',
      'Punk is a verb. Watch me conjugate it.',
    ],
  },
  {
    id: 'zara',
    displayName: 'ZARA',
    lines: [
      'I do not enter a room. I arrive.',
      'Nigerian-British glam metal. Lion laugh. Leopard coat.',
      'Rodeo Drive clears a lane. Good instinct.',
      'Box braids with gold rings. Shades in the hair. Royalty.',
      'Yellow supercar. Mall neon. Absolute main character.',
      'Glam metal volume. Street metal results.',
      'Towering. Loud. Kind if you keep up.',
      'GUCCI lights behind me. Rubber ahead. Balance.',
      'Lion laugh ends arguments and rivalries.',
      'Arrive. Apex. Applause. Repeat.',
    ],
  },
  {
    id: 'vince',
    displayName: 'VINCE',
    lines: [
      'Two seats. One man. Zero apologies.',
      'The fat one is roaring with laughter. Join or move.',
      'Dockside diner. Pie neon. Stars-and-stripes hog.',
      'FTW vest. Eagle arms. Wide smile, wider presence.',
      'Leather that will not close. Spirit that will not lose.',
      'Freighter lights. Red car. Full send breakfast energy.',
      'I take space. I earned it. Pass if you can.',
      'Joyful mass. Dangerous mass. Same package.',
      'US flag patch. Iron-cross chain. Homestyle heat.',
      'Roaring laugh is my turn signal.',
    ],
  },
  {
    id: 'ruby',
    displayName: 'RUBY',
    lines: [
      'Victory roll. Rose in the hair. Wink and a smirk.',
      'Indigenous American rockabilly. Racing blood.',
      'Cherry tattoos. Diner heart. Chrome bumper dreams.',
      'Red jacket. Route 66 pulse. Hollywood hills far back.',
      'Rockabilly is not costume. It is cadence.',
      'Brow piercing. Gold hoops. Cherry-red everything.',
      'I wink once. You lose once. Fair.',
      'Diner night blur. Racing day sharp.',
      'Heart on sleeve. Speed in blood. Both true.',
      'Smirk first. Pass second. Milkshake after.',
    ],
  },
  {
    id: 'hex',
    displayName: 'HEX',
    lines: [
      'Last lap is a séance. I always get an answer.',
      'Goth racer. Deadpan almost-smile. Purple fog.',
      'White contacts. Coffin pendant. Hearse-nosed coupe.',
      'Observatory night. Quiet threats. Loud results.',
      'I do not scream. The tires do.',
      'Black pageboy. Studded choker. Zero daylight required.',
      'Séance rules: commit, commit, finish.',
      'Deadpan wins look the same as deadpan losses. Prefer wins.',
      'Fog is atmosphere. Fear is optional.',
      'Treat the apex like an altar. Bow with speed.',
    ],
  },
  {
    id: 'viktor',
    displayName: 'VIKTOR',
    lines: [
      'I do not race for points. I race so you remember.',
      'Pakhan. Fur collar. Ice eyes. Night ownership.',
      'Snow on the warehouse. Red star neon. Quiet orders.',
      'Knuckle ink. Crown tattoo. No smile required.',
      'Mafia manners. Track results. Same firmness.',
      'You will remember who owns the night.',
      'Tracksuit under coat. Business over fashion.',
      'Ice-blue stare. Warm engines. Cold deals.',
      'Planet 10 is just another territory.',
      'Points are for tourists. Fear is for locals.',
    ],
  },
  {
    id: 'seamus',
    displayName: 'SEAMUS',
    lines: [
      'Crashed twice today. Still first into the corner.',
      'Crazy Irish. Pint raised. Missing tooth. Full send.',
      'Paddy\'s Pub fragment. Green bomber. Wild ginger storm.',
      'First to the bar. First into the apex. Consistency.',
      'Bloodshot laugh. Rally heart. Sidewalk optional.',
      'Already broken something. Still unbroken spirit.',
      'Shamrock pins. Overflowing pint. Overflowing chaos.',
      'Mad Irish math: crash + crash = still racing.',
      'The corner and I have an understanding. It flinches.',
      'Cheers. Then throttle. Then cheers again.',
    ],
  },
  {
    id: 'negao',
    displayName: 'NEGAO',
    lines: [
      'Carnival in a man\'s body. Yellow muscle incoming.',
      'João "Negão" Barbosa. Hollywood never saw this coming.',
      'Brazil flag pendant. Warm dangerous smile.',
      'Afro. Open racing shirt. Guitar neon. Full festa.',
      'Negão Brasil on the card. Party on the asphalt.',
      'Chrome yellow. Palm shadows. Absolute presence.',
      'Laugh warm. Pass hot. Same temperature.',
      'Carnival rules: dance, then dominate.',
      'Thick arms. Thick joy. Thin patience for slow traffic.',
      'Hollywood Blvd, make room for Brazil.',
    ],
  },
  {
    id: 'luca',
    displayName: 'LUCA',
    lines: [
      'Don Luca. Calm butcher\'s eyes. Full tank always.',
      'Old-world gangster. West Coast hours.',
      'Cigar. Rose. Pinstripe. Vine Street storefront.',
      'Town car black. Manners older. Threats quieter.',
      'Pinky ring energy. Pocket square diplomacy.',
      'I do not raise my voice. I raise the stakes.',
      'Italy neon. Silver temples. Absolute composure.',
      'The tank is full. So is the ledger.',
      'Calm is not soft. Calm is loaded.',
      'Respect the Don. Or respect the gap he leaves you in.',
    ],
  },
  {
    id: 'zor9',
    displayName: 'ZOR9',
    lines: [
      'Crash-landed on the Walk of Fame. Grid > Earth.',
      'Slienigena. AREA 51 patches. I Want To Believe.',
      'Suit one size too small. Ambition one size too big.',
      'Saucer parked like a lowrider. Palms approved.',
      'Alien-head pendant. Human racing religion.',
      'Three fingers. Full throttle. Tiny smirk.',
      'UFO OIL. Checkered shoulder. Cosmic pit crew.',
      'Hollywood stars underfoot. Earth in the sky. Priorities.',
      'The underground went planetary. I was already there.',
      'Believe. Then draft. Then abduct the lead.',
    ],
  },
];

const BANK_BY_ID: ReadonlyMap<ComicVoiceId, ComicVoiceBank> = new Map(
  COMIC_VOICE_BANKS.map(bank => [bank.id, bank]),
);

export function comicVoiceBank(id: ComicVoiceId): ComicVoiceBank | undefined {
  return BANK_BY_ID.get(id);
}

export interface OriginStripPanel {
  readonly badge: string;
  readonly line: string;
}

/**
 * Pick `count` cartoon panels for a splash card page.
 * Emma / Chimbler always mixes at least one self line with gossip when count ≥ 2.
 */
export function pickOriginStrips(
  voiceId: ComicVoiceId,
  seed: number,
  count = ORIGIN_STRIP_PANEL_COUNT,
): OriginStripPanel[] {
  const bank = BANK_BY_ID.get(voiceId);
  if (bank === undefined || count <= 0) {
    return [];
  }
  const rng = mulberry32(seed);
  const self: OriginStripPanel[] = bank.lines.map(line => ({
    badge: bank.displayName,
    line,
  }));
  const gossip: OriginStripPanel[] = (bank.gossip ?? []).map(tip => ({
    badge: `GOSSIP · ${tip.about}`,
    line: tip.line,
  }));

  if (gossip.length === 0) {
    const copy = [...self];
    shuffleInPlace(copy, rng);
    return copy.slice(0, Math.min(count, copy.length));
  }

  // Guarantee voice + dirt on Chimbler pages (comic left column).
  const selfCopy = [...self];
  const gossipCopy = [...gossip];
  shuffleInPlace(selfCopy, rng);
  shuffleInPlace(gossipCopy, rng);
  const wantSelf = Math.max(1, Math.floor(count / 3));
  const wantGossip = count - wantSelf;
  const picked = [
    ...selfCopy.slice(0, Math.min(wantSelf, selfCopy.length)),
    ...gossipCopy.slice(0, Math.min(wantGossip, gossipCopy.length)),
  ];
  shuffleInPlace(picked, rng);
  return picked.slice(0, Math.min(count, picked.length));
}

/** One roll of strips for every origin page, stable for a single entry. */
export function rollOriginEntryStrips(seed: number): readonly (readonly OriginStripPanel[])[] {
  return ORIGIN_VOICE_BY_CARD.map((voiceId, index) =>
    pickOriginStrips(voiceId, seed + index * 9973, ORIGIN_STRIP_PANEL_COUNT),
  );
}
