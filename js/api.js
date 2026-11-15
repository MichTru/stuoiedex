// Accesso ai dati. Con config vuota parte la modalità demo (tutto in locale).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import * as CAT from './catalog.js';

export const DEMO = !SUPABASE_URL || new URLSearchParams(location.search).has('demo');

export const xpForLevel = (l) => Math.round(25 * Math.pow(Math.max(l - 1, 0), 1.8));
export const levelForXp = (x) => { let l = 1; for (let i = 1; i <= 30; i++) if (xpForLevel(i) <= x) l = i; return l; };
export const rarityFor = (l) => (l >= 30 ? 'leggendario' : l >= 20 ? 'raro' : l >= 10 ? 'non_comune' : 'comune');
export const RARITY_LABEL = { comune: 'Comune', non_comune: 'Non comune', raro: 'Raro', leggendario: 'Leggendario' };

const friendly = (e) => {
  const m = e?.message || String(e);
  if (/duplicate key.*nickname/i.test(m)) return 'Questo soprannome è già preso';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Connessione assente: riprova tra poco';
  if (/rate limit|only request this after/i.test(m)) return 'Troppe email in poco tempo: riprova tra qualche minuto';
  if (/expired|invalid/i.test(m) && /otp|token|link/i.test(m)) return 'Link scaduto: chiedine uno nuovo';
  return m.replace(/^.*?ERROR:\s*/, '');
};

// ---------------------------------------------------------------- Supabase
const PUBLIC_COLS = 'id,nickname,description,type_ids,sprite,photo_path,status,hidden,title_id,team_id,xp,level,first_visit,created_at';
let sbPromise;
const sb = () => (sbPromise ??= import('https://esm.sh/@supabase/supabase-js@2.49.1').then(({ createClient }) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } })));

async function q(p) {
  const { data, error } = await p;
  if (error) throw new Error(friendly(error));
  return data;
}

const real = {
  async user() { const c = await sb(); const { data } = await c.auth.getSession(); return data.session?.user ?? null; },
  async sendOtp(email) { const c = await sb(); await q(c.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } })); },
  async verifyOtp(email, token) { const c = await sb(); await q(c.auth.verifyOtp({ email, token, type: 'email' })); },
  async signOut() { const c = await sb(); await c.auth.signOut(); },
  onSignIn(cb) { sb().then((c) => c.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN') cb(); })); },
  async catalog() {
    const c = await sb();
    const [types, parts, items, badges, titles] = await Promise.all([
      q(c.from('creature_types').select('*').order('id')),
      q(c.from('sprite_parts').select('*').order('kind').order('sort')),
      q(c.from('items').select('*').order('unlock_level', { nullsFirst: false })),
      q(c.from('badges').select('*').order('id')),
      q(c.from('titles').select('*').order('id')),
    ]);
    return { types, parts, items, badges, titles };
  },
  async myProfile() { const c = await sb(); const u = await this.user(); if (!u) return null; const r = await q(c.rpc('my_profile')); return r?.id ? r : null; },
  async createProfile(p) { const c = await sb(); const u = await this.user(); await q(c.from('profiles').insert({ ...p, id: u.id })); },
  async updateProfile(p) { const c = await sb(); const u = await this.user(); await q(c.from('profiles').update(p).eq('id', u.id)); },
  async useInvite(code) { const c = await sb(); await q(c.rpc('use_invite', { code })); },
  async profiles() {
    const c = await sb();
    return q(c.from('profiles').select(PUBLIC_COLS).order('level', { ascending: false }));
  },
  async profile(id) { const c = await sb(); return q(c.from('profiles').select(PUBLIC_COLS).eq('id', id).maybeSingle()); },
  async captures() { const c = await sb(); const u = await this.user(); return (await q(c.from('captures').select('caught').eq('catcher', u.id))).map((r) => r.caught); },
  async badgesOf(id) { const c = await sb(); return (await q(c.from('profile_badges').select('badge_id').eq('profile_id', id))).map((r) => r.badge_id); },
  async itemsOf(id) { const c = await sb(); return (await q(c.from('profile_items').select('item_id').eq('profile_id', id))).map((r) => r.item_id); },
  async titlesOf(id) { const c = await sb(); return (await q(c.from('profile_titles').select('title_id').eq('profile_id', id))).map((r) => r.title_id); },
  async checkin(code) { const c = await sb(); return q(c.rpc('do_checkin', { code })); },
  async capture(code) { const c = await sb(); return q(c.rpc('do_capture', { code })); },
  async myCaptureCode() { const c = await sb(); return q(c.rpc('my_capture_code')); },
  async checkedInToday() { const c = await sb(); const u = await this.user(); const d = new Date().toISOString().slice(0, 10); return (await q(c.from('checkins').select('day').eq('profile_id', u.id).eq('day', d))).length > 0; },
  async deleteAccount() { const c = await sb(); await q(c.rpc('delete_my_account')); await c.auth.signOut(); },
  // personale
  async staffRole() { const c = await sb(); const u = await this.user(); if (!u) return null; return (await q(c.from('staff').select('role').eq('user_id', u.id).maybeSingle()))?.role ?? null; },
  async checkinCode() { const c = await sb(); return q(c.rpc('staff_checkin_code')); },
  async pending() { const c = await sb(); return q(c.from('profiles').select(PUBLIC_COLS).eq('status', 'pending').order('created_at')); },
  async review(id, approve, note) { const c = await sb(); await q(c.rpc('staff_review_profile', { p: id, approve, note: note || null })); },
  async validateRedemption(code) { const c = await sb(); return q(c.rpc('staff_validate_redemption', { code })); },
  async today() {
    const c = await sb(); const d = new Date().toISOString().slice(0, 10);
    return q(c.from('checkins').select('profile_id, created_at, profiles(nickname, sprite, level)').eq('day', d).order('created_at', { ascending: false }));
  },
  async qrWindow() { const c = await sb(); return (await q(c.from('settings').select('qr_window_seconds').single())).qr_window_seconds; },
};

// ---------------------------------------------------------------- Demo
const KEY = 'stuoiedex-demo-v1';
const ME = 'demo-io';
const P = (kind, name) => CAT.PARTS.find((p) => p.kind === kind && p.name === name).id;
const base = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, P(k, v)]));
const it = (key) => CAT.ITEMS.find((i) => i.asset === `items/${key}.png`).id;

function demoSeed() {
  const mk = (id, nickname, type_ids, b, equipped, xp, description, title) => ({
    id, nickname, type_ids, sprite: { base: base(b), equipped }, status: 'approved', xp, level: levelForXp(xp),
    description, title_id: title ?? null, hidden: false, created_at: new Date().toISOString(),
  });
  const people = [
    mk('d1', 'Zvanì', [4, 10], { viso: 'Squadrato', capelli: 'Calvo', colore_capelli: 'Bianco', barba: 'Baffi', colore_maglia: 'Blu Stuoie', maglia: 'Camicia', pelle: 'Media', posa: 'Braccia conserte' },
      { cappello: it('corona-beccaccino'), cornice: it('cornice-leggenda') }, 10800, 'Si dice che abbia battuto il parroco a beccaccino. Due volte, nella stessa sera.', 5),
    mk('d2', 'Bacco', [9], { capelli: 'Corti', colore_capelli: 'Castano', maglia: 'Giacca', colore_maglia: 'Viola', pelle: 'Olivastra', bocca: 'Ghigno', posa: 'Brindisi' },
      { cappello: it('coppola'), cornice: it('cornice-oro') }, 5400, 'Conosce ogni bottiglia dietro al bancone per nome.', 2),
    mk('d3', 'La Mery', [5, 1], { capelli: 'Lunghi', colore_capelli: 'Rosso', colore_maglia: 'Arancio', occhi: 'Grandi', bocca: 'Risata', pantaloni: 'Gonna', corporatura: 'Snella', posa: 'Saluto' },
      { occhiali: it('occhiali-sole'), cornice: it('cornice-argento') }, 2950, 'Sa tutto di tutti prima che succeda.'),
    mk('d4', 'Il Biondo', [1], { capelli: 'Ciuffo', colore_capelli: 'Biondo', colore_maglia: 'Verde', maglia: 'Felpa' }, { occhiali: it('occhiali-sole') }, 1900, 'Spritz alle sei, puntuale come un orologio svizzero.'),
    mk('d5', 'Il Prof', [10], { capelli: 'Rasati', colore_capelli: 'Grigio', barba: 'Corta', maglia: 'Maglione', colore_maglia: 'Nero', viso: 'Ovale' }, {}, 4200, 'Risolve le cruciverba in penna. Senza guardare le definizioni.'),
    mk('d6', 'Gnola', [6], { capelli: 'Ricci', colore_capelli: 'Nero', colore_maglia: 'Blu Stuoie', pelle: 'Scura', occhi: 'Socchiusi' }, { sciarpa: it('sciarpa-rossoblu') }, 1100, "L'ultimo a uscire, sempre."),
    mk('d7', 'Tonino', [2, 7], { capelli: 'Corti', colore_capelli: 'Castano', corporatura: 'Robusta', colore_maglia: 'Bianco', maglia: 'Camicia' }, { cappello: it('berretto-rosso'), mano: it('tazzina') }, 640, 'Primo caffè alle sei e mezza, secondo alle sei e trentacinque.'),
    mk('d8', 'Pippo', [3], { capelli: 'Cresta', colore_capelli: 'Rosso', colore_maglia: 'Rosso Stuoie', maglia: 'Canotta', pantaloni: 'Pantaloncini' }, {}, 260, 'Ha visto tutte le partite del Lugo dal 2009.'),
    mk('d9', 'Rina', [5], { capelli: 'Raccolti', colore_capelli: 'Grigio', occhi: 'Felici', colore_maglia: 'Giallo', maglia: 'Maglione' }, {}, 900, 'Porta i biscotti fatti in casa la domenica.'),
    mk('d10', 'Lollo', [8, 3], { capelli: 'Coda', colore_capelli: 'Biondo', barba: 'Folta', colore_maglia: 'Nero', corporatura: 'Robusta' }, {}, 1500, 'Birra media e telecronaca a voce alta.'),
  ];
  people.push({ ...mk('d11', 'Ciccio', [8], { capelli: 'Ricci', colore_capelli: 'Castano', colore_maglia: 'Verde', corporatura: 'Robusta', bocca: 'Risata' }, {}, 0, 'Appena arrivato, già amico di tutti.'), status: 'pending' });
  return { profiles: people, captures: ['d1', 'd2', 'd3', 'd5', 'd7'], checkins: [], items: [], badges: [], user: null, invited: null };
}

let state;
const load = () => { if (state) return state; try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; } return (state ??= demoSeed()); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage non disponibile */ } };
const today = () => new Date().toISOString().slice(0, 10);
const wait = (ms = 180) => new Promise((r) => setTimeout(r, ms));
const me = () => load().profiles.find((p) => p.id === ME);

function demoAward(p, xp) {
  const before = p.level;
  p.xp += xp; p.level = levelForXp(p.xp);
  for (const i of CAT.ITEMS) if (i.unlock_level && i.unlock_level <= p.level && !state.items.includes(i.id)) state.items.push(i.id);
  return { levelUp: p.level > before, level: p.level };
}

const demo = {
  async user() { return load().user; },
  async sendOtp() { await wait(); },
  async verifyOtp(email) { await wait(); load().user = { id: ME, email }; save(); },
  async signOut() { load().user = null; save(); },
  async catalog() { return { types: CAT.TYPES, parts: CAT.PARTS, items: CAT.ITEMS, badges: CAT.BADGES, titles: CAT.TITLES }; },
  async myProfile() { return load().user ? me() ?? null : null; },
  async createProfile(p) {
    await wait();
    const s = load();
    if (s.profiles.some((x) => x.nickname.toLowerCase() === p.nickname.toLowerCase())) throw new Error('Questo soprannome è già preso');
    s.profiles.push({ ...p, id: ME, status: 'approved', xp: 0, level: 1, title_id: null, hidden: false, created_at: new Date().toISOString() });
    save();
  },
  async updateProfile(p) { Object.assign(me(), p); save(); },
  async useInvite(code) { if (!/^[A-Z0-9]{6}$/i.test(code)) throw new Error('Codice invito non valido'); load().invited = code; save(); },
  async profiles() { return load().profiles.filter((p) => (!p.hidden && p.status === 'approved') || p.id === ME).slice().sort((a, b) => b.level - a.level); },
  async profile(id) { return load().profiles.find((p) => p.id === id) ?? null; },
  async captures() { return load().captures; },
  async badgesOf(id) { return id === ME ? load().badges : id === 'd1' ? [1, 2, 3, 6, 8] : id === 'd2' ? [1, 2, 4] : [1]; },
  async itemsOf(id) { return id === ME ? load().items : []; },
  async titlesOf() { return []; },
  async checkin(code) {
    await wait(300);
    const s = load();
    if (!code.startsWith('C.')) throw new Error('QR scaduto: inquadra quello sul tablet del bar');
    if (s.checkins.includes(today())) throw new Error('Check-in già fatto oggi');
    s.checkins.push(today());
    const r = demoAward(me(), 20);
    if (!s.badges.includes(1)) s.badges.push(1);
    save();
    return { ok: true, streak: false, xp: 20, tokens: 2, ...r };
  },
  async capture(code) {
    await wait(300);
    const s = load();
    const id = code.replace(/^P/, '').split('.')[0];
    const other = s.profiles.find((p) => p.id === id);
    if (!other || id === ME) throw new Error('Questo non è il QR di un cliente');
    if (!s.checkins.includes(today())) throw new Error('Dovete aver fatto entrambi il check-in oggi');
    const isNew = !s.captures.includes(id);
    let r = {};
    if (isNew) { s.captures.push(id); r = demoAward(me(), 30); if (!s.badges.includes(4)) s.badges.push(4); }
    save();
    return { ok: true, new: isNew, caught: id, xp: isNew ? 30 : 0, tokens: isNew ? 3 : 0, ...r };
  },
  async myCaptureCode() { return `P${ME}.${Math.floor(Date.now() / 120000)}.demo`; },
  async checkedInToday() { return load().checkins.includes(today()); },
  async deleteAccount() { localStorage.removeItem(KEY); state = null; },
  async staffRole() { return 'owner'; },
  async checkinCode() { return `C.${Math.floor(Date.now() / 120000)}.demo`; },
  async pending() { return load().profiles.filter((p) => p.status === 'pending'); },
  async review(id, approve) { const p = load().profiles.find((x) => x.id === id); p.status = approve ? 'approved' : 'rejected'; save(); },
  async validateRedemption(code) { await wait(); if (!/^R\./.test(code)) throw new Error('Codice non valido'); return { reward: 'Caffè', nickname: 'Tonino' }; },
  async today() { return load().profiles.slice(0, 6).map((p) => ({ profile_id: p.id, created_at: new Date().toISOString(), profiles: p })); },
  async qrWindow() { return 120; },
};

export const api = DEMO ? demo : real;
export const ME_DEMO = ME;
