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

**This is currently broken for T1 and T2.** The art was regenerated on 2026-07-02 — new files, new names, and (confirmed by eye) inconsistent grid layouts from file to file: e.g. `boxerheavyweight.png` is a 6×6 grid (36 frames) at 1496×1051px, while `Dancerdance.png` is 8×6 (48 frames) at 1402×1122px. There's no fixed template size across files, so each new sheet's `cols`/`rows`/`fw`/`fh` has to be measured individually rather than assumed. `heroSprites.js` still points at the old T1/T2 filenames, which no longer exist on disk — sprite loading for those two tiers will fail until it's rewired against the final art set. T3 is untouched and still correct.

More art is expected to land before this gets finalized, so treat any rewrite of the T1/T2 entries as a draft until the full set is confirmed in.

## What's missing / messy right now

- **`heroSprites.js` T1/T2 entries are stale** (see above) — the single biggest open item.
- **Two roles have no art at all** in the new file set: Rollerskater (T1) and Skate Boarder (T2). Both had a sprite under the old system; neither has an obvious successor file. Needs a decision — new art coming, or intentionally cut.
- **No fixed grid convention for new hero art.** Old sheets were uniformly 1536×1024 at a known column count; the new ones vary per file. Worth standardizing the export size/grid before the next batch, or the same manual-measurement step repeats every time.
- **Several role pairs now have two sprites where they used to share one** (e.g. paintball sniper/frontman, tennis singles/doubles, cricket batter/pitcher) — good, but means `ROLE_SPRITE_KEY`'s `null` entries need re-auditing role by role rather than assumed still-null.
- **Filename typos** in the new art (`netGaoldefence`, `criketpitcher`, `paintballsinper`, `athlticJumperhigh`, `Gymnatsic`, `tennissigles`, etc.) — cosmetic, but worth a pass if these are going to be long-lived asset keys.
- **Unused wolf art variants**: `public/critters/wolf/` has three versions of each animation (bare, `no effects/`, `no shadow & effects/`) with genuinely different pixel content (not exact dupes) — only `no effects/wolf-idle.png` is actually loaded (`BattleScene.js`). The other variants and the other animation states (`wolf-bite`, `wolf-death`, `wolf-howl`, `wolf-run`) aren't wired in yet; intentional asset library for future use, not dead weight, but worth knowing before adding a "why do we have three folders of wolf" question later.
- **Single JS bundle**: production build is one ~1.5MB chunk (Vite warns past 500KB). Fine for now at this project size; if `BattleScene.js` keeps growing, dynamic `import()` per scene would keep the initial load light.
- **No tests, no linter, no TypeScript** — pure JS with no static checking. Not necessarily a problem for a project this size, but bugs (like the stale sprite paths above) won't surface until you actually run the scene that hits them.

## Recently cleaned up (2026-07-02)

- `public/heroes/T1` renamed to lowercase `t1` — was silently inconsistent with `t2`/`t3` (macOS's case-insensitive filesystem hid it locally; would 404 on a case-sensitive deploy).
- Removed unused Vite scaffold files (`src/counter.js`, `src/assets/hero.png`, `src/assets/javascript.svg`, `src/assets/vite.svg`).
- Moved non-shipping source art (`.aseprite` critter files, the isometric tileset's master spritesheet) out of `public/` into `art-source/` so it stops shipping to `dist/`.
