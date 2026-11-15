import { api, DEMO, xpForLevel, levelForXp, rarityFor, RARITY_LABEL } from './api.js';
import { spriteSVG, specFromProfile, FRAMES, ITEM_LAYERS, itemKey, slug, DEFAULT_SPEC } from './sprites.js';
import { esc, toast, sound, buzz, prefs, CREST, icon, qrSVG } from './ui.js';
import { startScanner } from './scanner.js';

const $app = document.getElementById('app');
const S = { cat: null, parts: new Map(), items: new Map(), types: new Map(), me: null, people: [], caught: new Set(), stop: null };

// ------------------------------------------------------------ utilità
const spec = (p) => specFromProfile(p?.sprite, S.parts, S.items);
const typeChip = (id) => { const t = S.types.get(id); return t ? `<span class="type" style="background:${t.color}">${esc(t.name)}</span>` : ''; };
const frameColor = (p) => {
  const f = p?.sprite?.equipped?.cornice;
  if (f && S.items.get(Number(f))) return FRAMES[itemKey(S.items.get(Number(f)))] || '#14183A';
  const r = rarityFor(p?.level ?? 1);
  return r === 'raro' || r === 'leggendario' ? '#F2B200' : r === 'non_comune' ? '#AEB8C9' : '#14183A';
};
const levelProgress = (p) => {
  const l = p.level ?? 1; if (l >= 30) return 1;
  const a = xpForLevel(l), b = xpForLevel(l + 1);
  return Math.max(0, Math.min(1, ((p.xp ?? 0) - a) / (b - a)));
};
const bar = (frac, n = 20) => `<div class="bar" role="img" aria-label="${Math.round(frac * 100)}%">${Array.from({ length: n }, (_, i) => `<span class="${i < Math.round(frac * n) ? 'on' : ''}"></span>`).join('')}</div>`;
const nav = (cur) => `<nav class="tabs" aria-label="Sezioni">
  <a href="#/" ${cur === 'dex' ? 'aria-current="page"' : ''}>${icon('dex')}<span>Stuoiedex</span></a>
  <a href="#/scan" class="scan" aria-label="Scanner">${icon('scan', 30)}</a>
  <a href="#/io" ${cur === 'io' ? 'aria-current="page"' : ''}>${icon('io')}<span>Io</span></a>
</nav>`;
const top = (title, right = '') => `<header class="top">${CREST}<h1>${esc(title)}</h1>${right}</header>`;
const stopCamera = () => { if (S.stop) { S.stop(); S.stop = null; } };

async function refreshMe() { S.me = await api.myProfile(); return S.me; }
async function refreshPeople() {
  const [people, caught] = await Promise.all([api.profiles(), api.captures()]);
  S.people = people; S.caught = new Set(caught);
}

// ------------------------------------------------------------ avvio
async function boot() {
  if (!sessionStorage.getItem('sdx-splash')) {
    sessionStorage.setItem('sdx-splash', '1');
    const s = document.createElement('div');
    s.className = 'splash'; s.innerHTML = `<div class="in">${CREST}<h1>Stuoiedex</h1></div>`;
    document.body.append(s); setTimeout(() => s.remove(), 1600);
  }
  try {
    const user = await api.user();
    if (!user) return loginView();
    await loadCatalog();
    if (!(await refreshMe())) return onboarding();
    await refreshPeople();
    route();
  } catch (e) {
    $app.innerHTML = `${top('Stuoiedex')}<main class="body"><div class="win"><p>${esc(e.message)}</p><button class="btn block" id="retry">Riprova</button></div></main>`;
    document.getElementById('retry').onclick = boot;
  }
}

async function loadCatalog() {
  if (S.cat) return;
  S.cat = await api.catalog();
  S.parts = new Map(S.cat.parts.map((p) => [p.id, p]));
  S.items = new Map(S.cat.items.map((i) => [i.id, i]));
  S.types = new Map(S.cat.types.map((t) => [t.id, t]));
}

window.addEventListener('hashchange', () => { if (S.me) route(); });

function route() {
  stopCamera();
  const h = location.hash.replace(/^#/, '') || '/';
  const [, a, b] = h.split('/');
  window.scrollTo(0, 0);
  if (a === 'p' && b) return cardView(b);
  if (a === 'scan') return scanView();
  if (a === 'io') return meView();
  if (a === 'personaggio') return editorView();
  return dexView();
}

// ------------------------------------------------------------ accesso
function loginView() {
  let email = '';
  const render = (step) => {
    $app.innerHTML = `<div class="screen">${top('Stuoiedex', DEMO ? '<span class="counter">Demo</span>' : '')}
    <main class="body" style="padding-bottom:32px">
      <div class="prof">${spriteSVG(BARISTA, 128, { label: 'Il barista' })}</div>
      <form class="win" id="f" novalidate>
        ${step === 1 ? `
        <label class="f">Email<input id="email" type="email" inputmode="email" autocomplete="email" required value="${esc(email)}"></label>
        <p class="err" id="err"></p>
        <button class="btn block" type="submit">Mandami il codice</button>` : `
        <p style="margin:0 0 12px">Codice inviato a <strong>${esc(email)}</strong></p>
        <label class="f">Codice<input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="8" required></label>
        <p class="err" id="err"></p>
        <button class="btn block" type="submit">Entra</button>
        <button class="link" type="button" id="back" style="color:var(--ink)">Cambia email</button>`}
      </form>
    </main></div>`;
    const f = document.getElementById('f'), err = document.getElementById('err');
    (document.getElementById('email') || document.getElementById('code')).focus();
    document.getElementById('back')?.addEventListener('click', () => render(1));
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true; err.textContent = '';
      try {
        if (step === 1) {
          email = document.getElementById('email').value.trim();
          if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Scrivi un indirizzo email valido');
          await api.sendOtp(email); render(2);
        } else {
          await api.verifyOtp(email, document.getElementById('code').value.trim());
          sound('ok'); boot();
        }
      } catch (e) { err.textContent = e.message; sound('error'); btn.disabled = false; }
    };
  };
  render(1);
}

// Il barista che fa da guida
const BARISTA = { ...DEFAULT_SPEC, capelli: 'ciuffo', colore_capelli: '#141414', barba: 'baffi', maglia: 'camicia', colore_maglia: '#F3F5FA', posa: 'saluto', pelle: '#E2A87F' };

// ------------------------------------------------------------ primo avvio
function onboarding() {
  const draft = { nickname: '', type_ids: [], sprite: { base: randomBase(), equipped: {} }, description: '', birth_day: null, birth_month: null, invite: '', adult: false };
  const say = (lines, then) => {
    let i = 0;
    const show = () => {
      $app.innerHTML = `<div class="screen">${top('Stuoiedex')}<main class="body" style="padding-bottom:32px">
        <div class="prof"><div class="bob">${spriteSVG(BARISTA, 160, { label: 'Il barista' })}</div></div>
        <button class="win dialog" id="d" style="text-align:left;width:100%">${esc(lines[i])}<span class="next">▼</span></button>
        <button class="link" id="skip">Salta</button></main></div>`;
      document.getElementById('d').onclick = () => { sound('tap'); if (++i < lines.length) show(); else then(); };
      document.getElementById('skip').onclick = then;
    };
    show();
  };

  const stepName = () => {
    $app.innerHTML = `<div class="screen">${top('Chi sei?')}<main class="body" style="padding-bottom:32px">
      <form class="win" id="f" novalidate>
        <label class="f">Soprannome<input id="n" maxlength="20" autocomplete="nickname" value="${esc(draft.nickname)}" required></label>
        <p class="err" id="err"></p>
        <h2 class="sec" style="color:var(--ink);margin-bottom:8px">Tipo (uno o due)</h2>
        <div class="chips" style="flex-wrap:wrap" id="types">${S.cat.types.map((t) => `<button type="button" class="chip" data-id="${t.id}" aria-pressed="${draft.type_ids.includes(t.id)}" style="${draft.type_ids.includes(t.id) ? `background:${t.color};color:#fff` : ''}">${esc(t.name)}</button>`).join('')}</div>
        <p class="err" id="err2"></p>
        <button class="btn block" type="submit">Avanti</button>
      </form></main></div>`;
    document.getElementById('types').onclick = (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      const id = Number(b.dataset.id);
      if (draft.type_ids.includes(id)) draft.type_ids = draft.type_ids.filter((x) => x !== id);
      else draft.type_ids = [...draft.type_ids.slice(-1), id];
      draft.nickname = document.getElementById('n').value; sound('tap'); stepName();
    };
    document.getElementById('f').onsubmit = (e) => {
      e.preventDefault();
      draft.nickname = document.getElementById('n').value.trim();
      if (draft.nickname.length < 2) { document.getElementById('err').textContent = 'Almeno due lettere'; return sound('error'); }
      if (!draft.type_ids.length) { document.getElementById('err2').textContent = 'Scegli almeno un tipo'; return sound('error'); }
      say([`${draft.nickname}… suona bene. Ora fatti vedere: com'è il tuo personaggio?`], stepLook);
    };
  };

  const stepLook = () => {
    editor(draft.sprite, { title: 'Il tuo personaggio', items: false, done: 'Avanti', onDone: stepLast });
  };

  const stepLast = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    $app.innerHTML = `<div class="screen">${top('Ultimi dettagli')}<main class="body" style="padding-bottom:32px">
      <form class="win" id="f" novalidate style="display:flex;flex-direction:column;gap:16px">
        <label class="f">Descrizione da Stuoiedex<textarea id="desc" maxlength="140" placeholder="Si dice che…">${esc(draft.description)}</textarea></label>
        <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:6px">
          <legend style="font-weight:700;margin-bottom:6px">Compleanno</legend>
          <div class="row">
            <label class="f"><span class="muted">Giorno</span><select id="bd"><option value="">—</option>${days.map((d) => `<option ${draft.birth_day === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
            <label class="f"><span class="muted">Mese</span><select id="bm"><option value="">—</option>${months.map((m, i) => `<option value="${i + 1}" ${draft.birth_month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          </div>
        </fieldset>
        <label class="f">Codice invito<input id="inv" maxlength="6" autocapitalize="characters" value="${esc(draft.invite)}" style="text-transform:uppercase"></label>
        <label class="check"><input type="checkbox" id="adult" ${draft.adult ? 'checked' : ''}><span>Ho almeno 18 anni</span></label>
        <p class="err" id="err"></p>
        <button class="btn block" type="submit">Crea la scheda</button>
      </form></main></div>`;
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const err = document.getElementById('err');
      draft.description = document.getElementById('desc').value.trim();
      draft.birth_day = Number(document.getElementById('bd').value) || null;
      draft.birth_month = Number(document.getElementById('bm').value) || null;
      draft.invite = document.getElementById('inv').value.trim().toUpperCase();
      draft.adult = document.getElementById('adult').checked;
      if (!draft.adult) { err.textContent = 'Stuoiedex è solo per maggiorenni'; return sound('error'); }
      if ((draft.birth_day == null) !== (draft.birth_month == null)) { err.textContent = 'Indica sia il giorno sia il mese, o nessuno dei due'; return sound('error'); }
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        await api.createProfile({
          nickname: draft.nickname, description: draft.description, type_ids: draft.type_ids, sprite: draft.sprite,
          birth_day: draft.birth_day, birth_month: draft.birth_month, adult_confirmed: true,
        });
        if (draft.invite) { try { await api.useInvite(draft.invite); } catch (x) { toast(x.message, 'error'); } }
        await refreshMe(); await refreshPeople();
        sound('levelup'); buzz([40, 60, 40]);
        say([
          `Ecco fatto, ${draft.nickname}! La tua scheda è al bancone: appena la approviamo entri nello Stuoiedex.`,
          'Ogni volta che passi, inquadra il QR sul tablet del bar. Se incroci un amico, catturalo!',
        ], installStep);
      } catch (x) { err.textContent = x.message; sound('error'); btn.disabled = false; }
    };
  };

  const installStep = () => {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) { location.hash = '#/io'; return route(); }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    $app.innerHTML = `<div class="screen">${top('Sulla Home')}<main class="body" style="padding-bottom:32px">
      <div class="win" style="display:flex;flex-direction:column;gap:14px">
        <p style="margin:0">${ios ? 'Tocca Condividi e poi «Aggiungi alla schermata Home»: così Stuoiedex si apre come un\'app e ti avvisa delle novità.' : 'Installa Stuoiedex: si apre come un\'app e ti avvisa delle novità.'}</p>
        ${!ios ? '<button class="btn gold block" id="inst">Installa</button>' : ''}
        <button class="btn light block" id="go">Entra nello Stuoiedex</button>
      </div></main></div>`;
    document.getElementById('inst')?.addEventListener('click', async () => {
      if (window.__installPrompt) { window.__installPrompt.prompt(); await window.__installPrompt.userChoice; }
      else toast('Usa il menu del browser: «Installa app»');
    });
    document.getElementById('go').onclick = () => { location.hash = '#/io'; route(); };
  };

  say(['Benvenuto al Bar Stuoie!', 'Qui ogni cliente è una creatura rara. Qualcuno più raro degli altri.', 'Io sono il barista. Prima di tutto: come ti chiamano al bar?'], stepName);
}

function randomBase() {
  const base = {};
  const kinds = [...new Set(S.cat.parts.map((p) => p.kind))];
  for (const k of kinds) {
    const opts = S.cat.parts.filter((p) => p.kind === k && !(k === 'posa' && p.name !== 'Fermo'));
    base[k] = opts[Math.floor(Math.random() * opts.length)].id;
  }
  return base;
}

// ------------------------------------------------------------ editor del personaggio
const GROUPS = [
  ['Corpo', ['corporatura', 'pelle']],
  ['Viso', ['viso', 'occhi', 'sopracciglia', 'bocca']],
  ['Capelli', ['capelli', 'colore_capelli', 'barba']],
  ['Vestiti', ['maglia', 'colore_maglia', 'pantaloni', 'scarpe']],
  ['Posa', ['posa']],
];
const KIND_LABEL = { corporatura: 'Corporatura', pelle: 'Pelle', viso: 'Viso', occhi: 'Occhi', sopracciglia: 'Sopracciglia', bocca: 'Bocca', capelli: 'Capelli', colore_capelli: 'Colore', barba: 'Barba', maglia: 'Maglia', colore_maglia: 'Colore', pantaloni: 'Pantaloni', scarpe: 'Scarpe', posa: 'Posa' };
const SLOT_LABEL = { cappello: 'Cappello', occhiali: 'Occhiali', sciarpa: 'Sciarpa', mano: 'In mano', sfondo: 'Sfondo', cornice: 'Cornice' };

function editor(sprite, { title, items, done, onDone, owned = new Set(), level = 1, back }) {
  let group = 0;
  const tabs = items ? [...GROUPS, ['Oggetti', []]] : GROUPS;
  const draw = () => {
    const sp = specFromProfile(sprite, S.parts, S.items);
    const fr = sprite.equipped?.cornice ? FRAMES[itemKey(S.items.get(Number(sprite.equipped.cornice)))] : '#14183A';
    let body = '';
    if (tabs[group][0] === 'Oggetti') {
      for (const slot of Object.keys(SLOT_LABEL)) {
        const list = S.cat.items.filter((i) => i.slot === slot);
        body += `<h2 class="sec">${SLOT_LABEL[slot]}</h2><div class="opts">
          <button class="opt" data-slot="${slot}" data-id="" aria-pressed="${!sprite.equipped?.[slot]}">${spriteSVG({ ...sp, items: { ...sp.items, [slot]: undefined } }, 48)}Niente</button>
          ${list.map((i) => {
            const have = owned.has(i.id);
            const k = itemKey(i);
            const preview = slot === 'cornice'
              ? `<span class="swatch" style="background:${FRAMES[k]}"></span>`
              : spriteSVG({ ...sp, items: { ...sp.items, [ITEM_LAYERS[k] || slot]: k } }, 48);
            return `<button class="opt ${have ? '' : 'locked'}" data-slot="${slot}" data-id="${i.id}" aria-pressed="${Number(sprite.equipped?.[slot]) === i.id}" ${have ? '' : 'aria-disabled="true"'}>${preview}${have ? esc(i.name) : i.unlock_level ? `Lv ${i.unlock_level}` : 'Medaglia'}</button>`;
          }).join('')}</div>`;
      }
    } else {
      for (const kind of tabs[group][1]) {
        const list = S.cat.parts.filter((p) => p.kind === kind);
        body += `<h2 class="sec">${KIND_LABEL[kind]}</h2><div class="opts">${list.map((p) => {
          const on = Number(sprite.base?.[kind]) === p.id;
          const prev = p.color ? `<span class="swatch" style="background:${p.color}"></span>` : spriteSVG({ ...sp, [kind]: slug(p.name) }, 48);
          return `<button class="opt" data-kind="${kind}" data-id="${p.id}" aria-pressed="${on}" aria-label="${esc(KIND_LABEL[kind])}: ${esc(p.name)}">${prev}${p.color ? '' : esc(p.name)}</button>`;
        }).join('')}</div>`;
      }
    }
    $app.innerHTML = `<div class="screen">${top(title, back ? `<a class="iconbtn" href="${back}" aria-label="Indietro">${icon('back')}</a>` : '')}
      <div class="editor-stage"><div class="frame" style="border-color:${fr}">${spriteSVG(sp, 144)}</div></div>
      <main class="body" style="padding-bottom:110px">
        <div class="tabs-k">${tabs.map(([n], i) => `<button class="chip" data-g="${i}" aria-pressed="${i === group}">${n}</button>`).join('')}
          <button class="chip dice" id="dice">Casuale</button></div>
        ${body}
      </main>
      <div style="position:fixed;left:0;right:0;bottom:0;padding:12px 16px calc(12px + var(--safe-b));background:var(--blu-d);border-top:4px solid var(--ink);z-index:9">
        <button class="btn gold block" id="ok" style="max-width:488px;margin:0 auto">${done}</button></div></div>`;
    $app.querySelector('.tabs-k').onclick = (e) => {
      const b = e.target.closest('[data-g]'); if (b) { group = Number(b.dataset.g); sound('tap'); draw(); }
    };
    document.getElementById('dice').onclick = () => { sprite.base = randomBase(); sound('ok'); draw(); };
    $app.querySelector('main').onclick = (e) => {
      const b = e.target.closest('.opt'); if (!b) return;
      if (b.dataset.kind) { sprite.base = { ...sprite.base, [b.dataset.kind]: Number(b.dataset.id) }; }
      else if (b.dataset.slot) {
        if (b.getAttribute('aria-disabled')) { toast(b.textContent.trim().startsWith('Lv') ? `Si sblocca al ${b.textContent.trim()}` : 'Si sblocca con una medaglia'); return sound('error'); }
        const eq = { ...(sprite.equipped || {}) };
        if (b.dataset.id) eq[b.dataset.slot] = Number(b.dataset.id); else delete eq[b.dataset.slot];
        sprite.equipped = eq;
      }
      sound('tap'); buzz(10);
      const y = window.scrollY; draw(); window.scrollTo(0, y);
    };
    document.getElementById('ok').onclick = () => onDone(sprite);
  };
  draw();
}

async function editorView() {
  const owned = new Set(await api.itemsOf(S.me.id));
  const sprite = JSON.parse(JSON.stringify(S.me.sprite || { base: {}, equipped: {} }));
  sprite.equipped ||= {};
  editor(sprite, {
    title: 'Personaggio', items: true, done: 'Salva', owned, level: S.me.level, back: '#/io',
    onDone: async (sp) => {
      try { await api.updateProfile({ sprite: sp }); await refreshMe(); await refreshPeople(); sound('ok'); toast('Salvato', 'ok'); location.hash = '#/io'; }
      catch (e) { toast(e.message, 'error'); sound('error'); }
    },
  });
}

// ------------------------------------------------------------ Stuoiedex
let filter = 0;
function dexView() {
  const others = S.people.filter((p) => p.id !== S.me.id && p.status === 'approved');
  const seen = others.filter((p) => S.caught.has(p.id)).length;
  const all = [S.me, ...others];
  const visible = filter ? all.filter((p) => (p.id === S.me.id || S.caught.has(p.id)) && p.type_ids?.includes(filter)) : all;
  const cells = visible.map((p) => {
    const mine = p.id === S.me.id;
    const known = mine || S.caught.has(p.id);
    if (!known) return `<a class="cell unknown" href="#/p/${p.id}" aria-label="Cliente non ancora catturato">${spriteSVG(spec(p), 64, { silhouette: true, label: 'Sagoma' })}<span class="name">???</span></a>`;
    const r = rarityFor(p.level);
    return `<a class="cell ${r} ${mine ? 'me' : ''}" href="#/p/${p.id}">${spriteSVG(spec(p), 64, { label: esc(p.nickname) })}<span class="name">${esc(p.nickname)}</span>
      <span class="dots">${(p.type_ids || []).map((t) => `<i style="background:${S.types.get(t)?.color}"></i>`).join('')}</span></a>`;
  }).join('');
  $app.innerHTML = `<div class="screen">${top('Stuoiedex', `<span class="counter" aria-label="Catturati ${seen} su ${others.length}">${seen}/${others.length}</span>`)}
    <main class="body">
      <div class="chips" role="group" aria-label="Filtra per tipo">
        <button class="chip" data-t="0" aria-pressed="${!filter}">Tutti</button>
        ${S.cat.types.map((t) => `<button class="chip" data-t="${t.id}" aria-pressed="${filter === t.id}">${esc(t.name)}</button>`).join('')}
      </div>
      <div class="dex">${cells}</div>
    </main>${nav('dex')}</div>`;
  $app.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { filter = Number(b.dataset.t); sound('tap'); dexView(); } };
}

// ------------------------------------------------------------ scheda
async function cardView(id) {
  const mine = id === S.me.id;
  const p = mine ? S.me : (S.people.find((x) => x.id === id) || await api.profile(id));
  if (!p) { location.hash = '#/'; return; }
  const known = mine || S.caught.has(p.id);
  if (!known) {
    $app.innerHTML = `<div class="screen">${top('???', `<a class="iconbtn" href="#/" aria-label="Indietro">${icon('back')}</a>`)}
      <main class="body"><div class="stage"><div class="frame">${spriteSVG(spec(p), 128, { silhouette: true, label: 'Sagoma' })}</div></div>
      <div class="win"><p style="margin:0">Non ancora catturato. Quando lo incroci al bar, inquadra il suo QR.</p></div></main>${nav('dex')}</div>`;
    return;
  }
  const r = rarityFor(p.level);
  const title = p.title_id ? S.cat.titles.find((t) => t.id === p.title_id)?.name : '';
  $app.innerHTML = `<div class="screen">${top(mine ? 'La mia scheda' : p.nickname, `<a class="iconbtn" href="${mine ? '#/io' : '#/'}" aria-label="Indietro">${icon('back')}</a>`)}
    <main class="body">
      <div class="stage">
        <div class="frame ${r === 'leggendario' ? 'glow' : ''}" style="border-color:${frameColor(p)}"><div class="bob">${spriteSVG(spec(p), 128, { label: esc(p.nickname) })}</div></div>
        <span class="badge-r ${r}">${RARITY_LABEL[r]}</span><span class="lv">Lv ${p.level}</span>
        ${p.status === 'pending' ? '<span class="pending">In attesa di approvazione</span>' : ''}
        ${p.status === 'rejected' ? `<span class="pending">Da modificare${p.moderation_note ? ': ' + esc(p.moderation_note) : ''}</span>` : ''}
      </div>
      <div class="row" style="align-items:flex-start"><h2 class="nick">${esc(p.nickname)}</h2><span class="row" style="flex:0 0 auto;gap:6px">${(p.type_ids || []).map(typeChip).join('')}</span></div>
      ${title ? `<p class="title">${esc(title)}</p>` : ''}
      ${p.description ? `<div class="win"><p style="margin:0">${esc(p.description)}</p></div>` : ''}
      <div class="win" style="display:flex;flex-direction:column;gap:12px">
        <div class="kv"><span>Esperienza</span><span>${(p.xp ?? 0).toLocaleString('it-IT')}</span></div>
        ${bar(levelProgress(p))}
        <div class="medals" id="medals"></div>
        ${p.first_visit ? `<div class="kv muted"><span>Al bar dal</span><span>${new Date(p.first_visit).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</span></div>` : ''}
      </div>
      ${mine ? '<a class="btn light block" href="#/personaggio">Cambia personaggio</a>' : ''}
    </main>${nav(mine ? 'io' : 'dex')}</div>`;
  const ids = await api.badgesOf(p.id);
  const box = document.getElementById('medals');
  if (box) box.innerHTML = ids.map((bid) => S.cat.badges.find((b) => b.id === bid)).filter(Boolean)
    .map((b, i) => `<span class="medal" title="${esc(b.name)}" aria-label="${esc(b.name)}">${medal(['#C8102E', '#F2B200', '#2E8B57', '#1B2F6E', '#7A4A2A'][i % 5])}</span>`).join('');
}
const medal = (c) => `<svg width="24" height="24" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${['..####..', '.#....#.', '#..##..#', '#.####.#', '#.####.#', '#..##..#', '.#....#.', '..####..']
  .map((r, y) => [...r].map((ch, x) => (ch === '#' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>` : '')).join('')).join('')}</svg>`;

// ------------------------------------------------------------ io
async function meView() {
  const p = S.me;
  $app.innerHTML = `<div class="screen">${top('Io')}
    <main class="body">
      <a class="win" href="#/p/${p.id}" style="display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit">
        <div class="frame" style="margin:0;padding:6px;border-width:4px;border-color:${frameColor(p)}">${spriteSVG(spec(p), 72)}</div>
        <div style="flex:1;min-width:0"><div style="font:14px/1.5 var(--px);overflow-wrap:anywhere">${esc(p.nickname)}</div>
        <div class="muted" style="font-weight:700;display:flex;gap:10px"><span>Lv ${p.level}</span><span>${RARITY_LABEL[rarityFor(p.level)]}</span></div>${bar(levelProgress(p), 12)}</div>
      </a>
      ${p.status !== 'approved' ? `<div class="win" style="background:#FFF4CC"><p style="margin:0;font-weight:700">${p.status === 'pending' ? 'La tua scheda aspetta l\'approvazione del bar.' : 'Il bar ti chiede di modificare la scheda.'}</p></div>` : ''}
      <h2 class="sec">Il mio QR</h2>
      <div class="qrbox" id="qr" aria-live="polite"></div>
      <div class="row"><a class="btn light" href="#/personaggio">Personaggio</a><button class="btn light" id="edit">Scheda</button></div>
      ${p.invite_code ? `<div class="win kv"><span>Codice invito</span><span style="font:14px var(--px)">${esc(p.invite_code)}</span></div>` : ''}
      <h2 class="sec">Impostazioni</h2>
      <div class="win" style="display:flex;flex-direction:column">
        <label class="switch">Suoni<input type="checkbox" id="s1" ${prefs.get('suoni', true) ? 'checked' : ''}></label>
        <label class="switch">Vibrazione<input type="checkbox" id="s2" ${prefs.get('vibrazione', true) ? 'checked' : ''}></label>
        <label class="switch">Nascondi la mia scheda<input type="checkbox" id="s3" ${p.hidden ? 'checked' : ''}></label>
      </div>
      <button class="btn light block" id="out">Esci</button>
      <button class="link" id="del">Cancella il mio account</button>
    </main>${nav('io')}</div>`;
  const qr = document.getElementById('qr');
  const draw = async () => {
    if (!document.body.contains(qr)) return clearInterval(t);
    if (p.status !== 'approved') { qr.innerHTML = `<p class="muted" style="margin:0;font-weight:700">Disponibile dopo l'approvazione</p>`; return; }
    try { qr.innerHTML = await qrSVG(await api.myCaptureCode()); } catch (e) { qr.textContent = e.message; }
  };
  const t = setInterval(draw, 50000); draw();
  document.getElementById('s1').onchange = (e) => { prefs.set('suoni', e.target.checked); sound('tap'); };
  document.getElementById('s2').onchange = (e) => { prefs.set('vibrazione', e.target.checked); buzz(30); };
  document.getElementById('s3').onchange = async (e) => {
    try { await api.updateProfile({ hidden: e.target.checked }); await refreshMe(); toast(e.target.checked ? 'Scheda nascosta' : 'Scheda visibile', 'ok'); }
    catch (x) { toast(x.message, 'error'); e.target.checked = !e.target.checked; }
  };
  document.getElementById('edit').onclick = editCard;
  document.getElementById('out').onclick = async () => { await api.signOut(); S.me = null; location.hash = ''; boot(); };
  document.getElementById('del').onclick = async () => {
    if (!confirm('Cancellare account e scheda? Punti, medaglie e catture spariscono per sempre.')) return;
    try { await api.deleteAccount(); S.me = null; location.hash = ''; toast('Account cancellato', 'ok'); boot(); } catch (x) { toast(x.message, 'error'); }
  };
}

function editCard() {
  const p = S.me;
  $app.innerHTML = `<div class="screen">${top('Scheda', `<a class="iconbtn" href="#/io" aria-label="Indietro">${icon('back')}</a>`)}<main class="body">
    <form class="win" id="f" style="display:flex;flex-direction:column;gap:14px" novalidate>
      <label class="f">Soprannome<input id="n" maxlength="20" value="${esc(p.nickname)}"></label>
      <label class="f">Descrizione<textarea id="d" maxlength="140">${esc(p.description || '')}</textarea></label>
      <div><div style="font-weight:700;margin-bottom:6px">Tipo</div><div class="chips" style="flex-wrap:wrap" id="types"></div></div>
      <p class="err" id="err"></p>
      <button class="btn block" type="submit">Salva</button>
    </form></main>${nav('io')}</div>`;
  let types = [...(p.type_ids || [])];
  const box = document.getElementById('types');
  const drawTypes = () => { box.innerHTML = S.cat.types.map((t) => `<button type="button" class="chip" data-id="${t.id}" aria-pressed="${types.includes(t.id)}" style="${types.includes(t.id) ? `background:${t.color};color:#fff` : ''}">${esc(t.name)}</button>`).join(''); };
  drawTypes();
  box.onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; const id = Number(b.dataset.id); types = types.includes(id) ? types.filter((x) => x !== id) : [...types.slice(-1), id]; sound('tap'); drawTypes(); };
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('n').value.trim(), err = document.getElementById('err');
    if (nickname.length < 2) { err.textContent = 'Almeno due lettere'; return; }
    if (!types.length) { err.textContent = 'Scegli almeno un tipo'; return; }
    try { await api.updateProfile({ nickname, description: document.getElementById('d').value.trim(), type_ids: types }); await refreshMe(); await refreshPeople(); sound('ok'); toast('Salvato', 'ok'); location.hash = '#/io'; }
    catch (x) { err.textContent = x.message; sound('error'); }
  };
}

// ------------------------------------------------------------ scanner
async function scanView() {
  $app.innerHTML = `<div class="screen">${top('Scanner')}<main class="body">
    <div class="scanner"><video muted aria-label="Fotocamera"></video><div class="aim"></div><div class="msg" id="msg">Avvio fotocamera…</div></div>
    ${DEMO ? `<div class="row"><button class="btn gold" id="fakeC">QR del bar</button><button class="btn light" id="fakeP">QR di un cliente</button></div>` : ''}
  </main>${nav('scan')}</div>`;
  const msg = document.getElementById('msg');
  let busy = false;
  const handle = async (code) => {
    if (busy) return; busy = true; buzz(20);
    try { await onCode(code); } finally { setTimeout(() => { busy = false; }, 1500); }
  };
  if (DEMO) {
    document.getElementById('fakeC').onclick = async () => handle(await api.checkinCode());
    document.getElementById('fakeP').onclick = () => {
      const pool = S.people.filter((p) => p.id !== S.me.id && p.status === 'approved');
      const pick = pool.find((p) => !S.caught.has(p.id)) || pool[0];
      handle(`P${pick.id}.0.demo`);
    };
  }
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Fotocamera non disponibile su questo browser');
    S.stop = await startScanner($app.querySelector('video'), handle);
    msg.hidden = true;
  } catch (e) {
    msg.textContent = /Permission|NotAllowed/i.test(e.name + e.message) ? 'Consenti l\'accesso alla fotocamera dalle impostazioni del browser' : e.message;
  }
}

async function onCode(code) {
  const before = { ...S.me };
  try {
    if (code.startsWith('C.')) {
      const r = await api.checkin(code);
      await refreshMe();
      stopCamera();
      showResult('checkin', before, r);
    } else if (/^P/.test(code)) {
      const r = await api.capture(code);
      await refreshMe(); await refreshPeople();
      stopCamera();
      const other = S.people.find((p) => p.id === r.caught) || await api.profile(r.caught);
      showResult('capture', before, r, other);
    } else throw new Error('QR non riconosciuto');
  } catch (e) { toast(e.message, 'error'); sound('error'); buzz([60, 40, 60]); }
}

function showResult(kind, before, r, other) {
  const dxp = (S.me.xp ?? 0) - (before.xp ?? 0);
  const dtk = (S.me.tokens ?? 0) - (before.tokens ?? 0) || r.tokens || 0;
  const up = (S.me.level ?? 1) > (before.level ?? 1);
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  const stars = '<div class="stars" aria-hidden="true"><i style="top:12%;left:18%"></i><i style="top:22%;right:16%"></i><i style="top:46%;left:10%"></i><i style="top:8%;right:34%"></i></div>';
  const rewards = `<div class="reward">${dxp ? `<span class="xp">+${dxp} XP</span>` : ''}${dtk ? `<span class="tk">+${dtk} gettoni</span>` : ''}${r.streak ? '<span>Serie!</span>' : ''}${up ? `<span class="tk">Livello ${S.me.level}</span>` : ''}</div>`;
  if (kind === 'checkin') {
    ov.innerHTML = `${stars}<div class="scene"><div class="frame bob" style="border-color:${frameColor(S.me)}">${spriteSVG(spec(S.me), 150)}</div></div>
      <div class="win"><p class="big">Check-in fatto!</p>${rewards}<button class="btn block" style="margin-top:14px" id="ok">Continua</button></div>`;
    sound(up ? 'levelup' : 'ok'); buzz([30, 50, 30]);
  } else {
    const isNew = r.new;
    ov.innerHTML = `<div class="scene" style="position:relative">${isNew ? stars.replace('class="stars"', 'class="stars pop"') : ''}
        <div class="row" style="flex:0;align-items:flex-end;gap:22px">
          <div class="frame pop" style="margin:0;border-color:${frameColor(other)}">${spriteSVG(spec(other), 140)}</div>
          <div class="throw"><div class="wobble">${CAP}</div></div></div></div>
      <div class="win"><p class="big">${isNew ? `Hai catturato ${esc(other.nickname.toUpperCase())}!` : `${esc(other.nickname)} è già nel tuo Stuoiedex`}</p>${rewards}
      <button class="btn block" style="margin-top:14px" id="ok">Continua</button></div>`;
    sound(isNew ? 'capture' : 'ok'); buzz([40, 120, 40, 120, 40, 120, 200]);
  }
  document.body.append(ov);
  ov.querySelector('#ok').focus();
  ov.querySelector('#ok').onclick = () => { ov.remove(); location.hash = kind === 'capture' ? `#/p/${other.id}` : '#/io'; route(); };
}

const CAP = `<svg class="cap" viewBox="0 0 14 14" shape-rendering="crispEdges" role="img" aria-label="Tappo">${['...########...', '..#r#b#r#b#r#.', '.#rrrbbbbrrrr#', '#rrrrbbbbrrrr#', '#rrrrbbbbrrrr#', '#rrrwwwwwwrrr#', '#bbbwkkkkwbbb#', '#bbbwkkkkwbbb#', '#rrrwwwwwwrrr#', '#rrrrbbbbrrrr#', '#rrrrbbbbrrrr#', '.#rrrbbbbrrr#.', '..#r#b#r#b#r..', '...########...']
  .map((row, y) => [...row].map((c, x) => (c === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${{ '#': '#14183A', r: '#C8102E', b: '#1B2F6E', w: '#fff', k: '#14183A' }[c]}"/>`)).join('')).join('')}</svg>`;

// ------------------------------------------------------------ PWA
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js');

boot();
