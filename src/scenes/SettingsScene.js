import Phaser from 'phaser';
import { drawButton } from '../ui/canvasButton.js';
import { drawSlider } from '../ui/canvasSlider.js';
import { playSfx, SFX } from '../audio/sound.js';
import { getSfxVolume, setSfxVolume, getMusicVolume } from '../audio/settings.js';
import { setMusicVolume } from '../audio/music.js';
import { DIFFICULTIES, getDifficultyKey, setDifficultyKey } from '../data/difficulty.js';

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
    drawButton(this, {
      x: 60, y: 26, w: 92, h: 32, label: '◀ BACK',
      bg: 0x161630, bgHover: 0x223060, border: 0x3344aa, accent: 0xaaaaff,
      textColor: '#aaaaff', depth: 20,
      onClick: () => this.scene.start(this.returnScene, this.returnData),
    });

    this.add.text(cx, 26, 'SETTINGS', {
      fontSize: '18px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    this.buildVolumeRow('MUSIC VOLUME', height / 2 - 90, getMusicVolume(), (v) => setMusicVolume(v));
    this.buildVolumeRow('SOUND EFFECTS VOLUME', height / 2 - 10, getSfxVolume(), (v) => setSfxVolume(v), {
      onRelease: () => playSfx(this, SFX.click),
    });
    this.buildDifficultyRow(height / 2 + 90);

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  // Sets the default difficulty new/first-time battles start on — see
  // BattleScene's `data?.difficulty ?? getDifficultyMult()` fallback.
  // Doesn't touch or replace WorldMapScene's per-replay Normal/Hard/Elite
  // picker, which still layers its own explicit choice on top.
  buildDifficultyRow(y) {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, y - 30, 'DEFAULT DIFFICULTY', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    const activeKey = getDifficultyKey();
    const bw = 88, bh = 40, gap = 12;
    const startX = cx - (DIFFICULTIES.length * (bw + gap) - gap) / 2 + bw / 2;

    const buttons = [];
    DIFFICULTIES.forEach((d, i) => {
      const btn = drawButton(this, {
        x: startX + i * (bw + gap), y, w: bw, h: bh,
        label: d.label, fontSize: '13px',
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

  buildVolumeRow(label, y, initial, onChange, { onRelease } = {}) {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, y - 30, label, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ccccee',
    }).setOrigin(0.5);

    const pctText = this.add.text(cx + 160, y, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#88aadd',
    }).setOrigin(0, 0.5);
    const updateLabel = (v) => pctText.setText(v <= 0 ? 'MUTED' : `${Math.round(v * 100)}%`);
    updateLabel(initial);

    drawSlider(this, {
      x: cx - 20, y, w: 260, value: initial,
      onChange: (v) => { updateLabel(v); onChange(v); },
      onRelease,
    });
  }
}
