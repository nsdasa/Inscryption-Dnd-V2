// ═══════════════════════════════════════════════════════════
// PLAYER HEALTH TRACKER
// ═══════════════════════════════════════════════════════════
function getPlayerHp()    { return S.playerHp    !== undefined ? S.playerHp    : 20; }
function getPlayerMaxHp() { return S.playerMaxHp !== undefined ? S.playerMaxHp : 20; }

function renderPlayerHp() {
  const cur = getPlayerHp(), max = getPlayerMaxHp();
  const ce = document.getElementById('player-hp-cur');
  const me = document.getElementById('player-hp-max');
  const bx = document.getElementById('player-hp-box');
  if (ce) { ce.textContent = cur; const p = max>0?cur/max:1; ce.style.color = p>.5?'#f08080':p>.25?'#ff6040':'#ff2020'; }
  if (me) me.textContent = max;
  if (bx) { const p=max>0?cur/max:1; bx.style.borderColor=p>.5?'rgba(155,28,28,.5)':p>.25?'rgba(220,80,20,.7)':'rgba(255,20,20,.9)'; bx.style.boxShadow=p<=.25?'0 0 8px rgba(255,20,20,.4)':''; }
}

function flashDamage() {
  const el = document.getElementById('damage-flash');
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 500);
}

function playerDmg() {
  if (S.playerHp === undefined) S.playerHp = getPlayerMaxHp();
  if (S.playerHp <= 0) { toast('Already at 0 HP!'); return; }
  S.playerHp = Math.max(0, S.playerHp - 1);
  save(); renderPlayerHp(); flashDamage(); sfx('aud-card-damage');
  if (S.playerHp === 0) { toast('You have fallen!'); log('Player reduced to 0 HP'); }
}

function playerHeal() {
  if (S.playerHp === undefined) S.playerHp = getPlayerMaxHp();
  S.playerHp = Math.min(getPlayerMaxHp(), S.playerHp + 1);
  save(); renderPlayerHp();
}

function setPlayerMaxHp(v) {
  S.playerMaxHp = Math.max(1, v);
  S.playerHp    = Math.min(getPlayerHp(), S.playerMaxHp);
  save(); renderPlayerHp();
}
function playerMaxDown() {
  setPlayerMaxHp(Math.max(1, getPlayerMaxHp() - 1));
}
function playerMaxUp() {
  setPlayerMaxHp(getPlayerMaxHp() + 1);
}

// INIT
// ═══════════════════════════════════════════════════════════
renderRes(); renderLog(); renderAll(); updateTurnBtn(); updateLevelDisplay(); renderPlayerHp();
document.getElementById('dm-notes').value = localStorage.getItem('scrybe-notes')||'';
document.getElementById('dm-notes').addEventListener('input',e=>localStorage.setItem('scrybe-notes',e.target.value));
document.getElementById('i-name').addEventListener('keydown',e=>{if(e.key==='Enter')addCard();});
document.getElementById('search').addEventListener('input',renderAll);
document.getElementById('editcancel').addEventListener('click',closeModal);
document.getElementById('editsave').addEventListener('click',saveEdit);
document.getElementById('editmodal').addEventListener('click',e=>{if(e.target===document.getElementById('editmodal'))closeModal();});
document.getElementById('unyielding-cb').addEventListener('change',function(){
  S.unyieldingDeck=this.checked; save();
  log(this.checked?'🔥 Unyielding Deck ACTIVE':'🔥 Unyielding Deck off');
});
document.getElementById('unyielding-cb').checked = S.unyieldingDeck||false;

// Set up altar and myco slots
setupAltarSlots();
setupMycoSlots();
buildSoundTable();

// Update admin inputs from current vars
if(document.getElementById('adm-hand-limit')) document.getElementById('adm-hand-limit').value=getHandLimit();

// Restore colour inputs to their current CSS values
['bg','gold','forest','ember','blood','white'].forEach(k=>{
  const inp=document.getElementById('adm-'+k);
  if(inp) inp.addEventListener('input',function(){
    document.getElementById(this.id+'-val').textContent=this.value;
  });
});

// HP click listeners removed — use +/- buttons instead





