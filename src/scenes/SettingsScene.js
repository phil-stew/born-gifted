import Phaser from 'phaser';
import { drawButton } from '../ui/canvasButton.js';
import { drawSlider } from '../ui/canvasSlider.js';
import { playSfx, SFX } from '../audio/sound.js';
import { getSfxVolume, setSfxVolume, getMusicVolume } from '../audio/settings.js';
import { setMusicVolume } from '../audio/music.js';

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

    this.buildVolumeRow('MUSIC VOLUME', height / 2 - 50, getMusicVolume(), (v) => setMusicVolume(v));
    this.buildVolumeRow('SOUND EFFECTS VOLUME', height / 2 + 30, getSfxVolume(), (v) => setSfxVolume(v), {
      onRelease: () => playSfx(this, SFX.click),
    });

    this.cameras.main.fadeIn(250, 0, 0, 0);
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
