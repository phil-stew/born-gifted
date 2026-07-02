# Born Gifted — Dev Notes

Tactical RPG built on [Phaser 4](https://phaser.io/) + [Vite](https://vitejs.dev/). No framework beyond that — plain JS modules, no TypeScript, no bundler config beyond Vite defaults.

## Running it

```
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Structure

```
src/
  main.js            # Phaser game config + scene registration
  scenes/             # one file per Phaser Scene (see below)
  data/               # plain-data modules, no framework dependency
    gameState.js      # module-singleton game state (talents, elements, affinity cycle)
    abilities.js
    items.js
    heroSprites.js     # class name → spritesheet metadata + loader helpers
  style.css
public/
  heroes/t1, t2, t3    # hero character art, tiered by unlock order
  critters/            # enemy art (badger, boar, stag, wolf)
  gears/, tiles/        # equipment icons, isometric tile atlas
art-source/             # non-shipping source files (.aseprite, master spritesheets)
                         # — kept out of public/ so they don't get bundled into dist/
```

Scene flow (registered in `main.js`): `GameScene` → `CharacterCreationScene` → `HubScene`/`WorldMapScene` → `BattleScene`, with `VictoryScene`, `LevelUpScene`, `StatsScene`, `EquipmentScene`, `ShopScene`, `ForgeScene`, `PartyScene`, `InventoryScene`, `StoryScene` as supporting screens. `BattleScene.js` is by far the largest (~1,800 lines — combat grid, pathing, turn order, enemy AI, HP bars all live there); everything else is 150–520 lines.

## Hero sprite pipeline (`src/data/heroSprites.js`)

Each hero class maps to one spritesheet: `{ file, cols, rows, fw, fh, skip? }`. Row 0 = idle, row 1 = run, row 2 = attack, last row = celebrate — `createHeroAnims()` slices those out generically off `cols`/`rows`, so any row count works as long as that convention holds. `ROLE_SPRITE_KEY` then maps each playable role id to one of these class sprites (or `null` if no art exists yet for that role).

**T1 is now fixed; T2 is still broken.** The art was regenerated starting 2026-07-02 — new files, new names, and (confirmed by eye) inconsistent grid layouts from file to file: e.g. `boxerheavyweight.png` is a 6×6 grid (36 frames) at 1496×1051px, while `Dancerdance.png` is 8×6 (48 frames) at 1402×1122px. There's no fixed template size across files, so each new sheet's `cols`/`rows`/`fw`/`fh` has to be measured individually rather than assumed. T1's entries were rewired and spot-checked live in-game (PartyScene) across all three grid families that appear in the set — renders clean, no misalignment. T2 still points at the old filenames, which no longer exist on disk, and hasn't been touched. T3 is untouched and still correct.

Several T1 role pairs that used to share one sprite (with one role left spriteless) now have dedicated art per role — new `HERO_SPRITES` entries were added for these and `ROLE_SPRITE_KEY`'s `null`s filled in: `heavyweight_box` → `Boxer Heavyweight`, `goal_defence` → `Netballer Defence`, `goalkeeper_lax` → `Lacrosse Goalkeeper`, `batter_softball` → `Softball Batter`. `Rollerskater` had no successor file, but turned out to be moot — its role chain was already cut in a prior redesign (see `gameState.js` around line 198) and it was never wired into `ROLE_SPRITE_KEY`, so nothing broke. Some T1 files have unused extra variants (`runnergirl.png`/`runnerpinkgirl.png` alongside the wired `runnerboy.png`; `Dancerdance1.png` alongside the wired `Dancerdance.png`) — not wired to anything, available if a variant-select feature ever wants them.

T2 needs the same treatment once its art is finalized — same manual per-file grid measurement, same audit of which previously-null roles now have art. **Skate Boarder (T2) has no successor file** in what's landed so far and doesn't have the same "already cut" out — worth confirming with whoever's doing the art before assuming it's covered.

## What's missing / messy right now

- **`heroSprites.js` T2 entries are still stale** — same treatment T1 just got, pending final T2 art.
- **No fixed grid convention for new hero art.** Old sheets were uniformly 1536×1024 at a known column count; the new ones vary per file. Worth standardizing the export size/grid before the next batch, or the same manual-measurement step repeats every time.
- **T2 role pairs likely need the same re-audit** T1 just got (paintball sniper/frontman, tennis singles/doubles, cricket batter/pitcher, etc. all got two sprites where they used to share one) — don't assume `ROLE_SPRITE_KEY`'s T2 `null`s are still accurate once that art is measured.
- **Filename typos** in the new art (`netGaoldefence`, `criketpitcher`, `paintballsinper`, `athlticJumperhigh`, `Gymnatsic`, `tennissigles`, etc.) — cosmetic, but worth a pass if these are going to be long-lived asset keys.
- **Unused wolf art variants**: `public/critters/wolf/` has three versions of each animation (bare, `no effects/`, `no shadow & effects/`) with genuinely different pixel content (not exact dupes) — only `no effects/wolf-idle.png` is actually loaded (`BattleScene.js`). The other variants and the other animation states (`wolf-bite`, `wolf-death`, `wolf-howl`, `wolf-run`) aren't wired in yet; intentional asset library for future use, not dead weight, but worth knowing before adding a "why do we have three folders of wolf" question later.
- **Single JS bundle**: production build is one ~1.5MB chunk (Vite warns past 500KB). Fine for now at this project size; if `BattleScene.js` keeps growing, dynamic `import()` per scene would keep the initial load light.
- **No tests, no linter, no TypeScript** — pure JS with no static checking. Not necessarily a problem for a project this size, but bugs (like the stale sprite paths above) won't surface until you actually run the scene that hits them.

## Recently cleaned up (2026-07-02)

- `public/heroes/T1` renamed to lowercase `t1` — was silently inconsistent with `t2`/`t3` (macOS's case-insensitive filesystem hid it locally; would 404 on a case-sensitive deploy).
- Removed unused Vite scaffold files (`src/counter.js`, `src/assets/hero.png`, `src/assets/javascript.svg`, `src/assets/vite.svg`).
- Moved non-shipping source art (`.aseprite` critter files, the isometric tileset's master spritesheet) out of `public/` into `art-source/` so it stops shipping to `dist/`.
