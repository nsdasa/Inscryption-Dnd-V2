// ═══════════════════════════════════════════════════════════
// ADMIN — SOUND REGISTRY (all sfx in one place)
// ═══════════════════════════════════════════════════════════
const SOUND_REGISTRY = {
  'aud-death':           { label:'Card Death',          event:'When any card dies (HP = 0 or killed)' },
  'aud-sacrifice':       { label:'Sacrifice',           event:'Knife sacrifice on played beast' },
  'aud-blessing':        { label:'Card Blessing',       event:'Inscribed, edited, sigil added, buffed' },
  'aud-campfire-burn':   { label:'Campfire Burn',       event:'Card burns/destroyed at campfire (roll 1-2)' },
  'aud-campfire-buff':   { label:'Campfire Buff',       event:'Card successfully buffed at campfire (roll 3+)' },
  'aud-campfire-smoked': { label:'Card Smoked',         event:'Card smoked at campfire (Lv18, roll 1-2)' },
  'aud-sigil-death':     { label:'Sigil Stone — Death', event:'Card sacrificed at sigil altar' },
  'aud-sigil-buff':      { label:'Sigil Stone — Buff',  event:'Sigil transferred to target card' },
  'aud-myco-enter':      { label:'Mycologist — Enter',  event:'Blackout begins when combining cards' },
  'aud-myco-success':    { label:'Mycologist — Success',event:'Cards successfully combined' },
  'aud-myco-fail':       { label:'Mycologist — Fail',   event:'Cards fail to combine' },
  'aud-card-damage':     { label:'Card Takes Damage',   event:'HP reduced on any card (not death)' },
  'aud-draw':            { label:'Card Draw',           event:'Card drawn from deck to hand' },
  'aud-play':            { label:'Card Played',         event:'Card played from hand to field' },
  'aud-turn-start':      { label:'Turn Start',          event:'Start Turn button pressed' },
  'aud-turn-end':        { label:'Turn End',            event:'End Turn button pressed' },
  'aud-campfire-enter':  { label:'Campfire Enter',    event:'Campfire page lights up' },
};

// Extra audio elements for extended sounds
const EXTRA_AUDIO_IDS = [
  'aud-campfire-burn','aud-campfire-buff','aud-campfire-smoked',
  'aud-sigil-death','aud-sigil-buff','aud-myco-enter','aud-myco-success','aud-myco-fail',
  'aud-card-damage','aud-draw','aud-play','aud-turn-start','aud-turn-end','aud-campfire-enter'
];
EXTRA_AUDIO_IDS.forEach(id => {
  if (!document.getElementById(id)) {
    const a = document.createElement('audio');
    a.id = id; a.preload = 'none';
    document.body.appendChild(a);
  }
});

let sfxVolume = 0.7;
let bgmVolume = 0.35;

function sfx(id) {
  try {
    const el = document.getElementById(id);
    if (!el) return;
    // Handle both direct src and <source> child elements
    if (!el.src && !(el.querySelector && el.querySelector('source[src]'))) return;
    el.currentTime = 0;
    el.volume = Math.max(0, Math.min(1, sfxVolume));
    el.play().catch(()=>{});
  } catch(e) {}
}
function setBgmVol(v) { bgmVolume=v; const b=document.getElementById('aud-bgm'); if(b) b.volume=v; }
function setSfxVol(v) { sfxVolume=v; }

let musicPlaying = false;
function toggleMusic() {
  const bgm = document.getElementById('aud-bgm');
  const btn = document.getElementById('musicbtn');
  if (!bgm) return;
  if (musicPlaying) {
    bgm.pause(); musicPlaying=false;
    btn.textContent='♪'; btn.style.color='var(--parch3)';
  } else {
    bgm.volume = bgmVolume;
    bgm.play().then(()=>{ musicPlaying=true; btn.textContent='♫'; btn.style.color='var(--gold2)'; })
      .catch(()=>toast('Click the page first to enable audio.'));
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════
function applyColours() {
  const map = {'bg':'--bg','gold':'--gold2','forest':'--forest','ember':'--ember','blood':'--blood','white':'--white'};
  Object.entries(map).forEach(([k,v]) => {
    const el = document.getElementById('adm-'+k);
    if (el) document.documentElement.style.setProperty(v, el.value);
  });
  toast('Colours applied!');
}
function applyFont(type, val) {
  document.documentElement.style.setProperty(`--font-${type}`, val);
}
function applyImages() {
  const cfFile = document.getElementById('adm-img-campfire')?.files[0];
  if (cfFile) {
    const r = new FileReader();
    r.onload = e => { const img = document.getElementById('campfire-img'); if (img) img.src = e.target.result; };
    r.readAsDataURL(cfFile);
  }
  const cbFile = document.getElementById('adm-card-back')?.files[0];
  if (cbFile) {
    const r = new FileReader();
    r.onload = e => { setCardBack(e.target.result); toast('Card back updated!'); };
    r.readAsDataURL(cbFile);
    return;
  }
  toast('Images updated!');
}
function applyBgmFile() {
  const file = document.getElementById('adm-bgm-file')?.files[0];
  if (!file) { toast('No file chosen.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const bgm = document.getElementById('aud-bgm');
    if (bgm) { bgm.src = e.target.result; bgm.load(); toast('BGM replaced!'); }
  };
  reader.readAsDataURL(file);
}
function applyGameSettings() {
  const hl = parseInt(document.getElementById('adm-hand-limit').value)||6;
  const sc = parseInt(document.getElementById('adm-sigil-cap').value)||3;
  const sc2= parseInt(document.getElementById('adm-sigil-cap2').value)||5;
  S.settings = { ...(S.settings||{}), handLimit:hl, sigilCap:sc, sigilCap2:sc2 };
  save(); toast(`Settings applied: hand limit ${hl}, sigil caps ${sc}/${sc2}`);
}
function getHandLimit() { return (S.settings&&S.settings.handLimit)||6; }
function getSigilCap()  { return getLevel()>=10 ? ((S.settings&&S.settings.sigilCap2)||5) : ((S.settings&&S.settings.sigilCap)||3); }

function exportState() {
  const blob = new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'scrybe_deck.json';
  a.click();
}
function importState() {
  const file = document.getElementById('adm-import')?.files[0];
  if (!file) { toast('No file chosen.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch(err) {
      toast('Invalid JSON — could not parse file.'); return;
    }
    // Accept either a full state export or a deck-only JSON (with "cards" array)
    if (Array.isArray(parsed)) {
      // Raw array of cards
      S.cards = parsed;
    } else if (parsed && Array.isArray(parsed.cards)) {
      // Deck JSON with cards array (our starter format)
      S.cards = parsed.cards;
      // Optionally merge other fields if present, but keep S intact otherwise
    } else {
      toast('JSON must have a "cards" array.'); return;
    }
    // Ensure every imported card has all required fields with safe defaults
    S.cards = S.cards.map(c => ({
      id:         c.id         || makeId(),
      name:       c.name       || 'Unknown',
      cr:         c.cr         || '?',
      bldCost:    c.bldCost    !== undefined ? c.bldCost : 0,
      bonCost:    c.bonCost    !== undefined ? c.bonCost : 0,
      maxHp:      c.maxHp      || 10,
      curHp:      c.curHp      !== undefined ? c.curHp : (c.maxHp || 10),
      ac:         c.ac         || 10,
      spd:        c.spd        || '30 ft',
      atk:        c.atk        || '+0',
      dmg:        c.dmg        || '1d6',
      dtype:      c.dtype      || '',
      str:        c.str        || 10,
      dex:        c.dex        || 10,
      con:        c.con        || 10,
      int:        c.int        || 10,
      wis:        c.wis        || 10,
      cha:        c.cha        || 10,
      saves:      c.saves      || '',
      senses:     c.senses     || '',
      imm:        c.imm        || '',
      res:        c.res        || '',
      lang:       c.lang       || '',
      abils:      c.abils      || '',
      sigilAbils: Array.isArray(c.sigilAbils) ? c.sigilAbils : [],
      zone:       c.zone       || 'deck',
      baseCond:   c.baseCond   || 'Normal',
      condStack:  Array.isArray(c.condStack) ? c.condStack : [],
      combined:   c.combined   || false,
      smoked:     c.smoked     || false,
      inanimate:  c.inanimate  || false,
      actUsed:    false,
      bonUsed:    false,
      reaUsed:    false,
    }));
    save();
    renderAll(); renderRes(); updateTurnBtn(); updateLevelDisplay(); renderPlayerHp();
    toast('Deck imported — ' + S.cards.length + ' cards loaded!');
  };
  reader.readAsText(file);
}

// Sound trigger table
function buildSoundTable() {
  const tbody = document.getElementById('sound-trigger-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.entries(SOUND_REGISTRY).forEach(([id, info]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:'Cinzel',serif;font-size:.55rem;color:var(--gold)">${info.label}</td>
      <td style="font-style:italic;font-size:.6rem;color:var(--dim)">${info.event}</td>
      <td><input type="file" accept="audio/*" data-sfx-id="${id}" onchange="replaceSfx(this)" style="font-size:.55rem;color:var(--parch3)"></td>
      <td>
        <div class="vol-wrap">
          <input type="range" min="0" max="100" value="70" data-sfx-vol="${id}"
            oninput="this.nextElementSibling.textContent=this.value+'%'"
            style="width:60px;accent-color:var(--gold)">
          <span style="font-size:.55rem;color:var(--parch3)">70%</span>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}
function replaceSfx(input) {
  const id = input.dataset.sfxId;
  const file = input.files[0];
  if (!file || !id) return;
  const reader = new FileReader();
  reader.onload = e => {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('audio'); el.id=id; el.preload='auto'; document.body.appendChild(el); }
    el.src = e.target.result; el.load();
    toast(`${SOUND_REGISTRY[id]?.label||id} replaced!`);
  };
  reader.readAsDataURL(file);
}

// Hover sounds
const hoverSounds = [];
function addHoverSoundRow() {
  const wrap = document.getElementById('hover-sound-rows');
  const row = document.createElement('div');
  row.className = 'admin-row'; row.style.gap='.3rem'; row.style.flexWrap='wrap';
  row.innerHTML = `
    <select style="flex:0 0 80px;background:rgba(26,92,53,.2);border:1px solid rgba(200,150,10,.2);border-radius:2px;color:var(--white);font-size:.65rem;padding:.2rem .3rem;outline:none;">
      <option>Any Zone</option><option>Deck</option><option>Hand</option><option>Played</option><option>Dead</option>
    </select>
    <input type="file" accept="audio/*" style="flex:1;font-size:.6rem;color:var(--parch3)">
    <button onclick="this.parentElement.remove()" style="background:rgba(120,20,20,.3);border:1px solid rgba(155,28,28,.4);color:#f08080;cursor:pointer;font-size:.6rem;padding:.15rem .4rem;border-radius:2px">✕</button>`;
  row.querySelector('input').addEventListener('change', function() {
    const zone = row.querySelector('select').value;
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const existing = hoverSounds.findIndex(h=>h.zone===zone);
      const audio = new Audio(e.target.result); audio.volume=sfxVolume;
      if (existing>=0) hoverSounds[existing].audio=audio;
      else hoverSounds.push({zone,audio});
      toast(`Hover sound set for ${zone}`);
    };
    reader.readAsDataURL(file);
  });
  wrap.appendChild(row);
}
// Wire hover sounds
document.addEventListener('mouseover', e => {
  const card = e.target.closest('.card');
  if (!card) return;
  if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.card') === card) return;
  const zone = card.dataset.zone || 'Any Zone';
  const hs = hoverSounds.find(h=>h.zone==='Any Zone'||h.zone===zone);
  if (hs && hs.audio) { hs.audio.currentTime=0; hs.audio.play().catch(()=>{}); }
});

// colour input live preview
document.querySelectorAll('.admin-section input[type=color]').forEach(inp => {
  inp.addEventListener('input', function() {
    document.getElementById(this.id+'-val').textContent = this.value;
  });
});
