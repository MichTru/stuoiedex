// Pannello del personale: QR di check-in, schede da approvare, convalida premi.
import { api, DEMO } from './api.js';
import { spriteSVG, specFromProfile } from './sprites.js';
import { esc, toast, sound, CREST, qrSVG, icon } from './ui.js';
import { startScanner } from './scanner.js';

const $ = document.getElementById('app');
const S = { role: null, parts: new Map(), items: new Map(), types: new Map(), tab: 'bancone', timers: [], stop: null };
const spec = (p) => specFromProfile(p?.sprite, S.parts, S.items);
const clear = () => { S.timers.forEach(clearInterval); S.timers = []; if (S.stop) { S.stop(); S.stop = null; } };

async function boot() {
  clear();
  try {
    if (!(await api.user())) return login();
    S.role = await api.staffRole();
    if (!S.role) {
      $.innerHTML = `<div class="banco-msg win"><p style="margin:0 0 14px">Questo account non fa parte del personale del bar.</p><button class="btn light block" id="out">Esci</button></div>`;
      document.getElementById('out').onclick = async () => { await api.signOut(); boot(); };
      return;
    }
    const cat = await api.catalog();
    S.parts = new Map(cat.parts.map((p) => [p.id, p]));
    S.items = new Map(cat.items.map((i) => [i.id, i]));
    S.types = new Map(cat.types.map((t) => [t.id, t]));
    render();
  } catch (e) { $.innerHTML = `<div class="banco-msg win"><p>${esc(e.message)}</p><button class="btn block" id="r">Riprova</button></div>`; document.getElementById('r').onclick = boot; }
}

function login() {
  let email = '';
  const draw = (step) => {
    $.innerHTML = `<form class="banco-msg win" id="f" novalidate style="display:flex;flex-direction:column;gap:12px">
      <div class="row" style="flex:0">${CREST}<strong style="font:14px var(--px)">Bancone</strong></div>
      ${step === 1 ? `<label class="f">Email<input id="e" type="email" autocomplete="email" value="${esc(email)}"></label>`
        : `<label class="f">Codice ricevuto<input id="c" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></label>`}
      <p class="err" id="err"></p>
      <button class="btn block" type="submit">${step === 1 ? 'Mandami il codice' : 'Entra'}</button></form>`;
    document.getElementById('f').onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        if (step === 1) { email = document.getElementById('e').value.trim(); await api.sendOtp(email); draw(2); }
        else { await api.verifyOtp(email, document.getElementById('c').value.trim()); boot(); }
      } catch (e) { document.getElementById('err').textContent = e.message; }
    };
  };
  draw(1);
}

function render() {
  clear();
  $.innerHTML = `<div class="banco">
    <header class="top">${CREST}<h1>Bancone${DEMO ? ' demo' : ''}</h1>
      <nav class="btabs" aria-label="Sezioni">
        <button class="chip" data-t="bancone" aria-pressed="${S.tab === 'bancone'}">Check-in</button>
        <button class="chip" data-t="schede" aria-pressed="${S.tab === 'schede'}">Schede <span id="nb"></span></button>
      </nav>
      <button class="iconbtn" id="out" aria-label="Esci">${icon('back')}</button>
    </header>
    <div id="view" class="bview"></div></div>`;
  $.querySelector('.btabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { S.tab = b.dataset.t; render(); } };
  document.getElementById('out').onclick = async () => { if (confirm('Uscire dal bancone?')) { await api.signOut(); boot(); } };
  countPending();
  S.timers.push(setInterval(countPending, 30000));
  if (S.tab === 'schede') schede(); else bancone();
}

async function countPending() {
  try { const n = (await api.pending()).length; const el = document.getElementById('nb'); if (el) el.textContent = n ? `(${n})` : ''; } catch { /* rete */ }
}

async function bancone() {
  const v = document.getElementById('view');
  v.innerHTML = `<div class="bgrid">
    <section class="bqr"><div class="qrbox big" id="qr"></div><div class="timer"><span id="tb"></span></div></section>
    <section class="bside">
      <button class="btn gold block tall" id="val">Convalida premio</button>
      <h2 class="sec">Oggi al bar <span id="nt"></span></h2>
      <div class="faces" id="faces"></div>
    </section></div>`;
  const win = (await api.qrWindow()) * 1000;
  const qr = document.getElementById('qr'), tb = document.getElementById('tb');
  const refresh = async () => {
    try { qr.innerHTML = await qrSVG(await api.checkinCode()); } catch (e) { qr.textContent = e.message; }
  };
  const tick = () => {
    const left = win - (Date.now() % win);
    tb.style.width = `${(left / win) * 100}%`;
    if (left < 1000 && !tick.busy) { tick.busy = true; setTimeout(async () => { await refresh(); tick.busy = false; }, 1200); }
  };
  await refresh(); tick();
  S.timers.push(setInterval(tick, 500));
  const faces = async () => {
    try {
      const list = await api.today();
      document.getElementById('nt').textContent = list.length;
      document.getElementById('faces').innerHTML = list.map((r) => `<div class="face" title="${esc(r.profiles?.nickname)}">${spriteSVG(spec(r.profiles), 52, { label: esc(r.profiles?.nickname) })}<span>${esc(r.profiles?.nickname)}</span></div>`).join('');
    } catch { /* rete */ }
  };
  faces(); S.timers.push(setInterval(faces, 20000));
  document.getElementById('val').onclick = validate;
}

function validate() {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="win" style="display:flex;flex-direction:column;gap:12px;max-width:520px;width:100%;margin:auto">
    <strong style="font:14px var(--px)">Convalida premio</strong>
    <div class="scanner" style="aspect-ratio:4/3"><video muted></video><div class="aim"></div><div class="msg" id="m">Avvio fotocamera…</div></div>
    <form class="row" id="f"><label class="f" style="flex:2"><span class="muted">Oppure il codice</span><input id="c" autocapitalize="characters"></label><button class="btn" style="align-self:flex-end">Convalida</button></form>
    <button class="btn light block" id="x">Chiudi</button></div>`;
  document.body.append(ov);
  let stop;
  const close = () => { if (stop) stop(); ov.remove(); };
  const go = async (code) => {
    try {
      const r = await api.validateRedemption(code.startsWith('R.') ? code : 'R.' + code.toUpperCase());
      sound('ok'); close(); toast(`${r.reward} per ${r.nickname}: consegna pure`, 'ok');
    } catch (e) { sound('error'); toast(e.message, 'error'); }
  };
  document.getElementById('x').onclick = close;
  document.getElementById('f').onsubmit = (e) => { e.preventDefault(); const c = document.getElementById('c').value.trim(); if (c) go(c); };
  startScanner(ov.querySelector('video'), (c) => { if (c.startsWith('R.')) go(c); })
    .then((s) => { stop = s; document.getElementById('m').hidden = true; })
    .catch((e) => { document.getElementById('m').textContent = e.message; });
}

async function schede() {
  const v = document.getElementById('view');
  const list = await api.pending();
  if (!list.length) { v.innerHTML = '<div class="win" style="max-width:640px">Nessuna scheda da approvare.</div>'; return; }
  v.innerHTML = `<div class="list" style="max-width:820px">${list.map((p) => `
    <div class="lrow" data-id="${p.id}" style="gap:16px;align-items:flex-start">
      <div class="frame" style="margin:0;padding:6px;border-width:4px">${spriteSVG(spec(p), 80)}</div>
      <div class="grow" style="display:flex;flex-direction:column;gap:6px">
        <strong style="font:14px/1.5 var(--px);overflow-wrap:anywhere">${esc(p.nickname)}</strong>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${(p.type_ids || []).map((t) => `<span class="type" style="background:${S.types.get(t)?.color}">${esc(S.types.get(t)?.name)}</span>`).join('')}</div>
        ${p.description ? `<p style="margin:0">${esc(p.description)}</p>` : ''}
        <div class="row" style="margin-top:6px"><button class="btn" data-a="ok">Approva</button><button class="btn light" data-a="no">Rifiuta</button></div>
      </div></div>`).join('')}</div>`;
  v.onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const row = b.closest('[data-id]'); const ok = b.dataset.a === 'ok';
    let note = null;
    if (!ok) { note = prompt('Cosa deve cambiare? (soprannome, descrizione…)'); if (note === null) return; }
    try { await api.review(row.dataset.id, ok, note); sound('ok'); row.remove(); countPending(); if (!v.querySelector('[data-id]')) schede(); }
    catch (x) { toast(x.message, 'error'); }
  };
}

boot();
