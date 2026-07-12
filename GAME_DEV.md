# Fantasy Sports Tactics — Dev Notes

(project folder/repo still named "born-gifted" — renamed in-game 2026-07-04, not worth a directory rename)

Tactical RPG built on [Phaser 4](https://phaser.io/) + [Vite](https://vitejs.dev/). No framework beyond that — plain JS modules, no TypeScript, no bundler config beyond Vite defaults. Mobile game, **landscape orientation only** (see `main.js`'s orientation-lock block + `#rotate-overlay` in `index.html`/`style.css`).

## Running it

```
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Structure

```
src/
  main.js            # Phaser game config + scene registration + landscape-only lock
  scenes/             # one file per Phaser Scene (see below)
  data/               # plain-data modules, no framework dependency
    gameState.js      # module-singleton game state: party/inventory/save, sports/roles/
                       #   chains, talents, elements, designation triangle, promotion logic
    abilities.js      # full Ability Revised system: specials/skills/passives per role,
                       #   talent, designation, and sport-class grouping
    items.js          # gear + materials catalog, rarity, Forge recipes, gear stat rolls
    monsters.js        # 10-base-monster roster, tier/boss/unique generation (only
                       #   Wolf/Boar/Deer have sprite art wired into BattleScene so far)
    heroSprites.js     # role → spritesheet metadata + loader/anim helpers
    storyBackdrops.js  # shared photo-backdrop registry (StoryScene/HubScene/WorldMapScene/
                       #   ForgeScene/ShopScene all pull from this one BACKDROPS object)
  ui/
    domUI.js           # mount/unmount helpers for the DOM-overlay "modern UI" scenes
    canvasButton.js    # shared rounded/shadowed/accent-bar button for Phaser-canvas scenes
  style.css            # includes the DOM "modern UI" design system (#ui-root, --ui-* tokens)
                       #   and the landscape-only #rotate-overlay
public/
  heroes/t1, t2, t3    # hero character art, tiered by unlock order (all 3 tiers wired)
  monster/             # enemy art — 10 base monsters, only wolf/boar/deer spawnable today
  gears/, items/       # gear icon sheet (gearitems.png) + material icon sheet (rawmaterials.png)
  tiles/               # isometric battle tileset + world-map scenery icons
  world/               # painterly photo backdrops (title, Altroes/Gale/Lametus kingdom art)
art-source/             # non-shipping source files (.aseprite, master spritesheets)
                         # — kept out of public/ so they don't get bundled into dist/
```

Scene flow (registered in `main.js`): `GameScene` (splash → title → optional lore crawl on New Game) → `CharacterCreationScene` → `HubScene`/`WorldMapScene` → `BattleScene`, with `VictoryScene`, `LevelUpScene`, `StatsScene`, `EquipmentScene`, `ShopScene`, `ForgeScene`, `PartyScene`, `LoadoutScene`, `InventoryScene`, `StoryScene` as supporting screens. `BattleScene.js` is by far the largest (~2,600 lines — combat grid, pathing, turn order, designation/elemental damage triangles, enemy AI, action menu, item use — all live there); everything else is 130–700 lines.

Two parallel UI styles by design (per the 2026-07-04 visual style guide):
- **Battle stays pixel art** — `BattleScene.js` and most menu scenes (Shop/Forge/Inventory/Equipment/Stats/WorldMap/Hub/etc.) are hand-drawn Phaser Graphics, now sharing a common "glass card" look (rounded corners, soft drop shadow, colored accent stripe on hover/selected) via `src/ui/canvasButton.js` plus inline copies of the same pattern for multi-line cards.
- **`PartyScene`/`LoadoutScene` are DOM overlays** — mounted into `#ui-root` (see `domUI.js`), styled entirely through `style.css`'s `--ui-*` custom-property system (already rounded/shadowed/translucent, a separate but visually-compatible "modern UI" language). Don't migrate these to `canvasButton.js` — different rendering layer entirely.

## Hero sprite pipeline (`src/data/heroSprites.js`)

Each role maps to one spritesheet via `ROLE_SPRITE_KEY` → `HERO_SPRITES[key]`: `{ file, cols, rows, fw, fh, skip? }`. Row 0 = idle, row 1 = run, row 2 = attack, last row = celebrate — `createHeroAnims()` slices those out generically off `cols`/`rows`. **All three tiers (T1/T2/T3) are now fully wired** to the July 2026 art batch — grids were measured per file since the new sheets aren't a uniform template size/column count (unlike the old art, which was uniformly 1536×1024). A few previously-spriteless roles got dedicated art added in the same pass (e.g. Heavyweight Boxer, Netball Defence, Lacrosse Goalkeeper, Softball Batter, Soccer Goalkeeper, High Jumper, Kyokushin, Setter, Cricket Pitcher, Frontman, Doubles, and several T3 counterparts) — see the inline comments in `heroSprites.js`/`ROLE_SPRITE_KEY` for the exact list. `Rollerskater`/`Skate Boarder`/`Parkour` were dropped entirely (role chains already cut in an earlier redesign, never wired, old art files gone) — not a gap, just removed.

Filename typos survive in the new art (`netGaoldefence`, `criketpitcher`, `paintballsinper`, `athlticJumperhigh`, `Gymnatsic`, `tennissigles`, etc.) — cosmetic, but worth a pass if these are going to be long-lived asset keys.

## Major systems (all data-model-first, several partially engine-wired)

- **Ability Revised (`abilities.js`)** — full talent/designation/sport-class ability trees per the July 2026 sheets. Specials and Skills (cooldown actives) are engine-live in `BattleScene.js`. **Passives are NOT yet applied in combat** — equipping one is selectable in `PartyScene`/`LoadoutScene` but has zero mechanical effect today (`getEquippedPassives()` exists, nothing calls it during a fight). Same for sports-partner-adjacency bonuses (Duo, Set Up, 2 for 2, etc.) — all data-only.
- **Gear & Forge redesign (`items.js`)** — `rollGearItem()` replaces the old fixed-rarity catalog with rolled stat lines. `ForgeScene` now has two modes: the original **Reinforce** tab (upgrade an equipped item's stats) and a new **Craft** tab that consumes `FORGE_RECIPES` materials (bone/skin/fur/ore) to roll a brand-new item via `rollGearItem()` — ore type picked by the player sets result rarity via `ORE_TIER_TO_RARITY`, and stat rolls are seeded from the selected party member's talents.
- **Monster List (`monsters.js`)** — full 10-base-monster roster with tier/boss/unique generation logic exists, but only Wolf/Boar/Deer have real sprite art and are actually used in `MISSION_CONFIGS`. Region archetypes (`REGION_ARCHETYPES` in `BattleScene.js`) auto-roll each spawned enemy's element/primary-stat based on which kingdom (Altroes/Gale/Lametus) the mission belongs to.
- **World content** — Altroes has a full mission chain (M1F–M6: forest/outskirts/plains/2 caves/1 signature area). Gale and Lametus each got their first-ever playable content this pass (M7–M9, M10–M12 respectively — 2 caves + 1 signature elemental area each), deliberately built as a minimal stub (reused tile art/sprites, no new hand-authored content) rather than a full arc. M13–M15 are still unbuilt placeholder nodes.
- **Healing items** — Heal Herb/Health/Focus/Vitality Potion now actually restore HP/SP when used from the in-battle Items menu (previously flavor-only, zero mechanical effect). Herb has a 25% chance to drop after any battle.

## What's missing / messy right now

- **Passives and sports-partner-adjacency bonuses aren't engine-wired** (see above) — the single biggest gap between "data model done" and "actually affects a fight."
- **Region content is a stub for 2 of 3 kingdoms** — Gale/Lametus's 6 missions reuse Altroes's tile art and Wolf/Boar/Deer sprites with just a color-tint/layout difference; no unique monster art, no story dialogue beyond a one-time entry cutscene per location.
- **M13–M15** are unbuilt "Coming soon" placeholder nodes on the world map.
- **Single JS bundle** — production build is one ~1.6MB chunk (Vite warns past 500KB). Fine at this project size; if `BattleScene.js` keeps growing, per-scene dynamic `import()` would keep the initial load light.
- **No tests, no linter, no TypeScript** — pure JS with no static checking.
- **Working tree has substantial uncommitted work** — everything from the Ability Revised pass onward (region expansion, shop/UI modernization, mobile lock, healing items, etc.) is sitting as uncommitted changes as of this doc update; the last real commit is "Rename game to Fantasy Sports Tactics; add dev splash + title art."

## Recently cleaned up

- **2026-07-04**: modernized button/panel styling across every Phaser-canvas scene (`src/ui/canvasButton.js`); mobile landscape-only lock + rotate overlay; healing items actually heal now; ShopScene reskinned to light parchment + Items/Gear tabs; region expansion (Gale/Lametus's first missions); items.js dead-item cleanup (20 removed, superseded by the gear-roll system); photo backdrops wired across Story/Hub/WorldMap/Forge/Shop scenes; PartyScene split into a DOM-overlay screen with a separate LoadoutScene; Forge crafting UI built (Reinforce/Craft mode tabs, recipe list, ore/slot pickers, rollGearItem() wired in).
- **2026-07-02/03**: hero art fully regenerated and wired across all 3 tiers; Ability Revised talent/designation/class system implemented; Gear & Forge redesign (rolled stat gear); Monster List data model; `public/heroes/T1` casing fix; unused Vite scaffold files removed; non-shipping source art moved to `art-source/`.
