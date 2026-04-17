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
  if (name === 'admin' && typeof setupAdminPage === 'function') setupAdminPage();
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

// ═══════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════
function setupAdminPage() {
  // Populate state override inputs from current state
  const el = (id) => document.getElementById(id);
  if (el('adm-level'))   el('adm-level').value   = getLevel();
  if (el('adm-bones'))   el('adm-bones').value   = S.res.bones || 0;
  if (el('adm-souls'))   el('adm-souls').value   = S.res.souls || 0;
  if (el('adm-turn'))    el('adm-turn').value    = S.turn.count || 0;
  if (el('adm-obol'))    el('adm-obol').value    = S.obolFlipsLeft != null ? S.obolFlipsLeft : 5;
  if (el('adm-php'))     el('adm-php').value     = getPlayerHp();
  if (el('adm-pmaxhp'))  el('adm-pmaxhp').value  = getPlayerMaxHp();
  if (el('adm-hand-limit')) el('adm-hand-limit').value = getHandLimit();
  renderAdminCardTable();
}

function renderAdminCardTable() {
  const tbody = document.getElementById('admin-card-tbody');
  if (!tbody) return;
  if (!S.cards.length) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;font-style:italic;color:var(--dim);padding:1rem">No cards in deck</td></tr>';
    return;
  }
  tbody.innerHTML = S.cards.map(c => {
    const conds = getActiveConditions(c).map(a => a.name).filter(n => n !== 'Normal').join(', ') || '—';
    const dt = c.deathTrigger ? c.deathTrigger.slice(0, 40) + (c.deathTrigger.length > 40 ? '…' : '') : '—';
    return `<tr>
      <td title="${c.name}">${c.name}</td>
      <td>${c.type || '?'}</td>
      <td>${c.cr}</td>
      <td>${c.bonCost || 0}</td>
      <td>${c.soulCost || 0}</td>
      <td>${c.curHp}/${c.maxHp}</td>
      <td>${c.ac}</td>
      <td><span class="zone-tag z-${c.zone}">${c.zone}</span></td>
      <td title="${c.deathTrigger || ''}">${dt}</td>
      <td title="${conds}">${conds}</td>
      <td style="white-space:nowrap">
        <button class="adm-edit-btn" data-fn="openEdit" data-cid="${c.id}">Edit</button>
        <button class="adm-del-btn" data-fn="delCard" data-cid="${c.id}">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function applyStateOverrides() {
  const el = (id) => document.getElementById(id);
  S.level = parseInt(el('adm-level')?.value) || 1;
  S.res.bones = parseInt(el('adm-bones')?.value) || 0;
  S.res.souls = parseInt(el('adm-souls')?.value) || 0;
  S.turn.count = parseInt(el('adm-turn')?.value) || 0;
  S.obolFlipsLeft = parseInt(el('adm-obol')?.value) || 0;
  S.playerHp = parseInt(el('adm-php')?.value) || 20;
  S.playerMaxHp = parseInt(el('adm-pmaxhp')?.value) || 20;
  save();
  renderRes(); updateLevelDisplay(); updateTurnBtn(); renderPlayerHp(); renderAll();
  toast('State overrides applied.');
  log('⚙ Admin: state overrides applied');
}

function applyGameplay() {
  const hl = parseInt(document.getElementById('adm-hand-limit')?.value) || 6;
  S.settings = { ...(S.settings || {}), handLimit: hl };
  save();
  toast('Gameplay settings applied.');
}

function exportDeck() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'scrybe_dead_deck.json';
  a.click();
}

function importDeck() {
  const file = document.getElementById('adm-import')?.files[0];
  if (!file) { toast('No file chosen.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    let parsed;
    try { parsed = JSON.parse(e.target.result); } catch { toast('Invalid JSON.'); return; }
    if (Array.isArray(parsed)) {
      S.cards = parsed;
    } else if (parsed && Array.isArray(parsed.cards)) {
      S.cards = parsed.cards;
      if (parsed.res) S.res = parsed.res;
      if (parsed.level) S.level = parsed.level;
      if (parsed.turn) S.turn = parsed.turn;
      if (parsed.obolFlipsLeft != null) S.obolFlipsLeft = parsed.obolFlipsLeft;
    } else {
      toast('JSON must have a "cards" array.'); return;
    }
    S.cards = S.cards.map(c => ({
      id: c.id || makeId(),
      name: c.name || 'Unknown',
      cr: c.cr || '?',
      type: c.type || 'Fleeting',
      bonCost: c.bonCost || 0,
      soulCost: c.soulCost || 0,
      maxHp: c.maxHp || 10,
      curHp: c.curHp != null ? c.curHp : (c.maxHp || 10),
      ac: c.ac || 10,
      spd: c.spd || '30 ft',
      atk: c.atk || '+0',
      dmg: c.dmg || '1d6',
      dtype: c.dtype || '',
      dmgOptions: Array.isArray(c.dmgOptions) ? c.dmgOptions : (c.dmg ? [{ dmg: c.dmg, dtype: c.dtype || '' }] : []),
      str: c.str || 10, dex: c.dex || 10, con: c.con || 10,
      int: c.int || 10, wis: c.wis || 10, cha: c.cha || 10,
      saves: c.saves || '', senses: c.senses || '',
      imm: c.imm || '', res: c.res || '', lang: c.lang || '',
      abils: c.abils || '',
      deathTrigger: c.deathTrigger || '',
      zone: c.zone || 'deck',
      baseCond: c.baseCond || 'Normal',
      condStack: Array.isArray(c.condStack) ? c.condStack : [],
      sacrificedCount: c.sacrificedCount || 0,
      actUsed: false, bonUsed: false, reaUsed: false,
    }));
    save(); renderAll(); renderRes(); updateTurnBtn(); updateLevelDisplay(); renderPlayerHp();
    toast('Deck imported — ' + S.cards.length + ' cards loaded!');
    setupAdminPage();
  };
  reader.readAsText(file);
}
