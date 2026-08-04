import './style.css';
import Phaser from 'phaser';
import { GameScene }      from './scenes/GameScene.js';
import { CharacterCreationScene } from './scenes/CharacterCreationScene.js';
import { RecruitClassScene } from './scenes/RecruitClassScene.js';
import { WorldMapScene }  from './scenes/WorldMapScene.js';
import { BattleScene }    from './scenes/BattleScene.js';
import { BattlePartySelectScene } from './scenes/BattlePartySelectScene.js';
import { VictoryScene }   from './scenes/VictoryScene.js';
import { LootScene }      from './scenes/LootScene.js';
import { LevelUpScene }   from './scenes/LevelUpScene.js';
import { StatsScene }     from './scenes/StatsScene.js';
import { EquipmentScene } from './scenes/EquipmentScene.js';
import { StoryScene }     from './scenes/StoryScene.js';
import { HubScene }       from './scenes/HubScene.js';
import { ShopScene }      from './scenes/ShopScene.js';
import { ForgeScene }     from './scenes/ForgeScene.js';
import { PartyScene }     from './scenes/PartyScene.js';
import { LoadoutScene }   from './scenes/LoadoutScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { RewardPopupScene } from './scenes/RewardPopupScene.js';
import { AcademyTaskListScene } from './scenes/AcademyTaskListScene.js';
import { AcademyQuestListScene } from './scenes/AcademyQuestListScene.js';
import { HandbookScene } from './scenes/HandbookScene.js';
import { VillageQuestListScene } from './scenes/VillageQuestListScene.js';
import { IndexScene } from './scenes/IndexScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';

// ── Global error boundary (2026-08-04, pre-launch audit: "no global error
// boundary... an uncaught exception in any scene just freezes silently, no
// reload prompt") — registered before Phaser.Game() so it also catches
// boot-time failures, not just in-scene ones. Plain DOM, styled inline and
// appended straight to <body> rather than #app/#ui-root — those live inside
// Phaser's own DOM tree and the whole point is this still works when Phaser
// itself is the thing that broke. Fires on genuinely UNCAUGHT errors only
// (window 'error'/'unhandledrejection'), so it never interferes with
// anything already handled elsewhere (try/catch, .catch(), etc.) — this is
// strictly the "nothing else caught this" fallback. Guarded to show once;
// a cascade of secondary errors after the first shouldn't stack overlays.
let errorBoundaryShown = false;
function showErrorBoundary(detail) {
  if (errorBoundaryShown) return;
  errorBoundaryShown = true;
  console.error('[error boundary]', detail);

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(5, 5, 12, 0.94); color: #f1f1f6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-align: center; padding: 24px;
  `;
  overlay.innerHTML = `
    <div style="font-size: 17px; font-weight: 700; margin-bottom: 10px;">Something went wrong</div>
    <div style="font-size: 13px; color: #9393ab; max-width: 420px; margin-bottom: 22px;">
      The game hit an unexpected error and can't continue safely. Your progress is saved
      automatically as you play, so reloading should pick back up close to where you left off.
    </div>
    <button id="error-boundary-reload" style="
      appearance: none; border: 1px solid rgba(255,255,255,0.16); border-radius: 8px;
      background: #ffaa44; color: #1a1408; font-weight: 700; font-size: 14px;
      padding: 10px 22px; cursor: pointer;
    ">Reload</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById('error-boundary-reload').addEventListener('click', () => location.reload());
}

window.addEventListener('error', (e) => showErrorBoundary(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showErrorBoundary(e.reason));

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
  width: 800,
  height: 600,
  backgroundColor: '#0a0a18',
  parent: 'app',
  scale: {
    // FIT, not ENVELOP — tried ENVELOP (fills the screen, no black bars) but
    // reverted: on a real phone's much-wider-than-4:3 landscape aspect ratio
    // it crops enough off the top/bottom to hide real UI (world map title,
    // the SAVE/EXIT bar), which is worse than a letterbox bar on the sides.
    // FIT never crops — always shows every scene's full content.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: Phaser.Scale.ZOOM_2X,
  },
  scene: [GameScene, CharacterCreationScene, RecruitClassScene, WorldMapScene, BattleScene, BattlePartySelectScene, VictoryScene, LootScene, LevelUpScene, StatsScene, EquipmentScene, StoryScene, HubScene, ShopScene, ForgeScene, PartyScene, LoadoutScene, InventoryScene, RewardPopupScene, AcademyTaskListScene, AcademyQuestListScene, HandbookScene, VillageQuestListScene, IndexScene, SettingsScene],
};

window.__game = new Phaser.Game(config);

// ── Landscape preference, not a hard lock (2026-07-04, revised again) ──────
// Mobile game, designed for landscape — but a plain Safari/Chrome tab can't
// reliably combine true fullscreen with a forced landscape lock (iOS Safari
// especially), and blocking portrait with a "please rotate" prompt just adds
// friction without actually fixing anything for players who don't want to
// rotate (or use Add to Home Screen — see index.html). So: best-effort
// native orientation lock only (silently ignored outside fullscreen/PWA
// contexts), no blocking overlay, no pausing. Portrait is fully playable,
// just cramped/small since no scene layout was built for it — FIT scale
// mode (see below) handles that gracefully without cropping anything.
if (screen.orientation?.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}
