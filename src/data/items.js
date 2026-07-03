// Item database — slots: weapon | footwear | handwear | chest | headwear
// `sport` drives icon lookup via gearFrameName (see ITEM_SPORT_TO_CLASS /
// GEAR_CLASS_COL / GEAR_SLOT_ROW below) — rarity is shown separately via
// rarityColor(), not baked into the icon art.

import { TALENT_STAT_KEY } from './gameState.js';

export const ITEMS = [

  // ── Materials ─────────────────────────────────────────────────────────────
  { id:'heal_herb',    name:'Heal Herb',    type:'material', slot:null, rarity:'common',   cost:15,  stats:{}, desc:'A medicinal herb found in forest clearings.' },
  { id:'iron_scrap',   name:'Iron Scrap',   type:'material', slot:null, rarity:'common',   cost:20,  stats:{}, desc:'Salvaged metal, useful for forging.' },
  { id:'crystal_shard',name:'Crystal Shard',type:'material', slot:null, rarity:'uncommon', cost:60,  stats:{}, desc:'A shard of elemental crystal.' },
  { id:'leather_strip',name:'Leather Strip',type:'material', slot:null, rarity:'common',   cost:25,  stats:{}, desc:'Cured hide strips. Flexible and durable.' },
  { id:'wood_plank',   name:'Wood Plank',   type:'material', slot:null, rarity:'common',   cost:18,  stats:{}, desc:'Treated wood boards salvaged from the borderlands.' },
  // M4 upgrade materials (feed the existing Forge reinforcement mechanic —
  // kept as-is, see FORGE_RECIPES below for the separate new crafting system)
  { id:'cave_crystal', name:'Cave Crystal', type:'material', slot:null, rarity:'uncommon', cost:75,  stats:{}, desc:'A luminous crystal formed deep in the caves. Enhances gear.' },
  { id:'shadow_ore',   name:'Shadow Ore',   type:'material', slot:null, rarity:'uncommon', cost:80,  stats:{}, desc:'Dark alloy found only in hollow cave veins. Ideal for upgrades.' },

  // ── Monster drops (Gear & Forge, July 2026) ─────────────────────────────
  // Generalized, replacing the old per-monster wolf_pelt/boar_hide (every
  // monster now drops from this same generic pool — see getKillDrops).
  { id:'skin', name:'Skin', type:'material', slot:null, rarity:'common', cost:25, stats:{}, desc:'Cured monster skin. A Forge crafting material.' },
  { id:'fur',  name:'Fur',  type:'material', slot:null, rarity:'common', cost:25, stats:{}, desc:'Coarse monster fur. A Forge crafting material.' },
  { id:'bone', name:'Bone', type:'material', slot:null, rarity:'common', cost:25, stats:{}, desc:'A sturdy monster bone. A Forge crafting material.' },

  // ── Cave ore (Gear & Forge, July 2026) — Forge crafting materials, tiered
  // T1-T4. oreTier drives the rarity of whatever gear a recipe crafts with
  // it (see ORE_TIER_TO_RARITY / FORGE_RECIPES below).
  { id:'iron_ore',   name:'Iron Ore',   type:'material', slot:null, rarity:'uncommon',  oreTier:1, cost:30,  stats:{}, desc:'Raw iron pulled from cave veins. Crafts Uncommon gear.' },
  { id:'silver_ore', name:'Silver Ore', type:'material', slot:null, rarity:'rare',      oreTier:2, cost:90,  stats:{}, desc:'A vein of silver ore. Crafts Rare gear.' },
  { id:'gold_ore',   name:'Gold Ore',   type:'material', slot:null, rarity:'epic',      oreTier:3, cost:250, stats:{}, desc:'A rich seam of gold ore. Crafts Epic gear.' },
  { id:'mystic_ore', name:'Mystic Ore', type:'material', slot:null, rarity:'legendary', oreTier:4, cost:700, stats:{}, desc:'Ore humming with unexplained energy. Crafts Legendary gear.' },

  // ── Herbs & Tonics (July 2026 art) ───────────────────────────────────────
  // Sellable flavor materials, same as heal_herb — no consume/use mechanic
  // exists yet for ANY item in this game (heal_herb itself is inert despite
  // the name), so these are wired the same way: icon + sell value only.
  { id:'mint_sprig',     name:'Mint Sprig',     type:'material', slot:null, rarity:'common',   cost:15, stats:{}, desc:'A hardy green sprig with a sharp, clean scent.' },
  { id:'lavender_bloom', name:'Lavender Bloom', type:'material', slot:null, rarity:'common',   cost:20, stats:{}, desc:'A flowering herb prized for its calming scent.' },
  { id:'wild_berries',   name:'Wild Berries',   type:'material', slot:null, rarity:'common',   cost:20, stats:{}, desc:'Sweet berries picked from a hardy bramble.' },
  { id:'health_potion',  name:'Health Potion',  type:'material', slot:null, rarity:'uncommon', cost:45, stats:{}, desc:'A brewed red tonic, warm to the touch.' },
  { id:'focus_potion',   name:'Focus Potion',   type:'material', slot:null, rarity:'uncommon', cost:45, stats:{}, desc:'A brewed blue tonic said to sharpen the mind.' },
  { id:'vitality_potion',name:'Vitality Potion',type:'material', slot:null, rarity:'uncommon', cost:45, stats:{}, desc:'A brewed green tonic with a faint herbal shimmer.' },

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
  // "God tier" (Gear & Forge, July 2026) — above legendary, presumably
  // unique/quest-tier per the sheet. Not part of the normal drop/craft
  // rarity ladder below it (see rollGodTierClassItem).
  god:       0xff3366,
};

export function rarityColor(rarity) { return RARITY_COLORS[rarity] ?? 0xffffff; }

// Ladder order for the normal roll system (god tier is a separate fixed
// template, not part of this progression — see rollGodTierClassItem).
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Cave-ore tier → the rarity a Forge recipe crafts when that ore is used
// (Gear & Forge: "Ore tier drives result rarity — e.g. Bone(T3) + Gold =
// Epic Chest").
export const ORE_TIER_TO_RARITY = { 1: 'uncommon', 2: 'rare', 3: 'epic', 4: 'legendary' };

// Inventory stack cap for materials (Gear & Forge: "Stack cap: 25 per item").
// NOTE: not yet enforced anywhere — the current inventory model stores N
// separate copies of a material as N separate array entries (see
// getKillDrops below), not a single counted stack. Enforcing this cap needs
// an inventory-model change (grouping by id with a count), which is UI/
// engine wiring, not data — deferred to a follow-up pass.
export const MATERIAL_STACK_CAP = 25;

// gears/gearitems.png grid layout (1536×1024, 7 cols × 5 rows) — replaces the
// old gearset10.png/basicgear.png sport×rarity scheme (July 2026 art redo).
// This sheet has ONE icon per {class grouping, slot} — no per-rarity art —
// so rarity is conveyed separately via rarityColor() (border/text tint),
// not baked into the icon.
//
// Columns are the same 7 "class" groupings already used for sports-partner
// adjacency (see SPORTS[*].class in gameState.js): Bat & Ball, Racquet,
// Target, Athletics, Martial Arts, Ball, Performance.
// Rows are slots: weapon(class item), headwear, footwear, chest, handwear.
export const GEAR_SHEET = {
  cols: 7, rows: 5,
  cellW: 1536 / 7,
  cellH: 1024 / 5,
};
export const GEAR_CLASS_COL = {
  'Bat & Ball': 0, 'Racquet': 1, 'Target': 2, 'Athletics': 3,
  'Martial Arts': 4, 'Ball': 5, 'Performance': 6,
};
export const GEAR_SLOT_ROW = { weapon: 0, headwear: 1, footwear: 2, chest: 3, handwear: 4 };

// items.js's existing `sport` field predates the class-grouping system and
// uses its own display strings (Basketball, Soccer, ...) — map each to the
// class grouping whose column art fits it, so ~80 existing items don't need
// per-item rewrites. Universal (no-sport) items have no matching column and
// get no icon, same as before this rework.
export const ITEM_SPORT_TO_CLASS = {
  Basketball: 'Ball', Soccer: 'Ball', Football: 'Ball', Volleyball: 'Ball', Hockey: 'Ball',
  Baseball: 'Bat & Ball',
  Tennis: 'Racquet', Golf: 'Racquet',
  Boxing: 'Martial Arts',
  Track: 'Athletics',
};

// Returns the Phaser frame name for a specific item icon (sport + slot)
export function gearFrameName(sport, slot) {
  const cls = ITEM_SPORT_TO_CLASS[sport];
  if (!cls || !GEAR_SLOT_ROW.hasOwnProperty(slot)) return null;
  return `gear_${cls}_${slot}`;
}

// items/rawmaterials.png (1536×1024) — re-exported 2026-07-03 as an irregular
// layout (not a uniform grid: row 1 has 4 icons, row 2 has 4, row 3 has 5),
// so each material is an explicit [x, y, w, h] crop measured off the sheet's
// own content bounds (a few px padding each side), same convention as the
// old gearset10.png ITEM_FRAMES.
export const MATERIAL_ICON_FRAME = {
  skin:       [144, 60,  274, 267],
  fur:        [441, 60,  288, 267],
  bone:       [797, 60,  283, 267],
  iron_ore:   [1118, 60, 268, 267],
  silver_ore: [132, 359, 276, 284],
  gold_ore:   [450, 359, 290, 284],
  mystic_ore: [782, 359, 303, 284],
  mint_sprig:     [1132, 359, 254, 284],
  lavender_bloom: [137, 655, 217, 298],
  wild_berries:   [397, 655, 236, 298],
  health_potion:  [694, 655, 199, 298],
  focus_potion:   [940, 655, 199, 298],
  vitality_potion:[1191, 655, 201, 298],
};

export function materialFrameName(id) {
  return MATERIAL_ICON_FRAME[id] ? `material_${id}` : null;
}

// Guaranteed material drops per mission clear
export const MISSION_MATERIALS = {
  M1F: ['heal_herb'],
  M3:  ['iron_ore', 'leather_strip'],
  M4:  ['cave_crystal', 'shadow_ore'],
};

// Generic monster-drop pool (Gear & Forge, July 2026 — replaces the old
// per-monster wolf_pelt/boar_hide mapping). ASSUMPTION: the sheet lists
// "Skin/Fur/Bone" as one flat "Monster drops" category with no per-monster
// breakdown, so every kill picks uniformly at random from this pool rather
// than a fixed drop per enemy name.
export const MONSTER_DROP_MATERIALS = ['skin', 'fur', 'bone'];

export function getKillDrops(killsByType) {
  const drops = [];
  for (const [name, count] of Object.entries(killsByType)) {
    for (let i = 0; i < count; i++) {
      const id = MONSTER_DROP_MATERIALS[Math.floor(Math.random() * MONSTER_DROP_MATERIALS.length)];
      const item = getItem(id);
      if (item) drops.push({ ...item });
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

// ── Forge crafting recipes (Gear & Forge, July 2026) ────────────────────────
// A separate system from ForgeScene's existing reinforcement mechanic (kept
// as-is, per decision — reinforcement upgrades an equipped item's stats,
// this crafts a NEW item from materials). Material kind names here are
// abstract; 'ore' resolves to whichever specific ore item (iron/silver/
// gold/mystic) the player supplies — its oreTier drives the result's
// rarity via ORE_TIER_TO_RARITY (e.g. Bone + Gold Ore(T3) → Epic Chest).
// Craft costs: TBD per the sheet's own open item — not modeled yet.
export const FORGE_RECIPES = [
  { id: 'craft_class_item', resultSlots: ['weapon'],                materials: ['bone', 'skin', 'ore'], desc: 'Bone + Skin + Ore → Class Item' },
  { id: 'craft_chest',      resultSlots: ['chest'],                  materials: ['bone', 'ore'],         desc: 'Bone + Ore → Chest' },
  { id: 'craft_hand_head',  resultSlots: ['handwear', 'headwear'],   materials: ['skin', 'ore'],         desc: 'Skin + Ore → Hand & Head (pick one)' },
  { id: 'craft_foot',       resultSlots: ['footwear'],               materials: ['fur', 'bone'],         desc: 'Fur + Bone → Foot' },
];

// ── Gear stat rolls (Gear & Forge, July 2026) ───────────────────────────────
// Replaces fixed-stat items with a roll system: a main stat (fixed per slot)
// plus stat LINES that vary by rarity. Talent lines roll toward the unit's
// own 2 talents (via TALENT_STAT_KEY); R = a random line from the full stat
// pool. RESOLVED per the sheet: lines are rolled once at DROP time and
// fixed on the item from then on — this module only generates the item
// once; nothing re-rolls it later.
//
// Numeric ranges: flat lines roll 1-20, multiplier lines roll 1%-10% — the
// sheet says these are "based on rarity" without an exact formula.
// ASSUMPTION: each rarity gets an even 1/5th band of the full range, common
// lowest through legendary highest (e.g. flat: common 1-4 ... legendary
// 17-20; multiplier: common 1-2% ... legendary 9-10%).
const RARITY_TIER_INDEX = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
function rollFlatStat(rarity) {
  const tier = RARITY_TIER_INDEX[rarity] ?? 0;
  const band = 20 / RARITY_ORDER.length;
  const min = Math.round(1 + tier * band);
  const max = Math.round(min + band - 1);
  return min + Math.floor(Math.random() * (max - min + 1));
}
function rollMultiplierStat(rarity) {
  const tier = RARITY_TIER_INDEX[rarity] ?? 0;
  const band = 10 / RARITY_ORDER.length;
  const min = 1 + tier * band;
  const max = min + band - 1;
  const pct = min + Math.floor(Math.random() * (max - min + 1));
  return pct / 100;
}

// Stat pool for Random (R) lines: "everything that already exists (core
// stats, HP, SP) plus damage/affinity/designation multiplier."
const FLAT_STAT_POOL = ['speed', 'strength', 'stamina', 'endurance', 'hp', 'sp'];
const MULTIPLIER_STAT_POOL = ['damage', 'affinity', 'designation'];

function rollRandomLine(rarity) {
  const pool = [...FLAT_STAT_POOL, ...MULTIPLIER_STAT_POOL];
  const stat = pool[Math.floor(Math.random() * pool.length)];
  if (MULTIPLIER_STAT_POOL.includes(stat)) return { kind: 'multiplier', stat, value: rollMultiplierStat(rarity) };
  return { kind: 'flat', stat, value: rollFlatStat(rarity) };
}
function rollTalentLine(talent, rarity) {
  const stat = TALENT_STAT_KEY[talent];
  if (!stat) return rollRandomLine(rarity); // no talent picked for this slot — fall back to a random line
  return { kind: 'flat', stat, value: rollFlatStat(rarity) };
}
function applyLine(item, line, mult = 1) {
  if (line.kind === 'flat') item.stats[line.stat] = (item.stats[line.stat] ?? 0) + Math.round(line.value * mult);
  else item.multipliers[line.stat] = (item.multipliers[line.stat] ?? 0) + line.value * mult;
}

// Main stat per slot (see the sheet's "Gear Stat Layout" table). Head
// ("HP or SP") and Chest ("End/Stm") are each an either/or on the sheet —
// ASSUMPTION: each individual rolled item picks one of the two at random,
// not both. Class Item's main is "ALL stats" — read as a flat bonus applied
// equally to all 4 core stats at once.
function rollMainLine(slot, rarity) {
  if (slot === 'weapon')   return { kind: 'flat-all', value: rollFlatStat(rarity) };
  if (slot === 'headwear') return { kind: 'flat', stat: Math.random() < 0.5 ? 'hp' : 'sp', value: rollFlatStat(rarity) };
  if (slot === 'footwear') return { kind: 'flat', stat: 'speed', value: rollFlatStat(rarity) };
  if (slot === 'chest')    return { kind: 'flat', stat: Math.random() < 0.5 ? 'endurance' : 'stamina', value: rollFlatStat(rarity) };
  if (slot === 'handwear') return { kind: 'multiplier', stat: 'damage', value: rollMultiplierStat(rarity) };
  return { kind: 'flat', stat: 'speed', value: rollFlatStat(rarity) };
}

function defaultGearName(slot, rarity) {
  const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  const slotLabel = { weapon: 'Class Item', headwear: 'Headwear', footwear: 'Footwear', chest: 'Chest Gear', handwear: 'Handwear' }[slot] ?? slot;
  return `${rarityLabel} ${slotLabel}`;
}

// Rolls a full gear item for `slot` at `rarity`, for a unit with the given
// `talents` (its 2 picked talents) and `classItemMultiplier` (1/2/3 — see
// CLASS_GEAR_LAYOUT in gameState.js; only applied when slot === 'weapon').
export function rollGearItem({ slot, rarity, talents = [], classItemMultiplier = 1, name, desc, cost = 0 }) {
  const item = {
    id: `${slot}_${rarity}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    name: name ?? defaultGearName(slot, rarity), slot, rarity, type: 'equipment', cost,
    stats: {}, multipliers: {}, desc: desc ?? '',
  };
  const mult = slot === 'weapon' ? classItemMultiplier : 1;

  const main = rollMainLine(slot, rarity);
  if (main.kind === 'flat-all') {
    for (const stat of ['speed', 'strength', 'stamina', 'endurance']) applyLine(item, { kind: 'flat', stat, value: main.value }, mult);
  } else {
    applyLine(item, main, mult);
  }

  if (slot === 'weapon') {
    // Class Item: Talent1, then progressively more Random lines gated by
    // rarity tier — ASSUMPTION, reading "Talent 1 · Random(rare) ·
    // Random(epic) · Random(legendary)" as a rarity-gated line COUNT (2
    // lines at uncommon, 3 at rare, 4 at epic, 5 at legendary), not 4 fixed
    // lines always present regardless of rarity.
    applyLine(item, rollTalentLine(talents[0], rarity), mult);
    const extraLines = Math.max(0, (RARITY_TIER_INDEX[rarity] ?? 0) - 1); // rare=1, epic=2, legendary=3
    for (let i = 0; i < extraLines; i++) applyLine(item, rollRandomLine(rarity), mult);
  } else {
    // Head/Foot/Chest/Hand: Talent1 · Talent2 · R · R · R — always all 5.
    applyLine(item, rollTalentLine(talents[0], rarity));
    applyLine(item, rollTalentLine(talents[1], rarity));
    applyLine(item, rollRandomLine(rarity));
    applyLine(item, rollRandomLine(rarity));
    applyLine(item, rollRandomLine(rarity));
  }
  return item;
}

// God Tier Class Item (above Legendary) — a FIXED template per the sheet,
// not part of the normal rarity roll ladder. Main stats are flat 40+40 on
// the unit's own 2 talents (not rolled), plus 5 flat +20% multipliers.
// "Power" is read as Strength (same convention used for Flex's "Power +10"
// in the Ability Revised talent tree). `power`/`hp` percentage multipliers
// are new fields unique to this item — equipMultipliers() in gameState.js
// only aggregates damage/affinity/designation today, not these two; that's
// a follow-up if God Tier items get wired into a live drop/craft flow.
// Drop source and one-per-unit status are open items on the sheet (TBD).
export function rollGodTierClassItem(unit) {
  const talents = unit.talents ?? [];
  const item = {
    id: `god_class_item_${unit.id}_${Date.now()}`, name: 'God Tier Class Item',
    slot: 'weapon', rarity: 'god', type: 'equipment', cost: 0,
    stats: {}, multipliers: {},
    desc: 'An artifact-grade Class Item, beyond Legendary.',
  };
  const stat1 = TALENT_STAT_KEY[talents[0]];
  const stat2 = TALENT_STAT_KEY[talents[1]];
  if (stat1) item.stats[stat1] = (item.stats[stat1] ?? 0) + 40;
  if (stat2) item.stats[stat2] = (item.stats[stat2] ?? 0) + 40;
  item.multipliers.damage      = 0.20;
  item.multipliers.power       = 0.20;
  item.multipliers.hp          = 0.20;
  item.multipliers.affinity    = 0.20;
  item.multipliers.designation = 0.20;
  return item;
}
