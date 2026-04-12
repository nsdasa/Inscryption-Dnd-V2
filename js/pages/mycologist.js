// ═══════════════════════════════════════════════════════════
// MYCOLOGIST PAGE
// ═══════════════════════════════════════════════════════════
let mycoSlots = { a:null, b:null };

function refreshMycoDeck() {
  const strip = document.getElementById('myco-deck-strip');
  if (!strip) return;
  const cards = S.cards.filter(c=>c.zone==='deck'||c.zone==='hand');
  strip.innerHTML = cards.length
    ? cards.map(c=>miniCardHTML(c,'myco')).join('')
    : '<span style="font-size:.65rem;color:var(--dim);font-style:italic">No cards in deck</span>';
}

function setupMycoSlots() {
  ['a','b'].forEach(sl => {
    const el = document.getElementById('myco-slot-'+sl);
    if (!el) return;
    el.addEventListener('dragover', e=>{ e.preventDefault(); el.classList.add('active'); });
    el.addEventListener('dragleave', ()=>el.classList.remove('active'));
    el.addEventListener('drop', e=>{
      e.preventDefault(); el.classList.remove('active');
      const cid=e.dataTransfer.getData('cardId');
      if (!cid) return;
      const card=getCard(cid);
      if (!card) return;
      mycoSlots[sl]=card;
      el.innerHTML=`<div class="slot-card-mini" style="width:100px" onclick="mycoSlots['${sl}']=null;this.parentElement.innerHTML='<span class=slot-lbl>Card ${sl.toUpperCase()}</span>';checkMycoReady()">
        <div class="scm-name">${card.name}</div>
        <div class="scm-hp">HP ${card.curHp}/${card.maxHp}</div>
      </div>`;
      checkMycoReady();
    });
  });
}

function checkMycoReady() {
  const btn=document.getElementById('myco-choose-btn');
  const status=document.getElementById('myco-status');
  const {a,b}=mycoSlots;
  if (!a||!b) { btn.classList.remove('ready'); if(status) status.textContent=''; return; }
  // Check same name/CR
  const same = a.name.toLowerCase()===b.name.toLowerCase() && a.cr===b.cr;
  if (!same) {
    btn.classList.remove('ready');
    if(status) status.textContent='Cards must be identical (same creature & CR)';
    return;
  }
  if (a.id===b.id) {
    btn.classList.remove('ready');
    if(status) status.textContent='Cannot combine a card with itself';
    return;
  }
  btn.classList.add('ready');
  if(status) status.textContent=`Ready to combine: 2× ${a.name}`;
}

function performCombine() {
  const btn=document.getElementById('myco-choose-btn');
  if (!btn.classList.contains('ready')) return;
  const {a,b}=mycoSlots;
  if (!a||!b) return;

  sfx('aud-myco-enter');
  blackout(3000, () => {
    // Roll DC 15
    const roll = Math.floor(Math.random()*20)+1;
    const success = roll >= 15;
    log(`🍄 Mycologist: combining ${a.name}+${b.name}, rolled d20=${roll} (${success?'SUCCESS':'FAILURE'})`);

    if (success) {
      sfx('aud-myco-success'); sfx('aud-blessing');
      // Merge into card A
      a.maxHp = a.maxHp * 2;
      a.curHp = Math.min(a.curHp * 2, a.maxHp);
      const atkM = (a.atk||'+0').match(/([+-]?\d+)/);
      const atkN = atkM ? parseInt(atkM[1]) : 0;
      a.atk = (atkN+2>=0?'+':'') + (atkN+2);
      a.ac = (a.ac||10) + 2;
      a.combined = true;
      // Absorb sigils from B
      if (b.sigilAbils && b.sigilAbils.length) {
        if (!a.sigilAbils) a.sigilAbils=[];
        b.sigilAbils.forEach(s=>{ if(!a.sigilAbils.includes(s)) a.sigilAbils.push(s); });
      }
      // Remove card B
      S.cards = S.cards.filter(c=>c.id!==b.id);
      save();
      toast(`${a.name} combined! HP×2, +2 Atk, +2 AC`);
      log(`✂ Combined: ${a.name} (HP ${a.maxHp}, Atk ${a.atk}, AC ${a.ac})`);
    } else {
      sfx('aud-myco-fail'); sfx('aud-death');
      ['a','b'].forEach(sl=>{
        const slEl = document.getElementById('myco-slot-' + sl);
        const sm = slEl && slEl.querySelector('.slot-card-mini');
        if (sm) animateSlotDeath(sm, false, null);
      });
      S.cards = S.cards.filter(c=>c.id!==a.id && c.id!==b.id);
      save();
      toast(`Combination failed! Both cards destroyed.`);
      log(`✂ Combine FAILED — ${a.name} and ${b.name} both destroyed`);
    }
    // Reset slots
    mycoSlots={a:null,b:null};
    ['a','b'].forEach(sl=>{
      const el=document.getElementById('myco-slot-'+sl);
      if(el) el.innerHTML=`<span class="slot-lbl">Card ${sl.toUpperCase()}</span>`;
      if(el) el.classList.remove('active');
    });
    btn.classList.remove('ready');
    const status=document.getElementById('myco-status');
    if(status) status.textContent='';
    refreshMycoDeck(); renderAll();
  });
}

// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// PATCHED knifeCard — use corrected campfire sfx approach
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// HAND LIMIT using dynamic setting
// ═══════════════════════════════════════════════════════════
// patch moveCard inner hand check to use getHandLimit()


// ═══════════════════════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════════════════════
;
;
// Sacrifice button
document.getElementById('sacrifice-btn').addEventListener('click', performSacrifice);
// Mycologist combine button
document.getElementById('myco-choose-btn').addEventListener('click', performCombine);

// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// MYCO SPORE PARTICLES
// ═══════════════════════════════════════════════════════════
let sporeInterval = null;
function startSpores() {
  clearSpores();
  sporeInterval = setInterval(() => {
    if (currentPage !== 'mycologist') { clearSpores(); return; }
    const s = document.createElement('div');
    s.className = 'spore';
    const x = 10 + Math.random() * 80;
    const dur = 4 + Math.random() * 5;
    const delay = Math.random() * 2;
    const size = 3 + Math.random() * 6;
    s.style.cssText = `left:${x}vw;bottom:${5+Math.random()*20}vh;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;opacity:${0.3+Math.random()*0.4}`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), (dur + delay) * 1000);
  }, 600);
}
function clearSpores() {
  if (sporeInterval) { clearInterval(sporeInterval); sporeInterval = null; }
  document.querySelectorAll('.spore').forEach(s => s.remove());
}
