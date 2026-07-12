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
  scene: [GameScene, CharacterCreationScene, RecruitClassScene, WorldMapScene, BattleScene, BattlePartySelectScene, VictoryScene, LootScene, LevelUpScene, StatsScene, EquipmentScene, StoryScene, HubScene, ShopScene, ForgeScene, PartyScene, LoadoutScene, InventoryScene, RewardPopupScene, AcademyTaskListScene, AcademyQuestListScene, HandbookScene, VillageQuestListScene, IndexScene],
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
