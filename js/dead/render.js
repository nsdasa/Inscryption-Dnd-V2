// ═══════════════════════════════════════════════════════════
// THE SCRYBE OF THE DEAD — RENDER
// ═══════════════════════════════════════════════════════════
// Gravestone-shaped cards in hand/field/dead. Plain gravestone
// silhouette in deck zone (no details) per user request.
// ═══════════════════════════════════════════════════════════

function renderCard(c) {
  const hpPct  = Math.max(0, Math.min(100, (c.curHp / c.maxHp) * 100));
  const active = getActiveConditions(c);
  const allCondCss = getAllCondClasses(c);
  const condOverlays = buildCondOverlays(c);
  const id = c.id;

  const typeBadge = c.type ? `<span class="badge-type badge-${c.type.toLowerCase()}">${c.type === 'DeadMass' ? 'Dead Mass' : c.type}</span>` : '';
  const baseTag = (c.baseCond && c.baseCond !== 'Normal')
    ? `<span class="badge-bc cn-${c.baseCond}">${c.baseCond}</span>` : '';

  // ── DECK ZONE: plain gravestone silhouette, no details ──
  if (c.zone === 'deck') {
    return `<div class="card gravestone-plain" data-card-id="${id}" data-zone="deck">
      <div class="gs-silhouette">
        <div class="gs-rip">RIP</div>
        <div class="gs-name">${c.name}</div>
      </div>
      <div class="cbtns" style="flex-wrap:nowrap;">
        <button class="cb-g" data-fn="drawCard" data-cid="${id}">→ Hand</button>
        <button data-fn="openEdit" data-cid="${id}">Edit</button>
        <button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>
      </div>
    </div>`;
  }

  // ── HAND / FIELD / DEAD: full gravestone card with details ──
  let abHtml = '';
  if (c.abils || c.deathTrigger) {
    let parts = [];
    if (c.abils) parts.push(c.abils);
    if (c.deathTrigger) parts.push(`<span class="death-trig">☠ ${c.deathTrigger}</span>`);
    abHtml = `<div class="abils">${parts.join(' | ')}</div>`;
  }

  const misc = [
    c.saves   ? `<strong>Saves:</strong> ${c.saves}` : '',
    c.senses  ? `<strong>Senses:</strong> ${c.senses}` : '',
    c.imm     ? `<strong>Immune:</strong> ${c.imm}` : '',
    c.res     ? `<strong>Resist:</strong> ${c.res}` : '',
    c.lang    ? `<strong>Lang:</strong> ${c.lang}` : '',
  ].filter(Boolean);
  const miscHtml = misc.length ? `<div class="miscrow">${misc.join('  ·  ')}</div>` : '';

  // Condition stack UI — played zone
  let condHtml = '';
  if (c.zone === 'played') {
    const stackRows = active.map(({ name, dur, isBase }) => {
      const css = `cn-${name}`;
      const durLabel = isBase
        ? `<span class="cdur infinite">∞ base</span>`
        : (dur === null
            ? `<span class="cdur infinite">∞</span>`
            : `<span class="cdur ${dur<=1?'expiring':''}">${dur}t</span>`);
      const removeBtn = isBase ? '' : `<button class="rem-cond" data-cid="${id}" data-cond="${name}" title="Remove">✕</button>`;
      const eff = CONDS[name];
      return `<div class="cstack-row">
        <span class="ctag ${css}">${name}</span>${durLabel}
        ${eff && eff.note !== 'Normal state' ? `<span style="font-size:.5rem;color:var(--dim);font-style:italic">${eff.note}</span>` : ''}
        ${removeBtn}
      </div>`;
    }).join('');

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
    condHtml = active.length
      ? active.map(({ name }) => `<span class="ctag cn-${name}">${name}</span>`).join(' ')
      : `<span class="ctag cn-Normal">Normal</span>`;
  }

  const effBars = active
    .filter(({ name }) => CONDS[name] && (CONDS[name].dmgDice > 0 || CONDS[name].regen))
    .map(({ name }) => CONDS[name].note).join('  ·  ');
  const effBarHtml = effBars ? `<div class="effbar">${effBars}</div>` : '';

  const acBar = c.zone === 'played' ? `<div class="acb">
    <span class="al">Act</span><div class="ap${c.actUsed?' used':''}" data-cid="${id}" data-fn="togActA"></div>
    <span class="al" style="margin-left:3px">Bon</span><div class="ap${c.bonUsed?' used':''}" data-cid="${id}" data-fn="togActB"></div>
    <span class="al" style="margin-left:3px">Rea</span><div class="ap rea${c.reaUsed?' used':''}" data-cid="${id}" data-fn="togActR"></div>
  </div>` : '';

  const btns = {
    hand:   `<button class="cb-g" data-fn="playCard" data-cid="${id}">▶ Play</button><button data-fn="returnDeck" data-cid="${id}">← Deck</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
    played: `<button class="cb-k" data-fn="killCard" data-cid="${id}">☠ Kill</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
    dead:   `<button class="cb-g" data-fn="returnDeck" data-cid="${id}">↩ Deck</button><button data-fn="openEdit" data-cid="${id}">Edit</button><button class="cb-d" data-fn="delCard" data-cid="${id}">✕</button>`,
  }[c.zone] || '';

  const dmgList = (c.dmgOptions && c.dmgOptions.length)
    ? c.dmgOptions
    : (c.dmg ? [{ dmg: c.dmg, dtype: c.dtype || '' }] : []);
  const dmgHtml = dmgList
    .map(d => `<div class="ci"><span class="cl">${d.dtype||'Dmg'}</span><span class="vo">${d.dmg}</span></div>`)
    .join('');

  const dmSizeBadge = c.type === 'DeadMass' && c.sacrificedCount
    ? `<span class="badge-mass">Size: ${deadMassSize(c.sacrificedCount)} (${c.sacrificedCount})</span>` : '';

  return `<div class="card gravestone ${allCondCss} ${c.zone==='dead'?'cdead':''}" data-card-id="${id}" data-zone="${c.zone}">
    ${condOverlays}
    <div class="ctop"><span class="cname">${c.name}</span><div class="cbadges">${typeBadge}${baseTag}${dmSizeBadge}</div></div>
    <div class="ccost">
      <div class="ci"><span class="cl">CR</span><span class="vg">${c.cr}</span></div>
      <div class="ci"><span class="cl">🦴</span><span class="vo">${c.bonCost||0}</span></div>
      <div class="ci"><span class="cl">💎</span><span class="vs">${c.soulCost||0}</span></div>
      <div class="ci"><span class="cl">⚡</span><span class="vg">${c.atk}</span></div>
      ${dmgHtml}
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

function deadMassSize(n) {
  if (n <= 2) return 'Small';
  if (n <= 4) return 'Medium';
  if (n <= 6) return 'Large';
  return 'Huge';
}

// ═══════════════════════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-fn]');
  if (!el) return;
  const fn  = el.dataset.fn;
  const cid = el.dataset.cid;
  const cond = el.dataset.cond;

  switch(fn) {
    case 'addExtraDmgRow': addExtraDmgRow(el.dataset.target || 'i'); break;
    // header
    case 'gainBones':   gainBones();   break;
    case 'spendBones':  spendBones();  break;
    case 'gainSouls':   gainSouls();   break;
    case 'spendSouls':  spendSouls();  break;
    case 'toggleTurn':  toggleTurn();  break;
    // sidebar
    case 'addCard':         addCard();         break;
    case 'newEncounter':    newEncounter();    break;
    case 'clearCards':      clearCards();      break;
    case 'wipeHistory':     wipeHistory();     break;
    case 'resetTurnCounter':resetTurnCounter();break;
    case 'levelUp':     levelUp();      break;
    case 'levelDown':   levelDown();    break;
    case 'playerDmg':   playerDmg();    break;
    case 'playerHeal':  playerHeal();   break;
    case 'playerMaxDown': playerMaxDown(); break;
    case 'playerMaxUp':   playerMaxUp();   break;
    case 'toggleMusic': toggleMusic();  break;
    // rituals
    case 'openObolFlip':      openObolFlip();      break;
    case 'openRustedNail':    openRustedNail();    break;
    case 'openBurialRitual':  openBurialRitual();  break;
    case 'doGravedig':        doGravedig();        break;
    case 'obolCancel':        closeRitual();       break;
    case 'obolResolve':       obolResolve();       break;
    case 'nailResolve':       nailResolve();       break;
    case 'burialResolve':     burialResolve();     break;
    case 'selectRitualCard':  selectRitualCard(cid); break;
    case 'boneHeal':          boneHeal(cid);       break;
    case 'recurDead':         recurDead(cid);      break;
    case 'boneLordTithe':     boneLordTithe();     break;
    case 'boneLordCommand':   boneLordCommand();   break;
    case 'boneStatBuff':      boneStatBuff(cid);   break;
    // card
    case 'drawCard':    moveCard(cid, 'hand');   break;
    case 'playCard':    moveCard(cid, 'played'); break;
    case 'returnDeck':  moveCard(cid, 'deck');   break;
    case 'killCard':    moveCard(cid, 'dead');   break;
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
  }
});

document.addEventListener('click', function(e) {
  const el = e.target.closest('.rem-cond');
  if (!el) return;
  const cid = el.dataset.cid;
  const cond = el.dataset.cond;
  if (cid && cond) removeCondition(cid, cond);
});

// ═══════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════
function renderAll() {
  const searchEl = document.getElementById('search');
  const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
  ['deck','hand','played','dead'].forEach(z => {
    const filtered = S.cards.filter(c => c.zone===z && (!q || c.name.toLowerCase().includes(q)));
    const el = document.getElementById(`z-${z}`);
    if (!el) return;
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
  if (db) {
    const full = hand >= getHandLimit();
    const drawsLeft = Math.max(0, (S.turn.drawsAllowed || 1) - (S.turn.drawCount || 0));
    if (!S.turn.active)      { db.textContent = `Hand: ${hand} / ${getHandLimit()}  —  Press Start Turn to draw`; db.className='dbar noturn'; }
    else if (full)           { db.textContent = `Hand: ${hand} / ${getHandLimit()}  —  HAND FULL`; db.className='dbar full'; }
    else if (drawsLeft === 0){ db.textContent = `Hand: ${hand} / ${getHandLimit()}  —  All draws used this turn ✓`; db.className='dbar drawn'; }
    else                     { db.textContent = `Hand: ${hand} / ${getHandLimit()}  —  ${drawsLeft} draw${drawsLeft>1?'s':''} available`; db.className='dbar'; }
  }
  renderRes();
  // If a ritual page is currently active, refresh its picker so newly
  // inscribed/duplicated/destroyed cards reflect immediately.
  if (typeof currentPage !== 'undefined' && currentPage && currentPage !== 'deck') {
    if (typeof refreshRitualPicker === 'function') refreshRitualPicker();
  }
}
