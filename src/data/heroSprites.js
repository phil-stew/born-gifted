// Hero sprite registry — maps class name → spritesheet metadata
// Standard sprites: 1536×1024, 6 columns
// frameHeight = floor(1024 / rowCount) — rows fit cleanly within image height

export const HERO_SPRITES = {
  // ── T1 ────────────────────────────────────────────────────────────────────
  // New art as of 2026-07-02 — grids measured by eye per file, not uniform.
  'Runner':             { file:'heroes/t1/runnerboy.png',         cols:6, rows:6, fw:249, fh:175 },
  'Ice Skater':         { file:'heroes/t1/iceskatergirl.png',      cols:6, rows:6, fw:249, fh:175 },
  'Boxer':              { file:'heroes/t1/boxerlightweight.png',  cols:6, rows:6, fw:249, fh:175 },
  'Boxer Heavyweight':  { file:'heroes/t1/boxerheavyweight.png',  cols:6, rows:6, fw:249, fh:175 },
  'Dart Player':        { file:'heroes/t1/Dartarrowchucker.png',  cols:6, rows:6, fw:249, fh:175 },
  'Dancer':             { file:'heroes/t1/Dancerdance.png',       cols:8, rows:6, fw:175, fh:187 },
  'Netballer':          { file:'heroes/t1/netGoalattack.png',     cols:6, rows:6, fw:249, fh:175 },
  'Netballer Defence':  { file:'heroes/t1/netGaoldefence.png',    cols:6, rows:6, fw:249, fh:175 },
  'Lacrosse Player':    { file:'heroes/t1/lacrosseAceattacker.png', cols:6, rows:6, fw:249, fh:175 },
  'Lacrosse Goalkeeper':{ file:'heroes/t1/LacrosseGoalkeeper.png', cols:6, rows:6, fw:249, fh:175 },
  'Softball Batter':    { file:'heroes/t1/softbatter.png',        cols:6, rows:6, fw:249, fh:175 },
  'Softball Pitcher':   { file:'heroes/t1/softpitcher.png',       cols:6, rows:6, fw:249, fh:175 },

  // ── T2 ────────────────────────────────────────────────────────────────────
  'Striker':          { file:'heroes/t2/striker1.png',      cols:6, rows:6, fw:256, fh:170 },
  'Long Jumper':      { file:'heroes/t2/jumper.png',        cols:6, rows:6, fw:256, fh:170 },
  'Speed Skater':     { file:'heroes/t2/speedskater.png',   cols:8, rows:7, fw:192, fh:146 },
  'Black Belt':       { file:'heroes/t2/blackbelt.png',     cols:6, rows:7, fw:256, fh:146 },
  'Paintballer':      { file:'heroes/t2/paintball.png',     cols:6, rows:6, fw:256, fh:170 },
  'Gymnast':          { file:'heroes/t2/Gymnist.png',       cols:5, rows:6, fw:217, fh:241 },
  'Spiker':           { file:'heroes/t2/Spiker.png',        cols:6, rows:6, fw:256, fh:170 },
  'Skate Boarder':    { file:'heroes/t2/skateboarder.png',  cols:6, rows:6, fw:256, fh:170 },
  'Cricket Player':   { file:'heroes/t2/Cricket.png',       cols:6, rows:7, fw:256, fh:146 },
  'Tennis Player':    { file:'heroes/t2/tennisplayer.png',  cols:6, rows:6, fw:256, fh:170 },
  'Cheerleader':      { file:'heroes/t2/cheerleader.png',   cols:5, rows:5, fw:151, fh:204 },

  // ── T3 ────────────────────────────────────────────────────────────────────
  'Rugger':           { file:'heroes/t3/rugger.png',        cols:6, rows:6, fw:256, fh:170 },
  'Sprinter':         { file:'heroes/t3/Sprinter.png',      cols:8, rows:6, fw:192, fh:170 },
  'Hockey Player':    { file:'heroes/t3/hockeyplayer.png',  cols:8, rows:8, fw:192, fh:128 },
  'MMA':              { file:'heroes/t3/mma1t3.png',        cols:6, rows:7, fw:256, fh:146 },
  'Archer':           { file:'heroes/t3/archery.png',       cols:8, rows:6, fw:192, fh:170 },
  'Aerial Fitness':   { file:'heroes/t3/Arielfitness.png',  cols:5, rows:6, fw:217, fh:241 },
  'Baller':           { file:'heroes/t3/baller.png',        cols:6, rows:7, fw:256, fh:146 },
  'Parkour':          { file:'heroes/t3/pakourer.png',      cols:6, rows:6, fw:256, fh:170 },
  'Baseball Player':  { file:'heroes/t3/baseball.png',      cols:6, rows:7, fw:256, fh:146 },
  'Golfer':           { file:'heroes/t3/golfer.png',        cols:6, rows:6, fw:256, fh:170 },
  'Figure Skater':    { file:'heroes/t3/figureskater.png',  cols:6, rows:6, fw:256, fh:170 },
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
  // T2
  striker: 'Striker', goalkeeper_soccer: null,
  long_jumper: 'Long Jumper', high_jumper: null,
  skater_speed: 'Speed Skater',
  wado_ryu: 'Black Belt', kyokushin: null,
  spiker: 'Spiker', setter: null,
  batter_cricket: 'Cricket Player', pitcher_cricket: null,
  sniper: 'Paintballer', frontman: null,
  singles: 'Tennis Player', doubles: null,
  cheerleader: 'Cheerleader', gymnast: 'Gymnast',
  // T3
  ace_attacker_rugby: 'Rugger', ace_defender_rugby: null,
  qb: null, defender_amfb: null,
  starter: 'Sprinter', anchor: null,
  ace_forward: 'Hockey Player', goalkeeper_hockey: null,
  heavyweight_mma: 'MMA', lightweight_mma: null,
  master: null, // Kendo — new sport, no sheet exists
  ace_attack_bball: 'Baller', ace_defence_bball: null,
  batter_baseball: 'Baseball Player', pitcher_baseball: null,
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

// Load all sprites for the given class names into a Phaser scene's loader.
// Skips already-loaded textures. Call from preload().
export function loadHeroSprites(scene, classNames) {
  for (const name of classNames) {
    const info = HERO_SPRITES[name];
    if (!info) continue;
    const key = heroKey(name);
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, info.file, { frameWidth: info.fw, frameHeight: info.fh });
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
  const key = heroKey(className);
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

  const TOL = 30;
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
  const { cols, rows, skip = 1 } = info;
  try {
    scene.anims.create({ key: idleKey,            frames: scene.anims.generateFrameNumbers(key, { start: skip,                end: cols - 1         }), frameRate: 6,  repeat: -1 });
    scene.anims.create({ key: `${key}-run`,       frames: scene.anims.generateFrameNumbers(key, { start: cols + skip,         end: cols * 2 - 1     }), frameRate: 10, repeat: -1 });
    scene.anims.create({ key: `${key}-attack`,    frames: scene.anims.generateFrameNumbers(key, { start: cols * 2 + skip,     end: cols * 3 - 1     }), frameRate: 12, repeat: 0  });
    scene.anims.create({ key: `${key}-celebrate`, frames: scene.anims.generateFrameNumbers(key, { start: cols*(rows-1)+skip,  end: cols * rows - 1  }), frameRate: 8,  repeat: 0  });
  } catch (e) {
    console.warn(`Hero anims failed for ${className}:`, e);
  }
}
