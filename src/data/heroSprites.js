// Hero sprite registry — maps class name → spritesheet metadata
// Standard sprites: 1536×1024, 6 columns
// frameHeight = floor(1024 / rowCount) — rows fit cleanly within image height

export const HERO_SPRITES = {
  // ── T1 ────────────────────────────────────────────────────────────────────
  // New art as of 2026-07-02 — grids measured by eye per file, not uniform.
  'Runner':             { file:'heroes/t1/runnerboy.webp',         cols:6, rows:6, fw:249, fh:175 },
  'Ice Skater':         { file:'heroes/t1/iceskatergirl.webp',      cols:6, rows:6, fw:249, fh:175 },
  'Boxer':              { file:'heroes/t1/boxerlightweight.webp',  cols:6, rows:6, fw:249, fh:175 },
  'Boxer Heavyweight':  { file:'heroes/t1/boxerheavyweight.webp',  cols:6, rows:6, fw:249, fh:175 },
  'Dart Player':        { file:'heroes/t1/Dartarrowchucker.webp',  cols:6, rows:6, fw:249, fh:175 },
  // Re-supplied 2026-07-08 — a full replacement sheet, 7 cols x 6 rows
  // (1416x1111, ~202x185/cell; the old 8-col Dancerdance.png this was tuned
  // against — overflowing run poses, runEnd:4, noMoveAnim — no longer
  // exists on disk). Re-measured and re-verified fresh: grid-overlay test at
  // cols:7 lines up cleanly on every row, and the run row's poses are all
  // fully contained in their cell with no overflow, so none of the old
  // workarounds apply here. skip:0 — column 0 is a real pose every row
  // (confirmed by eye), not a blank label column.
  'Dancer':             { file:'heroes/t1/Dancerdance.webp',       cols:7, rows:6, fw:202, fh:185, skip:0 },
  'Netballer':          { file:'heroes/t1/netGoalattack.webp',     cols:6, rows:6, fw:249, fh:175 },
  'Netballer Defence':  { file:'heroes/t1/netGaoldefence.webp',    cols:6, rows:6, fw:249, fh:175 },
  'Lacrosse Player':    { file:'heroes/t1/lacrosseAceattacker.webp', cols:6, rows:6, fw:249, fh:175 },
  'Lacrosse Goalkeeper':{ file:'heroes/t1/LacrosseGoalkeeper.webp', cols:6, rows:6, fw:249, fh:175 },
  'Softball Batter':    { file:'heroes/t1/softbatter.webp',        cols:6, rows:6, fw:249, fh:175 },
  'Softball Pitcher':   { file:'heroes/t1/softpitcher.webp',       cols:6, rows:6, fw:249, fh:175 },

  // ── T2 ────────────────────────────────────────────────────────────────────
  // New art as of 2026-07-03 — same 6x6-grid pipeline as T1, grids measured
  // per file (canvas dims aren't perfectly uniform, ~1491-1496 x 1050-1055).
  'Striker':          { file:'heroes/t2/footballsoccerstrikerboy.webp', cols:6, rows:6, fw:249, fh:175 },
  'Soccer Goalkeeper':{ file:'heroes/t2/footballsoccergaolkeepboy.webp',cols:6, rows:6, fw:249, fh:175 },
  'Long Jumper':      { file:'heroes/t2/AltheticsJumper.webp',   cols:6, rows:6, fw:248, fh:175 },
  'High Jumper':      { file:'heroes/t2/athlticJumperhigh.webp', cols:6, rows:6, fw:249, fh:175 },
  'Speed Skater':     { file:'heroes/t2/skaterspeed.webp',       cols:6, rows:6, fw:248, fh:175 },
  'Black Belt':       { file:'heroes/t2/karatewado.webp',        cols:6, rows:6, fw:249, fh:175, bgErase: [{ x:114, y:458, w:62, h:63 }, { x:279, y:458, w:67, h:63 }, { x:263, y:461, w:61, h:44 }, { x:322, y:381, w:48, h:25 }, { x:502, y:456, w:111, h:68 }, { x:503, y:471, w:35, h:26 }, { x:500, y:456, w:23, h:31 }, { x:821, y:374, w:119, h:147 }, { x:970, y:420, w:25, h:42 }, { x:971, y:464, w:24, h:48 }, { x:1207, y:420, w:37, h:91 }, { x:1038, y:383, w:47, h:23 }, { x:1228, y:389, w:16, h:32 }, { x:1301, y:460, w:68, h:61 }, { x:1290, y:384, w:47, h:28 }, { x:500, y:354, w:225, h:100, onlyColor:[0,0,0] }, { x:620, y:435, w:100, h:90, onlyColor:[0,0,0] }, { x:540, y:480, w:75, h:45, onlyColor:[0,0,0] }, { x:598, y:440, w:70, h:35, onlyColor:[0,0,0] }, { x:478, y:350, w:24, h:180 }, { x:938, y:350, w:24, h:180 }, { x:748, y:182, w:210, h:170, onlyColor:[0,0,0] }, { x:997, y:182, w:250, h:170, onlyColor:[0,0,0] }] },
  'Kyokushin':        { file:'heroes/t2/karatekyokushin.webp',   cols:6, rows:6, fw:249, fh:175, bgErase: [{ x:45, y:366, w:90, h:84 }, { x:284, y:365, w:88, h:84 }, { x:521, y:381, w:86, h:68 }, { x:529, y:365, w:45, h:27 }, { x:749, y:381, w:73, h:69 }, { x:974, y:394, w:21, h:56 }, { x:749, y:365, w:40, h:27 }, { x:1201, y:451, w:43, h:50 }, { x:1411, y:425, w:73, h:86 }, { x:914, y:378, w:41, h:52, onlyColor:[0,0,0] }, { x:993, y:354, w:201, h:82, onlyColor:[0,0,0] }, { x:993, y:444, w:35, h:74, onlyColor:[0,0,0] }, { x:748, y:182, w:250, h:170, onlyColor:[0,0,0] }, { x:1180, y:182, w:70, h:170, onlyColor:[0,0,0] }, { x:1245, y:230, w:55, h:80, onlyColor:[0,0,0] }] },
  // bgTol: 8 — both paintball sheets use very dark tactical/camo colors
  // close to pure black; the default TOL=30 flood-fill leaks from the
  // background into that dark gear and eats holes in the character
  // (2026-07-07 feedback: "the sniper is not really visible" — confirmed via
  // canvas test, TOL=30 shreds both sheets, TOL=8 leaves them fully intact).
  // bgBand: 4 — the tighter tolerance above uncovered a second issue: the
  // default 3px divider-clearing band wasn't quite wide enough for these two
  // sheets, and TOL=30 used to paper over the last 1-2px via color match.
  // At TOL=8 that no longer happens, leaving a visible thin divider line
  // (2026-07-07 feedback: "now we have that dark vertical line"). band:4
  // fixes it without exceeding the corner-seed inset (see stripBackgroundByKey).
  'Paintballer':      { file:'heroes/t2/paintballsinper.webp',   cols:6, rows:6, fw:248, fh:175, bgTol:8, bgBand:4 },
  'Frontman':         { file:'heroes/t2/paintballfrontman.webp', cols:6, rows:6, fw:248, fh:175, bgTol:8, bgBand:4 },
  'Gymnast':          { file:'heroes/t2/Gymnatsic.webp',         cols:6, rows:6, fw:248, fh:175 },
  'Spiker':           { file:'heroes/t2/volleyballspiker.webp',  cols:6, rows:6, fw:248, fh:175 },
  'Setter':           { file:'heroes/t2/volleyballsetter.webp',  cols:6, rows:6, fw:248, fh:175 },
  // 'Skate Boarder' dropped — no role ever mapped to it and the old art file is gone.
  'Cricket Player':   { file:'heroes/t2/cricketbatter.webp',     cols:6, rows:6, fw:249, fh:175 },
  'Cricket Pitcher':  { file:'heroes/t2/criketpitcher.webp',     cols:6, rows:6, fw:249, fh:175 },
  'Tennis Player':    { file:'heroes/t2/tennissigles.webp',      cols:6, rows:6, fw:248, fh:175 },
  'Tennis Doubles':   { file:'heroes/t2/tennisdoubles.webp',     cols:6, rows:6, fw:248, fh:175 },
  'Cheerleader':      { file:'heroes/t2/cheerleader.webp',       cols:6, rows:6, fw:248, fh:175 },

  // ── T3 ────────────────────────────────────────────────────────────────────
  'Rugger':             { file:'heroes/t3/rugbyaceforward.webp',    cols:6, rows:6, fw:248, fh:175 },
  'Rugby Defender':     { file:'heroes/t3/rugbyacedefender.webp',   cols:6, rows:6, fw:249, fh:175 },
  'Quarterback':        { file:'heroes/t3/amfootballqb.webp',       cols:6, rows:6, fw:249, fh:175 },
  'Am Football Defender':{ file:'heroes/t3/amfootballdefender.webp',cols:6, rows:6, fw:249, fh:175 },
  'Sprinter':           { file:'heroes/t3/sprinter starter.webp',   cols:6, rows:6, fw:249, fh:175 },
  'Sprinter Anchor':    { file:'heroes/t3/sprinterachor.webp',      cols:6, rows:6, fw:249, fh:175 },
  'Hockey Player':      { file:'heroes/t3/hockeyaceforward.webp',   cols:6, rows:6, fw:249, fh:175 },
  'Hockey Goalie':      { file:'heroes/t3/hockegoalie.webp',        cols:6, rows:6, fw:249, fh:175 },
  'MMA':                { file:'heroes/t3/mmaheavyweight.webp',     cols:6, rows:6, fw:249, fh:175 },
  'MMA Lightweight':    { file:'heroes/t3/mmalightweight.webp',     cols:6, rows:6, fw:249, fh:175 },
  'Kendo':              { file:'heroes/t3/masterkendo.webp',        cols:6, rows:6, fw:249, fh:175 },
  'Archer':             { file:'heroes/t3/archer.webp',             cols:6, rows:6, fw:249, fh:175, bgErase: [{ x:69, y:462, w:29, h:31 }, { x:295, y:474, w:25, h:19 }, { x:894, y:362, w:101, h:44 }, { x:1156, y:364, w:88, h:39 }, { x:1018, y:462, w:30, h:31 }, { x:1247, y:369, w:19, h:31 }, { x:1361, y:494, w:27, h:30 }, { x:115, y:352, w:90, h:38, onlyColor:[0,0,0] }, { x:344, y:352, w:88, h:38, onlyColor:[0,0,0] }, { x:806, y:352, w:85, h:34, onlyColor:[0,0,0] }, { x:1066, y:352, w:84, h:37, onlyColor:[0,0,0] }, { x:838, y:876, w:38, h:30, onlyColor:[0,0,0] }] },
  'Aerial Fitness':     { file:'heroes/t3/airfitness.webp',         cols:6, rows:6, fw:248, fh:175 },
  'Baller':             { file:'heroes/t3/basketballaceforward.webp',cols:6, rows:6, fw:249, fh:175, bgErase: [{ x:124, y:334, w:30, h:15 }, { x:330, y:317, w:49, h:32 }, { x:629, y:325, w:39, h:24 }, { x:553, y:329, w:80, h:20 }, { x:864, y:325, w:53, h:24 }, { x:780, y:325, w:41, h:24 }, { x:776, y:279, w:30, h:26 }, { x:1036, y:325, w:132, h:24 }, { x:1020, y:325, w:21, h:24 }, { x:1392, y:325, w:32, h:24 }, { x:1420, y:325, w:20, h:24 }, { x:1359, y:325, w:21, h:24 }, { x:1294, y:335, w:36, h:14 }] },
  // 'Parkour' dropped — no role ever mapped to it and the old art file is gone.
  'Baseball Player':    { file:'heroes/t3/baseballbatter.webp',     cols:6, rows:6, fw:256, fh:170 },
  'Baseball Pitcher':   { file:'heroes/t3/baseballpitcher.webp',    cols:6, rows:6, fw:248, fh:175 },
  'Golfer':             { file:'heroes/t3/gulfer.webp',             cols:6, rows:6, fw:249, fh:175, bgErase: [{ x:971, y:396, w:24, h:24 }, { x:1052, y:354, w:147, h:57 }, { x:998, y:373, w:35, h:120, onlyColor:[0,0,0] }, { x:95, y:60, w:90, h:120, onlyColor:[0,0,0] }, { x:338, y:110, w:30, h:70, onlyColor:[0,0,0] }, { x:570, y:65, w:65, h:115, onlyColor:[0,0,0] }, { x:808, y:70, w:65, h:110, onlyColor:[0,0,0] }, { x:1050, y:65, w:70, h:115, onlyColor:[0,0,0] }, { x:1285, y:60, w:70, h:120, onlyColor:[0,0,0] }, { x:818, y:875, w:70, h:22, onlyColor:[0,0,0] }, { x:1060, y:875, w:65, h:22, onlyColor:[0,0,0] }, { x:1297, y:875, w:70, h:22, onlyColor:[0,0,0] }] },
  'Figure Skater':      { file:'heroes/t3/figureskater.webp',       cols:6, rows:6, fw:247, fh:176, bgErase: [{ x:112, y:448, w:39, h:38 }, { x:135, y:485, w:31, h:29 }, { x:594, y:451, w:31, h:39 }, { x:603, y:483, w:37, h:31 }, { x:618, y:456, w:19, h:33 }, { x:836, y:444, w:57, h:34 }, { x:892, y:436, w:33, h:30 }, { x:1148, y:444, w:32, h:32 }, { x:1294, y:484, w:29, h:30 }, { x:1356, y:354, w:84, h:32, onlyColor:[0,0,0] }] },
};

// Role id → existing HERO_SPRITES key (unchanged old class-name strings —
// no art files renamed). Most single-role sports map 1:1 by name; two-role
// sports had exactly one sprite authored under the old system, so it's
// assigned to whichever role the old name most plausibly matches (or the
// first-listed role when the old name was generic) and the other role is
// left `null` — genuinely missing art, not a guessed reuse. Roles that were
// already spriteless under the old system (Goalkeeper/Linebacker/Center
// standalone classes, and Am Football generally) stay spriteless.
export const ROLE_SPRITE_KEY = {
  // T1
  runner: 'Runner', skater_ice: 'Ice Skater',
  lightweight_box: 'Boxer', heavyweight_box: 'Boxer Heavyweight',
  goal_attack: 'Netballer', goal_defence: 'Netballer Defence',
  ace_attacker_lax: 'Lacrosse Player', goalkeeper_lax: 'Lacrosse Goalkeeper',
  arrow_chucker: 'Dart Player',
  batter_softball: 'Softball Batter', pitcher_softball: 'Softball Pitcher',
  dancer: 'Dancer',
  // T2 — goalkeeper_soccer/high_jumper/kyokushin/setter/pitcher_cricket/
  // frontman/doubles filled in as of the 2026-07-03 art batch.
  striker: 'Striker', goalkeeper_soccer: 'Soccer Goalkeeper',
  long_jumper: 'Long Jumper', high_jumper: 'High Jumper',
  skater_speed: 'Speed Skater',
  wado_ryu: 'Black Belt', kyokushin: 'Kyokushin',
  spiker: 'Spiker', setter: 'Setter',
  batter_cricket: 'Cricket Player', pitcher_cricket: 'Cricket Pitcher',
  sniper: 'Paintballer', frontman: 'Frontman',
  singles: 'Tennis Player', doubles: 'Tennis Doubles',
  cheerleader: 'Cheerleader', gymnast: 'Gymnast',
  // T3 — ace_defender_rugby/qb/defender_amfb/anchor/goalkeeper_hockey/
  // lightweight_mma/master/pitcher_baseball filled in as of the same batch.
  ace_attacker_rugby: 'Rugger', ace_defender_rugby: 'Rugby Defender',
  qb: 'Quarterback', defender_amfb: 'Am Football Defender',
  starter: 'Sprinter', anchor: 'Sprinter Anchor',
  ace_forward: 'Hockey Player', goalkeeper_hockey: 'Hockey Goalie',
  heavyweight_mma: 'MMA', lightweight_mma: 'MMA Lightweight',
  master: 'Kendo',
  ace_attack_bball: 'Baller', ace_defence_bball: null, // still no basketball-defence art
  batter_baseball: 'Baseball Player', pitcher_baseball: 'Baseball Pitcher',
  archer: 'Archer', golfer: 'Golfer',
  figure_skater: 'Figure Skater', aerial: 'Aerial Fitness',
};

// Sprite key string for a role id (or null if no art exists yet).
export function spriteKeyForRole(roleId) {
  return ROLE_SPRITE_KEY[roleId] ?? null;
}

// Phaser texture key for a class name
export function heroKey(className) {
  return `hero-${className}`;
}

// Sprite metadata for a class, or null if unknown
export function getSpriteInfo(className) {
  return HERO_SPRITES[className] ?? null;
}

// Index of the first actual character frame (after the text label columns)
export function firstFrame(className) {
  return HERO_SPRITES[className]?.skip ?? 1;
}

// This whole art batch has a faint gray divider line baked in at every cell
// boundary (measured directly off the PNGs: ~5px wide horizontally, ~3px
// vertically, centered on the boundary) — subtle enough to have gone
// unnoticed on most sheets, but visible as a thin vertical line "on" the
// character once background-stripped (the line's gray doesn't match pure
// black closely enough for the flood fill to clear it — see
// stripBackgroundByKey above). Rather than hand-editing every fw/fh in
// HERO_SPRITES, shrink each frame's crop by TRIM px on every side and tell
// Phaser to skip that trimmed-off ring between frames (margin/spacing) —
// keeps HERO_SPRITES' fw/fh as "measured raw cell size" and fixes this at
// load time for every sheet at once.
const CELL_TRIM = 4;
export function trimmedSheetConfig(fw, fh) {
  return {
    frameWidth: fw - CELL_TRIM * 2,
    frameHeight: fh - CELL_TRIM * 2,
    margin: CELL_TRIM,
    spacing: CELL_TRIM * 2,
  };
}

// Load all sprites for the given class names into a Phaser scene's loader.
// Skips already-loaded textures. Call from preload().
export function loadHeroSprites(scene, classNames) {
  for (const name of classNames) {
    const info = HERO_SPRITES[name];
    if (!info) continue;
    const key = heroKey(name);
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, info.file, trimmedSheetConfig(info.fw, info.fh));
    }
  }
}

// Strip the background from a hero spritesheet using edge flood-fill.
// Seeds from corners + edge midpoints, expands through connected pixels that
// match each seed's colour within TOL. Only removes pixels reachable from the
// boundary — internal character pixels of the same colour are preserved.
// Safe to call multiple times (skips already-transparent textures).
export function stripHeroBackground(scene, className) {
  const info = HERO_SPRITES[className];
  if (!info) return;
  stripBackgroundByKey(scene, heroKey(className), { cols: info.cols, rows: info.rows, tol: info.bgTol, band: info.bgBand, erase: info.bgErase });
}

// Some sheets (a subset of the 2026-07-03 batch, e.g. amfootballdefender.png,
// rugbyacedefender.png) have a thin gray divider grid baked in — both between
// cells AND as a decorative frame around the sheet's own outer edge. That
// grid's color differs enough from true background-black that the flood
// fill below can't cross it, so each cell's interior background stays
// isolated from the sheet's outer seeds and never gets cleared — leaving a
// black box behind the sprite. Fix: pre-clear a thin band at each cell
// boundary INCLUDING the outer edge (i=0/cols, j=0/rows) — geometry, not
// color, so it's blind to whatever the divider looks like — reconnecting
// every cell's background to the rest of the sheet before flood-filling.
// No-op on sheets with no divider — clearing an already-background band
// changes nothing.
function clearGridBoundaries(d, W, H, cols, rows, bandPx = 3) {
  const cellW = W / cols, cellH = H / rows;
  for (let i = 0; i <= cols; i++) {
    const x0 = Math.round(i * cellW);
    for (let x = Math.max(0, x0 - bandPx); x <= Math.min(W - 1, x0 + bandPx); x++) {
      for (let y = 0; y < H; y++) d[(y * W + x) * 4 + 3] = 0;
    }
  }
  for (let j = 0; j <= rows; j++) {
    const y0 = Math.round(j * cellH);
    for (let y = Math.max(0, y0 - bandPx); y <= Math.min(H - 1, y0 + bandPx); y++) {
      for (let x = 0; x < W; x++) d[(y * W + x) * 4 + 3] = 0;
    }
  }
}

// Same flood-fill strip, keyed directly by an already-loaded texture key
// rather than a HERO_SPRITES class name — used for non-hero sheets (e.g.
// monster spritesheets) that share this baked-solid-background convention.
// Pass { cols, rows } when the sheet is a character grid so the grid-divider
// pre-pass above can run — harmless to omit on a single-frame image.
// `tol` overrides the default color-match tolerance (see DEFAULT_TOL below)
// — some art (e.g. 'Paintballer', all-dark tactical/camo colors close to
// pure black) needs a much tighter tolerance or the flood fill leaks from
// the background into the character's own dark gear, eating holes in it
// (2026-07-07 feedback: "the sniper is not really visible" — confirmed via
// a canvas test that TOL=30 shreds that sheet's character but TOL=8 leaves
// it fully intact).
// `band` overrides clearGridBoundaries' default 3px divider band. Tightening
// `tol` has a side effect: the geometric band was never quite wide enough to
// fully cover this sheet's divider on its own — the old TOL=30 was
// incidentally mopping up the remaining 1-2px via color match. At TOL=8 that
// slack disappears, leaving a visible thin line (2026-07-07 feedback again:
// "now we have that dark vertical line"). Confirmed via canvas test that a
// stray opaque near-black pixel survives at exactly 4px from a boundary with
// band=3; band=4 clears it. IMPORTANT: band must stay below the per-cell
// corner-seed inset (6px, below) — at band>=6 the corner seeds land inside
// the now-pre-cleared strip and floodFill's early-return means that cell's
// interior background never gets filled at all (confirmed: band=8 leaves
// almost the entire sheet's background solid black). Keep any override <=5.
const DEFAULT_TOL = 30;
const DEFAULT_BAND = 3;
const BRIGHTNESS = 1.22;
export function stripBackgroundByKey(scene, key, { cols, rows, tol, band, erase } = {}) {
  if (!scene.textures.exists(key)) return;

  const src = scene.textures.get(key).source[0];
  if (!src?.image) return;

  const canvas = document.createElement('canvas');
  canvas.width  = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src.image, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const W = canvas.width, H = canvas.height;

  if (d[3] === 0) return; // already stripped

  // 2026-07-09 feedback ("enhance the quality make them a little brighter")
  // — a flat +22% RGB multiply, applied once here (same guarded-by-already-
  // stripped check above) so it hits every hero/monster sheet uniformly via
  // this one shared choke point. Pure-black background (0,0,0) stays exactly
  // 0 under multiplication, so this can't shift the flood-fill's background
  // match target or interact with tol/band tuning below — confirmed via a
  // before/after render comparison, not just reasoning about the math.
  for (let i = 0; i < d.length; i += 4) {
    d[i]     *= BRIGHTNESS;
    d[i + 1] *= BRIGHTNESS;
    d[i + 2] *= BRIGHTNESS;
  }

  if (cols > 1 || rows > 1) clearGridBoundaries(d, W, H, cols || 1, rows || 1, band ?? DEFAULT_BAND);

  const TOL = tol ?? DEFAULT_TOL;
  const visited = new Uint8Array(W * H);

  function matches(pixelIdx, r, g, b) {
    return d[pixelIdx + 3] > 0 &&
      Math.abs(d[pixelIdx]   - r) < TOL &&
      Math.abs(d[pixelIdx+1] - g) < TOL &&
      Math.abs(d[pixelIdx+2] - b) < TOL;
  }

  function floodFill(sx, sy) {
    const si = (sy * W + sx) * 4;
    if (d[si + 3] === 0) return;
    const r = d[si], g = d[si+1], b = d[si+2];
    const stack = [sy * W + sx];
    while (stack.length) {
      const pos = stack.pop();
      if (visited[pos]) continue;
      visited[pos] = 1;
      const pi = pos * 4;
      if (!matches(pi, r, g, b)) continue;
      d[pi + 3] = 0;
      const x = pos % W, y = (pos / W) | 0;
      if (x > 0)     stack.push(pos - 1);
      if (x < W - 1) stack.push(pos + 1);
      if (y > 0)     stack.push(pos - W);
      if (y < H - 1) stack.push(pos + W);
    }
  }

  // Seed from all 4 corners + midpoints of each edge
  const mx = (W / 2) | 0, my = (H / 2) | 0;
  for (const [sx, sy] of [
    [0, 0], [W-1, 0], [0, H-1], [W-1, H-1],
    [mx, 0], [mx, H-1], [0, my], [W-1, my],
  ]) {
    floodFill(sx, sy);
  }

  // A divider grid (see clearGridBoundaries above) makes each cell its own
  // island — the sheet-edge seeds above can't reach a cell's interior
  // through it (matches() requires alpha>0, so the now-transparent divider
  // band is a wall, not a corridor). Seed each cell from all 4 of its own
  // corners too (a wide silhouette — e.g. a mountain's base, or a character's
  // planted feet — can block the flood between a cell's top and bottom, so
  // top-only seeding left the occasional bottom strip uncleared).
  if (cols > 1 || rows > 1) {
    const cellW = W / (cols || 1), cellH = H / (rows || 1);
    const inset = 6;
    for (let r = 0; r < (rows || 1); r++) {
      for (let c = 0; c < (cols || 1); c++) {
        const x0 = Math.round(c * cellW), y0 = Math.round(r * cellH);
        const x1 = Math.round((c + 1) * cellW) - 1;
        const y1 = Math.round((r + 1) * cellH) - 1;
        floodFill(Math.min(W - 1, x0 + inset), Math.min(H - 1, y0 + inset));
        floodFill(Math.max(0, x1 - inset),     Math.min(H - 1, y0 + inset));
        floodFill(Math.min(W - 1, x0 + inset), Math.max(0, y1 - inset));
        floodFill(Math.max(0, x1 - inset),     Math.max(0, y1 - inset));
      }
    }
  }

  // erase (2026-08-04, Goblin's idle row) — a handful of sheets have a
  // small piece of a NEIGHBORING pose bleeding across a cell boundary far
  // enough (confirmed for Goblin: 27px) that clearGridBoundaries' band
  // can't safely reach it without eating into that cell's own art (the
  // band>=6 ceiling documented above already caps how far that lever can
  // go). This is the disconnected-fragment counterpart to King Wolf's
  // `patch` in BattleScene.js's fixedIdleFrames (which restores alpha in a
  // rect); this one zeroes it — plain raw-pixel rects, applied AFTER the
  // flood fill so it can't affect flood-fill seeding/matching, just wipes
  // out a known-bad region directly.
  //
  // `onlyColor`/`colorTol` (2026-08-04, several attack-row VFX frames —
  // Black Belt/Archer/Kyokushin/Figure Skater) — some sheets have a chunk
  // of unstripped near-black BACKGROUND sitting directly behind/around the
  // character (a bright glow effect walls it off from every flood-fill
  // seed), but the bad region overlaps the character's own bounding box
  // (interleaved with their black belt/hair/gi shadow, not a clean
  // separate area) — a blind rect erase here would punch a hole in the
  // character too (confirmed the hard way: first attempt erased most of
  // Black Belt's torso). Making the rect conditional on color — only
  // erase pixels that ALSO match near-black — lets the rect safely
  // overlap the character's bounding box, since only the actually-black
  // pixels within it get zeroed.
  if (erase) {
    for (const { x: ex, y: ey, w: ew, h: eh, onlyColor, colorTol } of erase) {
      for (let y = ey; y < ey + eh; y++) {
        for (let x = ex; x < ex + ew; x++) {
          if (x < 0 || x >= W || y < 0 || y >= H) continue;
          const pi = (y * W + x) * 4;
          if (onlyColor) {
            const ct = colorTol ?? 12;
            if (Math.abs(d[pi] - onlyColor[0]) >= ct || Math.abs(d[pi+1] - onlyColor[1]) >= ct || Math.abs(d[pi+2] - onlyColor[2]) >= ct) continue;
          }
          d[pi + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  src.updateSource(canvas);
}

// Create standard animations for a class in a Phaser scene.
// Row 0 = idle, Row 1 = run, Row 2 = attack, Last row = celebrate.
// Skips if the idle animation already exists.
export function createHeroAnims(scene, className) {
  const info = HERO_SPRITES[className];
  if (!info) return;
  const key = heroKey(className);
  const idleKey = `${key}-idle`;
  if (scene.anims.exists(idleKey)) return;
  const { cols, rows, skip = 1, runEnd } = info;
  try {
    scene.anims.create({ key: idleKey,            frames: scene.anims.generateFrameNumbers(key, { start: skip,                end: cols - 1         }), frameRate: 6,  repeat: -1 });
    // runEnd lets a sheet cap the run row short of the last column — some
    // sheets' later run-cycle poses (wide stride, flying accessories) are
    // drawn wider than the sheet's own cell pitch, so cropping at the cell
    // boundary slices the character and leaves a disconnected fragment in
    // the next cell (looks like "2 units in one frame"/a jump-cut mid-loop).
    // Confirmed on Dancerdance.png: columns 5-7 of the run row overflow their
    // cell this way (verified against the raw, unprocessed art — not a
    // stripping/crop-math bug); columns 0-4 are clean, hence runEnd:4 below.
    scene.anims.create({ key: `${key}-run`,       frames: scene.anims.generateFrameNumbers(key, { start: cols + skip,         end: cols + (runEnd ?? cols - 1) }), frameRate: 10, repeat: -1 });
    scene.anims.create({ key: `${key}-attack`,    frames: scene.anims.generateFrameNumbers(key, { start: cols * 2 + skip,     end: cols * 3 - 1     }), frameRate: 12, repeat: 0  });
    scene.anims.create({ key: `${key}-celebrate`, frames: scene.anims.generateFrameNumbers(key, { start: cols*(rows-1)+skip,  end: cols * rows - 1  }), frameRate: 8,  repeat: 0  });
  } catch (e) {
    console.warn(`Hero anims failed for ${className}:`, e);
  }
}
