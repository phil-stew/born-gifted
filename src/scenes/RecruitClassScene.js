import Phaser from 'phaser';
import {
  STARTING_SPORTS, sportById, TALENTS, ELEMENTS, elementIcon,
  FULL_ROSTER, recruitWithChoice, recruitNewUnit,
} from '../data/gameState.js';
import { loadHeroSprites, stripHeroBackground, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';

// Recruit flow: same sport → role → element → talent1 → talent2 choice
// machine as CharacterCreationScene (the protagonist's own new-game flow),
// reused here for roster characters (Drace/Sela/Kael/Trice/Zora) so the
// player picks their class too instead of it being preset — followed by a
// deliberately loud "joined the team" announcement (camera flash + big
// banner + portrait) before moving on. `recruitIds` is a queue: this scene
// restarts itself for the next id until the queue is empty, then hands off
// to nextScene/nextSceneData.
//
// `newRecruit: true` (2026-07-08 feedback — academies now offer repeatable
// recruiting after the exam) switches to a second mode: no fixed FULL_ROSTER
// template, an extra 'name' step up front (DOM text input via ui/domUI,
// since this scene otherwise draws to the Phaser canvas and has no native
// text-entry widget), and recruitNewUnit() instead of recruitWithChoice() on
// confirm. Both modes share every other step.
export class RecruitClassScene extends Phaser.Scene {
  constructor() { super({ key: 'RecruitClassScene' }); }

  init(data) {
    this.newRecruit   = !!data.newRecruit;
    this.recruitIds   = data.recruitIds ?? [];
    this.idx          = data.idx ?? 0;
    this.nextScene     = data.nextScene ?? 'WorldMapScene';
    this.nextSceneData = data.nextSceneData ?? {};
    // Optional Sport `class` filter (e.g. 'Athletics', 'Bat & Ball') — set
    // when recruiting through a specific academy (HUB_CONFIGS.recruitPool,
    // M0-M4 redesign); unset for the general recruit flow, which offers
    // every starting sport same as before.
    this.sportClassFilter = data.sportClass ?? null;

    this.recruitId = this.recruitIds[this.idx];
    this.template  = FULL_ROSTER.find(u => u.id === this.recruitId);

    this.step = this.newRecruit ? 'name' : 'sport'; // 'name' | 'sport' | 'role' | 'element' | 'talent1' | 'talent2' | 'confirm' | 'announce'
    this.chosenName = '';
    this.chosenSport = null;
    this.chosenRole = null;
    this.chosenElement = null;
    this.chosenTalents = [];
    this.recruitedUnit = null;
  }

  // The name shown in step headers/banners — the FULL_ROSTER template's fixed
  // name in the story-recruit mode, or the player's own typed name in newRecruit mode.
  displayName() {
    return this.newRecruit ? this.chosenName : this.template.name;
  }

  // Starting sports available for this recruit — the full STARTING_SPORTS
  // list, or narrowed to one Sport `class` when recruiting via a specific
  // academy.
  availableSports() {
    if (!this.sportClassFilter) return STARTING_SPORTS;
    // sportClass can be a single class string (Ester: 'Athletics') or an
    // array of classes (Hilbert: Bat & Ball + Ball, 2026-07-08 feedback).
    const classes = Array.isArray(this.sportClassFilter) ? this.sportClassFilter : [this.sportClassFilter];
    return STARTING_SPORTS.filter(id => classes.includes(sportById(id).class));
  }

  preload() {
    // Every T1 role reachable from the sport-picker below, loaded up front
    // so whichever one gets picked is already cached by the 'announce' step.
    const roleIds = new Set();
    for (const sportId of this.availableSports()) {
      sportById(sportId).roles.forEach(r => roleIds.add(r.id));
    }
    const classNames = [...roleIds].map(spriteKeyForRole).filter(Boolean);
    loadHeroSprites(this, classNames);
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    const roleIds = new Set();
    for (const sportId of this.availableSports()) {
      sportById(sportId).roles.forEach(r => roleIds.add(r.id));
    }
    for (const roleId of roleIds) {
      const cn = spriteKeyForRole(roleId);
      if (cn) stripHeroBackground(this, cn);
    }

    this.bg = this.add.graphics();
    this.bg.fillStyle(0x0a0a18, 1);
    this.bg.fillRect(0, 0, width, height);

    this.headerText = this.add.text(width / 2, 30, '', {
      fontSize: '18px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    this.subText = this.add.text(width / 2, 54, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#7788aa',
    }).setOrigin(0.5);

    this.con = this.add.container(0, 0);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.events.once('shutdown', unmount);
    this.render();
  }

  renderNameStep() {
    mount(`
      <div class="ui-screen" style="align-items:center; justify-content:center;">
        <div class="ui-modal">
          <div class="ui-modal-title">NAME YOUR RECRUIT</div>
          <div class="ui-modal-sub">Choose a name for your new teammate.</div>
          <input id="recruit-name-input" class="ui-text-input" type="text" maxlength="18"
            placeholder="Enter a name" value="${esc(this.chosenName)}" />
          <div class="ui-modal-actions">
            <button class="ui-btn ui-btn-primary" data-name-confirm="1">Continue</button>
            <button class="ui-btn ui-btn-muted" data-name-cancel="1">Cancel</button>
          </div>
        </div>
      </div>
    `);
    const input = document.getElementById('recruit-name-input');
    input?.focus();
    const submit = () => {
      const val = input?.value.trim();
      if (!val) return;
      this.chosenName = val;
      this.step = 'sport';
      this.render();
    };
    onClick('[data-name-confirm]', submit);
    onClick('[data-name-cancel]', () => {
      unmount();
      this.scene.start(this.nextScene, this.nextSceneData);
    });
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  }

  render() {
    this.con.removeAll(true);
    if (this.step === 'name') { this.renderNameStep(); return; }
    unmount();
    if (this.step === 'sport')    this.renderSportStep();
    if (this.step === 'role')     this.renderRoleStep();
    if (this.step === 'element')  this.renderElementStep();
    if (this.step === 'talent1')  this.renderTalentStep(1);
    if (this.step === 'talent2')  this.renderTalentStep(2);
    if (this.step === 'confirm')  this.renderConfirmStep();
    if (this.step === 'announce') this.renderAnnounceStep();
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

    this.con.add(this.add.text(x, y - (sub ? 8 : 0), label, {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ddddee',
    }).setOrigin(0.5));
    if (sub) {
      this.con.add(this.add.text(x, y + 10, sub, {
        fontSize: '9px', fontFamily: 'monospace', color: '#5577aa',
      }).setOrigin(0.5));
    }

    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => draw(true));
    z.on('pointerout',  () => draw(false));
    z.on('pointerdown', onClick);
    this.con.add(z);
  }

  // Moved into the header (2026-07-11, "have the back button at top of
  // menues") — was bottom-left, now top-left alongside the step header.
  backLink(onClick) {
    this.con.add(this.add.text(20, 16, '◀ back', {
      fontSize: '11px', fontFamily: 'monospace', color: '#556688',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', onClick));
  }

  renderSportStep() {
    this.headerText.setText(`CHOOSE ${this.displayName().split(' ')[0].toUpperCase()}'S SPORT`);
    this.subText.setText(`${this.displayName()} just joined the team — pick their class`);

    const cols = 2, bw = 220, bh = 44, gapX = 20, gapY = 12;
    const totalW = cols * bw + (cols - 1) * gapX;
    const startX = this.W / 2 - totalW / 2 + bw / 2;
    const startY = 100;

    this.availableSports().forEach((sportId, i) => {
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

    if (this.newRecruit) this.backLink(() => { this.step = 'name'; this.render(); });
  }

  renderRoleStep() {
    const sport = sportById(this.chosenSport);
    this.headerText.setText('CHOOSE THEIR ROLE');
    this.subText.setText(`${sport.name} — in-sport position`);

    const bw = 260, bh = 56, gap = 16;
    const startY = this.H / 2 - (sport.roles.length * (bh + gap) - gap) / 2;

    sport.roles.forEach((role, i) => {
      const y = startY + i * (bh + gap);
      this.makeButton(this.W / 2, y, bw, bh, role.name, role.designations.join(' / '), () => {
        this.chosenRole = role.id;
        this.step = 'element';
        this.render();
      });
    });

    this.backLink(() => { this.step = 'sport'; this.render(); });
  }

  renderElementStep() {
    this.headerText.setText('CHOOSE THEIR ELEMENT');
    this.subText.setText('Affinity — shown alongside their class');

    const cols = 3, bw = 140, bh = 70, gapX = 16, gapY = 16;
    const totalW = cols * bw + (cols - 1) * gapX;
    const startX = this.W / 2 - totalW / 2 + bw / 2;
    const startY = 130;

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

    const sport = sportById(this.chosenSport);
    this.backLink(() => { this.step = sport.roles.length >= 2 ? 'role' : 'sport'; this.render(); });
  }

  renderTalentStep(which) {
    const prev = which === 2 ? this.chosenTalents[0] : null;
    this.headerText.setText(`PICK TALENT ${which} OF 2`);
    this.subText.setText(
      prev
        ? `First pick: ${prev}. Picking it again quadruples its growth instead of doubling.`
        : 'Each talent doubles that stat\'s growth per level-up.'
    );

    const bw = 260, bh = 56, gap = 16;
    const startY = this.H / 2 - (TALENTS.length * (bh + gap) - gap) / 2;

    TALENTS.forEach((t, i) => {
      const y = startY + i * (bh + gap);
      const willStack = prev === t;
      const mult = willStack ? '×4 growth' : '×2 growth';
      this.makeButton(this.W / 2, y, bw, bh, t, `${mult}${willStack ? '  (stacks with pick 1)' : ''}`, () => {
        this.chosenTalents[which - 1] = t;
        this.step = which === 1 ? 'talent2' : 'confirm';
        this.render();
      });
    });

    this.backLink(() => { this.step = which === 1 ? 'element' : 'talent1'; this.render(); });
  }

  renderConfirmStep() {
    this.headerText.setText(`CONFIRM ${this.displayName().split(' ')[0].toUpperCase()}'S CLASS`);
    const sport = sportById(this.chosenSport);
    const role = sport.roles.find(r => r.id === this.chosenRole);
    const elIcon = elementIcon(this.chosenElement);
    this.subText.setText(`${sport.name} · ${role.name}  ·  ${elIcon} ${this.chosenElement}  ·  ${this.chosenTalents.join(' + ')}`);

    const STAT_TALENT = { speed: 'Speed', strength: 'Strength', endurance: 'Endurance', stamina: 'Stamina' };
    let y = 110;
    for (const [stat, talent] of Object.entries(STAT_TALENT)) {
      const picks = this.chosenTalents.filter(t => t === talent).length;
      const mult = Math.pow(2, picks);
      this.con.add(this.add.text(this.W / 2 - 120, y, stat.toUpperCase(), {
        fontSize: '12px', fontFamily: 'monospace', color: '#8899bb',
      }));
      this.con.add(this.add.text(this.W / 2 + 120, y, `growth ×${mult}`, {
        fontSize: '12px', fontFamily: 'monospace', fontStyle: mult > 1 ? 'bold' : 'normal',
        color: mult >= 4 ? '#ffcc44' : mult === 2 ? '#44ccff' : '#556677',
      }).setOrigin(1, 0));
      y += 26;
    }

    this.makeButton(this.W / 2, y + 50, 240, 46, `RECRUIT ${this.displayName().split(' ')[0].toUpperCase()}`, null, () => {
      this.recruitedUnit = this.newRecruit
        ? recruitNewUnit({
            name: this.chosenName,
            t1Sport: this.chosenSport, t1Role: this.chosenRole,
            talents: this.chosenTalents, element: this.chosenElement,
          })
        : recruitWithChoice(this.recruitId, {
            t1Sport: this.chosenSport, t1Role: this.chosenRole,
            talents: this.chosenTalents, element: this.chosenElement,
          });
      // recruitNewUnit/recruitWithChoice return null if the roster filled up
      // (or, for recruitWithChoice, the character already joined) between
      // this scene opening and confirming — bail straight to nextScene
      // rather than crashing the announce step on a null unit.
      if (!this.recruitedUnit) {
        this.scene.start(this.nextScene, this.nextSceneData);
        return;
      }
      this.step = 'announce';
      this.render();
    });

    this.backLink(() => { this.step = 'talent2'; this.render(); });
  }

  renderAnnounceStep() {
    // Deliberately loud: camera flash + big gold banner + a pop-in portrait,
    // per the ask for a "very noticeable" join moment.
    this.cameras.main.flash(400, 255, 215, 80);

    this.headerText.setText('');
    this.subText.setText('');

    const unit = this.recruitedUnit;
    const sport = sportById(unit.t1Sport);
    const role = sport.roles.find(r => r.id === unit.t1Role);
    const cx = this.W / 2;

    const spriteKey = spriteKeyForRole(unit.t1Role);
    if (spriteKey && this.textures.exists(heroKey(spriteKey))) {
      const portrait = this.add.image(cx, 150, heroKey(spriteKey), firstFrame(spriteKey))
        .setScale(0.001).setAlpha(0);
      this.con.add(portrait);
      this.tweens.add({
        targets: portrait, scale: 2.2, alpha: 1,
        duration: 450, ease: 'Back.easeOut',
      });
    }

    const banner = this.add.text(cx, 260, `★ ${unit.name.toUpperCase()} ★`, {
      fontSize: '26px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#ffdd44',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScale(0.3);
    this.con.add(banner);
    this.tweens.add({ targets: banner, scale: 1, duration: 350, ease: 'Back.easeOut', delay: 150 });

    const joinedText = this.add.text(cx, 296, 'HAS JOINED THE TEAM!', {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);
    this.con.add(joinedText);
    this.tweens.add({ targets: joinedText, alpha: 1, duration: 300, delay: 400 });

    this.con.add(this.add.text(cx, 330, `${sport.name}  ·  ${role.name}  ·  ${elementIcon(unit.element)} ${unit.element}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5));
    this.con.add(this.add.text(cx, 350, `Talents: ${unit.talents.join(' + ')}  ·  Level ${unit.level}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#667799',
    }).setOrigin(0.5));

    this.makeButton(cx, 430, 220, 46, 'CONTINUE', null, () => {
      const nextIdx = this.idx + 1;
      if (nextIdx < this.recruitIds.length) {
        this.scene.restart({
          recruitIds: this.recruitIds, idx: nextIdx,
          nextScene: this.nextScene, nextSceneData: this.nextSceneData,
        });
      } else {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.nextScene, this.nextSceneData));
      }
    });
  }
}
