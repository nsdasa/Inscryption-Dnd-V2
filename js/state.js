// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const SK = 'scrybe-v4';

// ═══════════════════════════════════════════════════════════
// CARD BACK
// ═══════════════════════════════════════════════════════════
let CARD_BACK_URI = 'Assets/Images/card_back.svg';
function setCardBack(uri) { CARD_BACK_URI = uri; renderAll(); }
let S;
function defaultS() {
  return { cards:[], res:{blood:0,bones:0}, turn:{active:false,drawn:false,count:0}, log:[], level:1 };
}
function loadS() {
  try { const d = JSON.parse(localStorage.getItem(SK)); return d && d.cards ? d : defaultS(); }
  catch { return defaultS(); }
}
S = loadS();
function save() { try { localStorage.setItem(SK, JSON.stringify(S)); } catch(e) { console.warn('save failed',e); } }

// ═══════════════════════════════════════════════════════════
// CONDITION DEFINITIONS
// ═══════════════════════════════════════════════════════════
// Each condition: { dmgDice, dmgType, regen, note, cardCss, emoji }
const CONDS = {
  Normal:       { dmgDice:0, regen:false, note:'Normal state', cardCss:'', emoji:'' },
  Burning:      { dmgDice:6, dmgType:'fire',   regen:false, note:'🔥 1d6 fire dmg at start of turn', cardCss:'c-burning', emoji:'🔥' },
  Poisoned:     { dmgDice:4, dmgType:'poison', regen:false, note:'☠ 1d4 poison dmg at start of turn', cardCss:'c-poisoned', emoji:'☠' },
  Regenerating: { dmgDice:0, regen:true,  note:'💚 Regains 1 HP at start of turn', cardCss:'c-regenerating', emoji:'💚' },
  Frozen:       { dmgDice:0, regen:false, note:'❄ Half speed, no reactions', cardCss:'c-frozen', emoji:'❄' },
  Stunned:      { dmgDice:0, regen:false, note:'⚡ Auto-fails STR & DEX saves', cardCss:'c-stunned', emoji:'⚡' },
  Frightened:   { dmgDice:0, regen:false, note:'😨 Disadvantage on attack rolls', cardCss:'c-frightened', emoji:'😨' },
  Weakened:     { dmgDice:0, regen:false, note:'💔 Deals half damage', cardCss:'c-weakened', emoji:'💔' },
  Blessed:      { dmgDice:0, regen:false, note:'✨ +1d4 to attacks and saving throws', cardCss:'c-blessed', emoji:'✨' },
  Invisible:    { dmgDice:0, regen:false, note:'👁 Advantage on attacks; enemies disadvantaged', cardCss:'c-invisible', emoji:'👁' },
};
const COND_NAMES = Object.keys(CONDS);
// Non-permanent conditions (can be added with duration)
const STACKABLE = COND_NAMES.filter(c => c !== 'Normal');

// ═══════════════════════════════════════════════════════════
// CONDITION STACK HELPERS
// Duration: null = infinite (base condition), number = turns remaining
// A card has: baseCond (string), condStack (array of {name, dur})
// The "dominant" visual condition is the first non-Normal in the stack
// ═══════════════════════════════════════════════════════════
function getActiveConditions(card) {
  const stack = card.condStack || [];
  // base condition is always there at foundation (infinite)
  const base = card.baseCond || 'Normal';
  const result = [];
  if (base !== 'Normal') result.push({ name: base, dur: null, isBase: true });
  stack.forEach(s => result.push({ name: s.name, dur: s.dur, isBase: false }));
  return result;
}

function getAllCondClasses(card) {
  return getActiveConditions(card)
    .map(({ name }) => CONDS[name] && CONDS[name].cardCss ? CONDS[name].cardCss : '')
    .filter(Boolean).join(' ');
}

const COND_PARTICLES = {
  Burning:      [{ emoji:'🔥', n:3 }],
  Poisoned:     [{ emoji:'🧪', n:2 }],
  Frozen:       [{ emoji:'❄',  n:2 }],
  Stunned:      [{ emoji:'⚡', n:2 }],
  Blessed:      [{ emoji:'✨', n:2 }],
  Frightened:   [{ emoji:'💀', n:2 }],
  Weakened:     [{ emoji:'💔', n:2 }],
  Regenerating: [{ emoji:'💚', n:2 }],
  Invisible:    [{ emoji:'👁', n:2 }],
};

function buildCondOverlays(card) {
  const active = getActiveConditions(card);
  let html = '';
  // Smoked overlay — always rendered if card is smoked, on top of everything
  if (card.smoked) {
    html += `<div class="cov cov-Smoked"></div>`;
    html += `<div class="cpart cpart-Smoked-0">💨</div>`;
    html += `<div class="cpart cpart-Smoked-1">💨</div>`;
    html += `<div class="cpart cpart-Smoked-2">💨</div>`;
  }
  for (const { name } of active) {
    if (name === 'Normal') continue;
    html += `<div class="cov cov-${name}"></div>`;
    const cfg = COND_PARTICLES[name];
    if (cfg) {
      cfg.forEach(({ emoji, n }) => {
        for (let i = 0; i < n; i++) {
          html += `<div class="cpart cpart-${name}-${i}">${emoji}</div>`;
        }
      });
    }
  }
  return html;
}

function addCondition(cardId, condName, dur) {
  // dur: number of turns, or null for infinite
  const c = getCard(cardId);
  if (!c) return;
  if (condName === 'Normal') return;
  if (!c.condStack) c.condStack = [];
  // Cannot stack the same condition
  const already = getActiveConditions(c).find(x => x.name === condName);
  if (already) {
    toast(`${c.name} already has ${condName}!`);
    return;
  }
  c.condStack.push({ name: condName, dur: dur === null ? null : parseInt(dur) || 3 });
  save();
  sfx('aud-blessing');
  log(`${CONDS[condName].emoji} ${c.name} gained ${condName}${dur !== null ? ` for ${dur} turns` : ' (∞)'}`);
  renderAll();
}

function removeCondition(cardId, condName) {
  const c = getCard(cardId);
  if (!c) return;
  c.condStack = (c.condStack || []).filter(s => s.name !== condName);
  save();
  log(`${c.name}: ${condName} removed`);
  renderAll();
}

function tickConditionDurations(card) {
  // called at start of each turn for played cards
  if (!card.condStack) card.condStack = [];
  const expired = [];
  card.condStack = card.condStack.filter(s => {
    if (s.dur === null) return true; // infinite
    s.dur--;
    if (s.dur <= 0) { expired.push(s.name); return false; }
    return true;
  });
  expired.forEach(name => log(`⌛ ${card.name}: ${name} expired`));
}
