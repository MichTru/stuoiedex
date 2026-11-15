// Motore degli sprite di Stuoiedex: personaggi 16×16 composti a strati.
// Ogni pezzo è una griglia di simboli; '.' lascia passare lo strato sotto, '0' cancella.

export const INK = '#14183A';

const pal = (spec) => ({
  k: INK,
  s: spec.pelle,
  S: shade(spec.pelle, -0.14),
  h: spec.colore_capelli,
  H: shade(spec.colore_capelli, 0.25),
  c: spec.colore_maglia,
  C: shade(spec.colore_maglia, -0.28),
  w: '#F3F5FA',
  p: PANTS[spec.pantaloni]?.color ?? '#2D4F8A',
  P: shade(PANTS[spec.pantaloni]?.color ?? '#2D4F8A', -0.25),
  f: SHOES[spec.scarpe]?.color ?? '#F3F5FA',
  F: SHOES[spec.scarpe]?.sole ?? INK,
  r: '#B3122E',
  R: '#C8102E',
  b: '#1B2F6E',
  B: '#2B47A3',
  g: '#F2B200',
  G: '#FFE27A',
  m: '#7A4A2A',
  M: '#A8693D',
  x: '#2B2F45',
  X: '#6E7CA8',
  e: '#3E8E41',
  y: '#E8D9A8',
});

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------------- corpo ----------------
const BODY = {
  snella: {
    10: '...kcccccccck...',
    11: '..kcccccccccck..',
    12: '..ksccccccccsk..',
    13: '..ksccccccccsk..',
    14: '...kppppppppk...',
    15: '...kffk..kffk...',
  },
  media: {
    10: '..kcccccccccck..',
    11: '.kcccccccccccck.',
    12: '.ksccccccccccsk.',
    13: '.ksccccccccccsk.',
    14: '..kppppppppppk..',
    15: '..kffk....kffk..',
  },
  robusta: {
    10: '.kcccccccccccck.',
    11: 'kcccccccccccccck',
    12: 'ksccccccccccccsk',
    13: 'ksccccccccccccsk',
    14: '.kppppppppppppk.',
    15: '.kffk......kffk.',
  },
};

const HEAD = {
  tondo: {
    1: '....kkkkkkkk....',
    2: '...kssssssssk...',
    3: '..kssssssssssk..',
    4: '..kssssssssssk..',
    5: '..kssssssssssk..',
    6: '..kssssssssssk..',
    7: '..kssssssssssk..',
    8: '...kssssssssk...',
    9: '....kkkkkkkk....',
  },
  ovale: {
    1: '.....kkkkkk.....',
    2: '....kssssssk....',
    3: '...kssssssssk...',
    4: '..kssssssssssk..',
    5: '..kssssssssssk..',
    6: '..kssssssssssk..',
    7: '...kssssssssk...',
    8: '....kssssssk....',
    9: '.....kkkkkk.....',
  },
  squadrato: {
    1: '...kkkkkkkkkk...',
    2: '..kssssssssssk..',
    3: '..kssssssssssk..',
    4: '..kssssssssssk..',
    5: '..kssssssssssk..',
    6: '..kssssssssssk..',
    7: '..kssssssssssk..',
    8: '..kssssssssssk..',
    9: '..kkkkkkkkkkkk..',
  },
};

const EYES = {
  puntini: { 5: '.....k....k.....' },
  grandi: { 4: '....wk....wk....', 5: '....kk....kk....' },
  socchiusi: { 5: '....kk....kk....' },
  felici: { 4: '.....k....k.....', 5: '....k.k..k.k....' },
};

const BROWS = {
  sottili: { 3: '....kk....kk....' },
  folte: { 3: '...kkk....kkk...' },
  arrabbiate: { 3: '....k......k....', 4: '.....k....k.....' },
};

const MOUTH = {
  sorriso: { 6: '.....k....k.....', 7: '......kkkk......' },
  ghigno: { 6: '..........k.....', 7: '......kkkkk.....' },
  seria: { 7: '......kkkk......' },
  risata: { 6: '......kkkk......', 7: '......kRRk......', 8: '.......kk.......' },
};

const BEARD = {
  nessuna: {},
  baffi: { 6: '.....hhhhhh.....' },
  pizzetto: { 8: '......hhhh......', 9: '.......hh.......' },
  corta: { 6: '..kh........hk..', 7: '..khh......hhk..', 8: '...khhhhhhhhk...', 9: '....khhhhhhk....' },
  folta: {
    5: '..kh........hk..', 6: '..khh......hhk..', 7: '..khhh....hhhk..',
    8: '..khhhhhhhhhhk..', 9: '...khhhhhhhhk...', 10: '....khhhhhhk....',
  },
};

const HAIR = {
  rasati: { 1: '....kkkkkkkk....', 2: '...kHhHhHhHhk...' },
  corti: { 0: '....kkkkkkkk....', 1: '...khhhhhhhhk...', 2: '..khhhhhhhhhhk..', 3: '..kh........hk..' },
  ciuffo: {
    0: '.....kkkkkkkk...', 1: '...khhhhhhhhhk..', 2: '..khhhhhhhhhhhk.',
    3: '..khh....hhhhhk.', 4: '..kh.......hk...',
  },
  ricci: {
    0: '...khhkhhkhhk...', 1: '..khhhhhhhhhhk..', 2: '.khhhhhhhhhhhhk.',
    3: '.khhH......Hhhk.', 4: '.khh........hhk.', 5: '..kh........hk..',
  },
  lunghi: {
    0: '....kkkkkkkk....', 1: '...khhhhhhhhk...', 2: '..khhhhhhhhhhk..', 3: '..khhh....hhhk..',
    4: '..hh........hh..', 5: '..hh........hh..', 6: '..hh........hh..', 7: '..hh........hh..',
    8: '..hhh......hhh..', 9: '..hhk......khh..', 10: '..hh........hh..',
  },
  coda: {
    0: '....kkkkkkkk....', 1: '...khhhhhhhhk...', 2: '..khhhhhhhhhhkk.', 3: '..kh........hkhk',
    4: '.............khk', 5: '..............hk', 6: '..............k.',
  },
  raccolti: {
    0: '......khhk......', 1: '....kkhHhhkk....', 2: '...khhhhhhhhk...', 3: '..kh........hk..',
  },
  calvo: {},
  cresta: {
    0: '......khhk......', 1: '....kkkhhkkk....', 2: '...kssshhsssk...',
  },
};

// Sovrapposizioni applicate solo sui pixel della maglia ('c')
const SHIRT = {
  't-shirt': {},
  camicia: { 10: '......wwww......', 11: '........C.......', 12: '.......C........', 13: '........C.......' },
  felpa: { 10: '.....CwCCwC.....', 11: '.......w.w......', 13: '.....CCCCCC.....' },
  maglione: { 11: '.C.C.C.C.C.C.C.C', 13: 'C.C.C.C.C.C.C.C.' },
  giacca: { 10: '......CwwC......', 11: '......CwwC......', 12: '......CwwC......', 13: '......CwwC......' },
  canotta: { 10: 'ssssss....ssssss', 11: 'sss..........sss', 12: 'ss............ss', 13: 'ss............ss' },
};

const PANTS = {
  jeans: { color: '#2D4F8A' },
  pantaloncini: { color: '#C9A66B', over: { 14: 'ppppppppPppppppp' } },
  tuta: { color: '#3A3F55', over: { 14: '..w..........w..' } },
  gonna: { color: '#7A1F3D', rows: { 14: '.kppppppppppppk.' } },
};

const SHOES = {
  'scarpe-da-ginnastica': { color: '#F3F5FA' },
  stivali: { color: '#5A3A22' },
  ciabatte: { color: '#2B47A3' },
};

const POSE = {
  fermo: {},
  saluto: {
    4: '.............kk.', 5: '............kssk', 6: '............kssk', 7: '.............kck',
    8: '.............kck', 9: '.............kck', 12: '.............ck.', 13: '.............ck.',
  },
  brindisi: { 9: '.............GGk', 10: '.............ggk', 11: '............sggk', 12: '.............kk.' },
  'braccia-conserte': { 12: '..kssssssssssk..', 13: '...kkkkkkkkkk...' },
};

// ---------------- oggetti sbloccabili ----------------
const ITEMS = {
  // cappelli
  'berretto-rosso': { layer: 'cappello', rows: { 0: '....kkkkkkkk....', 1: '...kRRRRRRRRk...', 2: '..kRRRRRRRRRRk..', 3: '..kkkkkkkkkkkkkk' } },
  coppola: { layer: 'cappello', rows: { 0: '....kkkkkkkk....', 1: '...kMmMmMmMmk...', 2: '..kmmmmmmmmmmk..', 3: '..kkkkkkkkkkkkk.' } },
  'cresta-gallo': { layer: 'cappello', rows: { 0: '....RRk.RRk.RRk.', 1: '....kRRkRRkRRk..', 2: '.....kRRRRRRk...' } },
  'corona-beccaccino': { layer: 'cappello', rows: { 0: '...gk.gk.gk.gk..', 1: '...gggggggggg...', 2: '...gRgggbgggRg..' } },
  'corona-briscola': { layer: 'cappello', rows: { 0: '...Gk.Gk.Gk.Gk..', 1: '...gggggggggg...', 2: '...gbgggRgggbg..' } },
  // occhiali
  'occhiali-sole': { layer: 'occhiali', rows: { 4: '...kkkkkkkkkk...', 5: '...kxxxkkxxxk...' } },
  // sciarpe
  'sciarpa-rossoblu': { layer: 'sciarpa', rows: { 9: '....RbRbRbRb....', 10: '..kbRbRbRbRbRk..', 11: '.......Rb.......', 12: '.......bR.......' } },
  // in mano
  tazzina: { layer: 'mano', rows: { 11: '............kwwk', 12: '............kmmk', 13: '.............kk.' } },
  'mazzo-carte': { layer: 'mano', rows: { 10: '............kwk.', 11: '...........kwRwk', 12: '...........kwwwk', 13: '............kk..' } },
  'coppa-mese': { layer: 'mano', rows: { 9: '............kGGk', 10: '............kggk', 11: '.............gk.', 12: '............kggk' } },
};

const BACKDROPS = {
  'sfondo-bancone': (g) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g[y][x] = y > 10 ? (y === 11 ? 'M' : 'm') : (x % 4 === 0 && y < 9 ? 'X' : 'b'); },
  'sfondo-piazza': (g) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g[y][x] = y > 12 ? 'x' : (y < 6 ? 'b' : ((x + y) % 5 === 0 ? 'G' : 'B')); },
  'sfondo-dex': (g) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g[y][x] = (x + y) % 2 ? 'R' : 'r'; },
};

export const FRAMES = {
  'cornice-legno': '#8A5A2B',
  'cornice-argento': '#AEB8C9',
  'cornice-oro': '#F2B200',
  'cornice-leggenda': '#F2B200',
};

export const DEFAULT_SPEC = {
  corporatura: 'media', pelle: '#F1C6A3', viso: 'tondo', occhi: 'puntini', sopracciglia: 'sottili',
  bocca: 'sorriso', capelli: 'corti', colore_capelli: '#4A2E1C', barba: 'nessuna', maglia: 't-shirt',
  colore_maglia: '#C8102E', pantaloni: 'jeans', scarpe: 'scarpe-da-ginnastica', posa: 'fermo', items: {},
};

export const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function paint(grid, rows, only) {
  for (const [y, row] of Object.entries(rows)) {
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      if (only && !only.includes(grid[y][x])) continue;
      grid[y][x] = ch === '0' ? '.' : ch;
    }
  }
}

export function compose(specIn) {
  const spec = { ...DEFAULT_SPEC, ...specIn, items: { ...(specIn?.items || {}) } };
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const bg = BACKDROPS[spec.items.sfondo];
  if (bg) bg(g);
  const ground = g.map((r) => r.slice());

  const pants = PANTS[spec.pantaloni] || PANTS.jeans;
  paint(g, BODY[spec.corporatura] || BODY.media);
  if (pants.rows) paint(g, pants.rows);
  if (pants.over) paint(g, pants.over, ['p']);
  paint(g, SHIRT[spec.maglia] || {}, ['c']);
  paint(g, HEAD[spec.viso] || HEAD.tondo);
  paint(g, EYES[spec.occhi] || EYES.puntini, ['s']);
  paint(g, BROWS[spec.sopracciglia] || BROWS.sottili, ['s']);
  paint(g, BEARD[spec.barba] || {});
  paint(g, MOUTH[spec.bocca] || MOUTH.sorriso, ['s', 'h']);
  paint(g, HAIR[spec.capelli] || {}, null);
  paint(g, POSE[spec.posa] || {});
  if (spec.items.sciarpa) paint(g, ITEMS[spec.items.sciarpa]?.rows || {});
  if (spec.items.occhiali) paint(g, ITEMS[spec.items.occhiali]?.rows || {});
  if (spec.items.cappello) paint(g, ITEMS[spec.items.cappello]?.rows || {});
  if (spec.items.mano) paint(g, ITEMS[spec.items.mano]?.rows || {});

  // i capelli lunghi non coprono lo sfondo dove non c'è il corpo
  return { grid: g, colors: pal(spec), ground };
}

export function spriteSVG(spec, size = 64, { silhouette = false, label = 'Personaggio' } = {}) {
  const { grid, colors } = compose(spec);
  let out = '';
  for (let y = 0; y < 16; y++) {
    let x = 0;
    while (x < 16) {
      const ch = grid[y][x];
      if (ch === '.') { x++; continue; }
      let n = 1;
      while (x + n < 16 && grid[y][x + n] === ch) n++;
      out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${silhouette ? INK : colors[ch] || INK}"/>`;
      x += n;
    }
  }
  return `<svg class="sprite" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" role="img" aria-label="${label}">${out}</svg>`;
}

export const ITEM_LAYERS = Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.layer]));
export const KNOWN_ITEMS = new Set([...Object.keys(ITEMS), ...Object.keys(BACKDROPS), ...Object.keys(FRAMES)]);

// Da profilo (id dei pezzi + catalogo) a spec del motore
export function specFromProfile(sprite, parts, items) {
  const spec = { ...DEFAULT_SPEC, items: {} };
  const base = sprite?.base || {};
  for (const [kind, id] of Object.entries(base)) {
    const part = parts.get(Number(id));
    if (!part) continue;
    spec[kind] = part.color || slug(part.name);
  }
  for (const [slot, id] of Object.entries(sprite?.equipped || {})) {
    const it = items.get(Number(id));
    if (it) spec.items[slot] = itemKey(it);
  }
  return spec;
}

export const itemKey = (it) => it.asset.replace(/^items\//, '').replace(/\.png$/, '');
