import {
  state, pendingPromotion, classSkillSlotCount, gearLayoutForUnit,
  MAX_EQUIPPED_SPECIALS, MAX_EQUIPPED_SKILLS,
} from '../data/gameState.js';
import {
  getUnitSpecials, getUnitSkills, getUnitPassivePool,
  getEquippedSpecialAbilities, getEquippedSkillAbilities,
} from '../data/abilities.js';
import { playSfx, SFX } from '../audio/sound.js';

// Keys already shown this session, so returning to the map doesn't repeat a
// reminder. Each key includes a count, so learning something new shows again.
const seen = new Set();

function firstName(unit) {
  return unit.name.split(' ')[0];
}

export function remindersFor(unit) {
  const list = [];
  const promo = pendingPromotion(unit);
  if (promo) list.push({ key: `promo:${promo}`, tab: 'stats', text: `${firstName(unit)} can be promoted!` });

  const { slots } = gearLayoutForUnit(unit);
  const emptySlots = slots.filter(s => !unit.equip[s]);
  const gear = state.inventory.filter(it => emptySlots.includes(it.slot));
  if (gear.length) list.push({ key: `gear:${gear.length}`, tab: 'equipment', text: `${firstName(unit)} has gear to equip` });

  const specials = getUnitSpecials(unit);
  const usedSpecials = getEquippedSpecialAbilities(unit).filter(Boolean).length;
  if (usedSpecials < Math.min(MAX_EQUIPPED_SPECIALS, specials.length)) {
    list.push({ key: `special:${specials.length}`, tab: 'skills', text: `${firstName(unit)} has a Special to equip` });
  }

  const skills = getUnitSkills(unit);
  const usedSkills = getEquippedSkillAbilities(unit).filter(Boolean).length;
  if (usedSkills < Math.min(MAX_EQUIPPED_SKILLS, skills.length)) {
    list.push({ key: `skill:${skills.length}`, tab: 'skills', text: `${firstName(unit)} has a Skill to equip` });
  }

  const pool = getUnitPassivePool(unit);
  const slotCount = classSkillSlotCount(unit.level);
  const usedClass = (unit.classSkills ?? []).slice(0, slotCount).filter(Boolean).length;
  if (usedClass < Math.min(slotCount, pool.length)) {
    list.push({ key: `class:${slotCount}:${pool.length}`, tab: 'class', text: `${firstName(unit)} has a Class Skill to equip` });
  }
  return list.map(r => ({ ...r, key: `${unit.id}:${r.key}`, unitId: unit.id }));
}

function nextReminder() {
  for (const unit of state.party) {
    const found = remindersFor(unit).find(r => !seen.has(r.key));
    if (found) return found;
  }
  return null;
}

// Slides a banner down from the top of `scene`. Tapping it opens the matching
// Party tab; it leaves on its own after a few seconds.
export function showLoadoutReminder(scene) {
  const reminder = nextReminder();
  if (!reminder) return;
  seen.add(reminder.key);

  const { width } = scene.scale;
  const w = Math.min(760, width - 40), h = 62, restY = 40;
  const con = scene.add.container(width / 2, -h).setDepth(5000);

  const g = scene.add.graphics();
  g.fillStyle(0x0d1428, 0.96);
  g.fillRoundedRect(-w / 2, 0, w, h, 12);
  g.lineStyle(2, 0xffaa44, 1);
  g.strokeRoundedRect(-w / 2, 0, w, h, 12);
  con.add(g);

  con.add(scene.add.text(-w / 2 + 20, h / 2, reminder.text, {
    fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0, 0.5));
  con.add(scene.add.text(w / 2 - 20, h / 2, 'OPEN ▶', {
    fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffaa44',
  }).setOrigin(1, 0.5));

  const leave = () => {
    if (!con.active) return;
    scene.tweens.add({
      targets: con, y: -h - 10, duration: 250, ease: 'Sine.easeIn',
      onComplete: () => con.destroy(true),
    });
  };

  const zone = scene.add.zone(0, h / 2, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', () => {
    playSfx(scene, SFX.click);
    scene.scene.start('PartyScene', { selId: reminder.unitId, tab: reminder.tab });
  });
  con.add(zone);

  scene.tweens.add({ targets: con, y: restY, duration: 350, delay: 500, ease: 'Back.easeOut' });
  scene.time.delayedCall(7000, leave);
}
