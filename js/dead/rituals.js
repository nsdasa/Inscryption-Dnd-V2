// ═══════════════════════════════════════════════════════════
// THE SCRYBE OF THE DEAD — RITUALS & LEVEL FEATURES
// ═══════════════════════════════════════════════════════════
// Obol Flip, Rusted Nail, Burial Ritual, Gravedigging, plus
// level-gated abilities (Recurring Dead, Bone Lord's Tithe,
// Bone Lord command, etc.)
// ═══════════════════════════════════════════════════════════

// Level feature table — used by updateFeatureList() and guards
const DEAD_LEVEL_FEATURES = {
  1:  ['Grim Quill', 'Inscription Cards', 'Bones & Souls', 'Fleeting Undead',
       'Obol Flip', 'Rusted Nail Ritual', 'Burial Ritual', 'Gravedigging'],
  2:  ['Early Grave'],
  3:  ["Death's Whisper"],
  4:  ['ASI'],
  5:  ['All Roads'],
  6:  ['Bone Hoard — Bones reset on Short Rest'],
  7:  ['Collective Grave — +1 bone on any death within 60 ft'],
  8:  ['ASI'],
  9:  ['Boner — 10 bones → temp buff stat'],
  10: ['Dead Masstery — Dead Masses can attack'],
  11: ['Recurring Dead — bonus action, 2 souls → Dead to hand'],
  12: ['ASI'],
  13: ['By Daylight — Due Date bones windfall'],
  14: ["Bone Lord's Tithe — 1×/LR, all souls → bones ×2"],
  15: ['Ambidextrous Drawing — draw 2/turn'],
  16: ['ASI'],
  17: ['Undying Resilience'],
  18: ['The Snake Itself Eats — 20 bones → heal a card'],
  19: ['ASI'],
  20: ['The Bone Lord — 1×/LR, command cards to die'],
};

function describeLevelFeature(lv) {
  const feats = DEAD_LEVEL_FEATURES[lv];
  return feats ? feats.join(', ') : '';
}

function updateFeatureList() {
  const el = document.getElementById('feature-list');
  if (!el) return;
  const lv = getLevel();
  const rows = [];
  for (let i = 1; i <= lv; i++) {
    const feats = DEAD_LEVEL_FEATURES[i];
    if (!feats) continue;
    rows.push(`<div class="feat-row"><span class="feat-lv">Lv ${i}</span><span class="feat-txt">${feats.join(', ')}</span></div>`);
  }
  el.innerHTML = rows.length ? rows.join('') : '<p style="font-size:.55rem;color:var(--dim);font-style:italic">No features unlocked</p>';
  // Update level-gated buttons
  const recurBtn = document.getElementById('btn-recurring-dead');
  if (recurBtn) recurBtn.disabled = lv < 11;
  const titheBtn = document.getElementById('btn-bone-tithe');
  if (titheBtn) titheBtn.disabled = lv < 14;
  const snakeBtn = document.getElementById('btn-snake-heal');
  if (snakeBtn) snakeBtn.disabled = lv < 18;
  const blBtn = document.getElementById('btn-bone-lord');
  if (blBtn) blBtn.disabled = lv < 20;
  const bonerBtn = document.getElementById('btn-boner');
  if (bonerBtn) bonerBtn.disabled = lv < 9;
}

// ═══════════════════════════════════════════════════════════
// RITUAL MODAL — shared picker for Obol / Nail / Burial
// ═══════════════════════════════════════════════════════════
// ritualMode: 'obol' | 'nail' | 'burial'
// selection: Set of card ids
let ritualMode = null;
let ritualSelection = [];

function openRitual(mode) {
  ritualMode = mode;
  ritualSelection = [];
  const picker = document.getElementById('ritual-picker');
  const title = document.getElementById('ritual-title');
  const hint  = document.getElementById('ritual-hint');
  const resolveBtn = document.getElementById('ritual-resolve');
  if (mode === 'obol') {
    if ((S.obolFlipsLeft || 0) <= 0) { toast('No Obol flips left today.'); return; }
    title.textContent = `Obol Flip (${S.obolFlipsLeft} left)`;
    hint.textContent = 'Choose 1 or 2 cards from your hand or field, then flip.';
    resolveBtn.dataset.fn = 'obolResolve';
    resolveBtn.textContent = 'Flip Coin';
  } else if (mode === 'nail') {
    title.textContent = 'Rusted Nail Ritual';
    hint.textContent = 'Choose one card. Lightning strikes — roll a d6.';
    resolveBtn.dataset.fn = 'nailResolve';
    resolveBtn.textContent = 'Strike with Lightning';
  } else if (mode === 'burial') {
    title.textContent = 'Burial Ritual';
    hint.textContent = 'Choose one card to bury. Roll a d4 for the outcome.';
    resolveBtn.dataset.fn = 'burialResolve';
    resolveBtn.textContent = 'Bury Card';
  }
  picker.style.display = 'flex';
  refreshRitualPicker();
}
function openObolFlip()   { openRitual('obol'); }
function openRustedNail() { openRitual('nail'); }
function openBurialRitual(){ openRitual('burial'); }

function closeRitual() {
  ritualMode = null;
  ritualSelection = [];
  const picker = document.getElementById('ritual-picker');
  if (picker) picker.style.display = 'none';
}

function refreshRitualPicker() {
  const grid = document.getElementById('ritual-card-grid');
  if (!grid) return;
  // Show all non-dead cards except Dead Masses (excluded from obol; still
  // allowed in nail/burial — DM choice, for simplicity we allow them in
  // nail/burial but lock them out of obol)
  const cards = S.cards.filter(c => {
    if (c.zone === 'dead') return false;
    if (ritualMode === 'obol' && c.type === 'DeadMass') return false;
    return true;
  });
  if (!cards.length) {
    grid.innerHTML = '<p style="font-size:.6rem;color:var(--dim);font-style:italic;grid-column:1/-1;text-align:center">No eligible cards</p>';
    return;
  }
  grid.innerHTML = cards.map(c => {
    const selected = ritualSelection.includes(c.id) ? 'selected' : '';
    return `<div class="ritual-card ${selected}" data-fn="selectRitualCard" data-cid="${c.id}">
      <div class="rc-name">${c.name}</div>
      <div class="rc-meta">${c.type || ''} · CR ${c.cr}</div>
      <div class="rc-cost">🦴${c.bonCost||0} · 💎${c.soulCost||0}</div>
    </div>`;
  }).join('');
  // Update selection counter
  const cnt = document.getElementById('ritual-count');
  if (cnt) cnt.textContent = `${ritualSelection.length} selected`;
}

function selectRitualCard(cid) {
  if (ritualMode === 'obol') {
    const idx = ritualSelection.indexOf(cid);
    if (idx >= 0) ritualSelection.splice(idx, 1);
    else if (ritualSelection.length < 2) ritualSelection.push(cid);
    else toast('Obol Flip only allows 1 or 2 cards.');
  } else {
    // nail / burial: single selection
    ritualSelection = [cid];
  }
  refreshRitualPicker();
}

// ═══════════════════════════════════════════════════════════
// OBOL FLIP
// ═══════════════════════════════════════════════════════════
function obolResolve() {
  if ((S.obolFlipsLeft || 0) <= 0) { toast('No Obol flips left today.'); return; }
  if (ritualSelection.length < 1) { toast('Select 1 or 2 cards.'); return; }
  const coin = Math.random() < 0.5 ? 'Heads' : 'Tails';
  sfx('aud-blessing');
  S.obolFlipsLeft = (S.obolFlipsLeft || 0) - 1;

  if (ritualSelection.length === 2) {
    if (coin === 'Heads') {
      // Duplicate both
      ritualSelection.forEach(cid => {
        const orig = getCard(cid);
        if (!orig) return;
        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = makeId();
        copy.name = orig.name + ' (copy)';
        copy.zone = 'deck';
        copy.curHp = copy.maxHp;
        copy.condStack = [];
        S.cards.push(copy);
      });
      log(`🪙 Obol Flip (2 cards): ${coin} — both cards duplicated`);
      toast('Heads! Both cards duplicated.');
    } else {
      // Fuse into Dead Mass
      const cards = ritualSelection.map(getCard).filter(Boolean);
      const avgHp = Math.round(cards.reduce((s,c)=>s+c.maxHp,0) / cards.length * 1.8);
      const mass = {
        id: makeId(),
        name: `Dead Mass of ${cards.map(c=>c.name).join(' & ')}`,
        cr: '?',
        type: 'DeadMass',
        bonCost: 0, soulCost: 0,
        maxHp: avgHp, curHp: avgHp,
        ac: 12, spd: '15 ft', atk: '+0',
        dmgOptions: [{ dmg: '1d8', dtype: 'bludgeoning' }],
        dmg: '1d8', dtype: 'bludgeoning',
        str: 16, dex: 6, con: 16, int: 3, wis: 6, cha: 4,
        saves: '', senses: '', imm: 'poison', res: '', lang: '',
        abils: getLevel() >= 10 ? 'Attacks as Dead Masstery' : 'Cannot attack (unlocks level 10). Moves and defends by size.',
        deathTrigger: '',
        zone: 'deck',
        baseCond: 'Normal',
        condStack: [],
        sacrificedCount: cards.length,
        actUsed: false, bonUsed: false, reaUsed: false,
      };
      S.cards.push(mass);
      // Remove the consumed cards entirely
      const removeIds = new Set(ritualSelection);
      S.cards = S.cards.filter(c => !removeIds.has(c.id));
      log(`🪙 Obol Flip (2 cards): ${coin} — fused into Dead Mass (${mass.sacrificedCount} cards)`);
      toast('Tails! Cards fused into Dead Mass.');
    }
  } else {
    // 1 card
    if (coin === 'Heads') {
      const orig = getCard(ritualSelection[0]);
      if (orig) {
        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = makeId();
        copy.name = orig.name + ' (copy)';
        copy.zone = 'deck';
        copy.curHp = copy.maxHp;
        copy.condStack = [];
        S.cards.push(copy);
        log(`🪙 Obol Flip (1 card): ${coin} — ${orig.name} duplicated`);
        toast('Heads! Card duplicated.');
      }
    } else {
      // Destroy permanently
      const orig = getCard(ritualSelection[0]);
      if (orig) {
        S.cards = S.cards.filter(c => c.id !== orig.id);
        log(`🪙 Obol Flip (1 card): ${coin} — ${orig.name} destroyed permanently`);
        toast('Tails! Card destroyed.');
      }
    }
  }
  save(); closeRitual(); renderAll();
}

// ═══════════════════════════════════════════════════════════
// RUSTED NAIL RITUAL
// ═══════════════════════════════════════════════════════════
function nailResolve() {
  if (ritualSelection.length !== 1) { toast('Select exactly one card.'); return; }
  const c = getCard(ritualSelection[0]);
  if (!c) return;
  const roll = Math.floor(Math.random() * 6) + 1;
  const STATS = ['str','dex','con','int','wis','cha'];
  const statName = STATS[Math.floor(Math.random() * 6)];

  let msg = '';
  if (roll <= 2) {
    // Brittle — or level 17 Undying if already Brittle
    const already = (c.condStack || []).some(s => s.name === 'Brittle');
    if (already && getLevel() >= 17) {
      c.maxHp = Math.max(1, Math.floor(c.maxHp / 2));
      c.curHp = Math.min(c.curHp, c.maxHp);
      if (!c.condStack) c.condStack = [];
      c.condStack.push({ name: 'Undying', dur: null });
      msg = `d6 = ${roll} — Already Brittle → Undying (stats halved)`;
    } else if (already) {
      // Additional negative effect: Weakened permanent
      c.condStack.push({ name: 'Weakened', dur: null });
      msg = `d6 = ${roll} — Already Brittle → +Weakened (permanent)`;
    } else {
      if (!c.condStack) c.condStack = [];
      c.condStack.push({ name: 'Brittle', dur: null });
      c.type = 'Fleeting';
      msg = `d6 = ${roll} — ${c.name} becomes Brittle (Fleeting Undead)`;
    }
  } else if (roll <= 4) {
    c[statName] = (c[statName] || 10) + 1;
    if (!c.condStack) c.condStack = [];
    c.condStack.push({ name: 'Brittle', dur: null });
    c.type = 'Fleeting';
    msg = `d6 = ${roll} — +1 ${statName.toUpperCase()} and Brittle`;
  } else {
    const bonus = roll === 5 ? 2 : 3;
    c[statName] = (c[statName] || 10) + bonus;
    const triggers = [
      'On death: gain 1 Soul',
      'On death: all allies +1 atk',
      'On death: explode for 1d4 necrotic',
      'On death: draw a card',
    ];
    const trig = triggers[Math.floor(Math.random() * triggers.length)];
    c.deathTrigger = (c.deathTrigger ? c.deathTrigger + '; ' : '') + trig;
    msg = `d6 = ${roll} — +${bonus} ${statName.toUpperCase()} and minor death trigger: ${trig}`;
  }
  sfx('aud-blessing');
  log(`⚡ Rusted Nail: ${c.name} — ${msg}`);
  toast(msg);
  save(); closeRitual(); renderAll();
}

// ═══════════════════════════════════════════════════════════
// BURIAL RITUAL
// ═══════════════════════════════════════════════════════════
function burialResolve() {
  if (ritualSelection.length !== 1) { toast('Select exactly one card.'); return; }
  const c = getCard(ritualSelection[0]);
  if (!c) return;
  const roll = Math.floor(Math.random() * 4) + 1;
  let msg = '';
  if (!c.condStack) c.condStack = [];
  c.condStack.push({ name: 'Buried', dur: null });

  switch (roll) {
    case 1:
      c.bonCost = Math.max(0, Math.floor((c.bonCost || 0) / 2));
      c.type = 'Fleeting';
      msg = `d4 = 1 — Bone cost halved to ${c.bonCost}, but now Fleeting`;
      break;
    case 2:
      c.bonCost = Math.max(0, (c.bonCost || 0) - 2);
      c.baseCond = 'Poisoned';
      msg = `d4 = 2 — Bone cost −2 (now ${c.bonCost}), permanently Poisoned`;
      break;
    case 3: {
      const newHp = Math.floor((c.maxHp || 0) / 10) * 10;
      c.maxHp = Math.max(1, newHp);
      c.curHp = Math.min(c.curHp, c.maxHp);
      // Round damage up to nearest 10 conceptually (noted in ability text)
      c.abils = (c.abils ? c.abils + '; ' : '') + 'Buried: damage rounded up to nearest 10';
      msg = `d4 = 3 — HP rounded down to ${c.maxHp}, damage rounded up to nearest 10`;
      break;
    }
    case 4:
      c.bonCost = Math.max(0, (c.bonCost || 0) - 1);
      c.soulCost = (c.soulCost || 0) + 2;
      msg = `d4 = 4 — Bone −1 (now ${c.bonCost}), but +2 Soul cost (now ${c.soulCost})`;
      break;
  }
  log(`⚰ Burial Ritual: ${c.name} — ${msg}`);
  toast(msg);
  sfx('aud-blessing');
  save(); closeRitual(); renderAll();
}

// ═══════════════════════════════════════════════════════════
// GRAVEDIGGING
// ═══════════════════════════════════════════════════════════
function doGravedig() {
  askConfirm('Gravedigging', 'Spend 10–30 minutes digging. Roll a check — on success, create 1–3 undead cards.', ok => {
    if (!ok) return;
    const count = Math.floor(Math.random() * 3) + 1;
    const names = ['Rotted Beggar', 'Forgotten Soldier', 'Graveworm', 'Bone Drudge', 'Ashen Child', 'Pauper Skeleton', 'Hollow Monk'];
    for (let i = 0; i < count; i++) {
      const name = names[Math.floor(Math.random() * names.length)] + ' #' + (Math.floor(Math.random()*900)+100);
      const c = {
        id: makeId(),
        name,
        cr: '1/4',
        type: 'Fleeting',
        bonCost: 0, soulCost: 0,
        maxHp: 6, curHp: 6,
        ac: 10, spd: '20 ft', atk: '+2',
        dmgOptions: [{ dmg: '1d4', dtype: 'slashing' }],
        dmg: '1d4', dtype: 'slashing',
        str: 10, dex: 8, con: 10, int: 3, wis: 8, cha: 4,
        saves: '', senses: 'Darkvision 30 ft', imm: 'poison', res: '', lang: 'Common',
        abils: 'Gravedug',
        deathTrigger: '',
        zone: 'deck',
        baseCond: 'Normal',
        condStack: [],
        sacrificedCount: 0,
        actUsed: false, bonUsed: false, reaUsed: false,
      };
      S.cards.push(c);
    }
    sfx('aud-blessing');
    save();
    log(`⛏ Gravedigging: created ${count} new undead card${count>1?'s':''}`);
    toast(`Dug up ${count} card${count>1?'s':''}!`);
    renderAll();
  });
}

// ═══════════════════════════════════════════════════════════
// LEVEL-GATED ABILITIES
// ═══════════════════════════════════════════════════════════

// Level 11 — Recurring Dead: bonus action, spend 2 Souls to return
// any card from Dead zone to your hand
function recurDead(cid) {
  if (getLevel() < 11) { toast('Requires level 11 (Recurring Dead).'); return; }
  const c = getCard(cid); if (!c) return;
  if (c.zone !== 'dead') { toast('Recurring Dead only targets Dead zone cards.'); return; }
  if ((S.res.souls || 0) < 2) { toast('Need 2 Souls.'); return; }
  if (S.cards.filter(x => x.zone === 'hand').length >= getHandLimit()) { toast('Hand is full.'); return; }
  S.res.souls -= 2;
  c.zone = 'hand';
  c.curHp = c.maxHp;
  c.condStack = [];
  save(); renderRes(); renderAll();
  log(`⚰ Recurring Dead: ${c.name} returned to hand (−2 Souls)`);
  toast(`${c.name} returned to hand.`);
}

// Level 14 — Bone Lord's Tithe: 1×/LR, convert all Souls to Bones ×2
function boneLordTithe() {
  if (getLevel() < 14) { toast("Requires level 14 (Bone Lord's Tithe)."); return; }
  if ((S.res.souls || 0) <= 0) { toast('No Souls to convert.'); return; }
  const souls = S.res.souls;
  const bones = souls * 2;
  S.res.souls = 0;
  addBones(bones);
  save(); renderRes();
  log(`👑 Bone Lord's Tithe: ${souls} Souls → ${bones} Bones`);
  toast(`${souls} Souls → ${bones} Bones`);
}

// Level 18 — The Snake Itself Eats: 20 bones → heal a card to full
function boneHeal(cid) {
  if (getLevel() < 18) { toast('Requires level 18.'); return; }
  const c = getCard(cid); if (!c) return;
  if ((S.res.bones || 0) < 20) { toast('Need 20 Bones.'); return; }
  S.res.bones -= 20;
  c.curHp = c.maxHp;
  save(); renderRes(); renderAll();
  log(`🐍 Snake Eats: healed ${c.name} to full (−20 Bones)`);
  toast(`${c.name} healed.`);
}

// Level 9 — Boner: 10 bones → +1 to any stat
function boneStatBuff(cid) {
  if (getLevel() < 9) { toast('Requires level 9 (Boner).'); return; }
  const c = getCard(cid); if (!c) return;
  if ((S.res.bones || 0) < 10) { toast('Need 10 Bones.'); return; }
  const stat = prompt('Which stat to buff? (str/dex/con/int/wis/cha/ac/hp)', 'str');
  if (!stat) return;
  const s = stat.toLowerCase().trim();
  const valid = ['str','dex','con','int','wis','cha','ac','hp'];
  if (!valid.includes(s)) { toast('Invalid stat.'); return; }
  S.res.bones -= 10;
  if (s === 'hp') { c.maxHp += 1; c.curHp += 1; }
  else c[s] = (c[s] || 10) + 1;
  save(); renderRes(); renderAll();
  log(`💪 Boner: ${c.name} +1 ${s.toUpperCase()} (−10 Bones)`);
  toast(`${c.name} +1 ${s.toUpperCase()}`);
}

// Level 20 — The Bone Lord: command any N cards to die
function boneLordCommand() {
  if (getLevel() < 20) { toast('Requires level 20 (The Bone Lord).'); return; }
  const played = S.cards.filter(c => c.zone === 'played');
  if (!played.length) { toast('No cards on the field.'); return; }
  askConfirm('The Bone Lord', `Command all ${played.length} played cards to die immediately?`, ok => {
    if (!ok) return;
    played.forEach(c => killCard(c, true));
    log(`☠ The Bone Lord: ${played.length} cards commanded to die`);
    toast('Cards destroyed.');
    save(); renderAll();
  });
}
