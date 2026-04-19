// ═══════════════════════════════════════════════════════════
// THE SCRYBE OF THE DEAD — CARD OPERATIONS
// ═══════════════════════════════════════════════════════════
function getCard(id) { return S.cards.find(c => c.id === id); }
function makeId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function modStr(score) { const m = Math.floor(((score||10)-10)/2); return m>=0?`+${m}`:String(m); }

// ═══════════════════════════════════════════════════════════
// DEATH ANIMATION
// ═══════════════════════════════════════════════════════════
function animateDeath(cardId, onDone) {
  const el = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!el) { if (onDone) onDone(); return; }
  el.classList.add('dying');
  setTimeout(() => { if (onDone) onDone(); }, 1250);
}

function killCard(c, skipAnim) {
  if (c.zone === 'dead') return;
  sfx('aud-death');
  const doFinish = () => {
    c.zone = 'dead';
    // Bones on death: Dead Mass grants ~1 per card used to form it
    const bonesGained = (c.type === 'DeadMass') ? Math.max(1, c.sacrificedCount || 1) : 1;
    addBones(bonesGained);
    log(`🦴 ${c.name} died — ${bonesGained} bone${bonesGained>1?'s':''} collected (total: ${S.res.bones})`);
    // Level 3 Death's Whisper — d6, on 5 or 6 gain 1 Soul
    if (getLevel() >= 3) {
      const dr = Math.floor(Math.random() * 6) + 1;
      log(`👁 Death's Whisper d6 = ${dr}`);
      if (dr >= 5) { addSouls(1); log(`💎 +1 Soul from Death's Whisper (total: ${S.res.souls})`); }
    }
    save(); renderAll();
  };
  if (!skipAnim) animateDeath(c.id, doFinish);
  else doFinish();
}

// ═══════════════════════════════════════════════════════════
// DAMAGE OPTIONS (multiple damage types per card)
// ═══════════════════════════════════════════════════════════
function addExtraDmgRow(target, preDmg, preDtype) {
  const container = document.getElementById(`${target}-extra-dmg-rows`);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'fr extra-dmg-row';
  row.innerHTML = `
    <div class="fg"><label>Damage</label><input class="xdmg" placeholder="1d8+2" value="${(preDmg||'').replace(/"/g,'&quot;')}"></div>
    <div class="fg"><label>Dmg Type</label><input class="xdtype" placeholder="Necrotic" value="${(preDtype||'').replace(/"/g,'&quot;')}"></div>
    <button type="button" class="rem-xdmg" title="Remove" style="background:rgba(120,20,20,.2);border:1px solid rgba(155,28,28,.4);color:#f08080;cursor:pointer;border-radius:2px;padding:0 .4rem;align-self:end;font-size:.7rem;">✕</button>
  `;
  row.querySelector('.rem-xdmg').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectDmgOptions(target) {
  const opts = [];
  document.querySelectorAll(`#${target}-extra-dmg-rows .extra-dmg-row`).forEach(row => {
    const dmg = (row.querySelector('.xdmg')?.value || '').trim();
    const dtype = (row.querySelector('.xdtype')?.value || '').trim();
    if (dmg) opts.push({ dmg, dtype });
  });
  return opts;
}

function resetDmgRows(target) {
  const wrap = document.getElementById(`${target}-extra-dmg-rows`);
  if (!wrap) return;
  wrap.innerHTML = '';
  addExtraDmgRow(target);
}

function syncDmgFields(c, opts) {
  c.dmgOptions = opts;
  c.dmg   = opts[0]?.dmg   || '';
  c.dtype = opts[0]?.dtype || '';
}

// ═══════════════════════════════════════════════════════════
// ADD CARD (Inscribe)
// ═══════════════════════════════════════════════════════════
function addCard() {
  const name = document.getElementById('i-name').value.trim();
  if (!name) { toast('Enter a creature name.'); return; }
  const cr = document.getElementById('i-cr').value.trim() || '?';
  // Auto-detect Fleeting if CR <= 3 and type not explicitly Enduring
  const typeSelected = document.getElementById('i-type').value || 'Fleeting';
  let type = typeSelected;
  const crNum = parseFloat(cr);
  if (!isNaN(crNum) && crNum >= 4 && type === 'Fleeting') type = 'Enduring';
  const maxHp = parseInt(document.getElementById('i-hp').value) || 10;
  // Fleeting undead have 30–50% HP — apply scale if type is Fleeting
  const finalMaxHp = type === 'Fleeting' ? Math.max(1, Math.floor(maxHp * 0.4)) : maxHp;
  const baseCond = document.getElementById('i-basecond').value || 'Normal';
  let dmgOptions = collectDmgOptions('i');
  if (!dmgOptions.length) dmgOptions = [{ dmg: '1d6', dtype: 'necrotic' }];

  const c = {
    id: makeId(),
    name,
    cr,
    type,
    bonCost: parseInt(document.getElementById('i-bon').value) || 0,
    soulCost: parseInt(document.getElementById('i-sou').value) || 0,
    maxHp: finalMaxHp, curHp: finalMaxHp,
    ac:      parseInt(document.getElementById('i-ac').value) || 10,
    spd:     document.getElementById('i-spd').value.trim() || '30 ft',
    atk:     document.getElementById('i-atk').value.trim() || '+0',
    dmgOptions,
    dmg:     dmgOptions[0].dmg,
    dtype:   dmgOptions[0].dtype || '',
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
    deathTrigger: document.getElementById('i-death').value.trim() || '',
    zone: 'deck',
    baseCond,
    condStack: [],
    sacrificedCount: 0,
    actUsed: false, bonUsed: false, reaUsed: false,
  };
  S.cards.push(c); save();
  sfx('aud-blessing');
  log(`✦ Inscribed: ${name} (${type}, CR ${cr}${baseCond!=='Normal'?' | '+baseCond:''})`);
  ['i-name','i-cr','i-bon','i-sou','i-hp','i-ac','i-spd','i-atk',
   'i-str','i-dex','i-con','i-int','i-wis','i-cha','i-saves','i-senses','i-imm','i-res','i-lang','i-abils','i-death']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('i-basecond').value = 'Normal';
  document.getElementById('i-type').value = 'Fleeting';
  resetDmgRows('i');
  renderAll(); toast(`${name} added to deck.`);
}

// ═══════════════════════════════════════════════════════════
// MOVE CARD
// ═══════════════════════════════════════════════════════════
function moveCard(id, zone) {
  const c = getCard(id); if (!c) return;

  if (zone === 'hand') {
    if (!S.turn.active) { toast('Start your turn first!'); return; }
    const allowed = S.turn.drawsAllowed || 1;
    if ((S.turn.drawCount || 0) >= allowed) { toast(`No draws left this turn (${allowed}).`); return; }
    if (S.cards.filter(x => x.zone==='hand').length >= getHandLimit()) { toast(`Hand is full! (${getHandLimit()} card limit)`); return; }
  }

  if (zone === 'played' && c.zone === 'hand') {
    const haveBones = S.res.bones || 0;
    const haveSouls = S.res.souls || 0;
    if (c.bonCost > 0 && haveBones < c.bonCost) { toast(`Need ${c.bonCost} Bones to play ${c.name}! (have ${haveBones})`); return; }
    if (c.soulCost > 0 && haveSouls < c.soulCost) { toast(`Need ${c.soulCost} Souls to play ${c.name}! (have ${haveSouls})`); return; }
    if (c.bonCost > 0) { S.res.bones -= c.bonCost; log(`🦴 Spent ${c.bonCost} Bones for ${c.name}`); }
    if (c.soulCost > 0) { S.res.souls -= c.soulCost; log(`💎 Spent ${c.soulCost} Souls for ${c.name}`); }
    renderRes();
  }

  const old = c.zone; c.zone = zone;

  if (zone === 'hand' && old === 'deck') {
    sfx('aud-draw');
    S.turn.drawCount = (S.turn.drawCount || 0) + 1;
    if (S.turn.drawCount >= (S.turn.drawsAllowed || 1)) S.turn.drawn = true;
  }
  if (zone === 'played' && old === 'hand') sfx('aud-play');
  if (zone === 'played') {
    c.actUsed = false; c.bonUsed = false; c.reaUsed = false;
    c.condStack = [];
  }
  if (zone === 'dead' && old === 'played') { killCard(c); return; }

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
    // Undying (level 17) — return to hand instead of dying
    const isUndying = getActiveConditions(c).some(a => a.name === 'Undying');
    if (isUndying) {
      toast(`${c.name} is Undying — returned to hand.`);
      log(`🦴 ${c.name} would have died but is Undying — → hand`);
      c.curHp = Math.max(1, Math.floor(c.maxHp / 2));
      c.zone = 'hand';
      save(); renderAll();
      return;
    }
    toast(`${c.name} has fallen!`);
    log(`💀 ${c.name} reduced to 0 HP`);
    killCard(c, false);
    save(); return;
  }
  save(); renderAll();
}

function togAct(id, f) { const c=getCard(id); if(!c)return; c[f]=!c[f]; save(); renderAll(); }

// ═══════════════════════════════════════════════════════════
// DELETE / ENCOUNTER / WIPE
// ═══════════════════════════════════════════════════════════
function delCard(id) {
  const c = getCard(id); if (!c) return;
  askConfirm('Remove Card', `Permanently remove "${c.name}" from the deck?`, ok => {
    if (!ok) return;
    S.cards = S.cards.filter(x => x.id !== id);
    save(); log(`🗑 ${c.name} permanently removed`); renderAll(); toast(`${c.name} removed.`);
  });
}

function newEncounter() {
  askConfirm('New Encounter', 'Return all cards to deck, restore HP, reset Bones/Souls, and start combat?', ok => {
    if (!ok) return;
    S.cards.forEach(c => {
      c.zone = 'deck';
      c.curHp = c.maxHp;
      c.actUsed = false; c.bonUsed = false; c.reaUsed = false;
      c.condStack = [];
    });
    S.res.bones = 0; S.res.souls = 0;
    S.turn.active = false; S.turn.drawn = false; S.turn.drawCount = 0; S.turn.count = 0;
    S.turn.fairHandUsed = false;
    S.turn.dueDate = 0;
    S.obolFlipsLeft = 5;
    renderRes(); updateTurnBtn(); save();
    log('⚔ New encounter — field cleared, HP restored, resources reset, Obol flips reset');
    toast('New encounter started!');
    renderAll();
  });
}

function clearCards() {
  askConfirm('Clear All Cards', 'Remove every card from the deck?', ok => {
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
  const opts = (c.dmgOptions && c.dmgOptions.length)
    ? c.dmgOptions
    : (c.dmg ? [{ dmg: c.dmg, dtype: c.dtype || '' }] : []);
  const fields = {
    'e-name':c.name,'e-cr':c.cr,'e-bon':c.bonCost,'e-sou':c.soulCost||0,
    'e-hp':c.maxHp,'e-ac':c.ac,'e-spd':c.spd||'','e-atk':c.atk||'',
    'e-str':c.str||10,'e-dex':c.dex||10,'e-con':c.con||10,
    'e-int':c.int||10,'e-wis':c.wis||10,'e-cha':c.cha||10,
    'e-saves':c.saves||'','e-senses':c.senses||'',
    'e-imm':c.imm||'','e-res':c.res||'','e-lang':c.lang||'',
    'e-abils':c.abils||'','e-death':c.deathTrigger||'',
  };
  Object.entries(fields).forEach(([k,v]) => { const el = document.getElementById(k); if (el) el.value = v; });
  document.getElementById('e-basecond').value = c.baseCond || 'Normal';
  document.getElementById('e-type').value = c.type || 'Fleeting';
  const extraWrap = document.getElementById('e-extra-dmg-rows');
  if (extraWrap) extraWrap.innerHTML = '';
  if (opts.length) opts.forEach(opt => addExtraDmgRow('e', opt.dmg, opt.dtype));
  else addExtraDmgRow('e');
  document.getElementById('editmodal').classList.add('open');
}
function closeModal() { document.getElementById('editmodal').classList.remove('open'); editId = null; }
function saveEdit() {
  const c = getCard(editId); if (!c) return;
  const newMax = parseInt(document.getElementById('e-hp').value) || c.maxHp;
  const hpD = newMax - c.maxHp;
  c.name    = document.getElementById('e-name').value.trim() || c.name;
  c.cr      = document.getElementById('e-cr').value.trim();
  c.type    = document.getElementById('e-type').value || c.type || 'Fleeting';
  c.bonCost = parseInt(document.getElementById('e-bon').value) || 0;
  c.soulCost= parseInt(document.getElementById('e-sou').value) || 0;
  c.maxHp   = newMax;
  c.curHp   = Math.min(c.maxHp, Math.max(0, c.curHp + hpD));
  c.ac      = parseInt(document.getElementById('e-ac').value) || c.ac;
  c.spd     = document.getElementById('e-spd').value.trim();
  c.atk     = document.getElementById('e-atk').value.trim();
  const newOpts = collectDmgOptions('e');
  syncDmgFields(c, newOpts.length ? newOpts : [{ dmg: c.dmg || '1d6', dtype: c.dtype || '' }]);
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
  c.deathTrigger = document.getElementById('e-death').value.trim();
  c.baseCond   = document.getElementById('e-basecond').value || 'Normal';
  save(); sfx('aud-blessing'); log(`✏ Edited: ${c.name}`); closeModal(); renderAll(); toast(`${c.name} updated.`);
}
