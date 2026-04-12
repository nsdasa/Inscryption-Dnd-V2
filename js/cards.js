// ═══════════════════════════════════════════════════════════
// CARD HELPERS
// ═══════════════════════════════════════════════════════════
function getCard(id) { return S.cards.find(c => c.id === id); }

function makeId() {
  // safe alphanumeric only — no dots/special chars
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}


// ═══════════════════════════════════════════════════════════
// ANIMATED DEATH — used for all card removals
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// ANIMATE SLOT DEATH — works on any element (mini cards, etc.)
// ═══════════════════════════════════════════════════════════
function animateSlotDeath(el, withSacSymbol, onDone) {
  if (!el) { if (onDone) onDone(); return; }
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  if (withSacSymbol) {
    const sov = document.createElement('div');
    sov.className = 'sac-symbol-overlay';
    sov.style.zIndex = '20';
    sov.innerHTML = '<svg viewBox="0 0 28 34" fill="none" style="width:60%;height:60%">' +
      '<line x1="6" y1="3" x2="14" y2="13" stroke="#c02020" stroke-width="2.5" stroke-linecap="round"' +
      ' style="stroke-dasharray:40;stroke-dashoffset:40;animation:sac-draw .6s ease-out .05s forwards"/>' +
      '<line x1="22" y1="3" x2="14" y2="13" stroke="#c02020" stroke-width="2.5" stroke-linecap="round"' +
      ' style="stroke-dasharray:40;stroke-dashoffset:40;animation:sac-draw .6s ease-out .2s forwards"/>' +
      '<line x1="2" y1="13" x2="26" y2="13" stroke="#c02020" stroke-width="2.5" stroke-linecap="round"' +
      ' style="stroke-dasharray:40;stroke-dashoffset:40;animation:sac-draw .6s ease-out .35s forwards"/>' +
      '<path d="M14 13 C10 17,8 21,8 25 C8 29.5 11 32 14 32 C17 32 20 29.5 20 25 C20 17 18 17 14 13 Z"' +
      ' stroke="#c02020" stroke-width="2" fill="none" stroke-linecap="round"' +
      ' style="stroke-dasharray:80;stroke-dashoffset:80;animation:sac-draw .8s ease-out .5s forwards"/>' +
      '</svg>';
    el.appendChild(sov);
    setTimeout(() => {
      el.classList.add('dying');
      setTimeout(() => { if (onDone) onDone(); }, 1300);
    }, 950);
  } else {
    el.classList.add('dying');
    setTimeout(() => { if (onDone) onDone(); }, 1250);
  }
}

function animateDeath(cardId, withSacSymbol, onDone) {
  const el = document.querySelector('[data-card-id="' + cardId + '"]') ||
             document.querySelector('.slot-card-mini[data-card-id="' + cardId + '"]');
  animateSlotDeath(el, withSacSymbol, onDone);
}

function killCard(c, skipAnim) {
  if (c.zone === 'dead') return;
  const bonesGained = c.smoked ? 4 : 1;
  sfx('aud-death');
  const doFinish = () => {
    c.zone = 'dead';
    addBones(bonesGained);
    const smokedNote = c.smoked ? ' (Smoked — 4 Bones!)' : '';
    log(`🦴 ${c.name} died${smokedNote} — ${bonesGained} bone${bonesGained>1?'s':''} collected (total: ${S.res.bones})`);
    save(); renderAll();
  };
  if (!skipAnim) {
    animateDeath(c.id, false, doFinish);
  } else {
    doFinish();
  }
}

function modStr(score) { const m = Math.floor(((score||10)-10)/2); return m>=0?`+${m}`:String(m); }

// ═══════════════════════════════════════════════════════════
// ADD CARD
// ═══════════════════════════════════════════════════════════
function addCard() {
  const name = document.getElementById('i-name').value.trim();
  if (!name) { toast('Enter a creature name.'); return; }
  const maxHp = parseInt(document.getElementById('i-hp').value) || 10;
  const baseCond = document.getElementById('i-basecond').value || 'Normal';
  const c = {
    id: makeId(),
    name,
    cr:      document.getElementById('i-cr').value.trim() || '?',
    bldCost: parseInt(document.getElementById('i-bld').value) || 0,
    bonCost: parseInt(document.getElementById('i-bon').value) || 0,
    maxHp, curHp: maxHp,
    ac:      parseInt(document.getElementById('i-ac').value) || 10,
    spd:     document.getElementById('i-spd').value.trim() || '30 ft',
    atk:     document.getElementById('i-atk').value.trim() || '+0',
    dmg:     document.getElementById('i-dmg').value.trim() || '1d6',
    dtype:   document.getElementById('i-dtype').value.trim() || '',
    str: parseInt(document.getElementById('i-str').value) || 10,
    dex: parseInt(document.getElementById('i-dex').value) || 10,
    con: parseInt(document.getElementById('i-con').value) || 10,
    int: parseInt(document.getElementById('i-int').value) || 10,
    wis: parseInt(document.getElementById('i-wis').value) || 10,
    cha: parseInt(document.getElementById('i-cha').value) || 10,
    saves:   document.getElementById('i-saves').value.trim() || '',
    senses:  document.getElementById('i-senses').value.trim() || '',
    imm:     document.getElementById('i-imm').value.trim() || '',
    res:     document.getElementById('i-res').value.trim() || '',
    lang:    document.getElementById('i-lang').value.trim() || '',
    abils:   document.getElementById('i-abils').value.trim() || '',
    sigilAbils: [],
    zone: 'deck',
    baseCond,
    condStack: [],   // { name, dur (null=infinite, n=turns left) }
    combined: false,
    smoked: false,
    inanimate: false,
    actUsed: false, bonUsed: false, reaUsed: false,
  };
  S.cards.push(c); save();
  sfx('aud-blessing');
  log(`✦ Inscribed: ${name} (CR ${c.cr}${baseCond!=='Normal'?' | '+baseCond:''})`);
  ['i-name','i-cr','i-bld','i-bon','i-hp','i-ac','i-spd','i-atk','i-dmg','i-dtype',
   'i-str','i-dex','i-con','i-int','i-wis','i-cha','i-saves','i-senses','i-imm','i-res','i-lang','i-abils']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('i-basecond').value = 'Normal';
  renderAll(); toast(`${name} added to deck.`);
}

// ═══════════════════════════════════════════════════════════
// MOVE
// ═══════════════════════════════════════════════════════════
function moveCard(id, zone) {
  const c = getCard(id); if (!c) return;

  if (zone === 'hand') {
    if (!S.turn.active) { toast('Start your turn first!'); return; }
    if (S.turn.drawn)   { toast('Already drew a card this turn!'); return; }
    if (S.cards.filter(x => x.zone==='hand').length >= getHandLimit()) { toast(`Hand is full! (${getHandLimit()} card limit)`); return; }
  }

  if (zone === 'played' && c.zone === 'hand') {
    // Cost check
    const haveBlood = S.res.blood || 0;
    const haveBones = S.res.bones || 0;
    if (c.bldCost > 0 && haveBlood < c.bldCost) {
      toast(`Need ${c.bldCost} Blood to play ${c.name}! (have ${haveBlood})`); return;
    }
    if (c.bonCost > 0 && haveBones < c.bonCost) {
      toast(`Need ${c.bonCost} Bones to play ${c.name}! (have ${haveBones})`); return;
    }
    // Deduct
    if (c.bldCost > 0) { S.res.blood -= c.bldCost; document.getElementById('rc-blood').textContent = S.res.blood; log(`🩸 Spent ${c.bldCost} Blood for ${c.name}`); }
    if (c.bonCost > 0) { S.res.bones -= c.bonCost; document.getElementById('rc-bones').textContent = S.res.bones; log(`🦴 Spent ${c.bonCost} Bones for ${c.name}`); }
  }

  const old = c.zone; c.zone = zone;

  if (zone === 'hand' && old === 'deck') {
    sfx('aud-draw');
    if (getLevel() >= 15) {
      S.turn.drawCount = (S.turn.drawCount || 0) + 1;
      if (S.turn.drawCount >= 2) S.turn.drawn = true;
    } else {
      S.turn.drawn = true;
    }
  }
  if (zone === 'played' && old === 'hand') sfx('aud-play');
  if (zone === 'played') {
    c.actUsed = false; c.bonUsed = false; c.reaUsed = false;
    c.condStack = []; // reset temp conditions
    // restore base condition
  }
  if (zone === 'dead' && old === 'played') { killCard(c); }

  save(); log(`${c.name}: ${old} → ${zone}`); renderAll();
}

// ═══════════════════════════════════════════════════════════
// HP
// ═══════════════════════════════════════════════════════════
function adjHp(id, delta) {
  const c = getCard(id); if (!c) return;
  const prev = c.curHp;
  if (delta < 0 && prev > 0 && prev + delta > 0) sfx('aud-card-damage');
  c.curHp = Math.max(0, Math.min(c.maxHp, c.curHp + delta));
  if (prev > 0 && c.curHp === 0) {
    toast(`${c.name} has fallen!`);
    log(`💀 ${c.name} reduced to 0 HP`);
    killCard(c, false);
    save(); return; // renderAll will be called from killCard timeout
  }
  save(); renderAll();
}

// ═══════════════════════════════════════════════════════════
// ACTION PIPS
// ═══════════════════════════════════════════════════════════
function togAct(id, f) { const c=getCard(id); if(!c)return; c[f]=!c[f]; save(); renderAll(); }

// ═══════════════════════════════════════════════════════════
// KNIFE
// ═══════════════════════════════════════════════════════════
function knifeCard(id) {
  const c = getCard(id);
  if (!c || c.zone !== 'played') { toast('Can only sacrifice a played beast.'); return; }
  if (c.inanimate) { toast('Inanimate cards cannot be sacrificed.'); return; }
  sfx('aud-sacrifice');
  toast(c.name + ' sacrificed.');
  const bonesGained = c.smoked ? 4 : 1;
  animateDeath(c.id, true, () => {
    c.zone = 'dead';
    addBones(bonesGained);
    S.res.blood = (S.res.blood || 0) + 1;
    document.getElementById('rc-blood').textContent = S.res.blood;
    save();
    log('Sacrificed ' + c.name + ' +1 Blood (' + S.res.blood + '), ' + bonesGained + ' bone added');
    renderAll();
  });
}

// ═══════════════════════════════════════════════════════════
// CAMPFIRE ROLL
// ═══════════════════════════════════════════════════════════
function campfireCard(id) {
  const c = getCard(id); if (!c) return;
  if (c.smoked) { toast(`${c.name} is Smoked — cannot be campfire-buffed again.`); return; }

  const roll = Math.floor(Math.random() * 6) + 1;
  const STATS = ['Max HP','AC','Atk Bonus','Damage','Speed (+5ft)','All Saves'];
  const statRoll = Math.floor(Math.random() * 6) + 1;
  const statName = STATS[statRoll - 1];

  let outcome = '';
  let buff = 0;
  const unyielding = S.unyieldingDeck || false; // Level 18 toggle

  if (roll <= 2) {
    if (unyielding) {
      // Smoked instead of destroyed
      c.smoked = true;
      c.maxHp = Math.max(1, Math.floor(c.maxHp / 2));
      c.curHp = Math.min(c.curHp, c.maxHp);
      save();
      log(`💨 ${c.name} survived the fire — SMOKED (HP halved to ${c.maxHp}, grants 4 Bones on death, cannot be buffed again)`);
      toast(`${c.name} Smoked! HP halved. Cannot be buffed again.`);
      flashResult(id, '💨 Smoked');
    } else {
      // Destroyed
      save();
      log(`🔥 Campfire: ${c.name} rolled ${roll} — BURNED and destroyed permanently`);
      toast(`${c.name} burned! Gone forever.`);
      flashResult(id, `🔥 Burned!`);
      setTimeout(() => {
        S.cards = S.cards.filter(x => x.id !== id);
        save(); renderAll();
      }, 700);
      return;
    }
  } else if (roll <= 4) {
    buff = 1;
  } else if (roll === 5) {
    buff = 2;
  } else {
    buff = 3;
  }

  if (buff > 0) {
    applyStatBuff(c, statRoll, buff);
    save();
    log(`🔥 Campfire: ${c.name} rolled ${roll} — +${buff} to ${statName} (d6=${statRoll})`);
    toast(`${c.name}: +${buff} ${statName}!`);
    flashResult(id, `+${buff} ${statName}`);
  }

  save(); renderAll();
}

function applyStatBuff(c, statRoll, buff) {
  switch(statRoll) {
    case 1: c.maxHp += buff; c.curHp += buff; break;
    case 2: c.ac += buff; break;
    case 3: {
      // Parse and increment atk bonus number
      const m = (c.atk || '+0').match(/([+-]?\d+)/);
      const n = m ? parseInt(m[1]) : 0;
      c.atk = (n + buff >= 0 ? '+' : '') + (n + buff);
      break;
    }
    case 4: {
      // Append bonus to damage string e.g. "2d6+3" → "2d6+4" or note
      c.dmg = c.dmg + `+${buff}`;
      break;
    }
    case 5: {
      // Parse speed number and add 5*buff
      const sm = (c.spd || '30 ft').match(/(\d+)/);
      const sn = sm ? parseInt(sm[1]) : 30;
      c.spd = (sn + 5 * buff) + ' ft';
      break;
    }
    case 6: {
      // Note saves buff in saves field
      c.saves = (c.saves ? c.saves + ', ' : '') + `All +${buff} (campfire)`;
      break;
    }
  }
}

function flashResult(cardId, text) {
  // Briefly show a result overlay on the card element
  setTimeout(() => {
    const cards = document.querySelectorAll('.card');
    // Find card by looking for data-cid buttons inside
    cards.forEach(el => {
      const btn = el.querySelector(`[data-cid="${cardId}"]`);
      if (!btn) return;
      const div = document.createElement('div');
      div.className = 'campfire-result';
      div.textContent = text;
      el.appendChild(div);
      setTimeout(() => div.remove(), 700);
    });
  }, 50);
}

// ═══════════════════════════════════════════════════════════
// SMOKE CARD (manual — DM applies or Unyielding Deck)
// ═══════════════════════════════════════════════════════════
function smokeCard(id) {
  const c = getCard(id); if (!c) return;
  if (c.smoked) { toast(`${c.name} is already Smoked.`); return; }
  c.smoked = true;
  c.maxHp = Math.max(1, Math.floor(c.maxHp / 2));
  c.curHp = Math.min(c.curHp, c.maxHp);
  save();
  log(`💨 ${c.name} manually Smoked (HP halved to ${c.maxHp})`);
  toast(`${c.name} is now Smoked.`);
  renderAll();
}

function unsmokeCard(id) {
  const c = getCard(id); if (!c) return;
  c.smoked = false;
  save(); renderAll();
  toast(`${c.name} smoke cleared.`);
}

// ═══════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════
function delCard(id) {
  const c = getCard(id); if (!c) return;
  askConfirm('Remove Card', `Permanently remove "${c.name}" from the deck? This cannot be undone.`, ok => {
    if (!ok) return;
    S.cards = S.cards.filter(x => x.id !== id);
    save(); log(`🗑 ${c.name} permanently removed`); renderAll(); toast(`${c.name} removed.`);
  });
}

// ═══════════════════════════════════════════════════════════
// ENCOUNTER / WIPE
// ═══════════════════════════════════════════════════════════
function newEncounter() {
  askConfirm('New Encounter', 'Return all field & dead cards to deck, restore all HP, reset conditions, Blood & Bones to 0?', ok => {
    if (!ok) return;
    S.cards.forEach(c => {
      if (c.zone === 'played' || c.zone === 'dead') c.zone = 'deck';
      c.curHp = c.maxHp;
      c.actUsed = false; c.bonUsed = false; c.reaUsed = false;
      c.condStack = [];
    });
    S.res.blood = 0; S.res.bones = 0;
    S.turn.active = false; S.turn.drawn = false;
    renderRes(); updateTurnBtn(); save();
    log('⚔ New encounter — field cleared, HP restored, resources reset');
    toast('New encounter started!'); renderAll();
  });
}

function clearCards() {
  askConfirm('Clear All Cards', 'Remove every card from the deck manager? This cannot be undone.', ok => {
    if (!ok) return;
    S.cards = []; save();
    log('🗑 All cards cleared'); renderAll(); toast('All cards cleared.');
  });
}

function wipeHistory() {
  askConfirm('Wipe Log', 'Clear the entire log history?', ok => {
    if (!ok) return;
    S.log = []; save(); renderLog(); toast('Log cleared.');
  });
}

// ═══════════════════════════════════════════════════════════
// EDIT MODAL
// ═══════════════════════════════════════════════════════════
let editId = null;
function openEdit(id) {
  editId = id; const c = getCard(id); if (!c) return;
  const fields = {
    'e-name':c.name,'e-cr':c.cr,'e-bld':c.bldCost,'e-bon':c.bonCost,
    'e-hp':c.maxHp,'e-ac':c.ac,'e-spd':c.spd||'','e-atk':c.atk||'',
    'e-dmg':c.dmg||'','e-dtype':c.dtype||'',
    'e-str':c.str||10,'e-dex':c.dex||10,'e-con':c.con||10,
    'e-int':c.int||10,'e-wis':c.wis||10,'e-cha':c.cha||10,
    'e-saves':c.saves||'','e-senses':c.senses||'',
    'e-imm':c.imm||'','e-res':c.res||'','e-lang':c.lang||'',
    'e-abils':c.abils||'','e-sigils':(c.sigilAbils||[]).join('\n'),
  };
  Object.entries(fields).forEach(([k,v]) => document.getElementById(k).value = v);
  document.getElementById('e-basecond').value = c.baseCond || 'Normal';
  document.getElementById('e-combined').value = c.combined ? 'true' : 'false';
  const ei = document.getElementById('e-inanimate'); if (ei) ei.value = c.inanimate ? 'true' : 'false';
  document.getElementById('editmodal').classList.add('open');
}
function closeModal() { document.getElementById('editmodal').classList.remove('open'); editId = null; }
function saveEdit() {
  const c = getCard(editId); if (!c) return;
  const newMax = parseInt(document.getElementById('e-hp').value) || c.maxHp;
  const hpD = newMax - c.maxHp;
  c.name    = document.getElementById('e-name').value.trim() || c.name;
  c.cr      = document.getElementById('e-cr').value.trim();
  c.bldCost = parseInt(document.getElementById('e-bld').value) || 0;
  c.bonCost = parseInt(document.getElementById('e-bon').value) || 0;
  c.maxHp   = newMax;
  c.curHp   = Math.min(c.maxHp, Math.max(0, c.curHp + hpD));
  c.ac      = parseInt(document.getElementById('e-ac').value) || c.ac;
  c.spd     = document.getElementById('e-spd').value.trim();
  c.atk     = document.getElementById('e-atk').value.trim();
  c.dmg     = document.getElementById('e-dmg').value.trim();
  c.dtype   = document.getElementById('e-dtype').value.trim();
  c.str = parseInt(document.getElementById('e-str').value)||10;
  c.dex = parseInt(document.getElementById('e-dex').value)||10;
  c.con = parseInt(document.getElementById('e-con').value)||10;
  c.int = parseInt(document.getElementById('e-int').value)||10;
  c.wis = parseInt(document.getElementById('e-wis').value)||10;
  c.cha = parseInt(document.getElementById('e-cha').value)||10;
  c.saves   = document.getElementById('e-saves').value.trim();
  c.senses  = document.getElementById('e-senses').value.trim();
  c.imm     = document.getElementById('e-imm').value.trim();
  c.res     = document.getElementById('e-res').value.trim();
  c.lang    = document.getElementById('e-lang').value.trim();
  c.abils   = document.getElementById('e-abils').value.trim();
  const sr  = document.getElementById('e-sigils').value.trim();
  c.sigilAbils = sr ? sr.split('\n').map(x=>x.trim()).filter(Boolean) : [];
  c.baseCond   = document.getElementById('e-basecond').value || 'Normal';
  c.combined   = document.getElementById('e-combined').value === 'true';
  const eia = document.getElementById('e-inanimate'); if (eia) c.inanimate = eia.value === 'true';
  save(); sfx('aud-blessing'); log(`✏ Edited: ${c.name}`); closeModal(); renderAll(); toast(`${c.name} updated.`);
}

// ═══════════════════════════════════════════════════════════
// KNIFE SVG
// ═══════════════════════════════════════════════════════════
function knifeSVG() {
  return `<svg class="ksym" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="2" x2="12" y2="11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="19" y1="2" x2="12" y2="11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><line x1="2" y1="11" x2="22" y2="11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 11 C9 14,7 17,7 20 C7 23.5 9.5 26 12 26 C14.5 26 17 23.5 17 20 C17 17 15 14 12 11Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
