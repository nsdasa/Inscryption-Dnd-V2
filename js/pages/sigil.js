// ═══════════════════════════════════════════════════════════
// SIGIL PAGE
// ═══════════════════════════════════════════════════════════
let sigilSlots = { sacrifice:null, receive:null };
let selectedAbility = null;

function refreshSigilDeck() {
  const strip = document.getElementById('sigil-deck-strip');
  if (!strip) return;
  const deckCards = S.cards.filter(c=>c.zone==='deck'||c.zone==='hand');
  strip.innerHTML = deckCards.length
    ? deckCards.map(c=>miniCardHTML(c,'sigil')).join('')
    : '<span style="font-size:.65rem;color:var(--dim);font-style:italic">No cards in deck</span>';
}

function miniCardHTML(c, context) {
  const sigils = (c.sigilAbils||[]).length;
  const cap = getSigilCap();
  const locked = context==='sigil-receive' && sigils>=cap;
  return `<div class="slot-card-mini ${locked?'opacity-50':''}" 
    draggable="true" 
    data-card-id="${c.id}"
    data-context="${context}"
    style="${locked?'opacity:.4;cursor:not-allowed':''}"
    title="${c.name} | Sigils: ${sigils}/${cap}"
    ondragstart="onMiniDragStart(event,'${c.id}','${context}')"
    ondragend="onMiniDragEnd(event)">
    <div class="scm-name">${c.name}</div>
    <div class="scm-hp">HP ${c.curHp}/${c.maxHp} · AC ${c.ac}</div>
    <div class="scm-cost">🩸${c.bldCost} 🦴${c.bonCost} · ${sigils} sigil${sigils!==1?'s':''}</div>
  </div>`;
}

function onMiniDragStart(e, cardId, context) {
  e.dataTransfer.setData('cardId', cardId);
  e.dataTransfer.setData('context', context);
  e.currentTarget.classList.add('dragging');
}
function onMiniDragEnd(e) { e.currentTarget.classList.remove('dragging'); }

// Set up altar drop slots
function setupAltarSlots() {
  ['sacrifice','receive'].forEach(slotName => {
    const el = document.getElementById('slot-'+slotName);
    if (!el) return;
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('active'); });
    el.addEventListener('dragleave', () => el.classList.remove('active'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('active');
      const cardId = e.dataTransfer.getData('cardId');
      if (!cardId) return;
      const card = getCard(cardId);
      if (!card) return;
      if (slotName==='receive') {
        const cap = getSigilCap();
        if ((card.sigilAbils||[]).length >= cap) {
          toast(`${card.name} already has max ${cap} sigils!`); return;
        }
      }
      // Prevent same card in both slots
      const otherSlot = slotName === 'sacrifice' ? 'receive' : 'sacrifice';
      if (sigilSlots[otherSlot] && sigilSlots[otherSlot].id === card.id) {
        toast('Cannot place the same card in both slots!'); return;
      }
      sigilSlots[slotName] = card;
      renderSigilSlot(slotName, card);
      buildExtractPanel();
      updateSacrificeBtn();
    });
    // Click to remove placed card
    el.addEventListener('click', e => {
      if (e.target.closest('.slot-card-mini')) {
        sigilSlots[slotName] = null;
        renderSigilSlot(slotName, null);
        buildExtractPanel();
        updateSacrificeBtn();
      }
    });
  });
}

function renderSigilSlot(slotName, card) {
  const el = document.getElementById('slot-'+slotName);
  if (!el) return;
  if (card) {
    el.classList.add('has-card');
    const sigils = (card.sigilAbils||[]).length;
    const cap = getSigilCap();
    el.innerHTML = `<div class="slot-card-mini" data-card-id="${card.id}" title="Click to remove">
      <div class="scm-name">${card.name}</div>
      <div class="scm-hp">HP ${card.curHp}/${card.maxHp}</div>
      <div class="scm-cost">${sigils}/${cap} sigils</div>
    </div>`;
  } else {
    el.classList.remove('has-card');
    const labels = { sacrifice:'Drop card<br>to receive sigil', receive:'Drop card<br>to sacrifice' };
    el.innerHTML = `<div class="slot-label" style="font-size:.46rem;color:rgba(180,150,80,.5);text-align:center;line-height:1.4">${labels[slotName]}</div>`;
  }
}

function buildExtractPanel() {
  const panel = document.getElementById('extract-panel');
  const list  = document.getElementById('extract-list');
  const sacCard = sigilSlots.sacrifice; // bottom stone = card being destroyed
  if (!sacCard) { panel.classList.remove('visible'); return; }
  
  const abilities = [];
  if (sacCard.abils) sacCard.abils.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).forEach(a=>abilities.push(a));
  (sacCard.sigilAbils||[]).forEach(a=>abilities.push(a));
  // Add base stat abilities
  if (sacCard.atk) abilities.push(`Attack: ${sacCard.atk} for ${sacCard.dmg}`);
  
  if (!abilities.length) { panel.classList.remove('visible'); return; }
  
  panel.classList.add('visible');
  selectedAbility = null;
  list.innerHTML = abilities.map((ab,i) => `
    <label class="extract-option" onclick="selectAbility(${i})">
      <input type="radio" name="extract-ability" value="${i}" id="ea-${i}">
      ${ab}
    </label>`).join('');
  list._abilities = abilities;
}

function selectAbility(i) {
  selectedAbility = document.getElementById('extract-list')._abilities[i];
  document.querySelectorAll('.extract-option').forEach((el,j) => {
    el.classList.toggle('selected', j===i);
  });
  updateSacrificeBtn();
}

function updateSacrificeBtn() {
  const btn = document.getElementById('sacrifice-btn');
  const ready = sigilSlots.sacrifice && sigilSlots.receive && selectedAbility;
  btn.classList.toggle('ready', !!ready);
}

function performSacrifice() {
  const sacCard = sigilSlots.sacrifice; // top stone = card being sacrificed
  const recCard = sigilSlots.receive;  // bottom stone = card receiving sigil
  if (!sacCard || !recCard || !selectedAbility) { toast('Place both cards and select an ability.'); return; }
  if (sacCard.id === recCard.id) { toast('Cannot sacrifice a card to itself.'); return; }

  // SFX
  sfx('aud-sigil-death');

  // Animate the sacrifice card slot — draw symbol + fade
  const sacSlot = document.getElementById('slot-sacrifice');
  const sacMini = sacSlot.querySelector('.slot-card-mini');
  if (sacMini) {
    sacMini.style.position = 'relative';
    sacMini.style.overflow = 'hidden';
    animateSlotDeath(sacMini, true, null);
  }

  setTimeout(() => {
    // Remove card from deck permanently
    S.cards = S.cards.filter(c => c.id !== sacCard.id);
    
    // Add sigil to receive card
    if (!recCard.sigilAbils) recCard.sigilAbils = [];
    recCard.sigilAbils.push(selectedAbility);
    
    save();
    
    // Animate receive card with 360 flip + blessing sfx
    const recSlot = document.getElementById('slot-receive');
    const recMini = recSlot.querySelector('.slot-card-mini');
    if (recMini) {
      setTimeout(() => {
        sfx('aud-sigil-buff');
        sfx('aud-blessing');
        recMini.style.animation = 'card-flip-360 .7s ease-in-out forwards';
        recMini.style.transformStyle = 'preserve-3d';
        // Update the mini card to show new sigil after flip
        setTimeout(() => {
          recMini.querySelector('.scm-cost').textContent = `${recCard.sigilAbils.length}/${getSigilCap()} sigils`;
          log(`⚡ Sigil "${selectedAbility}" transferred to ${recCard.name} (now ${recCard.sigilAbils.length} sigil${recCard.sigilAbils.length!==1?'s':''}) — ${sacCard.name} permanently destroyed`);
          toast(`Sigil transferred to ${recCard.name}!`);
        }, 400);
      }, 200);
    }
    
    // Reset slots
    sigilSlots = { sacrifice:null, receive:null };
    selectedAbility = null;
    
    setTimeout(() => {
      renderSigilSlot('sacrifice', null);
      renderSigilSlot('receive', null);
      document.getElementById('extract-panel').classList.remove('visible');
      document.getElementById('extract-list').innerHTML = '';
      updateSacrificeBtn();
      refreshSigilDeck();
      renderAll();
    }, 1600);
    
  }, 1400);
}
