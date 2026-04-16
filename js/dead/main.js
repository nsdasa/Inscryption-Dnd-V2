// ═══════════════════════════════════════════════════════════
// THE SCRYBE OF THE DEAD — MAIN / INIT
// ═══════════════════════════════════════════════════════════

// Each event is its own page (Deck / Obol Flip / Rusted Nail / Burial)
// — clicking a nav tab calls switchPage, which also runs the ritual
// page setup hook so the per-page card grid is rendered fresh.
let currentPage = 'deck';
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const tab = document.querySelector(`.nav-tab[data-page="${name}"]`);
  if (page) page.classList.add('active');
  if (tab) tab.classList.add('active');
  currentPage = name;
  if (typeof setupRitualPage === 'function') setupRitualPage(name);
}
document.querySelectorAll('.nav-tab').forEach(t => {
  // Skip anchor tabs (cross-link to Beasts) — they navigate naturally
  if (t.tagName === 'A' || !t.dataset.page) return;
  t.addEventListener('click', () => switchPage(t.dataset.page));
});

// DOM helper
function findCardEl(cardId) {
  return document.querySelector(`[data-card-id="${cardId}"]`);
}

// Empty blackout helper (sigil uses it in Beasts; harmless here)
function blackout(durMs, callback) {
  const bl = document.getElementById('page-blackout');
  if (bl) bl.classList.add('dark');
  setTimeout(() => {
    if (callback) callback();
    if (bl) bl.classList.remove('dark');
  }, durMs);
}

// ═══════════════════════════════════════════════════════════
// PLAYER HP (forked from js/player.js minus its Beasts-only
// init block which references #unyielding-cb, setupAltarSlots,
// buildSoundTable — none of which exist on the Dead page)
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
function playerMaxDown() { setPlayerMaxHp(Math.max(1, getPlayerMaxHp() - 1)); }
function playerMaxUp()   { setPlayerMaxHp(getPlayerMaxHp() + 1); }

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
renderRes();
renderLog();
renderAll();
updateTurnBtn();
updateLevelDisplay();
renderPlayerHp();

// DM notes — separate localStorage key from Beasts
const NOTES_KEY = 'scrybe-dead-notes';
const notesEl = document.getElementById('dm-notes');
if (notesEl) {
  notesEl.value = localStorage.getItem(NOTES_KEY) || '';
  notesEl.addEventListener('input', e => localStorage.setItem(NOTES_KEY, e.target.value));
}

// Enter-to-inscribe on name field
const nameEl = document.getElementById('i-name');
if (nameEl) nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });

// Search filter
const searchEl = document.getElementById('search');
if (searchEl) searchEl.addEventListener('input', renderAll);

// Edit modal wiring
const ec = document.getElementById('editcancel');
const es = document.getElementById('editsave');
const em = document.getElementById('editmodal');
if (ec) ec.addEventListener('click', closeModal);
if (es) es.addEventListener('click', saveEdit);
if (em) em.addEventListener('click', e => { if (e.target === em) closeModal(); });

// Seed inscribe form with one empty damage row
resetDmgRows('i');
