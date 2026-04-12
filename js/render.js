// ═══════════════════════════════════════════════════════════
// RENDER CARD
// ═══════════════════════════════════════════════════════════
function renderCard(c) {
  const hpPct  = Math.max(0, Math.min(100, (c.curHp / c.maxHp) * 100));
  const active = getActiveConditions(c);
  const allCondCss = getAllCondClasses(c);
  const condOverlays = buildCondOverlays(c);
  const id     = c.id; // safe alphanumeric

  // base condition badge
  const baseTag = (c.baseCond && c.baseCond !== 'Normal')
    ? `<span class="badge-bc cn-${c.baseCond}">${c.baseCond}</span>` : '';
  const combBadge = c.combined ? `<span class="badge badge-comb">✂ Combined</span>` : '';
  const smokedBadge = c.smoked ? `<span class="badge-smoked">💨 Smoked</span>` : '';

  // abilities
  let abHtml = '';
  if (c.abils || (c.sigilAbils && c.sigilAbils.length)) {
    let parts = [];
    if (c.abils) parts.push(c.abils);
    if (c.sigilAbils && c.sigilAbils.length)
      parts.push(c.sigilAbils.map(s=>`<span class="sigab">✦ ${s}</span>`).join(' · '));
    abHtml = `<div class="abils">${parts.join(' | ')}</div>`;
  }

  // misc row
  const misc = [
    c.saves   ? `<strong>Saves:</strong> ${c.saves}` : '',
    c.senses  ? `<strong>Senses:</strong> ${c.senses}` : '',
    c.imm     ? `<strong>Immune:</strong> ${c.imm}` : '',
    c.res     ? `<strong>Resist:</strong> ${c.res}` : '',
    c.lang    ? `<strong>Lang:</strong> ${c.lang}` : '',
  ].filter(Boolean);
  const miscHtml = misc.length ? `<div class="miscrow">${misc.join('  ·  ')}</div>` : '';

  // condition stack UI (played only)
  let condHtml = '';
  if (c.zone === 'played') {
    // Show each active condition with duration and remove button
    const stackRows = active.map(({ name, dur, isBase }) => {
      const css = `cn-${name}`;
      const durLabel = isBase
        ? `<span class="cdur infinite">∞ base</span>`
        : (dur === null
            ? `<span class="cdur infinite">∞</span>`
            : `<span class="cdur ${dur<=1?'expiring':''}">${dur}t</span>`);
      const removeBtn = isBase ? '' : `<button class="rem-cond" data-cid="${id}" data-cond="${name}" title="Remove condition">✕</button>`;
      const eff = CONDS[name];
      return `<div class="cstack-row">
        <span class="ctag ${css}">${name}</span>
        ${durLabel}
        ${eff && eff.note !== 'Normal state' ? `<span style="font-size:.5rem;color:var(--dim);font-style:italic">${eff.note}</span>` : ''}
        ${removeBtn}
      </div>`;
    }).join('');

    // Condition rows + add new condition controls
    // Build options excluding already-active conditions
    const activeNames = active.map(x => x.name);
    const availOpts = STACKABLE.filter(n => !activeNames.includes(n))
      .map(n => `<option value="${n}">${n}</option>`).join('');

    condHtml = `<div class="cstack">
      ${stackRows || '<span class="ctag cn-Normal">Normal</span>'}
      ${availOpts ? `<div class="addcond">
        <select id="cond-sel-${id}">${availOpts}</select>
        <input type="number" id="cond-dur-${id}" placeholder="∞ or turns" min="1" max="99" style="max-width:70px">
        <button data-cid="${id}" data-fn="addCondBtn">+ Add</button>
      </div>` : '<span style="font-size:.5rem;color:var(--parch3);font-style:italic">All conditions active</span>'}
    </div>`;
  } else {
    // Non-played: just show condition tags
    condHtml = active.length
      ? active.map(({ name }) => `<span class="ctag cn-${name}">${name}</span>`).join(' ')
      : `<span class="ctag cn-Normal">Normal</span>`;
  }

  // effect bar — list active DOT/HOT conditions
  const effBars = active
    .filter(({ name }) => CONDS[name] && (CONDS[name].dmgDice > 0 || CONDS[name].regen))
    .map(({ name }) => CONDS[name].note).join('  ·  ');
  const effBarHtml = effBars ? `<div class="effbar">${effBars}</div>` : '';

  // action pips (played only)
  const acBar = c.zone === 'played' ? `<div class="acb">
    <span class="al">Act</span><div class="ap${c.actUsed?' used':''}" data-cid="${id}" data-fn="togActA"></div>
    <span class="al" style="margin-left:3px">Bon</span><div class="ap${c.bonUsed?' used':''}" data-cid="${id}" data-fn="togActB"></div>
    <span class="al" style="margin-left:3px">Rea</span><div class="ap rea${c.reaUsed?' used':''}" data-cid="${id}" data-fn="togActR"></div>
  </div>` : '';

  // zone buttons
  const btns = {
    deck: `<button class="cb-g" data-fn="drawCard" data-cid="${id}">→ Hand</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
    hand: `<button class="cb-g" data-fn="playCard" data-cid="${id}">▶ Play</button><button data-fn="returnDeck" data-cid="${id}">← Deck</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
    played: c.inanimate
      ? `<button class="cb-k" style="opacity:.35;cursor:not-allowed;" title="Inanimate — cannot sacrifice"><div class="knife-denied">${knifeSVG()}</div></button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`
      : `<button class="cb-k" data-fn="knifeCard" data-cid="${id}">${knifeSVG()} Knife</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
    dead: `<button class="cb-g" data-fn="returnDeck" data-cid="${id}">↩ Deck</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
  }[c.zone] || '';

  // Show card back for deck cards (face-down)
  

  // ── DECK ZONE: show card back (full size), no name, minimal buttons
  if (c.zone === 'deck') {
    const inanimate = c.inanimate || false;
    return `<div class="card ${c.smoked?'csmoked':''}" data-card-id="${id}" data-zone="deck" style="${inanimate?'border:2px dashed rgba(100,180,220,.6);box-shadow:0 0 8px rgba(80,160,220,.2);':''}">
      <div style="position:relative;width:100%;padding-bottom:142%;overflow:hidden;border-radius:3px;">
        <img src="${CARD_BACK_URI}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:3px;" draggable="false">
        ${inanimate ? '<div style="position:absolute;inset:0;background:rgba(100,180,220,.08);border-radius:3px;pointer-events:none;"></div>' : ''}
      </div>
      <div class="cbtns" style="flex-wrap:nowrap;">
        <button class="cb-g" data-fn="drawCard" data-cid="${id}">→ Hand</button>
        <button data-fn="openEdit" data-cid="${id}">Edit</button>
        <button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>
      </div>
    </div>`;
  }

  // ── DECK ZONE: show card back, full size, no name label ────────────
  if (c.zone === 'deck') {
    const inanimate = c.inanimate || false;
    const inanimStyle = inanimate ? 'border:2px dashed rgba(100,180,220,.65)!important;box-shadow:0 0 8px rgba(80,160,220,.2)!important;' : '';
    return `<div class="card ${c.smoked?'csmoked':''} ${inanimate?'inanimate':''}" data-card-id="${id}" data-zone="deck" style="${inanimStyle}">
      <div style="position:relative;width:100%;padding-bottom:142%;overflow:hidden;border-radius:3px 3px 0 0;">
        <img src="${CARD_BACK_URI}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" draggable="false">
      </div>
      <div class="cbtns">
        <button class="cb-g" data-fn="drawCard" data-cid="${id}">→ Hand</button>
        <button data-fn="openEdit" data-cid="${id}">Edit</button>
        <button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>
      </div>
    </div>`;
  }

return `<div class="card ${allCondCss} ${c.combined?'combined':''} ${c.zone==='dead'?'cdead':''} ${c.smoked?'csmoked':''} ${c.inanimate?'inanimate':''}" data-card-id="${id}" data-zone="${c.zone}">
    ${condOverlays}
    <div class="ctop"><span class="cname">${c.name}</span><div class="cbadges">${baseTag}${combBadge}${smokedBadge}</div></div>
    <div class="ccost">
      <div class="ci"><span class="cl">CR</span><span class="vg">${c.cr}</span></div>
      <div class="ci"><span class="cl">🩸</span><span class="vb">${c.bldCost}</span></div>
      <div class="ci"><span class="cl">🦴</span><span class="vo">${c.bonCost}</span></div>
      <div class="ci"><span class="cl">⚡</span><span class="vg">${c.atk}</span></div>
      <div class="ci"><span class="cl">${c.dtype||'Dmg'}</span><span class="vo">${c.dmg}</span></div>
    </div>
    <div class="cbody">
      <div class="sgrid">
        <div class="si"><span class="sk">HP</span><span class="sv">${c.maxHp}</span></div>
        <div class="si"><span class="sk">AC</span><span class="sv">${c.ac}</span></div>
        <div class="si"><span class="sk">Spd</span><span class="sv" style="font-size:.56rem">${c.spd}</span></div>
        <div class="si"><span class="sk">Atk</span><span class="sv">${c.atk}</span></div>
      </div>
      <div class="estats">
        <div class="si"><span class="sk">STR</span><span class="sv">${c.str} <span style="font-size:.4rem;opacity:.65">(${modStr(c.str)})</span></span></div>
        <div class="si"><span class="sk">DEX</span><span class="sv">${c.dex} <span style="font-size:.4rem;opacity:.65">(${modStr(c.dex)})</span></span></div>
        <div class="si"><span class="sk">CON</span><span class="sv">${c.con} <span style="font-size:.4rem;opacity:.65">(${modStr(c.con)})</span></span></div>
        <div class="si"><span class="sk">INT</span><span class="sv">${c.int} <span style="font-size:.4rem;opacity:.65">(${modStr(c.int)})</span></span></div>
        <div class="si"><span class="sk">WIS</span><span class="sv">${c.wis} <span style="font-size:.4rem;opacity:.65">(${modStr(c.wis)})</span></span></div>
        <div class="si"><span class="sk">CHA</span><span class="sv">${c.cha} <span style="font-size:.4rem;opacity:.65">(${modStr(c.cha)})</span></span></div>
      </div>
      ${miscHtml}
      <div class="hpa">
        <span class="hplbl">HP</span>
        <div class="hpw"><div class="hpb" style="width:${hpPct}%"></div></div>
        <div class="hpc">
          <button data-fn="dmgHp" data-cid="${id}">−</button>
          <span class="hpv">${c.curHp}</span>
          <button data-fn="healHp" data-cid="${id}">+</button>
        </div>
      </div>
      ${condHtml}
      ${acBar}
      ${abHtml}
    </div>
    ${effBarHtml}
    <div class="cbtns">${btns}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// EVENT DELEGATION — single listener, no inline handlers
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-fn]');
  if (!el) return;
  const fn  = el.dataset.fn;
  const cid = el.dataset.cid;
  const cond = el.dataset.cond;

  switch(fn) {
    // header
    case 'gainBlood':   gainBlood();   break;
    case 'spendBlood':  spendBlood();  break;
    case 'gainBones':   gainBones();   break;
    case 'spendBones':  spendBones();  break;
    case 'toggleTurn':  toggleTurn();  break;
    // sidebar
    case 'addCard':         addCard();         break;
    case 'newEncounter':    newEncounter();    break;
    case 'clearCards':      clearCards();      break;
    case 'wipeHistory':     wipeHistory();     break;
    case 'resetTurnCounter':resetTurnCounter();break;
    case 'levelUp':     levelUp();      break;
    case 'levelDown':   levelDown();     break;
    case 'playerDmg':    playerDmg();    break;
    case 'playerHeal':   playerHeal();   break;
    case 'playerMaxDown': playerMaxDown(); break;
    case 'playerMaxUp':   playerMaxUp();   break;
    case 'toggleMusic': toggleMusic();  break;
    // card
    case 'drawCard':    moveCard(cid, 'hand');   break;
    case 'playCard':    moveCard(cid, 'played'); break;
    case 'returnDeck':  moveCard(cid, 'deck');   break;
    case 'killCard':    moveCard(cid, 'dead');   break;
    case 'knifeCard':   knifeCard(cid);          break;
    case 'campfireCard': campfireCard(cid);       break;
    case 'smokeCard':    smokeCard(cid);          break;
    case 'unsmokeCard':  unsmokeCard(cid);        break;
    case 'openEdit':    openEdit(cid);           break;
    case 'delCard':     delCard(cid);            break;
    case 'dmgHp':       adjHp(cid, -1);          break;
    case 'healHp':      adjHp(cid, +1);          break;
    case 'togActA':     togAct(cid, 'actUsed');  break;
    case 'togActB':     togAct(cid, 'bonUsed');  break;
    case 'togActR':     togAct(cid, 'reaUsed');  break;
    case 'addCondBtn': {
      const sel = document.getElementById(`cond-sel-${cid}`);
      const durInp = document.getElementById(`cond-dur-${cid}`);
      if (!sel) break;
      const name = sel.value;
      const durVal = durInp && durInp.value.trim() !== '' ? parseInt(durInp.value) : null;
      addCondition(cid, name, durVal);
      break;
    }
    case 'removeCondition':
      removeCondition(cid, cond); break;
  }
});

// Remove-condition buttons use data-fn on the button itself
document.addEventListener('click', function(e) {
  const el = e.target.closest('.rem-cond');
  if (!el) return;
  const cid  = el.dataset.cid;
  const cond = el.dataset.cond;
  if (cid && cond) removeCondition(cid, cond);
});

// ═══════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════
function renderAll() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  ['deck','hand','played','dead'].forEach(z => {
    const filtered = S.cards.filter(c => c.zone===z && (!q || c.name.toLowerCase().includes(q)));
    const el = document.getElementById(`z-${z}`);
    el.innerHTML = filtered.length
      ? filtered.map(renderCard).join('')
      : `<div class="ez">No cards ${z==='dead'?'fallen':'here'} yet</div>`;
    const all = S.cards.filter(c => c.zone===z).length;
    const cntEl = document.getElementById(`cnt-${z}`);
    const lblEl = document.getElementById(`lbl-${z}`);
    if (cntEl) cntEl.textContent = all;
    if (lblEl) lblEl.textContent = `${all} card${all!==1?'s':''}`;
  });

  const hand = S.cards.filter(c=>c.zone==='hand').length;
  const db = document.getElementById('dbar');
  if (!db) return;
  const full = hand >= 6;
  if (!S.turn.active) { db.textContent=`Hand: ${hand} / 6  —  Press Start Turn to draw`; db.className='dbar noturn'; }
  else if (full)      { db.textContent=`Hand: ${hand} / 6  —  HAND FULL`; db.className='dbar full'; }
  else if (S.turn.drawn){ db.textContent=`Hand: ${hand} / 6  —  Card drawn this turn ✓`; db.className='dbar drawn'; }
  else if (getLevel()>=15 && (S.turn.drawCount||0)===1){ db.textContent=`Hand: ${hand} / 6  —  1/2 draws used (Ambidextrous)`; db.className='dbar'; }
  else                { db.textContent=`Hand: ${hand} / 6  —  Draw available (→ Hand on a deck card)`; db.className='dbar'; }
}


// ═══════════════════════════════════════════════════════════
// LEVEL & BONE LIMIT
// ═══════════════════════════════════════════════════════════
const BONE_LIMITS = {1: 10, 2: 12, 3: 14, 4: 16, 5: 18, 6: 20, 7: 22, 8: 24, 9: 26, 10: 28, 11: 30, 12: 32, 13: 34, 14: 36, 15: 38, 16: 40, 17: 42, 18: 44, 19: 46, 20: 9999};

function getLevel() { return S.level || 1; }
function getBoneLimit() { return BONE_LIMITS[getLevel()] || 10; }

function levelUp() {
  if (getLevel() >= 20) { toast('Already at max level (20).'); return; }
  S.level = getLevel() + 1;
  save(); updateLevelDisplay(); renderAll();
  sfx('aud-level-up');
  log(`⬆ Level up! Now level ${S.level} (Bone Limit: ${getBoneLimit()})`);
  toast(`Level ${S.level}! Bone Limit: ${getBoneLimit()}`);
}
function levelDown() {
  if (getLevel() <= 1) { toast('Already at level 1.'); return; }
  S.level = getLevel() - 1;
  save(); updateLevelDisplay(); renderAll();
  log(`⬇ Level ${S.level} (Bone Limit: ${getBoneLimit()})`);
}
function updateLevelDisplay() {
  if (getLevel() === 20 && S._noShotShown !== true) { S._noShotShown=true; toast('Level 20 — No Shot unlocked! You can now inscribe inanimate objects.'); }
  document.getElementById('rc-level').textContent = getLevel();
  document.getElementById('rc-bonelimit').textContent = getBoneLimit() === 9999 ? '∞' : getBoneLimit();
  // Update unyielding checkbox visibility
  const ub = document.getElementById('unyielding-cb');
  if (ub) ub.closest('div').style.opacity = getLevel() >= 18 ? '1' : '0.4';
  // Update ambidextrous draw indicator style
  const am = document.getElementById('ambidextrous-note');
  if (am) am.style.display = getLevel() >= 15 ? 'block' : 'none';
}

// Bone limit enforcement
function addBones(n) {
  const limit = getBoneLimit();
  const have = S.res.bones || 0;
  const gain = Math.min(n, limit - have);
  if (gain <= 0) { log('🦴 Bone limit reached — excess lost'); return; }
  S.res.bones = have + gain;
  document.getElementById('rc-bones').textContent = S.res.bones;
  if (gain < n) log(`🦴 ${gain} bone${gain!==1?'s':''} added (${n-gain} lost to limit ${limit})`);
  save();
}

// Override gainBones to use bone limit


