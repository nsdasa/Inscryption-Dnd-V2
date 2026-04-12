// ═══════════════════════════════════════════════════════════
// CAMPFIRE PAGE
// ═══════════════════════════════════════════════════════════
let campfireCardId = null;
let campfireRevealed = false;
let campfireSlotSetup = false;

function initCampfirePage() {
  // Only play the reveal animation on first visit per session
  if (!campfireRevealed) {
    const bg = document.getElementById('campfire-bg');
    const imgWrap = document.getElementById('campfire-img-wrap');
    const title = document.getElementById('campfire-title');
    const label = document.getElementById('campfire-drop-label');

    bg.classList.remove('lit');
    imgWrap.classList.remove('lit');
    if (title) title.style.color='rgba(220,130,40,.0)';
    if (label) label.classList.remove('lit');

    setTimeout(() => {
      bg.classList.add('lit');
      imgWrap.classList.add('lit');
      if (title) title.style.color='rgba(220,130,40,.85)';
      if (label) label.classList.add('lit');
      campfireRevealed = true;
      sfx('aud-campfire-enter');
    }, 1600);
  }

  refreshCampfireDeck();

  // Only wire up slot event listeners once
  if (!campfireSlotSetup) {
    setupCampfireSlot();
    campfireSlotSetup = true;
  }

  // If a card was already in the slot, restore its display
  if (campfireCardId) {
    const card = getCard(campfireCardId);
    if (card) {
      restoreCampfireSlot(card);
    } else {
      // Card was deleted/burned while away
      campfireCardId = null;
      const slot = document.getElementById('campfire-slot');
      if (slot) slot.innerHTML = '<span class="slot-label">Drop card here</span>';
      const btn = document.getElementById('campfire-choose-btn');
      if (btn) { btn.classList.remove('lit-and-ready'); btn.textContent = 'Choose'; }
    }
  }
}

function restoreCampfireSlot(card) {
  const slot = document.getElementById('campfire-slot');
  const btn  = document.getElementById('campfire-choose-btn');
  if (!slot) return;
  slot.innerHTML = `<div class="slot-on-fire" style="position:relative">
    ${miniCardHTML(card,'campfire-slot')}
  </div>`;
  const slotMini = slot.querySelector('.slot-card-mini');
  if (slotMini) {
    slotMini.setAttribute('draggable', 'true');
    slotMini.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('cardId', card.id);
      campfireCardId = null;
      slot.innerHTML = '<span class="slot-label">Drop card here</span>';
      btn.classList.remove('lit-and-ready');
      btn.textContent = 'Choose';
      refreshCampfireDeck();
    });
  }
  if (card.smoked) {
    btn.classList.remove('lit-and-ready');
    btn.textContent = 'Choose';
  } else {
    btn.classList.add('lit-and-ready');
  }
}

function refreshCampfireDeck() {
  const strip = document.getElementById('campfire-deck-strip');
  if (!strip) return;
  const cards = S.cards.filter(c=>c.zone==='deck'||c.zone==='hand');
  strip.innerHTML = cards.length
    ? cards.map(c => miniCardHTML(c,'campfire')).join('')
    : '<span style="font-size:.65rem;color:var(--dim);font-style:italic">No cards in deck</span>';
  // Drag from campfire deck
  strip.querySelectorAll('.slot-card-mini').forEach(el => {
    el.addEventListener('dragstart', e => {
      if (el.dataset.smoked==='true') { e.preventDefault(); toast('Smoked cards cannot be campfired again.'); return; }
      e.dataTransfer.setData('cardId', el.dataset.cardId);
    });
    el.addEventListener('dragend', e => el.classList.remove('dragging'));
  });
}

function setupCampfireSlot() {
  const slot = document.getElementById('campfire-slot');
  const btn  = document.getElementById('campfire-choose-btn');
  if (!slot) return;

  slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('active'); });
  slot.addEventListener('dragleave', () => slot.classList.remove('active'));
  slot.addEventListener('drop', e => {
    e.preventDefault(); slot.classList.remove('active');
    const cid = e.dataTransfer.getData('cardId');
    if (!cid) return;
    const card = getCard(cid);
    if (!card) return;
    if (card.smoked) { toast(`${card.name} is Smoked — cannot be campfired.`); return; }
    campfireCardId = cid;
    // Render the card in the slot with fire effect
    slot.innerHTML = `<div class="slot-on-fire" style="position:relative">
      ${miniCardHTML(card,'campfire-slot')}
    </div>`;
    // Make card draggable OUT — drag it back to remove
    const slotMini = slot.querySelector('.slot-card-mini');
    if (slotMini) {
      slotMini.setAttribute('draggable', 'true');
      slotMini.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('cardId', cid);
        campfireCardId = null;
        slot.innerHTML = '<span class="slot-label">Drop card here</span>';
        btn.classList.remove('lit-and-ready');
        btn.textContent = 'Choose';
        refreshCampfireDeck();
      });
    }
    // Enable button
    btn.classList.add('lit-and-ready');
  });

  btn.addEventListener('click', () => {
    if (!campfireCardId || !campfireRevealed) return;
    if (!btn.classList.contains('lit-and-ready')) return;
    doCampfireRoll(campfireCardId);
  });
}

function doCampfireRoll(cardId) {
  const c = getCard(cardId);
  if (!c) return;
  const slot = document.getElementById('campfire-slot');
  const btn  = document.getElementById('campfire-choose-btn');
  btn.classList.remove('lit-and-ready');
  btn.textContent = 'Rolling…';

  // First roll: d6 for outcome
  const roll = Math.floor(Math.random()*6)+1;
  const STATS = ['Max HP','AC','Atk Bonus','Damage','Speed (+5ft)','All Saves'];
  const statRoll = Math.floor(Math.random()*6)+1;
  const statName = STATS[statRoll-1];
  const unyielding = S.unyieldingDeck || false;

  setTimeout(() => {
    if (roll <= 2) {
      if (unyielding) {
        sfx('aud-campfire-smoked'); sfx('aud-death');
        c.smoked = true;
        c.maxHp = Math.max(1, Math.floor(c.maxHp/2));
        c.curHp = Math.min(c.curHp, c.maxHp);
        save();
        // Grey out card
        const mini = slot.querySelector('.slot-card-mini');
        if (mini) mini.style.filter='grayscale(1) brightness(.6)';
        showCampfireResult(slot, `💨 Smoked! HP→${c.maxHp}`);
        log(`💨 Campfire: ${c.name} rolled ${roll} — SMOKED (HP halved to ${c.maxHp})`);
        toast(`${c.name} Smoked!`);
      } else {
        sfx('aud-campfire-burn'); sfx('aud-death');
        showCampfireResult(slot, '🔥 Burned!');
        const burnEl = slot.querySelector('.slot-card-mini');
        if (burnEl) animateSlotDeath(burnEl, false, null);
        log(`🔥 Campfire: ${c.name} rolled ${roll} — BURNED permanently`);
        toast(`${c.name} burned to ash!`);
        setTimeout(() => {
          S.cards = S.cards.filter(x=>x.id!==cardId);
          save(); campfireCardId=null;
          slot.innerHTML='<span class="slot-label">Drop card here</span>';
          refreshCampfireDeck(); renderAll();
          btn.textContent='Choose'; btn.classList.remove('lit-and-ready');
        }, 1500);
        return;
      }
    } else {
      let buff = roll<=4 ? 1 : roll===5 ? 2 : 3;
      sfx('aud-campfire-buff'); sfx('aud-blessing');
      applyStatBuff(c, statRoll, buff);
      save();
      showCampfireResult(slot, `+${buff} ${statName}`);
      // 360 flip
      const mini = slot.querySelector('.slot-card-mini');
      if (mini) {
        setTimeout(() => {
          mini.style.animation='card-flip-360 .7s ease-in-out forwards';
          mini.style.transformStyle='preserve-3d';
          setTimeout(() => {
            mini.querySelector('.scm-hp').textContent=`HP ${c.curHp}/${c.maxHp} · AC ${c.ac}`;
          }, 400);
        }, 400);
      }
      log(`🔥 Campfire: ${c.name} rolled ${roll} — +${buff} ${statName}`);
      toast(`${c.name}: +${buff} ${statName}!`);
    }
    // Re-enable button after animation — card stays in slot
    setTimeout(() => { btn.textContent = 'Choose'; btn.classList.add('lit-and-ready'); }, 2500);
  }, 600);
}

function showCampfireResult(slot, text) {
  const el = slot.querySelector('.slot-on-fire') || slot;
  const div = document.createElement('div');
  div.className='campfire-result';
  div.textContent=text;
  div.style.fontSize='.9rem';
  el.appendChild(div);
  setTimeout(() => div.remove(), 1800);
}
