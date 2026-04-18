// ═══════════════════════════════════════════════════════════
// THE SCRYBE OF THE DEAD — RITUALS (drag-drop slot system)
// ═══════════════════════════════════════════════════════════

const DEAD_LEVEL_FEATURES = {
  1:  ['Grim Quill', 'Inscription Cards', 'Bones & Souls', 'Fleeting Undead',
       'Obol Flip', 'Rusted Nail Ritual', 'Burial Ritual'],
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
  20: ['The Bone Lord'],
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
  const titheBtn = document.getElementById('btn-bone-tithe');
  if (titheBtn) titheBtn.disabled = lv < 14;
  const blBtn = document.getElementById('btn-bone-lord');
  if (blBtn) blBtn.disabled = lv < 20;
}

// ═══════════════════════════════════════════════════════════
// MINI CARD HTML (Dead version — gravestone-shaped tile)
// ═══════════════════════════════════════════════════════════
function deadMiniCardHTML(c) {
  return `<div class="slot-card-mini" draggable="true" data-card-id="${c.id}">
    <div class="scm-name">${c.name}</div>
    <div class="scm-hp">HP ${c.curHp}/${c.maxHp} · AC ${c.ac}</div>
    <div class="scm-cost">🦴${c.bonCost||0} 💎${c.soulCost||0} · ${c.type||'?'}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// SLOT STATE — tracks which card is in which slot
// ═══════════════════════════════════════════════════════════
const slotCards = { 'nail-slot': null, 'burial-slot': null, 'obol-slot-1': null, 'obol-slot-2': null };
let slotsWired = false;

// ═══════════════════════════════════════════════════════════
// PAGE SETUP — called by switchPage()
// ═══════════════════════════════════════════════════════════
function setupRitualPage(mode) {
  if (mode === 'obol') {
    const left = document.getElementById('obol-left');
    if (left) left.textContent = (S.obolFlipsLeft != null ? S.obolFlipsLeft : 5);
    refreshRitualStrip('obol');
    restoreSlots('obol');
  } else if (mode === 'nail') {
    refreshRitualStrip('nail');
    restoreSlots('nail');
  } else if (mode === 'burial') {
    refreshRitualStrip('burial');
    restoreSlots('burial');
  }
  if (!slotsWired) { wireAllSlots(); slotsWired = true; }
}

// ═══════════════════════════════════════════════════════════
// DECK STRIP — draggable mini cards at bottom of each page
// ═══════════════════════════════════════════════════════════
function refreshRitualStrip(mode) {
  const stripId = mode + '-strip';
  const strip = document.getElementById(stripId);
  if (!strip) return;
  const exclude = new Set(Object.values(slotCards).filter(Boolean));
  let cards = S.cards.filter(c => c.zone !== 'dead' && !exclude.has(c.id));
  if (mode === 'obol') cards = cards.filter(c => c.type !== 'DeadMass');
  if (!cards.length) {
    strip.innerHTML = '<span style="font-size:.65rem;color:var(--dim);font-style:italic">No eligible cards</span>';
    return;
  }
  strip.innerHTML = cards.map(c => deadMiniCardHTML(c)).join('');
  strip.querySelectorAll('.slot-card-mini').forEach(el => {
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('cardId', el.dataset.cardId);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', e => el.classList.remove('dragging'));
  });
}

function refreshAllStrips() {
  ['obol','nail','burial'].forEach(m => refreshRitualStrip(m));
}

// ═══════════════════════════════════════════════════════════
// SLOT WIRING — drag-and-drop for all ritual slots
// ═══════════════════════════════════════════════════════════
function wireAllSlots() {
  Object.keys(slotCards).forEach(slotId => {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('active'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('active'));
    slot.addEventListener('drop', e => {
      e.preventDefault(); slot.classList.remove('active');
      const cid = e.dataTransfer.getData('cardId');
      if (!cid) return;
      const card = getCard(cid);
      if (!card) return;
      if (slotCards[slotId]) return; // slot occupied
      slotCards[slotId] = cid;
      renderSlotCard(slotId, card);
      refreshAllStrips();
    });
  });
}

function renderSlotCard(slotId, card) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  slot.innerHTML = deadMiniCardHTML(card);
  const mini = slot.querySelector('.slot-card-mini');
  if (mini) {
    mini.setAttribute('draggable', 'true');
    mini.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('cardId', card.id);
      slotCards[slotId] = null;
      slot.innerHTML = '<span class="slot-label">Drop card</span>';
      refreshAllStrips();
    });
  }
}

function restoreSlots(mode) {
  const slotIds = mode === 'obol' ? ['obol-slot-1','obol-slot-2'] : [mode + '-slot'];
  slotIds.forEach(sid => {
    const cid = slotCards[sid];
    if (cid) {
      const card = getCard(cid);
      if (card) renderSlotCard(sid, card);
      else { slotCards[sid] = null; clearSlot(sid); }
    } else {
      clearSlot(sid);
    }
  });
}

function clearSlot(slotId) {
  const slot = document.getElementById(slotId);
  if (slot) slot.innerHTML = '<span class="slot-label">Drop card</span>';
  slotCards[slotId] = null;
}

// ═══════════════════════════════════════════════════════════
// CARD FLIP ANIMATION (for nail/burial slot cards)
// ═══════════════════════════════════════════════════════════
function flipSlotCard(slotId, callback) {
  const mini = document.querySelector(`#${slotId} .slot-card-mini`);
  if (!mini) { if (callback) callback(); return; }
  mini.style.animation = 'card-flip-360 .8s ease-in-out forwards';
  mini.style.transformStyle = 'preserve-3d';
  setTimeout(() => {
    mini.style.animation = '';
    if (callback) callback();
  }, 900);
}

// ═══════════════════════════════════════════════════════════
// OBOL FADE ANIMATION
// ═══════════════════════════════════════════════════════════
function fadeObolCards(coin, callback) {
  const slots = ['obol-slot-1','obol-slot-2'].filter(s => slotCards[s]);
  const minis = slots.map(s => document.querySelector(`#${s} .slot-card-mini`)).filter(Boolean);
  // Fade all to black
  minis.forEach(m => { m.style.transition = 'filter .6s, opacity .6s'; m.style.filter = 'brightness(0)'; });
  setTimeout(() => {
    if (coin === 'Heads') {
      // Show duplicates appearing next to slots — insert "ghost" copies
      slots.forEach(sid => {
        const slot = document.getElementById(sid);
        if (!slot) return;
        const ghost = document.createElement('div');
        ghost.className = 'slot-card-mini ghost-copy';
        ghost.innerHTML = '<div class="scm-name">Copy</div>';
        ghost.style.filter = 'brightness(0)';
        ghost.style.transition = 'filter .8s';
        slot.appendChild(ghost);
        setTimeout(() => { ghost.style.filter = 'brightness(1)'; }, 100);
      });
      // Fade originals back to normal
      setTimeout(() => {
        minis.forEach(m => { m.style.filter = ''; });
        if (callback) callback();
      }, 900);
    } else {
      // Tails — keep dark then callback
      setTimeout(() => {
        if (callback) callback();
      }, 600);
    }
  }, 700);
}

// ═══════════════════════════════════════════════════════════
// OBOL FLIP RESOLVE
// ═══════════════════════════════════════════════════════════
function obolResolve() {
  const ids = ['obol-slot-1','obol-slot-2'].map(s => slotCards[s]).filter(Boolean);
  if (!ids.length) { toast('Drop 1 or 2 cards to the altar first.'); return; }
  if ((S.obolFlipsLeft || 0) <= 0) { toast('No Obol flips left today.'); return; }
  const coin = Math.random() < 0.5 ? 'Heads' : 'Tails';
  S.obolFlipsLeft = (S.obolFlipsLeft || 0) - 1;
  const left = document.getElementById('obol-left');
  if (left) left.textContent = S.obolFlipsLeft;

  sfx('aud-coin');
  fadeObolCards(coin, () => {
      let resultHtml = '';
      if (ids.length === 2) {
        if (coin === 'Heads') {
          ids.forEach(cid => {
            const orig = getCard(cid);
            if (!orig) return;
            const copy = JSON.parse(JSON.stringify(orig));
            copy.id = makeId(); copy.name = orig.name + ' (copy)';
            copy.zone = 'deck'; copy.curHp = copy.maxHp; copy.condStack = [];
            S.cards.push(copy);
          });
          log('🪙 Obol (2): Heads — both duplicated');
          resultHtml = `<div class="rr-coin">🪙 Heads</div><div class="rr-msg">Both cards duplicated!</div>`;
        } else {
          const cards = ids.map(getCard).filter(Boolean);
          const avgHp = Math.round(cards.reduce((s,c)=>s+c.maxHp,0) / cards.length * 1.8);
          const mass = {
            id: makeId(), name: `Dead Mass of ${cards.map(c=>c.name).join(' & ')}`,
            cr: '?', type: 'DeadMass', bonCost: 0, soulCost: 0,
            maxHp: avgHp, curHp: avgHp, ac: 12, spd: '15 ft', atk: '+0',
            dmgOptions: [{dmg:'1d8',dtype:'bludgeoning'}], dmg:'1d8', dtype:'bludgeoning',
            str:16,dex:6,con:16,int:3,wis:6,cha:4,
            saves:'',senses:'',imm:'poison',res:'',lang:'',
            abils: getLevel()>=10 ? 'Attacks as Dead Masstery' : 'Cannot attack (unlocks Lv10).',
            deathTrigger:'', zone:'deck', baseCond:'Normal', condStack:[],
            sacrificedCount: cards.length, actUsed:false,bonUsed:false,reaUsed:false,
          };
          S.cards.push(mass);
          const removeIds = new Set(ids);
          S.cards = S.cards.filter(c => !removeIds.has(c.id));
          log('🪙 Obol (2): Tails — fused into Dead Mass');
          resultHtml = `<div class="rr-coin">🪙 Tails</div><div class="rr-msg">Cards fused into a Dead Mass!</div>`;
        }
      } else {
        const orig = getCard(ids[0]);
        if (coin === 'Heads' && orig) {
          const copy = JSON.parse(JSON.stringify(orig));
          copy.id = makeId(); copy.name = orig.name + ' (copy)';
          copy.zone = 'deck'; copy.curHp = copy.maxHp; copy.condStack = [];
          S.cards.push(copy);
          log(`🪙 Obol (1): Heads — ${orig.name} duplicated`);
          resultHtml = `<div class="rr-coin">🪙 Heads</div><div class="rr-msg">${orig.name} duplicated!</div>`;
        } else if (orig) {
          S.cards = S.cards.filter(c => c.id !== orig.id);
          log(`🪙 Obol (1): Tails — ${orig.name} destroyed`);
          resultHtml = `<div class="rr-coin">🪙 Tails</div><div class="rr-msg">${orig.name} destroyed permanently.</div>`;
        }
      }
      // Clear slots
      clearSlot('obol-slot-1'); clearSlot('obol-slot-2');
      showRitualResult('obol', resultHtml);
      save(); refreshRitualStrip('obol'); renderAll();
    });
}

// ═══════════════════════════════════════════════════════════
// RUSTED NAIL RESOLVE
// ═══════════════════════════════════════════════════════════
function nailResolve() {
  const cid = slotCards['nail-slot'];
  if (!cid) { toast('Drop a card on the nail first.'); return; }
  const c = getCard(cid);
  if (!c) return;
  sfx('aud-spark');
  const roll = Math.floor(Math.random() * 6) + 1;
  const STATS = ['str','dex','con','int','wis','cha'];
  const statName = STATS[Math.floor(Math.random() * 6)];
  let msg = '';

  if (roll <= 2) {
    const already = (c.condStack || []).some(s => s.name === 'Brittle');
    if (already && getLevel() >= 17) {
      c.maxHp = Math.max(1, Math.floor(c.maxHp / 2));
      c.curHp = Math.min(c.curHp, c.maxHp);
      if (!c.condStack) c.condStack = [];
      c.condStack.push({ name: 'Undying', dur: null });
      msg = `d6=${roll} — Already Brittle → Undying (HP halved)`;
    } else if (already) {
      c.condStack.push({ name: 'Weakened', dur: null });
      msg = `d6=${roll} — Already Brittle → +Weakened`;
    } else {
      if (!c.condStack) c.condStack = [];
      c.condStack.push({ name: 'Brittle', dur: null });
      c.type = 'Fleeting';
      msg = `d6=${roll} — Brittle (now Fleeting)`;
    }
  } else if (roll <= 4) {
    c[statName] = (c[statName] || 10) + 1;
    if (!c.condStack) c.condStack = [];
    c.condStack.push({ name: 'Brittle', dur: null });
    c.type = 'Fleeting';
    msg = `d6=${roll} — +1 ${statName.toUpperCase()} and Brittle`;
  } else {
    const bonus = roll === 5 ? 2 : 3;
    c[statName] = (c[statName] || 10) + bonus;
    const triggers = ['On death: gain 1 Soul','On death: allies +1 atk','On death: 1d4 necrotic','On death: draw a card'];
    const trig = triggers[Math.floor(Math.random() * triggers.length)];
    c.deathTrigger = (c.deathTrigger ? c.deathTrigger + '; ' : '') + trig;
    msg = `d6=${roll} — +${bonus} ${statName.toUpperCase()}, ${trig}`;
  }

  flipSlotCard('nail-slot', () => {
    const card = getCard(cid);
    if (card) renderSlotCard('nail-slot', card);
    showRitualResult('nail', `<div class="rr-coin">⚡ ${msg}</div>`);
    log(`⚡ Nail: ${c.name} — ${msg}`);
    toast(msg);
    save(); refreshRitualStrip('nail'); renderAll();
  });
}

// ═══════════════════════════════════════════════════════════
// BURIAL RESOLVE
// ═══════════════════════════════════════════════════════════
function burialResolve() {
  const cid = slotCards['burial-slot'];
  if (!cid) { toast('Drop a card on the grave first.'); return; }
  const c = getCard(cid);
  if (!c) return;
  sfx('aud-shovel');
  const roll = Math.floor(Math.random() * 4) + 1;
  let msg = '';
  if (!c.condStack) c.condStack = [];
  c.condStack.push({ name: 'Buried', dur: null });

  switch (roll) {
    case 1:
      c.bonCost = Math.max(0, Math.floor((c.bonCost || 0) / 2));
      c.type = 'Fleeting';
      msg = `d4=1 — Bone cost halved to ${c.bonCost}, now Fleeting`;
      break;
    case 2:
      c.bonCost = Math.max(0, (c.bonCost || 0) - 2);
      c.baseCond = 'Poisoned';
      msg = `d4=2 — Bone −2 (now ${c.bonCost}), permanently Poisoned`;
      break;
    case 3:
      c.maxHp = Math.max(1, Math.floor((c.maxHp||0)/10)*10);
      c.curHp = Math.min(c.curHp, c.maxHp);
      c.abils = (c.abils ? c.abils+'; ':'') + 'Buried: dmg rounded up to 10';
      msg = `d4=3 — HP→${c.maxHp}, dmg rounded up`;
      break;
    case 4:
      c.bonCost = Math.max(0, (c.bonCost || 0) - 1);
      c.soulCost = (c.soulCost || 0) + 2;
      msg = `d4=4 — Bone −1 (${c.bonCost}), Soul +2 (${c.soulCost})`;
      break;
  }

  flipSlotCard('burial-slot', () => {
    const card = getCard(cid);
    if (card) renderSlotCard('burial-slot', card);
    showRitualResult('burial', `<div class="rr-coin">⚰ ${msg}</div>`);
    log(`⚰ Burial: ${c.name} — ${msg}`);
    toast(msg);
    save(); refreshRitualStrip('burial'); renderAll();
  });
}

function showRitualResult(mode, html) {
  const el = document.getElementById(mode + '-result');
  if (!el) return;
  el.innerHTML = html;
}

// Compatibility shims
function openObolFlip()    { switchPage('obol'); }
function openRustedNail()  { switchPage('nail'); }
function openBurialRitual(){ switchPage('burial'); }
function closeRitual()     { switchPage('deck'); }
function refreshRitualPicker() {} // no-op, replaced by strip system

// ═══════════════════════════════════════════════════════════
// LEVEL-GATED ABILITIES (unchanged)
// ═══════════════════════════════════════════════════════════
function recurDead(cid) {
  if (getLevel() < 11) { toast('Requires level 11.'); return; }
  const c = getCard(cid); if (!c) return;
  if (c.zone !== 'dead') { toast('Only targets Dead zone.'); return; }
  if ((S.res.souls || 0) < 2) { toast('Need 2 Souls.'); return; }
  if (S.cards.filter(x => x.zone === 'hand').length >= getHandLimit()) { toast('Hand full.'); return; }
  S.res.souls -= 2;
  c.zone = 'hand'; c.curHp = c.maxHp; c.condStack = [];
  save(); renderRes(); renderAll();
  log(`⚰ Recurring Dead: ${c.name} → hand (−2 Souls)`);
  toast(`${c.name} returned.`);
}

function boneLordTithe() {
  if (getLevel() < 14) { toast('Requires level 14.'); return; }
  if ((S.res.souls || 0) <= 0) { toast('No Souls.'); return; }
  const souls = S.res.souls;
  S.res.souls = 0; addBones(souls * 2);
  save(); renderRes();
  log(`👑 Tithe: ${souls} Souls → ${souls*2} Bones`);
  toast(`${souls} Souls → ${souls*2} Bones`);
}

function boneHeal(cid) {
  if (getLevel() < 18) { toast('Requires level 18.'); return; }
  const c = getCard(cid); if (!c) return;
  if ((S.res.bones || 0) < 20) { toast('Need 20 Bones.'); return; }
  S.res.bones -= 20; c.curHp = c.maxHp;
  save(); renderRes(); renderAll();
  log(`🐍 Healed ${c.name} (−20 Bones)`); toast(`${c.name} healed.`);
}

function boneStatBuff(cid) {
  if (getLevel() < 9) { toast('Requires level 9.'); return; }
  const c = getCard(cid); if (!c) return;
  if ((S.res.bones || 0) < 10) { toast('Need 10 Bones.'); return; }
  const stat = prompt('Stat to buff? (str/dex/con/int/wis/cha/ac/hp)', 'str');
  if (!stat) return;
  const s = stat.toLowerCase().trim();
  if (!['str','dex','con','int','wis','cha','ac','hp'].includes(s)) { toast('Invalid.'); return; }
  S.res.bones -= 10;
  if (s === 'hp') { c.maxHp += 1; c.curHp += 1; } else c[s] = (c[s]||10) + 1;
  save(); renderRes(); renderAll();
  log(`💪 Boner: ${c.name} +1 ${s.toUpperCase()} (−10 Bones)`);
}

function boneLordCommand() {
  if (getLevel() < 20) { toast('Requires level 20.'); return; }
  const played = S.cards.filter(c => c.zone === 'played');
  if (!played.length) { toast('No cards on field.'); return; }
  askConfirm('The Bone Lord', `Command all ${played.length} played cards to die?`, ok => {
    if (!ok) return;
    played.forEach(c => killCard(c, true));
    log(`☠ Bone Lord: ${played.length} cards commanded to die`);
    save(); renderAll();
  });
}
