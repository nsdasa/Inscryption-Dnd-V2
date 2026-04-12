// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
let currentPage = 'deck';
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  const tab = document.querySelector(`.nav-tab[data-page="${name}"]`);
  if (page) page.classList.add('active');
  if (tab) tab.classList.add('active');
  currentPage = name;
  if (name === 'campfire')    initCampfirePage();
  if (name === 'sigil')       refreshSigilDeck();
  if (name === 'mycologist')  { refreshMycoDeck(); startSpores(); }
  // Clear spores when leaving myco
  if (name !== 'mycologist')  clearSpores();
}
document.querySelectorAll('.nav-tab').forEach(t => {
  t.addEventListener('click', () => switchPage(t.dataset.page));
});

// ═══════════════════════════════════════════════════════════
// DOM HELPERS
// ═══════════════════════════════════════════════════════════
function findCardEl(cardId) {
  return document.querySelector(`[data-card-id="${cardId}"]`);
}

// ═══════════════════════════════════════════════════════════
// PAGE BLACKOUT HELPER
// ═══════════════════════════════════════════════════════════
function blackout(durMs, callback) {
  const bl = document.getElementById('page-blackout');
  bl.classList.add('dark');
  setTimeout(() => {
    if (callback) callback();
    bl.classList.remove('dark');
  }, durMs);
}
