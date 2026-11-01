// Battle map generator. Terrain comes in connected patches rather than a
// per-tile scatter, a river runs edge to edge, and decorations sit on a second
// layer above real ground. Seeded by stage id, so a stage's map never changes.

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i).padStart(3, '0'));

const SAND = range(0, 10).filter(t => t !== '003'), CRACKED_SAND = range(11, 13), RIDGED_SAND = range(14, 16);
const DIRT = ['017', '018', '021'], MOSS_DIRT = ['019', '020'];
const GRASS = ['022', '023', '024', '037', '038', '039'], DARK_GRASS = ['040', '036', '027', '028'];
const TALL_GRASS = '036';
const STONE = ['061', '063'], WATER = ['088', '087', '086'], DARK_WATER = ['090', '091'];
const ICE = range(104, 110), ICE_CRACKED = ['114'];
const FLOWERS = ['041', '042', '044', '046'], TUFTS = ['043', '045'], LOGS = ['048', '049', '050'];
const BROWN_ROCKS = ['053', '054', '058'], GREY_ROCKS = ['062', '067'];
const SOLID = new Set([...LOGS, ...BROWN_ROCKS, ...GREY_ROCKS, ...TUFTS, TALL_GRASS]); // what counts as an obstacle

// patch covers `patchAmount` of the board in blobs; `stones`, when set, adds a
// second smaller set of blobs; `river` runs edge to edge with `bank` beside it.
// `obstacles` scatters extra rocks or logs on any dry tile. Every rock, log and
// clump of tall grass gives cover and slows movement; flowers and flat lawn don't.
const THEMES = {
  plains: { ground: GRASS, patch: SAND, patchAmount: 0.35, river: WATER, bank: SAND, decor: FLOWERS.concat(TUFTS), decorOn: 'ground', decorAmount: 0.1, border: STONE, obstacles: BROWN_ROCKS, obstacleAmount: 0.05 },
  forest: { ground: DARK_GRASS, patch: DIRT, patchAmount: 0.25, river: WATER, bank: DIRT, decor: TUFTS, decorOn: 'ground', decorAmount: 0.1, border: DARK_GRASS, obstacles: LOGS, obstacleAmount: 0.07 },
  field: { ground: GRASS, patch: SAND, patchAmount: 0.2, decor: TUFTS, decorOn: 'ground', decorAmount: 0.05, border: STONE, obstacles: LOGS, obstacleAmount: 0.04 },
  cave: { ground: DIRT, patch: STONE, patchAmount: 0.3, decor: BROWN_ROCKS, decorOn: 'patch', decorAmount: 0.1, border: STONE, obstacles: BROWN_ROCKS, obstacleAmount: 0.08 },
  deepCave: { ground: DIRT, patch: STONE, patchAmount: 0.3, river: DARK_WATER, bank: STONE, decor: BROWN_ROCKS, decorOn: 'patch', decorAmount: 0.1, border: STONE, obstacles: BROWN_ROCKS, obstacleAmount: 0.08 },
  desert: { ground: SAND, patch: GRASS, patchAmount: 0.18, stones: RIDGED_SAND, decor: FLOWERS, decorOn: 'patch', decorAmount: 0.2, border: CRACKED_SAND, obstacles: BROWN_ROCKS, obstacleAmount: 0.06 },
  volcanic: { ground: DIRT, patch: CRACKED_SAND, patchAmount: 0.35, decor: BROWN_ROCKS, decorOn: 'ground', decorAmount: 0.08, border: STONE, obstacles: BROWN_ROCKS, obstacleAmount: 0.08 },
  snow: { ground: ICE, patch: STONE, patchAmount: 0.2, river: DARK_WATER, bank: ICE_CRACKED, decor: GREY_ROCKS, decorOn: 'patch', decorAmount: 0.15, border: STONE, obstacles: GREY_ROCKS, obstacleAmount: 0.07 },
  blight: { ground: DIRT, patch: MOSS_DIRT, patchAmount: 0.3, river: DARK_WATER, bank: DIRT, decor: LOGS, decorOn: 'ground', decorAmount: 0.06, border: DIRT, obstacles: LOGS, obstacleAmount: 0.06 },
};

function seededRandom(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

// Smooth noise over the board: random values on a coarse grid, blended between
// points, so neighbouring tiles get similar values and blobs form.
function noiseField(size, rnd, cellSize = 3.5) {
  const n = Math.ceil(size / cellSize) + 2;
  const coarse = Array.from({ length: n * n }, () => rnd());
  const at = (x, y) => coarse[y * n + x];
  const ease = (t) => t * t * (3 - 2 * t);
  return (col, row) => {
    const fx = col / cellSize, fy = row / cellSize;
    const x = Math.floor(fx), y = Math.floor(fy);
    const tx = ease(fx - x), ty = ease(fy - y);
    const top = at(x, y) + (at(x + 1, y) - at(x, y)) * tx;
    const bottom = at(x, y + 1) + (at(x + 1, y + 1) - at(x, y + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

// The tiles holding the top `amount` of a noise field, as a Set of "col,row".
function blobs(size, field, amount, skip) {
  const tiles = [];
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) if (!skip.has(`${col},${row}`)) tiles.push([col, row, field(col, row)]);
  }
  tiles.sort((a, b) => b[2] - a[2]);
  return new Set(tiles.slice(0, Math.round(size * size * amount)).map(([c, r]) => `${c},${r}`));
}

// Walks from one edge to the opposite edge, drifting sideways without ever
// doubling back, so every river tile touches the next.
function riverPath(size, rnd) {
  const alongColumns = rnd() < 0.5;
  let cross = 2 + Math.floor(rnd() * (size - 4));
  const path = [];
  for (let along = 0; along < size; along++) {
    const place = (c) => path.push(alongColumns ? `${along},${c}` : `${c},${along}`);
    place(cross);
    const drift = rnd() < 0.45 ? (rnd() < 0.5 ? -1 : 1) : 0;
    const next = Math.max(1, Math.min(size - 2, cross + drift));
    if (next !== cross && along < size - 1) { cross = next; place(cross); }
  }
  return new Set(path);
}

function arenaMap(size, rnd) {
  const mid = (size - 1) / 2;
  const ground = {};
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      const edge = Math.min(col, row, size - 1 - col, size - 1 - row);
      const toCentre = Math.hypot(col - mid, row - mid);
      const tile = edge === 0 ? STONE : toCentre < 1.6 ? CRACKED_SAND : edge === 1 ? RIDGED_SAND : SAND;
      ground[`${col},${row}`] = pick(tile, rnd);
    }
  }
  return { ground, decor: {}, water: new Set(), obstacle: new Set() };
}

function themedMap(size, theme, rnd) {
  const key = (c, r) => `${c},${r}`;
  const river = theme.river ? riverPath(size, rnd) : new Set();
  const bank = new Set();
  if (theme.bank) {
    for (const tile of river) {
      const [c, r] = tile.split(',').map(Number);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = key(c + dc, r + dr);
        if (!river.has(k)) bank.add(k);
      }
    }
  }
  const taken = new Set([...river, ...bank]);
  const patch = blobs(size, noiseField(size, rnd), theme.patchAmount, taken);
  const stones = theme.stones
    ? blobs(size, noiseField(size, rnd, 2.5), 0.1, new Set([...taken, ...patch])) : new Set();

  const ground = {}, decor = {}, obstacle = new Set();
  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      const k = key(col, row);
      const edge = col === 0 || row === 0 || col === size - 1 || row === size - 1;
      const inGround = !river.has(k) && !bank.has(k) && !patch.has(k) && !stones.has(k);
      if (river.has(k)) ground[k] = pick(theme.river, rnd);
      else if (bank.has(k)) ground[k] = pick(theme.bank, rnd);
      else if (edge) ground[k] = pick(theme.border, rnd);
      else if (patch.has(k)) ground[k] = pick(theme.patch, rnd);
      else if (stones.has(k)) ground[k] = pick(theme.stones, rnd);
      else ground[k] = pick(theme.ground, rnd);

      const onRightGround = theme.decorOn === 'patch' ? patch.has(k) : inGround;
      if (!edge && onRightGround && rnd() < theme.decorAmount) decor[k] = pick(theme.decor, rnd);
      if (!edge && !river.has(k) && !bank.has(k) && rnd() < theme.obstacleAmount) {
        decor[k] = pick(theme.obstacles, rnd);
      }
      if (SOLID.has(decor[k]) || SOLID.has(ground[k])) obstacle.add(k);
    }
  }
  return { ground, decor, water: river, obstacle };
}

// Returns { tiles, layout(col, row), decor(col, row), water(col, row),
// obstacle(col, row) } for a stage.
export function buildTerrain(stageId, themeName, size) {
  const rnd = seededRandom(stageId);
  const map = themeName === 'arena' ? arenaMap(size, rnd) : themedMap(size, THEMES[themeName], rnd);
  return {
    tiles: [...new Set([...Object.values(map.ground), ...Object.values(map.decor)])],
    layout: (col, row) => map.ground[`${col},${row}`],
    decor: (col, row) => map.decor[`${col},${row}`],
    water: (col, row) => map.water.has(`${col},${row}`),
    hasWater: map.water.size > 0,
    obstacle: (col, row) => map.obstacle.has(`${col},${row}`),
    hasObstacles: map.obstacle.size > 0,
  };
}
