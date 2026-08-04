// Central registry of photo backdrops for StoryScene cutscenes and HubScene
// hubs, keyed by area — so any cutscene/hub for a given kind of location
// automatically gets the matching art without redefining the {key,path}
// pair at every call site.
const ALTROES = 'world/Altroesartscene/';
// Gale/Lametus art (July 2026) — each region only shipped a subset of shots
// (no cave art for Lametus, no elemental-boss art for either yet), so only
// the missions with a clean matching shot get pulled off the generic
// Altroes cave/wilds fallback; the rest keep reusing it (see WorldMapScene's
// NEW_AREA_INTRO — same "no dedicated art yet" reuse pattern this whole
// table already used before this pass).
const GALE = 'world/Galeartscence/';
const LAMETUS = 'world/lametusartscene/';

export const BACKDROPS = {
  village:         { key: 'bd-village',       path: ALTROES + 'village.webp' },
  villageRevisit:  { key: 'bd-renorevist',    path: ALTROES + 'renorevist.webp' },
  school:          { key: 'bd-castle1',       path: ALTROES + 'castle1.webp' },
  // Same key ShopScene already loads castle2.png under for the Capital's
  // shop panel — reusing it here means HubScene and ShopScene share one
  // cached texture instead of loading the art twice.
  capital:         { key: 'bd-castle2',       path: ALTROES + 'castle2.webp' },
  cave:            { key: 'bd-cave1',         path: ALTROES + 'cave1.webp' },
  wilds:           { key: 'bd-wilds',         path: ALTROES + 'wilds.webp' },
  // 2026-07-18 audit ("use these in the Altroes region") — grandarena.png
  // and volcano.png existed on disk but had no caller. altroesArena
  // replaces M4/AT1/AT2's previous BACKDROPS.school/wilds reuse (an
  // actual arena shot fits "Arena Atlros" and the Trials far better than
  // a generic castle or open wilds); altroesVolcano is new — Ester's
  // "Dragon's Roost" quest (A1a) never had an intro cutscene at all.
  altroesArena:    { key: 'bd-altroesarena',  path: ALTROES + 'grandarena.webp' },
  altroesVolcano:  { key: 'bd-altroesvolcano',path: ALTROES + 'volcano.webp' },

  galeCaveA:       { key: 'bd-snowcave1',     path: GALE + 'snowcave.webp' },
  galeCaveB:       { key: 'bd-snowcave2',     path: GALE + 'snowcave2.webp' },
  galeWilds:       { key: 'bd-snowwilds',     path: GALE + 'opensnowwilds.webp' },
  // 2026-07-18 audit ("these for Gale region") — castle.png/Snowarena.png/
  // snowbuilds.png existed on disk with no caller. galeCastle fixes the
  // exact gap Lametus Capital already got fixed for (M5's hub was falling
  // back to the generic vector illustration); galeTown does the same for
  // Zester; galeArena replaces GT's previous cross-region reuse of
  // Altroes' castle1.png with Gale's own snow-tournament shot. Gale's OWN
  // grandarena.png and snowarena2.png are near-duplicates of galeArena —
  // left unregistered on purpose (same "don't register 3 near-identical
  // arenas" call as Lametus's leftover town/well/shop shots below).
  galeCastle:      { key: 'bd-galecastle',    path: GALE + 'castle.webp' },
  galeTown:        { key: 'bd-galetown',      path: GALE + 'snowbuilds.webp' },
  galeArena:       { key: 'bd-galearena',     path: GALE + 'Snowarena.webp' },

  lametusWilds:    { key: 'bd-lametuswilds',  path: LAMETUS + 'wilds.webp' },
  // The Corrupted One arc (2026-07-17) — grandarena.png for the "villain
  // steals the tournament" reveal (M7), waterwilds.png for the post-defeat
  // rescue beat (M7a), trainingfield.png for the Noble Deity's 7 trials.
  // town/townwell/townshop/schooltrainning.png also exist on disk but have
  // no current caller — left unregistered until something actually needs
  // a Lametus town/hub shot.
  lametusArena:        { key: 'bd-lametusarena',   path: LAMETUS + 'grandarena.webp' },
  lametusWaterWilds:   { key: 'bd-lametuswater',    path: LAMETUS + 'waterwilds.webp' },
  lametusTrainingField:{ key: 'bd-lametustrain',    path: LAMETUS + 'trainingfield.webp' },
  // Lametus Capital's HubScene backdrop (2026-07-17) — town.png, same
  // TOWN_BACKDROP treatment HubScene.js already gives Hidden Village,
  // instead of falling back to the generic vector illustration Gale (M5)
  // uses (Gale never got dedicated town art; Lametus did, so no reason
  // not to use it). townwell/townshop/schooltrainning.png still unused.
  lametusTown:         { key: 'bd-lametustown',    path: LAMETUS + 'town.webp' },
};
