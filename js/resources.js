// ═══════════════════════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════════════════════
function gainBlood()  { S.res.blood++;  document.getElementById('rc-blood').textContent = S.res.blood;  save(); }
function spendBlood() { if(S.res.blood<=0){toast('No Blood left!');return;} S.res.blood--; document.getElementById('rc-blood').textContent=S.res.blood; log(`🩸 Blood spent (left: ${S.res.blood})`); save(); }
function gainBones()  { S.res.bones++;  document.getElementById('rc-bones').textContent = S.res.bones;  save(); }
function spendBones() { if(S.res.bones<=0){toast('No Bones left!');return;} S.res.bones--; document.getElementById('rc-bones').textContent=S.res.bones; log(`🦴 Bone spent (left: ${S.res.bones})`); save(); }
function renderRes()  { document.getElementById('rc-blood').textContent = S.res.blood||0; document.getElementById('rc-bones').textContent = S.res.bones||0; }

// ═══════════════════════════════════════════════════════════
// TURN
// ═══════════════════════════════════════════════════════════
function toggleTurn() {
  if (!S.turn.active) {
    // START TURN
    sfx('aud-turn-start');
    S.turn.active = true;
    S.turn.drawn = false;
    S.turn.drawCount = 0;
    S.turn.count = (S.turn.count || 0) + 1;
    document.getElementById('tnum').textContent = S.turn.count;

    // Fair hand: auto-draw 3 cards on the very first turn start only
    const isFairHand = S.turn.count === 1 && !S.turn.fairHandUsed;
    if (isFairHand) {
      S.turn.fairHandUsed = true;
      const drawn = [];
      const pick = (pool) => {
        const eligible = pool.filter(c => !drawn.includes(c));
        if (!eligible.length) return;
        const choice = eligible[Math.floor(Math.random() * eligible.length)];
        choice.zone = 'hand'; drawn.push(choice);
      };
      const deck = () => S.cards.filter(c => c.zone === 'deck');
      pick(deck().filter(c => (c.bldCost || 0) === 0));
      pick(deck().filter(c => (c.bldCost || 0) === 1));
      pick(deck());
      S.turn.drawn = true;
      if (drawn.length) {
        log(`✦ Fair hand: ${drawn.map(c => c.name).join(', ')}`);
        sfx('aud-draw');
      }
    }

    // Reset action pips, tick condition durations, apply effects
    S.cards.forEach(c => {
      if (c.zone !== 'played') return;
      c.actUsed = false; c.bonUsed = false; c.reaUsed = false;
      tickConditionDurations(c);
      applyCondEffectsForCard(c);
    });
    save();
    log(`▶ Turn ${S.turn.count} started`);
    toast(`Turn ${S.turn.count} started!`);
  } else {
    // END TURN
    sfx('aud-turn-end');
    S.turn.active = false;
    S.turn.drawn = false;
    S.res.blood = 0;
    document.getElementById('rc-blood').textContent = 0;
    save();
    log(`⏹ Turn ${S.turn.count} ended — Blood cleared`);
    toast('Turn ended. Blood cleared.');
  }
  save(); renderAll(); updateTurnBtn();
}
function updateTurnBtn() {
  const b = document.getElementById('turnbtn');
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
