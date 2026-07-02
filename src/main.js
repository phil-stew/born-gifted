import './style.css';
import Phaser from 'phaser';
import { GameScene }      from './scenes/GameScene.js';
import { CharacterCreationScene } from './scenes/CharacterCreationScene.js';
import { WorldMapScene }  from './scenes/WorldMapScene.js';
import { BattleScene }    from './scenes/BattleScene.js';
import { VictoryScene }   from './scenes/VictoryScene.js';
import { LevelUpScene }   from './scenes/LevelUpScene.js';
import { StatsScene }     from './scenes/StatsScene.js';
import { EquipmentScene } from './scenes/EquipmentScene.js';
import { StoryScene }     from './scenes/StoryScene.js';
import { HubScene }       from './scenes/HubScene.js';
import { ShopScene }      from './scenes/ShopScene.js';
import { ForgeScene }     from './scenes/ForgeScene.js';
import { PartyScene }     from './scenes/PartyScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
  width: 800,
  height: 600,
  backgroundColor: '#0a0a18',
  parent: 'app',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: Phaser.Scale.ZOOM_2X,
  },
  scene: [GameScene, CharacterCreationScene, WorldMapScene, BattleScene, VictoryScene, LevelUpScene, StatsScene, EquipmentScene, StoryScene, HubScene, ShopScene, ForgeScene, PartyScene, InventoryScene],
};

window.__game = new Phaser.Game(config);
