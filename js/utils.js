// ═══════════════════════════════════════════════════════════
// LOG
// ═══════════════════════════════════════════════════════════
function log(msg) {
  if (!S.log) S.log = [];
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  S.log.unshift({ t, msg });
  if (S.log.length > 120) S.log = S.log.slice(0, 120);
  save();
  renderLog();
}
function renderLog() {
  const p = document.getElementById('logp');
  if (!S.log || !S.log.length) { p.innerHTML='<div class="ll" style="opacity:.4;font-style:italic">No events yet</div>'; return; }
  p.innerHTML = S.log.slice(0,25).map(e => `<div class="ll"><span class="lt">${e.t}</span>${e.msg}</div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
let _tt;
function toast(m) {
  const el = document.getElementById('toast');
  el.textContent = m; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2400);
}
