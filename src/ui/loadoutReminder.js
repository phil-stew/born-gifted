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
  // Only empty slots, keyed by which slots: new drops for the same slot don't nag again.
  const fillable = emptySlots.filter(slot => state.inventory.some(it => it.slot === slot));
  if (fillable.length) list.push({ key: `gear:${fillable.join(',')}`, tab: 'equipment', text: `${firstName(unit)} has an empty gear slot` });

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

// A small, quiet note that fades in near the top of `scene`. Tapping it opens
// the matching Party tab; it fades out on its own after a few seconds.
export function showLoadoutReminder(scene) {
  const reminder = nextReminder();
  if (!reminder) return;
  seen.add(reminder.key);

  const { width } = scene.scale;
  const label = scene.add.text(0, 0, `${reminder.text}  ›`, {
    fontSize: '16px', fontFamily: 'monospace', color: '#c8d2ee',
  }).setOrigin(0.5);
  const w = label.width + 32, h = 34, restY = 44;
  const con = scene.add.container(width / 2, restY - 6).setDepth(5000).setAlpha(0);

  const g = scene.add.graphics();
  g.fillStyle(0x0d1428, 0.7);
  g.fillRoundedRect(-w / 2, 0, w, h, h / 2);
  g.lineStyle(1, 0x3a5aa0, 0.8);
  g.strokeRoundedRect(-w / 2, 0, w, h, h / 2);
  con.add(g);
  label.setPosition(0, h / 2);
  con.add(label);

  const leave = () => {
    if (!con.active) return;
    scene.tweens.add({
      targets: con, alpha: 0, duration: 400,
      onComplete: () => con.destroy(true),
    });
  };

  const zone = scene.add.zone(0, h / 2, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', () => {
    playSfx(scene, SFX.click);
    scene.scene.start('PartyScene', { selId: reminder.unitId, tab: reminder.tab });
  });
  con.add(zone);

  scene.tweens.add({ targets: con, y: restY, alpha: 1, duration: 400, delay: 800, ease: 'Sine.easeOut' });
  scene.time.delayedCall(5000, leave);
}
