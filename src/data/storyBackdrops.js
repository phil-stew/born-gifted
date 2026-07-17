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
  village:         { key: 'bd-village',       path: ALTROES + 'village.png' },
  villageRevisit:  { key: 'bd-renorevist',    path: ALTROES + 'renorevist.png' },
  school:          { key: 'bd-castle1',       path: ALTROES + 'castle1.png' },
  // Same key ShopScene already loads castle2.png under for the Capital's
  // shop panel — reusing it here means HubScene and ShopScene share one
  // cached texture instead of loading the art twice.
  capital:         { key: 'bd-castle2',       path: ALTROES + 'castle2.png' },
  cave:            { key: 'bd-cave1',         path: ALTROES + 'cave1.png' },
  wilds:           { key: 'bd-wilds',         path: ALTROES + 'wilds.png' },

  galeCaveA:       { key: 'bd-snowcave1',     path: GALE + 'snowcave.png' },
  galeCaveB:       { key: 'bd-snowcave2',     path: GALE + 'snowcave2.png' },
  galeWilds:       { key: 'bd-snowwilds',     path: GALE + 'opensnowwilds.png' },

  lametusWilds:    { key: 'bd-lametuswilds',  path: LAMETUS + 'wilds.png' },
  // The Corrupted One arc (2026-07-17) — grandarena.png for the "villain
  // steals the tournament" reveal (M7), waterwilds.png for the post-defeat
  // rescue beat (M7a), trainingfield.png for the Noble Deity's 7 trials.
  // town/townwell/townshop/schooltrainning.png also exist on disk but have
  // no current caller — left unregistered until something actually needs
  // a Lametus town/hub shot.
  lametusArena:        { key: 'bd-lametusarena',   path: LAMETUS + 'grandarena.png' },
  lametusWaterWilds:   { key: 'bd-lametuswater',    path: LAMETUS + 'waterwilds.png' },
  lametusTrainingField:{ key: 'bd-lametustrain',    path: LAMETUS + 'trainingfield.png' },
};
