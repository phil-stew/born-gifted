import Phaser from 'phaser';
import { drawButton, drawBackButton } from '../ui/canvasButton.js';
import { drawSlider } from '../ui/canvasSlider.js';
import { playSfx, SFX } from '../audio/sound.js';
import { getSfxVolume, setSfxVolume, getMusicVolume } from '../audio/settings.js';
import { setMusicVolume } from '../audio/music.js';
import { DIFFICULTIES, getDifficultyKey, setDifficultyKey } from '../data/difficulty.js';
import { HINT_MODES, getHintMode, setHintMode, battleInfoOn, setBattleInfoOn } from '../data/battleHints.js';
import { TEXT_SIZES, getTextSizeKey, setTextSizeKey } from '../data/textSize.js';

// Reachable from the title screen only (for now) — see GameScene's
// SETTINGS button. Both sliders write straight through to
// audio/settings.js (persisted) and, for music, live-update whatever
// track is already looping so the change is heard immediately.
export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  init(data) {
    this.returnScene = data?.returnScene ?? 'GameScene';
    this.returnData  = data?.returnData  ?? { skipCrawl: true };
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(cx, height / 2, width, height, 0x0a0a18);

    // Back button at the top, per this project's standing menu convention.
    drawBackButton(this, { label: 'BACK', onClick: () => this.scene.start(this.returnScene, this.returnData) });

    this.add.text(cx, 26, 'SETTINGS', {
      fontSize: '26px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    this.buildVolumeRow('MUSIC VOLUME', height / 2 - 200, getMusicVolume(), (v) => setMusicVolume(v));
    this.buildVolumeRow('SOUND EFFECTS VOLUME', height / 2 - 125, getSfxVolume(), (v) => setSfxVolume(v), {
      onRelease: () => playSfx(this, SFX.click),
    });
    this.buildDifficultyRow(height / 2 - 25);
    this.buildHintRow(height / 2 + 90);
    this.buildTextSizeRow(height / 2 + 205);
    this.buildBattleInfoRow(height / 2 + 205);

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  // Sets the difficulty tier every battle NOT started from WorldMapScene's
  // per-replay Normal/Hard/Elite picker uses (see BattleScene.init()'s
  // `data?.difficulty != null` branch) — a fully separate system from that
  // picker, not a default/fallback for it: Newbie/Veteran/Perilous govern
  // the level-floor + damage% mechanic (src/data/difficulty.js), while the
  // picker keeps its own untouched flat raw-stat-mult behavior.
  buildDifficultyRow(y) {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, y - 44, 'DEFAULT DIFFICULTY', {
      fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    const activeKey = getDifficultyKey();
    const bw = 150, bh = 56, gap = 14;
    const startX = cx - (DIFFICULTIES.length * (bw + gap) - gap) / 2 + bw / 2;

    const buttons = [];
    DIFFICULTIES.forEach((d, i) => {
      const btn = drawButton(this, {
        x: startX + i * (bw + gap), y, w: bw, h: bh,
        label: d.label, fontSize: '21px',
        bg: d.bg0, bgHover: d.bg0 + 0x080808, border: d.bdr, accent: d.bdr,
        textColor: d.color, textHoverColor: d.color,
        active: d.key === activeKey,
        onClick: () => {
          setDifficultyKey(d.key);
          buttons.forEach((b, bi) => b.setActive(DIFFICULTIES[bi].key === d.key));
        },
      });
      buttons.push(btn);
    });
  }

  buildHintRow(y) {
    const cx = this.scale.width / 2;
    this.add.text(cx, y - 44, 'BATTLE HINTS', {
      fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    const bw = 150, bh = 56, gap = 14;
    const startX = cx - (HINT_MODES.length * (bw + gap) - gap) / 2 + bw / 2;
    const buttons = [];
    HINT_MODES.forEach((mode, i) => {
      const btn = drawButton(this, {
        x: startX + i * (bw + gap), y, w: bw, h: bh, label: mode.label, fontSize: '21px',
        active: mode.key === getHintMode(),
        onClick: () => {
          setHintMode(mode.key);
          buttons.forEach((b, bi) => b.setActive(HINT_MODES[bi].key === mode.key));
        },
      });
      buttons.push(btn);
    });
  }

  // Canvas text picks up its size when created, so restart to show the change.
  // Shares its row with Text Size; there's no vertical room for another.
  buildBattleInfoRow(y) {
    const cx = this.scale.width / 2 + 260;
    this.add.text(cx, y - 44, 'BATTLE INFO', {
      fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    [['On', true], ['Off', false]].forEach(([label, on], i) => {
      drawButton(this, {
        x: cx - 55 + i * 110, y, w: 100, h: 56, label, fontSize: '21px',
        active: on === battleInfoOn(),
        onClick: () => {
          setBattleInfoOn(on);
          this.scene.restart({ returnScene: this.returnScene, returnData: this.returnData });
        },
      });
    });
  }

  buildTextSizeRow(y) {
    const cx = this.scale.width / 2 - 140;
    this.add.text(cx, y - 44, 'TEXT SIZE', {
      fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    const bw = 130, bh = 56, gap = 14;
    const startX = cx - (TEXT_SIZES.length * (bw + gap) - gap) / 2 + bw / 2;
    TEXT_SIZES.forEach((size, i) => {
      drawButton(this, {
        x: startX + i * (bw + gap), y, w: bw, h: bh, label: size.label, fontSize: '21px',
        active: size.key === getTextSizeKey(),
        onClick: () => {
          setTextSizeKey(size.key);
          this.scene.restart({ returnScene: this.returnScene, returnData: this.returnData });
        },
      });
    });
  }

  buildVolumeRow(label, y, initial, onChange, { onRelease } = {}) {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, y - 32, label, {
      fontSize: '21px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    const pctText = this.add.text(cx + 200, y, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#88aadd',
    }).setOrigin(0, 0.5);
    const updateLabel = (v) => pctText.setText(v <= 0 ? 'MUTED' : `${Math.round(v * 100)}%`);
    updateLabel(initial);

    drawSlider(this, {
      x: cx - 20, y, w: 400, value: initial,
      onChange: (v) => { updateLabel(v); onChange(v); },
      onRelease,
    });
  }
}
