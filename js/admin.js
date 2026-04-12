// ═══════════════════════════════════════════════════════════
// CORE STATE & FUNCTIONS (from v5)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// CONFIRM SYSTEM (no native confirm() — blocked in iframes)
// ═══════════════════════════════════════════════════════════
function askConfirm(title, msg, cb) {
  document.getElementById('cb-title').textContent = title;
  document.getElementById('cb-msg').textContent = msg;
  document.getElementById('confirmbox').classList.add('open');
  const ok = document.getElementById('cb-ok');
  const cn = document.getElementById('cb-cancel');
  // clone to remove old listeners
  const ok2 = ok.cloneNode(true); ok.parentNode.replaceChild(ok2, ok);
  const cn2 = cn.cloneNode(true); cn.parentNode.replaceChild(cn2, cn);
  ok2.onclick = () => { document.getElementById('confirmbox').classList.remove('open'); cb(true); };
  cn2.onclick = () => { document.getElementById('confirmbox').classList.remove('open'); cb(false); };
}
