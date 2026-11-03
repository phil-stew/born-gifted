import Phaser from 'phaser';
import {
  STARTING_SPORTS, sportById, TALENTS, ELEMENTS, elementIcon,
  FULL_ROSTER, recruitWithChoice, recruitNewUnit,
} from '../data/gameState.js';
import { loadHeroSprites, stripHeroBackground, createHeroAnims, getSpriteInfo, heroKey, firstFrame, spriteKeyForRole } from '../data/heroSprites.js';
import { mount, unmount, onClick, esc } from '../ui/domUI.js';
import { playSfx, SFX } from '../audio/sound.js';
import { drawBackButton } from '../ui/canvasButton.js';
import { BACKDROPS } from '../data/storyBackdrops.js';

// Recruit flow: same sport → role → element → talent1 → talent2 choice
// machine as CharacterCreationScene (the protagonist's own new-game flow),
// reused here for roster characters (Drace/Sela/Zora) so the
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
// confirm. Both modes share every other step. The name comes last, on one
// screen with the class summary, so the phone keyboard only opens at the end.
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

    this.step = 'sport'; // 'sport' | 'role' | 'element' | 'talent1' | 'talent2' | 'confirm' (or 'name' for newRecruit) | 'announce'
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
    return this.newRecruit ? (this.chosenName || 'Your recruit') : this.template.name;
  }

  // Starting sports available for this recruit — the full STARTING_SPORTS
  // list, or narrowed to one Sport `class` when recruiting via a specific
  // academy.
  availableSports() {
    if (!this.sportClassFilter) return STARTING_SPORTS;
    // sportClass can be a single class string (Ester: 'Athletics') or an
    // array of classes (Hilbert: Bat & Ball + Ball, 2026-07-08 feedback).
    // Listed in class order, so the academy's own classes come first.
    const classes = Array.isArray(this.sportClassFilter) ? this.sportClassFilter : [this.sportClassFilter];
    return STARTING_SPORTS.filter(id => classes.includes(sportById(id).class))
      .sort((a, b) => classes.indexOf(sportById(a).class) - classes.indexOf(sportById(b).class));
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
    if (!this.textures.exists(BACKDROPS.schoolTraining.key)) this.load.image(BACKDROPS.schoolTraining.key, BACKDROPS.schoolTraining.path);
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;
    this.S = width >= 1000 ? 1.5 : 1;

    const roleIds = new Set();
    for (const sportId of this.availableSports()) {
      sportById(sportId).roles.forEach(r => roleIds.add(r.id));
    }
    this.runnerClasses = [];
    for (const roleId of roleIds) {
      const cn = spriteKeyForRole(roleId);
      if (!cn) continue;
      stripHeroBackground(this, cn);
      createHeroAnims(this, cn);
      if (this.textures.exists(heroKey(cn))) this.runnerClasses.push(cn);
    }

    this.drawBackground();

    this.time.addEvent({ delay: 1300, loop: true, callback: () => this.spawnRunner() });
    for (let i = 0; i < 4; i++) this.spawnRunner(Math.random());

    this.headerText = this.add.text(width / 2, 24, '', {
      fontSize: '26px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#14284a',
      stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);

    this.subText = this.add.text(width / 2, 44, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#1e3a66',
      stroke: '#ffffff', strokeThickness: 3,
      align: 'center', wordWrap: { width: width - 60 },
    }).setOrigin(0.5, 0).setDepth(20);

    this.con = this.add.container(0, 0).setDepth(20);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.events.once('shutdown', unmount);
    this.render();
  }

  // Last step for a new recruit: the class they built, and their name.
  // Sunny training field covered in little coloured pixels drifting upward.
  // The menus sit on top of them.
  drawBackground() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xcfe4f7).setDepth(-10);
    if (this.textures.exists(BACKDROPS.schoolTraining.key)) {
      const img = this.add.image(width / 2, height / 2, BACKDROPS.schoolTraining.key).setDepth(-10);
      img.setScale(Math.max(width / img.width, height / img.height));
    }
    // One small emitter per colour, so each pixel keeps a clear colour.
    [0xffffff, 0x8fd3ff, 0x4f8fe0, 0xffd76a, 0xff9ec7, 0x9ef0c0].forEach(color => {
      const key = `recruit-pixel-${color}`;
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillRect(0, 0, 6, 6);
        g.generateTexture(key, 6, 6);
        g.destroy();
      }
      // Spawn anywhere on the page so it's covered from the start.
      this.add.particles(0, 0, key, {
        x: { min: 0, max: width }, y: { min: 0, max: height },
        speedY: { min: -40, max: -12 }, speedX: { min: -14, max: 14 },
        scale: { min: 0.6, max: 1.5 }, alpha: { values: [0, 1, 1, 0] },
        lifespan: { min: 5000, max: 9000 }, frequency: 120, quantity: 1,
        advance: 9000,
      }).setDepth(-5);
    });
  }

  // A hero from one of the offered classes running across the field behind
  // the menu. Lower on the screen means closer, so bigger. `startAt` (0-1)
  // places one part way across, to fill the field on the first frame.
  spawnRunner(startAt = 0) {
    if (!this.runnerClasses.length) return;
    const { width, height } = this.scale;
    const cn = Phaser.Utils.Array.GetRandom(this.runnerClasses);
    const key = heroKey(cn);
    const depthT = Phaser.Math.FloatBetween(0, 1);
    const y = height * (0.5 + 0.45 * depthT);
    const scale = 0.28 + 0.22 * depthT;
    const toRight = Math.random() < 0.5;
    const fromX = toRight ? -60 : width + 60, toX = toRight ? width + 60 : -60;
    const sprite = this.add.sprite(fromX + (toX - fromX) * startAt, y, key, firstFrame(cn))
      .setScale(scale).setOrigin(0.5, 0.92).setDepth(depthT).setAlpha(0.95).setFlipX(!toRight);
    const anim = getSpriteInfo(cn)?.noMoveAnim ? `${key}-idle` : `${key}-run`;
    if (this.anims.exists(anim)) sprite.play(anim);
    this.tweens.add({
      targets: sprite, x: toX, duration: Phaser.Math.Between(6000, 9000) * (1 - startAt),
      onComplete: () => sprite.destroy(),
    });
  }

  renderNameStep() {
    this.headerText.setText('');
    this.subText.setText('');
    const sport = sportById(this.chosenSport);
    const role = sport.roles.find(r => r.id === this.chosenRole);
    const growth = TALENTS.map(t => `${t} ×${Math.pow(2, this.chosenTalents.filter(x => x === t).length)}`).join(' · ');
    mount(`
      <div class="ui-screen ui-see-through" style="align-items:center; justify-content:center;">
        <div class="ui-modal">
          <div class="ui-modal-title">NAME YOUR RECRUIT</div>
          <div class="ui-modal-sub">${esc(sport.name)} · ${esc(role.name)} · ${elementIcon(this.chosenElement)} ${esc(this.chosenElement)}</div>
          <div class="ui-modal-sub">Growth: ${esc(growth)}</div>
          <input id="recruit-name-input" class="ui-text-input" type="text" maxlength="18"
            placeholder="Enter a name" value="${esc(this.chosenName)}" />
          <div class="ui-modal-actions">
            <button class="ui-btn ui-btn-primary" data-name-confirm="1">Recruit</button>
            <button class="ui-btn ui-btn-muted" data-name-cancel="1">Back</button>
          </div>
        </div>
      </div>
    `);
    const input = document.getElementById('recruit-name-input');
    const submit = () => {
      const val = input?.value.trim();
      if (!val) { input?.focus(); return; }
      this.chosenName = val;
      unmount();
      this.recruit();
    };
    onClick('[data-name-confirm]', submit);
    onClick('[data-name-cancel]', () => {
      this.chosenName = input?.value.trim() ?? '';
      this.step = 'talent2';
      this.render();
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
      g.fillStyle(hover ? 0x16203a : 0x0e1424, 0.9);
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

  // Moved into the header (2026-07-11, "have the back button at top of
  // menues") — was bottom-left, now top-left alongside the step header.
  backLink(onClick) {
    this.con.add(drawBackButton(this, { label: 'BACK', onClick }).container);
  }

  renderSportStep() {
    this.headerText.setText(this.newRecruit ? 'CHOOSE YOUR RECRUIT\'S SPORT' : `CHOOSE ${this.displayName().split(' ')[0].toUpperCase()}'S SPORT`);
    this.subText.setText(this.newRecruit ? 'Build your new teammate\'s class, then name them' : `${this.displayName()} just joined the team — pick their class`);

    const S = this.S;
    const cols = 2, bw = 220 * S, bh = 44 * S, gapX = 20, gapY = 12;
    const totalW = cols * bw + (cols - 1) * gapX;
    const startX = this.W / 2 - totalW / 2 + bw / 2;
    const startY = 92 + 22 * S;

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

    if (this.newRecruit) this.backLink(() => this.scene.start(this.nextScene, this.nextSceneData));
  }

  renderRoleStep() {
    const sport = sportById(this.chosenSport);
    this.headerText.setText('CHOOSE THEIR ROLE');
    this.subText.setText(`${sport.name} — in-sport position`);

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

    this.backLink(() => { this.step = 'sport'; this.render(); });
  }

  renderElementStep() {
    this.headerText.setText('CHOOSE THEIR ELEMENT');
    this.subText.setText('Affinity — shown alongside their class');

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

    const sport = sportById(this.chosenSport);
    this.backLink(() => { this.step = sport.roles.length >= 2 ? 'role' : 'sport'; this.render(); });
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
        this.step = which === 1 ? 'talent2' : this.newRecruit ? 'name' : 'confirm';
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

    this.makeButton(this.W / 2, y + 60, 420, 66, `RECRUIT ${this.displayName().split(' ')[0].toUpperCase()}`, null, () => this.recruit());

    this.backLink(() => { this.step = 'talent2'; this.render(); });
  }

  recruit() {
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
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);
    this.con.add(joinedText);
    this.tweens.add({ targets: joinedText, alpha: 1, duration: 300, delay: 400 });

    this.con.add(this.add.text(cx, 330, `${sport.name}  ·  ${role.name}  ·  ${elementIcon(unit.element)} ${unit.element}`, {
      fontSize: '17px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5));
    this.con.add(this.add.text(cx, 350, `Talents: ${unit.talents.join(' + ')}  ·  Level ${unit.level}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#99aacc',
    }).setOrigin(0.5));

    this.makeButton(cx, 450, 340, 66, 'CONTINUE', null, () => {
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
