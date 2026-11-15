// Piccoli attrezzi condivisi: escape, toast, suoni 8-bit, vibrazione, crest.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const prefs = {
  get(k, d) { try { const v = localStorage.getItem('sdx-' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sdx-' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

export function toast(msg, kind = 'info') {
  let box = document.getElementById('toast');
  if (!box) { box = document.createElement('div'); box.id = 'toast'; box.setAttribute('role', 'status'); document.body.append(box); }
  box.className = 'toast ' + kind;
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(box._t);
  box._t = setTimeout(() => { box.hidden = true; }, 3200);
}

let ctx;
const NOTES = {
  tap: [[660, 0.04]],
  ok: [[523, 0.07], [784, 0.1]],
  error: [[220, 0.12], [165, 0.16]],
  capture: [[392, 0.08], [0, 0.12], [392, 0.08], [0, 0.12], [392, 0.08], [0, 0.18], [523, 0.08], [659, 0.08], [784, 0.2]],
  levelup: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.25]],
  badge: [[784, 0.08], [988, 0.08], [1319, 0.22]],
};
export function sound(name) {
  if (!prefs.get('suoni', true)) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [f, d] of NOTES[name] || []) {
      if (f) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d);
      }
      t += d;
    }
  } catch { /* audio non disponibile */ }
}

export function buzz(pattern = 30) { if (prefs.get('vibrazione', true) && navigator.vibrate) navigator.vibrate(pattern); }

export const CREST = `<svg class="crest" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${[
  'kkkkkkkkkkkk', 'krrrrrbbbbbk', 'krrwwrbbbbbk', 'krwwwwwbbbbk', 'krrwwwwwbbbk', 'krrrwwwwwbbk',
  'krrrrwwywbbk', 'krrrrrbybbbk', '.krrrrbbbbk.', '..krrrbbbk..', '...krrbbk...', '....kkkk....',
].map((row, y) => [...row].map((c, x) => (c === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${{ k: '#14183A', r: '#C8102E', b: '#1B2F6E', w: '#fff', y: '#F2B200' }[c]}"/>`)).join('')).join('')}</svg>`;

export const ICON = {
  dex: '########|#..##..#|#..##..#|########|########|#..##..#|#..##..#|########',
  scan: '###..###|#......#|#.####.#|..#..#..|..#..#..|#.####.#|#......#|###..###',
  io: '..####..|.######.|.######.|..####..|........|.######.|########|########',
  back: '...#....|..##....|.#######|########|.#######|..##....|...#....|........',
};
export const icon = (name, size = 22) => {
  const rows = ICON[name].split('|');
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${rows
    .map((r, y) => [...r].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>` : '')).join('')).join('')}</svg>`;
};

// QR: generazione (libreria caricata solo quando serve)
let qrLib;
export async function qrSVG(text) {
  try {
    qrLib ??= (await import('https://esm.sh/qrcode@1.5.4')).default;
    return await qrLib.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#14183A', light: '#FFFFFF' } });
  } catch {
    return `<div class="qr-fallback">${esc(text)}</div>`;
  }
}
