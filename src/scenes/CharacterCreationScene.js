import Phaser from 'phaser';
import { STARTING_SPORTS, sportById, TALENTS, ELEMENTS, createStarterUnit, newGame } from '../data/gameState.js';
import { DIFFICULTIES, setDifficultyKey } from '../data/difficulty.js';
import { playSfx, SFX } from '../audio/sound.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';
import { drawBackButton } from '../ui/canvasButton.js';

const DEFAULT_NAME = 'Reno Sirblanc';

// New-game flow: name the protagonist, pick a starting sport, then a role in
// it (if the sport has 2+ roles), then an element, then pick 2 talents
// (repeats allowed) — each doubles that stat's level-up growth, picking the
// same one twice quadruples it — then a difficulty tier before the run
// actually begins (2026-08-04: name + difficulty steps added; difficulty
// reuses the same Newbie/Veteran/Perilous tiers as Settings' "default
// difficulty" picker in data/difficulty.js — this IS that same global
// preference, just surfaced up front too, so a fresh player isn't left on
// whatever the default happens to be without ever seeing the choice).
export class CharacterCreationScene extends Phaser.Scene {
  constructor() { super({ key: 'CharacterCreationScene' }); }

  init(data) {
    this.slot = data?.slot ?? 1;
    // New Game+ (2026-08-13) — non-empty only when this run was launched
    // from a beaten slot's "NEW GAME+" button (see GameScene.js), carrying
    // every piece of gear that save ever owned. Threaded straight into
    // newGame() at the end of the difficulty step.
    this.ngPlusGear = data?.ngPlusGear ?? [];
    this.step = 'name'; // 'name' | 'sport' | 'role' | 'element' | 'talent1' | 'talent2' | 'confirm' | 'difficulty'
    this.chosenName = '';
    this.chosenSport = null;
    this.chosenRole = null;
    this.chosenElement = null;
    this.chosenTalents = [];
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;
    this.S = width >= 1000 ? 1.5 : 1;

    this.bg = this.add.graphics();
    this.bg.fillStyle(0x0a0a18, 1);
    this.bg.fillRect(0, 0, width, height);

    this.headerText = this.add.text(width / 2, 24, '', {
      fontSize: '26px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    this.subText = this.add.text(width / 2, 44, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aabbdd',
      align: 'center', wordWrap: { width: width - 60 },
    }).setOrigin(0.5, 0);

    this.con = this.add.container(0, 0);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.events.once('shutdown', unmount);
    this.render();
  }

  render() {
    this.con.removeAll(true);
    if (this.step === 'name') { this.renderNameStep(); return; }
    unmount();
    if (this.step === 'sport')      this.renderSportStep();
    if (this.step === 'role')       this.renderRoleStep();
    if (this.step === 'element')    this.renderElementStep();
    if (this.step === 'talent1')    this.renderTalentStep(1);
    if (this.step === 'talent2')    this.renderTalentStep(2);
    if (this.step === 'confirm')    this.renderConfirmStep();
    if (this.step === 'difficulty') this.renderDifficultyStep();
  }

  renderNameStep() {
    mount(`
      <div class="ui-screen" style="align-items:center; justify-content:center;">
        <div class="ui-modal">
          <div class="ui-modal-title">WHO ARE YOU?</div>
          <div class="ui-modal-sub">Name your protagonist — this is who the story follows.</div>
          <input id="hero-name-input" class="ui-text-input" type="text" maxlength="18"
            placeholder="${esc(DEFAULT_NAME)}" value="${esc(this.chosenName)}" />
          <div class="ui-modal-actions">
            <button class="ui-btn ui-btn-primary" data-name-confirm="1">Continue</button>
          </div>
        </div>
      </div>
    `);
    const input = document.getElementById('hero-name-input');
    input?.focus();
    const submit = () => {
      this.chosenName = (input?.value.trim()) || DEFAULT_NAME;
      this.step = 'sport';
      this.render();
    };
    onClick('[data-name-confirm]', submit);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  }

  makeButton(x, y, w, h, label, sub, onClick) {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, 6);
    this.con.add(shadow);

    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(hover ? 0x16203a : 0x0e1424, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      g.lineStyle(1.5, hover ? 0x4488ff : 0x223355, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      if (hover) { g.fillStyle(0x4488ff, 0.9); g.fillRoundedRect(x - w / 2, y - h / 2, 3, h, 2); }
    };
    draw(false);
    this.con.add(g);

    this.con.add(this.add.text(x, y - (sub ? 12 : 0), label, {
      fontSize: `${Math.round(18 * Math.min(this.S, 1.35))}px`, fontFamily: 'monospace', fontStyle: 'bold', color: '#ddddee',
    }).setOrigin(0.5));
    if (sub) {
      this.con.add(this.add.text(x, y + 16, sub, {
        fontSize: '18px', fontFamily: 'monospace', color: '#88aadd',
      }).setOrigin(0.5));
    }

    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => draw(true));
    z.on('pointerout',  () => draw(false));
    z.on('pointerdown', (...args) => { playSfx(this, SFX.click); onClick(...args); });
    this.con.add(z);
  }

  backLink(onClick) {
    this.con.add(drawBackButton(this, { label: 'BACK', onClick }).container);
  }

  renderSportStep() {
    this.headerText.setText('WHAT ROLE SHALL I TRAIN FOR?');
    this.subText.setText('This is who you are — your talent picks come next');

    const S = this.S;
    const cols = 2, bw = 220 * S, bh = 44 * S, gapX = 20, gapY = 12;
    const totalW = cols * bw + (cols - 1) * gapX;
    const startX = this.W / 2 - totalW / 2 + bw / 2;
    const startY = 92 + 22 * S;

    STARTING_SPORTS.forEach((sportId, i) => {
      const sport = sportById(sportId);
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (bw + gapX);
      const y = startY + row * (bh + gapY);
      this.makeButton(x, y, bw, bh, sport.name, null, () => {
        this.chosenSport = sportId;
        this.chosenRole = null;
        this.step = sport.roles.length >= 2 ? 'role' : 'element';
        if (sport.roles.length === 1) this.chosenRole = sport.roles[0].id;
        this.render();
      });
    });

    this.backLink(() => {
      this.step = 'name';
      this.render();
    });
  }

  renderRoleStep() {
    const sport = sportById(this.chosenSport);
    this.headerText.setText(`CHOOSE YOUR ROLE`);
    this.subText.setText(`${sport.name} — your in-sport position`);

    const bw = 260 * this.S, bh = 56 * this.S, gap = 16;
    const startY = this.H / 2 + 30 - (sport.roles.length * (bh + gap) - gap) / 2 + bh / 2;

    sport.roles.forEach((role, i) => {
      const y = startY + i * (bh + gap);
      this.makeButton(this.W / 2, y, bw, bh, role.name, role.designations.join(' / '), () => {
        this.chosenRole = role.id;
        this.step = 'element';
        this.render();
      });
    });

    // Back links moved into the header row (2026-07-11, "have the back
    // button at top of menues") — all 4 in this file were bottom-left,
    // now top-left alongside headerText/subText.
    this.backLink(() => {
      this.step = 'sport';
      this.render();
    });
  }

  renderElementStep() {
    this.headerText.setText('CHOOSE YOUR ELEMENT');
    this.subText.setText('Your affinity — shown alongside your class');

    const S = this.S;
    const cols = 3, bw = 140 * S, bh = 70 * S, gapX = 16, gapY = 16;
    const totalW = cols * bw + (cols - 1) * gapX;
    const startX = this.W / 2 - totalW / 2 + bw / 2;
    const startY = 110 + bh / 2;

    ELEMENTS.forEach((el, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (bw + gapX);
      const y = startY + row * (bh + gapY);
      this.makeButton(x, y, bw, bh, `${el.icon}  ${el.name}`, null, () => {
        this.chosenElement = el.name;
        this.step = 'talent1';
        this.render();
      });
    });

    // Back button — skip the role step if this sport only had one role
    const sport = sportById(this.chosenSport);
    this.backLink(() => {
      this.step = sport.roles.length >= 2 ? 'role' : 'sport';
      this.render();
    });
  }

  renderTalentStep(which) {
    const prev = which === 2 ? this.chosenTalents[0] : null;
    this.headerText.setText(`PICK TALENT ${which} OF 2`);
    this.subText.setText(
      prev
        ? `First pick: ${prev}. Pick it again for ×4 growth and bonus points, but you'll lose out on another talent's moves and abilities.`
        : 'Talents set which stats grow fastest (×2) and which moves and abilities you can learn later. Choose carefully.'
    );

    const bw = 260 * this.S, bh = 56 * this.S, gap = 16;
    const startY = this.H / 2 + 40 - (TALENTS.length * (bh + gap) - gap) / 2 + bh / 2;

    TALENTS.forEach((t, i) => {
      const y = startY + i * (bh + gap);
      const willStack = prev === t;
      const mult = willStack ? '×4 growth' : '×2 growth';
      this.makeButton(this.W / 2, y, bw, bh, t, `${mult}${willStack ? '  (2nd pick)' : ''}`, () => {
        this.chosenTalents[which - 1] = t;
        this.step = which === 1 ? 'talent2' : 'confirm';
        this.render();
      });
    });

    // Back button
    this.backLink(() => {
      this.step = which === 1 ? 'element' : 'talent1';
      this.render();
    });
  }

  renderConfirmStep() {
    this.headerText.setText('CONFIRM YOUR GIFT');
    const sport = sportById(this.chosenSport);
    const role = sport.roles.find(r => r.id === this.chosenRole);
    const elIcon = ELEMENTS.find(e => e.name === this.chosenElement)?.icon ?? '';
    this.subText.setText(`${sport.name} · ${role.name}  ·  ${elIcon} ${this.chosenElement}  ·  ${this.chosenTalents.join(' + ')}`);

    const STAT_TALENT = { speed: 'Speed', strength: 'Strength', endurance: 'Endurance', stamina: 'Stamina' };
    let y = 120;
    for (const [stat, talent] of Object.entries(STAT_TALENT)) {
      const picks = this.chosenTalents.filter(t => t === talent).length;
      const mult = Math.pow(2, picks);
      this.con.add(this.add.text(this.W / 2 - 240, y, stat.toUpperCase(), {
        fontSize: '22px', fontFamily: 'monospace', color: '#aabbcc',
      }));
      this.con.add(this.add.text(this.W / 2 + 240, y, `growth ×${mult}`, {
        fontSize: '22px', fontFamily: 'monospace', fontStyle: mult > 1 ? 'bold' : 'normal',
        color: mult >= 4 ? '#ffcc44' : mult === 2 ? '#44ccff' : '#8899aa',
      }).setOrigin(1, 0));
      y += 40;
    }

    this.makeButton(this.W / 2, y + 60, 360, 66, 'NEXT', null, () => {
      this.step = 'difficulty';
      this.render();
    });

    this.backLink(() => {
      this.step = 'talent2';
      this.render();
    });
  }

  renderDifficultyStep() {
    this.headerText.setText('CHOOSE YOUR DIFFICULTY');
    this.subText.setText(
      this.ngPlusGear.length
        ? `You can change this anytime from Settings.  ✦ New Game+: ${this.ngPlusGear.length} gear piece${this.ngPlusGear.length === 1 ? '' : 's'} carrying over.`
        : 'You can change this anytime from Settings on the title screen.'
    );

    const DESC = {
      newbie:   'Softer enemies, extra damage — a relaxed pace',
      veteran:  'Balanced — enemies scale to match your level',
      perilous: 'Enemies scale up further, full strength — no safety net',
    };

    const bw = 660, bh = 66 * this.S, gap = 16;
    const startY = this.H / 2 + 30 - (DIFFICULTIES.length * (bh + gap) - gap) / 2 + bh / 2;

    DIFFICULTIES.forEach((d, i) => {
      const y = startY + i * (bh + gap);
      this.makeButton(this.W / 2, y, bw, bh, d.label, DESC[d.key] ?? '', () => {
        const starter = createStarterUnit({
          t1Sport: this.chosenSport, t1Role: this.chosenRole,
          talents: this.chosenTalents, element: this.chosenElement,
          name: this.chosenName,
        });
        setDifficultyKey(d.key);
        newGame(starter, this.slot, this.ngPlusGear);
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldMapScene'));
      });
    });

    this.backLink(() => {
      this.step = 'confirm';
      this.render();
    });
  }
}
