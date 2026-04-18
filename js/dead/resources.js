// ═══════════════════════════════════════════════════════════
// THE SCRYBE OF THE DEAD — RESOURCES & TURN LOOP
// ═══════════════════════════════════════════════════════════
// Bones  — gained on card death. Level-based maximum. Reset on
//          Long Rest (Short Rest at level 6).
// Souls  — auto-gained at start of turn = turn number, carry
//          over, max 6.
// ═══════════════════════════════════════════════════════════

const SOUL_CAP = 6;

function gainBones()  { addBones(1); renderRes(); }
function spendBones() {
  if (S.res.bones <= 0) { toast('No Bones left!'); return; }
  S.res.bones--; renderRes(); log(`🦴 Bone spent (left: ${S.res.bones})`); save();
}
function gainSouls()  {
  if ((S.res.souls || 0) >= SOUL_CAP) { toast(`Soul cap reached (${SOUL_CAP}).`); return; }
  addSouls(1); renderRes();
}
function spendSouls() {
  if (S.res.souls <= 0) { toast('No Souls left!'); return; }
  S.res.souls--; renderRes(); log(`💎 Soul spent (left: ${S.res.souls})`); save();
}
function addSouls(n) {
  const have = S.res.souls || 0;
  const gain = Math.min(n, SOUL_CAP - have);
  if (gain <= 0) { log('💎 Soul cap reached — excess lost'); return; }
  S.res.souls = have + gain;
  save();
}
function renderRes() {
  const b = document.getElementById('rc-bones');
  const s = document.getElementById('rc-souls');
  if (b) b.textContent = S.res.bones || 0;
  if (s) s.textContent = S.res.souls || 0;
}

// ═══════════════════════════════════════════════════════════
// LEVEL & BONE LIMIT
// ═══════════════════════════════════════════════════════════
const BONE_LIMITS = {1:10,2:12,3:14,4:16,5:18,6:20,7:22,8:24,9:26,10:28,11:30,12:32,13:34,14:36,15:38,16:40,17:42,18:44,19:46,20:9999};
function getLevel() { return S.level || 1; }
function getBoneLimit() { return BONE_LIMITS[getLevel()] || 10; }
function getHandLimit() { return 6; }

function levelUp() {
  if (getLevel() >= 20) { toast('Already at max level (20).'); return; }
  S.level = getLevel() + 1;
  save(); updateLevelDisplay(); renderAll();
  log(`⬆ Level up! Now level ${S.level} — ${describeLevelFeature(S.level)}`);
  toast(`Level ${S.level}! Bone Limit: ${getBoneLimit()}`);
}
function levelDown() {
  if (getLevel() <= 1) { toast('Already at level 1.'); return; }
  S.level = getLevel() - 1;
  save(); updateLevelDisplay(); renderAll();
  log(`⬇ Level ${S.level}`);
}
function updateLevelDisplay() {
  const l = document.getElementById('rc-level');
  const bl = document.getElementById('rc-bonelimit');
  if (l) l.textContent = getLevel();
  if (bl) bl.textContent = getBoneLimit() === 9999 ? '∞' : getBoneLimit();
  updateFeatureList();
  updateDrawNotes();
}

function updateDrawNotes() {
  const am = document.getElementById('ambidextrous-note');
  if (am) am.style.display = getLevel() >= 15 ? 'block' : 'none';
}

function addBones(n) {
  const limit = getBoneLimit();
  const have = S.res.bones || 0;
  const gain = Math.min(n, limit - have);
  if (gain <= 0) { log('🦴 Bone limit reached — excess lost'); return; }
  S.res.bones = have + gain;
  renderRes();
  if (gain < n) log(`🦴 ${gain} bone${gain!==1?'s':''} added (${n-gain} lost to limit ${limit})`);
  save();
}

// ═══════════════════════════════════════════════════════════
// TURN LOOP
// ═══════════════════════════════════════════════════════════
function toggleTurn() {
  if (!S.turn.active) {
    // START TURN
    sfx('aud-turn-start');
    S.turn.active = true;
    S.turn.drawn = false;
    S.turn.drawCount = 0;
    S.turn.count = (S.turn.count || 0) + 1;

    // Auto-gain Souls = turn number, capped at SOUL_CAP (level 15 Oversoul
    // may raise this in future, but base cap is 6)
    const soulGain = Math.min(S.turn.count, SOUL_CAP - (S.res.souls || 0));
    if (soulGain > 0) {
      S.res.souls = (S.res.souls || 0) + soulGain;
      log(`💎 Gained ${soulGain} Soul${soulGain>1?'s':''} at start of turn ${S.turn.count} (total: ${S.res.souls})`);
    }

    // Draw rules: first turn of the game auto-draws 3 cards (fair hand),
    // thereafter 1 per turn (2 per turn at level 15). Fair hand only
    // fires once — not again after New Encounter resets the counter.
    const isFairHand = S.turn.count === 1 && !S.turn.fairHandUsed;
    const drawsAllowed = isFairHand ? 0 : (getLevel() >= 15 ? 2 : 1);
    S.turn.drawsAllowed = drawsAllowed;

    if (isFairHand) {
      S.turn.fairHandUsed = true;
      const deck = S.cards.filter(c => c.zone === 'deck');
      const drawn = [];
      const pick = (pool) => {
        const eligible = pool.filter(c => !drawn.includes(c));
        if (!eligible.length) return;
        const choice = eligible[Math.floor(Math.random() * eligible.length)];
        choice.zone = 'hand';
        drawn.push(choice);
      };
      pick(deck.filter(c => (c.bonCost||0) === 0 && (c.soulCost||0) === 0));
      pick(deck.filter(c => (c.bonCost||0) <= 1));
      pick(deck);
      S.turn.drawn = true;
      if (drawn.length) {
        log(`✦ Fair hand: ${drawn.map(c=>c.name).join(', ')}`);
        toast(`Drew ${drawn.length} starting card${drawn.length>1?'s':''}!`);
        sfx('aud-draw');
      }
    }

    // Level 13 By Daylight — on the first turn of combat, roll a d20 to set
    // the Due Date. On that turn, played cards grant bones equal to cost.
    if (getLevel() >= 13 && S.turn.count === 1) {
      S.turn.dueDate = Math.floor(Math.random() * 20) + 1;
      log(`🌅 By Daylight — Due Date set to turn ${S.turn.dueDate}`);
      toast(`Due Date: turn ${S.turn.dueDate}`);
    }
    if (getLevel() >= 13 && S.turn.count === S.turn.dueDate) {
      let totalBones = 0;
      S.cards.filter(c => c.zone === 'played').forEach(c => {
        const gain = (c.bonCost || 0);
        totalBones += gain;
      });
      if (totalBones > 0) {
        addBones(totalBones);
        log(`🌅 Due Date struck — gained ${totalBones} bones from played cards`);
        toast(`Due Date! +${totalBones} Bones`);
      }
    }

    // Tick condition durations, apply effects on played cards
    S.cards.forEach(c => {
      if (c.zone !== 'played') return;
      c.actUsed = false; c.bonUsed = false; c.reaUsed = false;
      tickConditionDurations(c);
      applyCondEffectsForCard(c);
    });
    save();
    log(`▶ Turn ${S.turn.count} started — ${drawsAllowed} draw${drawsAllowed>1?'s':''} allowed`);
    toast(`Turn ${S.turn.count} — ${drawsAllowed} draw${drawsAllowed>1?'s':''}`);
  } else {
    // END TURN — Fleeting Undead die at end of their turn
    sfx('aud-turn-end');
    S.turn.active = false;
    S.turn.drawn = false;

    const fleeting = S.cards.filter(c => c.zone === 'played' && (c.type === 'Fleeting' || getActiveConditions(c).some(a => a.name === 'Brittle')));
    if (fleeting.length) {
      log(`⚰ ${fleeting.length} Fleeting Undead die at end of turn`);
      fleeting.forEach(c => { killCard(c, true); });
    }
    save();
    log(`⏹ Turn ${S.turn.count} ended`);
    toast('Turn ended.');
  }
  save(); renderAll(); updateTurnBtn();
}

function updateTurnBtn() {
  const b = document.getElementById('turnbtn');
  if (!b) return;
  b.textContent = S.turn.active ? 'End Turn' : 'Start Turn';
  b.className = 'btn-nav' + (S.turn.active ? ' active' : '');
  document.getElementById('tnum').textContent = S.turn.count || 0;
}
function resetTurnCounter() {
  askConfirm('Reset Turn Counter', 'Reset the turn counter back to 0?', ok => {
    if (!ok) return;
    S.turn.count = 0; S.turn.active = false; S.turn.drawn = false;
    save(); updateTurnBtn(); log('↺ Turn counter reset to 0'); toast('Turn counter reset.');
  });
}

function applyCondEffectsForCard(c) {
  const active = getActiveConditions(c);
  active.forEach(({ name }) => {
    const eff = CONDS[name];
    if (!eff) return;
    if (eff.regen) {
      const gain = Math.min(c.maxHp - c.curHp, 1);
      if (gain > 0) { c.curHp += gain; log(`💚 ${c.name} regenerates +1 HP → ${c.curHp}/${c.maxHp}`); }
    } else if (eff.dmgDice > 0) {
      const roll = Math.floor(Math.random() * eff.dmgDice) + 1;
      c.curHp = Math.max(0, c.curHp - roll);
      log(`${eff.emoji} ${c.name} takes ${roll} ${eff.dmgType} dmg → ${c.curHp}/${c.maxHp}`);
      if (c.curHp === 0) { killCard(c); }
    }
  });
}
