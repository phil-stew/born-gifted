// Item database — slots: weapon | footwear | handwear | chest | headwear
// `sport` maps to gearset10.png row for icon display:
//   Basketball=0, Soccer=1, Football=2, Baseball=3, Tennis=4,
//   Volleyball=5, Hockey=6, Boxing=7, Track=8, Golf=9
// Rarity maps to column: common=white, uncommon=green, rare=blue, epic=purple, legendary=gold

export const ITEMS = [

  // ── Materials ─────────────────────────────────────────────────────────────
  { id:'heal_herb',    name:'Heal Herb',    type:'material', slot:null, rarity:'common',   cost:15,  stats:{}, desc:'A medicinal herb found in forest clearings.' },
  { id:'wolf_pelt',    name:'Wolf Pelt',    type:'material', slot:null, rarity:'common',   cost:25,  stats:{}, desc:'A rough pelt stripped from a forest wolf.' },
  { id:'boar_hide',    name:'Boar Hide',    type:'material', slot:null, rarity:'common',   cost:30,  stats:{}, desc:'Thick hide from a territorial forest boar.' },
  { id:'iron_scrap',   name:'Iron Scrap',   type:'material', slot:null, rarity:'common',   cost:20,  stats:{}, desc:'Salvaged metal, useful for forging.' },
  { id:'crystal_shard',name:'Crystal Shard',type:'material', slot:null, rarity:'uncommon', cost:60,  stats:{}, desc:'A shard of elemental crystal.' },
  // M3 craft materials
  { id:'iron_ore',     name:'Iron Ore',     type:'material', slot:null, rarity:'common',   cost:30,  stats:{}, desc:'Raw iron pulled from the plains. Used to craft gear.' },
  { id:'leather_strip',name:'Leather Strip',type:'material', slot:null, rarity:'common',   cost:25,  stats:{}, desc:'Cured hide strips. Flexible and durable.' },
  { id:'wood_plank',   name:'Wood Plank',   type:'material', slot:null, rarity:'common',   cost:18,  stats:{}, desc:'Treated wood boards salvaged from the borderlands.' },
  // M4 upgrade materials
  { id:'cave_crystal', name:'Cave Crystal', type:'material', slot:null, rarity:'uncommon', cost:75,  stats:{}, desc:'A luminous crystal formed deep in the caves. Enhances gear.' },
  { id:'shadow_ore',   name:'Shadow Ore',   type:'material', slot:null, rarity:'uncommon', cost:80,  stats:{}, desc:'Dark alloy found only in hollow cave veins. Ideal for upgrades.' },

  // ══════════════════════════════════════════════════════════════════════════
  // SOCCER  (Reno · Sela)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'soccer_jersey',      sport:'Soccer', name:'Soccer Jersey',       slot:'chest',    rarity:'common',   cost:60,  stats:{ speed:1, stamina:1 },      desc:'Lightweight match jersey for agile movement.' },
  { id:'soccer_jersey_pro',  sport:'Soccer', name:'Pro Soccer Jersey',   slot:'chest',    rarity:'uncommon', cost:155, stats:{ speed:2, stamina:2 },      desc:'Academy-issue jersey with moisture control.' },
  { id:'soccer_jersey_elite',sport:'Soccer', name:'Elite Soccer Jersey', slot:'chest',    rarity:'rare',     cost:360, stats:{ speed:4, stamina:3 },      desc:'Championship-grade jersey worn by top strikers.' },
  { id:'soccer_cleats',      sport:'Soccer', name:'Soccer Cleats',       slot:'footwear', rarity:'common',   cost:65,  stats:{ speed:2 },                  desc:'Standard cleats for firm-ground traction.' },
  { id:'soccer_cleats_pro',  sport:'Soccer', name:'Sprint Cleats',       slot:'footwear', rarity:'uncommon', cost:150, stats:{ speed:4 },                  desc:'Lightweight cleats tuned for burst speed.' },
  { id:'soccer_cleats_elite',sport:'Soccer', name:'Lightning Cleats',    slot:'footwear', rarity:'rare',     cost:360, stats:{ speed:6, endurance:2 },    desc:'Infused with lightning-element energy.' },
  { id:'soccer_ball',        sport:'Soccer', name:'Soccer Ball',         slot:'weapon',   rarity:'common',   cost:50,  stats:{ strength:1 },               desc:'Standard match ball. A striker\'s best friend.' },
  { id:'soccer_ball_pro',    sport:'Soccer', name:'Pro Match Ball',      slot:'weapon',   rarity:'uncommon', cost:140, stats:{ strength:2, speed:1 },      desc:'Tournament-grade ball with tight spin control.' },
  { id:'soccer_ball_elite',  sport:'Soccer', name:'Thunder Ball',        slot:'weapon',   rarity:'rare',     cost:340, stats:{ strength:4, speed:2 },      desc:'A ball charged with electric Gift energy.' },
  { id:'soccer_ball_epic',   sport:'Soccer', name:'Volt Sphere',         slot:'weapon',   rarity:'epic',     cost:700, stats:{ strength:6, speed:4 },      desc:'Legendary ball that crackles with lightning.' },

  // ══════════════════════════════════════════════════════════════════════════
  // BASKETBALL  (Trice)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'bball_jersey',      sport:'Basketball', name:'Basketball Jersey',     slot:'chest',    rarity:'common',   cost:60,  stats:{ stamina:2 },                desc:'Loose-fit jersey for fast court play.' },
  { id:'bball_jersey_pro',  sport:'Basketball', name:'Pro Basketball Jersey', slot:'chest',    rarity:'uncommon', cost:155, stats:{ stamina:3, endurance:1 },  desc:'Reinforced jersey used in the championship league.' },
  { id:'bball_shoes',       sport:'Basketball', name:'Basketball Shoes',      slot:'footwear', rarity:'common',   cost:70,  stats:{ speed:1, endurance:1 },    desc:'High-top shoes for ankle support and jumps.' },
  { id:'bball_shoes_pro',   sport:'Basketball', name:'Air Court Shoes',       slot:'footwear', rarity:'uncommon', cost:160, stats:{ speed:2, endurance:2 },    desc:'Academy-issue high-tops with spring soles.' },
  { id:'basketball',        sport:'Basketball', name:'Basketball',            slot:'weapon',   rarity:'common',   cost:55,  stats:{ strength:1, stamina:1 },   desc:'Regulation ball, great for power plays.' },
  { id:'basketball_pro',    sport:'Basketball', name:'Pro Basketball',        slot:'weapon',   rarity:'uncommon', cost:145, stats:{ strength:2, stamina:2 },   desc:'Tournament-grade ball with superior grip.' },
  { id:'basketball_epic',   sport:'Basketball', name:'Earth Sphere',          slot:'weapon',   rarity:'epic',     cost:720, stats:{ strength:5, stamina:4 },   desc:'A ball imbued with earth Gift energy.' },

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTBALL  (Drace)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'football_helmet',      sport:'Football', name:'Football Helmet',       slot:'headwear', rarity:'common',   cost:80,  stats:{ endurance:2 },              desc:'Hard-shell helmet for full-contact play.' },
  { id:'football_helmet_pro',  sport:'Football', name:'Pro Football Helmet',   slot:'headwear', rarity:'uncommon', cost:190, stats:{ endurance:3, strength:1 },  desc:'Impact-rated helmet with reinforced faceguard.' },
  { id:'football_helmet_elite',sport:'Football', name:'Titan Helmet',          slot:'headwear', rarity:'rare',     cost:420, stats:{ endurance:5, strength:2 },  desc:'Rare alloy helmet worn by elite linebackers.' },
  { id:'football_jersey',      sport:'Football', name:'Football Jersey',       slot:'chest',    rarity:'common',   cost:65,  stats:{ endurance:1, strength:1 },  desc:'Padded jersey built for hard tackles.' },
  { id:'football_jersey_pro',  sport:'Football', name:'Pro Football Jersey',   slot:'chest',    rarity:'uncommon', cost:170, stats:{ endurance:2, strength:2 },  desc:'Reinforced game-day jersey.' },
  { id:'football',             sport:'Football', name:'Football',              slot:'weapon',   rarity:'common',   cost:55,  stats:{ strength:2 },               desc:'Regulation ball. Throw it hard.' },
  { id:'football_pro',         sport:'Football', name:'Pro Football',          slot:'weapon',   rarity:'uncommon', cost:150, stats:{ strength:3, endurance:1 },  desc:'Tournament-grade pigskin with fire stitch.' },
  { id:'football_epic',        sport:'Football', name:'Inferno Pigskin',       slot:'weapon',   rarity:'epic',     cost:730, stats:{ strength:6, endurance:3 },  desc:'A football wreathed in fire Gift energy.' },

  // ══════════════════════════════════════════════════════════════════════════
  // VOLLEYBALL  (Kael)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'volleyball_jersey',     sport:'Volleyball', name:'Volleyball Jersey',     slot:'chest',    rarity:'common',   cost:58,  stats:{ speed:1, stamina:1 },      desc:'Sleeveless jersey for quick arm swings.' },
  { id:'volleyball_jersey_pro', sport:'Volleyball', name:'Pro Volleyball Jersey', slot:'chest',    rarity:'uncommon', cost:150, stats:{ speed:2, stamina:2 },      desc:'Wind-element infused jersey for spikers.' },
  { id:'volleyball_shoes',      sport:'Volleyball', name:'Volleyball Shoes',      slot:'footwear', rarity:'common',   cost:65,  stats:{ speed:1, stamina:1 },      desc:'Low-cut shoes optimized for indoor courts.' },
  { id:'volleyball_shoes_pro',  sport:'Volleyball', name:'Air Spike Shoes',       slot:'footwear', rarity:'uncommon', cost:155, stats:{ speed:2, stamina:2 },      desc:'Cushioned for repeated jump landings.' },
  { id:'volleyball',            sport:'Volleyball', name:'Volleyball',            slot:'weapon',   rarity:'common',   cost:50,  stats:{ strength:1, speed:1 },     desc:'Regulation indoor ball. Spike with precision.' },
  { id:'volleyball_pro',        sport:'Volleyball', name:'Pro Volleyball',        slot:'weapon',   rarity:'uncommon', cost:140, stats:{ strength:2, speed:2 },     desc:'Competition ball with wind-element stitching.' },
  { id:'volleyball_epic',       sport:'Volleyball', name:'Gale Sphere',           slot:'weapon',   rarity:'epic',     cost:700, stats:{ strength:5, speed:5 },     desc:'A ball that whistles with wind Gift energy.' },

  // ══════════════════════════════════════════════════════════════════════════
  // HOCKEY  (universal)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'hockey_helmet',      sport:'Hockey', name:'Hockey Helmet',       slot:'headwear', rarity:'common',   cost:85,  stats:{ endurance:2 },              desc:'Full cage helmet for ice protection.' },
  { id:'hockey_helmet_pro',  sport:'Hockey', name:'Pro Hockey Helmet',   slot:'headwear', rarity:'uncommon', cost:200, stats:{ endurance:3, stamina:1 },   desc:'Reinforced shell with enhanced visibility.' },
  { id:'hockey_jersey',      sport:'Hockey', name:'Hockey Jersey',       slot:'chest',    rarity:'common',   cost:70,  stats:{ endurance:1, stamina:1 },   desc:'Padded jersey worn by ice warriors.' },
  { id:'hockey_jersey_pro',  sport:'Hockey', name:'Pro Hockey Jersey',   slot:'chest',    rarity:'uncommon', cost:175, stats:{ endurance:2, stamina:2 },   desc:'Championship-weight padded jersey.' },
  { id:'hockey_gloves',      sport:'Hockey', name:'Hockey Gloves',       slot:'handwear', rarity:'common',   cost:75,  stats:{ strength:1, endurance:1 },  desc:'Padded gloves for stickhandling and blocking.' },
  { id:'hockey_gloves_pro',  sport:'Hockey', name:'Pro Hockey Gloves',   slot:'handwear', rarity:'uncommon', cost:170, stats:{ strength:2, endurance:2 },  desc:'Reinforced gloves with knuckle guard.' },
  { id:'hockey_stick',       sport:'Hockey', name:'Hockey Stick',        slot:'weapon',   rarity:'common',   cost:80,  stats:{ strength:2, speed:1 },      desc:'Composite stick for fast, powerful shots.' },
  { id:'hockey_stick_pro',   sport:'Hockey', name:'Pro Hockey Stick',    slot:'weapon',   rarity:'uncommon', cost:200, stats:{ strength:3, speed:2 },      desc:'Tournament blade with precision curve.' },
  { id:'hockey_stick_elite', sport:'Hockey', name:'Frost Blade',         slot:'weapon',   rarity:'rare',     cost:430, stats:{ strength:5, speed:3 },      desc:'A stick forged with ice-element energy.' },

  // ══════════════════════════════════════════════════════════════════════════
  // BOXING  (universal — weapon = gloves pair, left + right)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'boxing_headgear',     sport:'Boxing', name:'Boxing Headgear',      slot:'headwear', rarity:'common',   cost:75,  stats:{ endurance:2, stamina:1 },   desc:'Padded headgear for sparring and competition.' },
  { id:'boxing_headgear_pro', sport:'Boxing', name:'Pro Boxing Headgear',  slot:'headwear', rarity:'uncommon', cost:185, stats:{ endurance:3, stamina:2 },   desc:'Championship-grade with cheek guards.' },
  { id:'boxing_tank',         sport:'Boxing', name:'Boxing Tank',          slot:'chest',    rarity:'common',   cost:55,  stats:{ stamina:2 },                 desc:'Lightweight tank for maximum movement.' },
  { id:'boxing_tank_pro',     sport:'Boxing', name:'Pro Boxing Tank',      slot:'chest',    rarity:'uncommon', cost:145, stats:{ stamina:3, speed:1 },        desc:'Moisture-wicking competition tank.' },
  { id:'boxing_gloves',       sport:'Boxing', name:'Boxing Gloves',        slot:'weapon',   rarity:'common',   cost:80,  stats:{ strength:2, stamina:1 },     desc:'Left + right gloves for powerful combination strikes.' },
  { id:'boxing_gloves_pro',   sport:'Boxing', name:'Pro Boxing Gloves',    slot:'weapon',   rarity:'uncommon', cost:200, stats:{ strength:3, stamina:2 },     desc:'Competition 10oz gloves, tuned for speed combos.' },
  { id:'boxing_gloves_elite', sport:'Boxing', name:'Iron Fist Gloves',     slot:'weapon',   rarity:'rare',     cost:420, stats:{ strength:5, stamina:3 },     desc:'Champion-grade gloves that pack a knockout punch.' },

  // ══════════════════════════════════════════════════════════════════════════
  // BASEBALL  (universal)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'baseball_cap',         sport:'Baseball', name:'Baseball Cap',          slot:'headwear', rarity:'common',   cost:40,  stats:{ speed:1 },                   desc:'Classic fitted cap for focus under the sun.' },
  { id:'baseball_cap_pro',     sport:'Baseball', name:'Pro Baseball Cap',      slot:'headwear', rarity:'uncommon', cost:110, stats:{ speed:2, stamina:1 },        desc:'Academy-issue cap with focus weave.' },
  { id:'baseball_jersey',      sport:'Baseball', name:'Baseball Jersey',       slot:'chest',    rarity:'common',   cost:60,  stats:{ endurance:1, stamina:1 },    desc:'Button-down jersey for diamond play.' },
  { id:'baseball_jersey_pro',  sport:'Baseball', name:'Pro Baseball Jersey',   slot:'chest',    rarity:'uncommon', cost:155, stats:{ endurance:2, stamina:2 },    desc:'Full-stretch jersey for elite athletes.' },
  { id:'baseball_cleats',      sport:'Baseball', name:'Baseball Cleats',       slot:'footwear', rarity:'common',   cost:65,  stats:{ speed:1, strength:1 },       desc:'Metal-tip cleats for grip on the diamond.' },
  { id:'baseball_bat',         sport:'Baseball', name:'Baseball Bat',          slot:'weapon',   rarity:'common',   cost:70,  stats:{ strength:2 },                desc:'Aluminum alloy bat for power hitters.' },
  { id:'baseball_bat_pro',     sport:'Baseball', name:'Pro Baseball Bat',      slot:'weapon',   rarity:'uncommon', cost:180, stats:{ strength:4, speed:1 },       desc:'Composite bat with vibration damping.' },
  { id:'baseball_bat_elite',   sport:'Baseball', name:'Power Lumber',          slot:'weapon',   rarity:'rare',     cost:400, stats:{ strength:6, endurance:1 },   desc:'Custom-forged bat used by tournament legends.' },

  // ══════════════════════════════════════════════════════════════════════════
  // TENNIS  (universal)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'tennis_shirt',          sport:'Tennis', name:'Tennis Shirt',         slot:'chest',    rarity:'common',   cost:55,  stats:{ speed:1, stamina:1 },       desc:'Polo-cut shirt for court agility.' },
  { id:'tennis_shirt_pro',      sport:'Tennis', name:'Pro Tennis Shirt',     slot:'chest',    rarity:'uncommon', cost:140, stats:{ speed:2, stamina:2 },       desc:'Aerodynamic cut for rapid baseline play.' },
  { id:'tennis_shoes',          sport:'Tennis', name:'Tennis Shoes',         slot:'footwear', rarity:'common',   cost:65,  stats:{ speed:2 },                   desc:'Lateral support shoes for quick court cuts.' },
  { id:'tennis_shoes_pro',      sport:'Tennis', name:'Pro Tennis Shoes',     slot:'footwear', rarity:'uncommon', cost:155, stats:{ speed:3, endurance:1 },     desc:'Academy-grade with cushioned arch support.' },
  { id:'tennis_racket',         sport:'Tennis', name:'Tennis Racket',        slot:'weapon',   rarity:'common',   cost:75,  stats:{ speed:2, strength:1 },      desc:'Standard racket with open string pattern.' },
  { id:'tennis_racket_pro',     sport:'Tennis', name:'Pro Tennis Racket',    slot:'weapon',   rarity:'uncommon', cost:190, stats:{ speed:3, strength:2 },      desc:'Tournament frame with aerodynamic beam.' },
  { id:'tennis_racket_elite',   sport:'Tennis', name:'Wind Slicer',          slot:'weapon',   rarity:'rare',     cost:410, stats:{ speed:5, strength:3 },      desc:'A racket that cuts the air with Gift energy.' },

  // ══════════════════════════════════════════════════════════════════════════
  // TRACK & FIELD  (runners — weapon = stopwatch)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'track_jersey',       sport:'Track', name:'Track Jersey',       slot:'chest',    rarity:'common',   cost:50,  stats:{ speed:1, stamina:1 },       desc:'Lightweight singlet for peak aerodynamics.' },
  { id:'track_jersey_pro',   sport:'Track', name:'Pro Track Jersey',   slot:'chest',    rarity:'uncommon', cost:130, stats:{ speed:2, stamina:2 },       desc:'Competition singlet with compression weave.' },
  { id:'track_shoes',        sport:'Track', name:'Track Shoes',        slot:'footwear', rarity:'common',   cost:70,  stats:{ speed:3 },                   desc:'Spike shoes for maximum sprint acceleration.' },
  { id:'track_shoes_pro',    sport:'Track', name:'Pro Track Spikes',   slot:'footwear', rarity:'uncommon', cost:175, stats:{ speed:5 },                   desc:'Carbon-plate spikes for sub-elite sprint times.' },
  { id:'track_shoes_elite',  sport:'Track', name:'Bolt Spikes',        slot:'footwear', rarity:'rare',     cost:390, stats:{ speed:7, stamina:1 },        desc:'Lightning-infused spikes for inhuman speed.' },
  { id:'stopwatch',          sport:'Track', name:'Stopwatch',          slot:'weapon',   rarity:'common',   cost:60,  stats:{ speed:2, stamina:1 },        desc:'A precision timer that bends your perception of pace.' },
  { id:'stopwatch_pro',      sport:'Track', name:'Chrono Watch',       slot:'weapon',   rarity:'uncommon', cost:165, stats:{ speed:3, stamina:2 },        desc:'Tournament-grade chronometer that sharpens focus.' },
  { id:'stopwatch_epic',     sport:'Track', name:'Temporal Dial',      slot:'weapon',   rarity:'epic',     cost:750, stats:{ speed:6, stamina:4 },        desc:'A watch imbued with time-bending Gift energy.' },

  // ══════════════════════════════════════════════════════════════════════════
  // GOLF  (universal — weapon = golf club)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'golf_shirt',      sport:'Golf', name:'Golf Polo',      slot:'chest',  rarity:'common',   cost:55,  stats:{ endurance:1, stamina:1 },   desc:'Classic polo for the fairway.' },
  { id:'golf_shirt_pro',  sport:'Golf', name:'Pro Golf Polo',  slot:'chest',  rarity:'uncommon', cost:145, stats:{ endurance:2, stamina:2 },   desc:'Moisture-wicking polo for tournament play.' },
  { id:'golf_club',       sport:'Golf', name:'Golf Club',      slot:'weapon', rarity:'common',   cost:85,  stats:{ strength:2, endurance:1 },  desc:'Titanium driver for long-distance power.' },
  { id:'golf_club_pro',   sport:'Golf', name:'Pro Golf Club',  slot:'weapon', rarity:'uncommon', cost:210, stats:{ strength:3, endurance:2 },  desc:'Tour-spec driver with low spin shaft.' },
  { id:'golf_club_elite', sport:'Golf', name:'Ace Driver',     slot:'weapon', rarity:'rare',     cost:450, stats:{ strength:5, endurance:3 },  desc:'A club said to never miss the fairway.' },

  // ══════════════════════════════════════════════════════════════════════════
  // UNIVERSAL GEAR  (no sport icon — any class)
  // ══════════════════════════════════════════════════════════════════════════
  { id:'basic_gloves',   name:'Training Gloves', slot:'handwear', rarity:'common',   cost:55,  stats:{ strength:1, stamina:1 },      desc:'General-purpose gloves for any athlete.' },
  { id:'power_wraps',    name:'Power Wraps',     slot:'handwear', rarity:'uncommon', cost:150, stats:{ strength:3, stamina:1 },      desc:'Competition-grade hand wraps.' },
  { id:'titan_gloves',   name:'Titan Gloves',    slot:'handwear', rarity:'rare',     cost:370, stats:{ strength:5, stamina:2 },      desc:'Reinforced gloves worn by elite athletes.' },
  { id:'basic_headband', name:'Focus Headband',  slot:'headwear', rarity:'common',   cost:40,  stats:{ speed:1 },                    desc:'Sharpens your mental focus in the heat of battle.' },
  { id:'swift_helm',     name:'Swift Helm',      slot:'headwear', rarity:'uncommon', cost:120, stats:{ speed:2, strength:1 },        desc:'Lightweight helm favored by strikers.' },
  { id:'leather_vest',   name:'Leather Vest',    slot:'chest',    rarity:'common',   cost:70,  stats:{ endurance:2 },                desc:'Basic padded protection for any class.' },
  { id:'chain_vest',     name:'Chain Vest',      slot:'chest',    rarity:'uncommon', cost:180, stats:{ endurance:4 },                desc:'Solid chain-link protection.' },
  { id:'titan_vest',     name:'Titan Vest',      slot:'chest',    rarity:'rare',     cost:420, stats:{ endurance:6, stamina:2 },     desc:'Rare alloy forged in Altroes.' },
  { id:'iron_boots',     name:'Iron Boots',      slot:'footwear', rarity:'common',   cost:50,  stats:{ speed:2 },                    desc:'Sturdy boots that quicken your step.' },
  { id:'volt_boots',     name:'Volt Boots',      slot:'footwear', rarity:'rare',     cost:380, stats:{ speed:6, endurance:2 },       desc:'Infused with lightning-element energy.' },
];

const RARITY_COLORS = {
  common:    0xdddddd,
  uncommon:  0x44cc44,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xffaa00,
};

export function rarityColor(rarity) { return RARITY_COLORS[rarity] ?? 0xffffff; }

// gearset10.png grid layout (1536×1024)
// Columns (left→right): common(white), uncommon(green), rare(blue), epic(purple), legendary(gold)
// Rows (top→bottom): Basketball, Soccer, Football, Baseball, Tennis, Volleyball, Hockey, Boxing, Track, Golf
export const GEAR_GRID = {
  labelW: 185, headerH: 52,
  cellW: Math.round((1536 - 185) / 6),
  cellH: Math.round((1024 - 52) / 10),
  sportRow:  { Basketball:0, Soccer:1, Football:2, Baseball:3, Tennis:4, Volleyball:5, Hockey:6, Boxing:7, Track:8, Golf:9 },
  rarityCol: { common:0, uncommon:1, rare:2, epic:3, legendary:4 },
};

// Per-sport, per-slot item crop coordinates [relX, relY, w, h] within a cell
// Coordinates measured from the pixel analysis of gearset10.png (1536×1024)
export const ITEM_FRAMES = {
  Basketball: {
    chest:    [26,  15, 47, 78],  // tank jersey
    footwear: [132, 38, 40, 55],  // high-top shoes
    weapon:   [163, 40, 40, 39],  // basketball
  },
  Soccer: {
    chest:    [17,  17, 72, 66],  // jersey
    footwear: [103, 47, 52, 36],  // cleats
    weapon:   [160, 43, 39, 39],  // soccer ball
  },
  Football: {
    headwear: [14,  11, 47, 58],  // helmet
    chest:    [70,  10, 49, 59],  // jersey #10
    weapon:   [165, 39, 38, 32],  // football
  },
  Baseball: {
    headwear: [13,   1, 47, 36],  // cap
    chest:    [67,   0, 59, 68],  // jersey
    footwear: [23,  40, 47, 28],  // cleats
    weapon:   [154,  3, 48, 64],  // bat
  },
  Tennis: {
    chest:    [13,   0, 63, 60],  // polo shirt
    footwear: [130, 50, 55, 47],  // sneakers (below racket)
    weapon:   [137,  0, 51, 45],  // racket
  },
  Volleyball: {
    chest:    [28,   0, 46, 54],  // jersey
    footwear: [131, 21, 40, 38],  // shoes
    weapon:   [167, 15, 36, 36],  // volleyball
  },
  Hockey: {
    headwear: [13,   0, 47, 51],  // cage helmet
    chest:    [64,   0, 64, 58],  // jersey
    handwear: [132,  0, 38, 58],  // gloves
    weapon:   [170,  0, 55, 58],  // stick + puck
  },
  Boxing: {
    headwear: [16,   0, 45, 35],  // headgear
    chest:    [73,   0, 44, 49],  // tank top
    weapon:   [130,  0, 70, 41],  // L + R gloves
  },
  Track: {
    chest:    [24,   0, 43, 38],  // singlet
    footwear: [17,  63, 60, 34],  // spike shoes
    weapon:   [171,  0, 33, 35],  // stopwatch
  },
  Golf: {
    chest:    [29,   0, 38, 32],  // polo shirt
    weapon:   [133,  0, 50, 33],  // golf club
  },
};

// Returns the Phaser frame name for a specific item icon (sport + slot + rarity)
export function gearFrameName(sport, slot, rarity) {
  if (!sport || !slot) return null;
  if (!GEAR_GRID.sportRow.hasOwnProperty(sport)) return null;
  if (!GEAR_GRID.rarityCol.hasOwnProperty(rarity)) return null;
  if (!ITEM_FRAMES[sport]?.[slot]) return null;
  return `gear_${sport}_${slot}_${rarity}`;
}

// basicgear.png (1536×1024) — absolute pixel coordinates per slot × rarity
// Rows: HEADBAND(0) | SHORTS(1) | PANTS(2) | GLOVE(3) | SHOES(4)
// Columns (left→right): common(white) | uncommon(green) | rare(blue) | epic(purple)
export const BASIC_FRAMES = {
  headwear: [
    { rarity:'common',   x:323,  y:76,  w:147, h:72  },
    { rarity:'uncommon', x:585,  y:76,  w:148, h:72  },
    { rarity:'rare',     x:858,  y:76,  w:148, h:72  },
    { rarity:'epic',     x:1127, y:76,  w:151, h:72  },
  ],
  handwear: [
    { rarity:'common',   x:338,  y:632, w:126, h:137 },
    { rarity:'uncommon', x:602,  y:632, w:126, h:137 },
    { rarity:'rare',     x:876,  y:632, w:125, h:137 },
    { rarity:'epic',     x:1146, y:632, w:127, h:137 },
  ],
  footwear: [
    { rarity:'common',   x:302,  y:821, w:206, h:111 },
    { rarity:'uncommon', x:568,  y:821, w:205, h:111 },
    { rarity:'rare',     x:839,  y:821, w:204, h:111 },
    { rarity:'epic',     x:1113, y:821, w:205, h:111 },
  ],
  // chest (vest) — to be added when basicgear.png is updated
};

export function basicFrameName(slot, rarity) {
  const entries = BASIC_FRAMES[slot];
  if (!entries) return null;
  const entry = entries.find(e => e.rarity === rarity);
  return entry ? `basic_${slot}_${rarity}` : null;
}

// Guaranteed material drops per mission clear
export const MISSION_MATERIALS = {
  M1F: ['heal_herb'],
  M3:  ['iron_ore', 'leather_strip'],
  M4:  ['cave_crystal', 'shadow_ore'],
};

// Per-kill drops keyed by enemy name
export const ENEMY_KILL_DROPS = {
  Wolf: 'wolf_pelt',
  Boar: 'boar_hide',
};

export function getKillDrops(killsByType) {
  const drops = [];
  for (const [name, count] of Object.entries(killsByType)) {
    const id = ENEMY_KILL_DROPS[name];
    if (!id) continue;
    const item = getItem(id);
    if (item) {
      for (let i = 0; i < count; i++) drops.push({ ...item });
    }
  }
  return drops;
}

// Random equipment drop pool per mission
export const MISSION_LOOT = {
  M1F: ['soccer_ball', 'soccer_cleats', 'basic_headband', 'iron_boots', 'basic_gloves'],
  M2:  ['soccer_jersey', 'football_jersey', 'baseball_bat', 'basic_headband', 'iron_boots', 'basic_gloves'],
  M3:  ['soccer_cleats_pro', 'chain_vest', 'basic_gloves', 'leather_vest', 'iron_boots', 'volleyball_jersey'],
  M4:  ['swift_helm', 'chain_vest', 'power_wraps', 'soccer_cleats_pro', 'track_shoes', 'boxing_gloves_pro'],
};

export function getItem(id) { return ITEMS.find(i => i.id === id) ?? null; }

export function getMissionMaterials(missionId) {
  return (MISSION_MATERIALS[missionId] ?? []).map(id => getItem(id)).filter(Boolean);
}

export function randomLoot(missionId) {
  const pool = MISSION_LOOT[missionId];
  if (!pool?.length) return null;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const item = getItem(id);
  return item ? { ...item } : null;
}
