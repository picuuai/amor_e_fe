'use strict';
/* Estúdio de divulgação: realça a foto, monta o post (canvas) e gera a legenda.
   A publicação automática no Instagram é feita pelo "postador" (Python) rodando neste computador. */

const POSTADOR = 'http://127.0.0.1:8777';
const FORMATOS = { retrato: [1080, 1350, 'Feed 4:5'], quadrado: [1080, 1080, 'Quadrado'], story: [1080, 1920, 'Stories'], foto: [1080, 1350, 'Proporção da foto'] };
const ESTILOS = { original: ['Foto original', 'linear-gradient(135deg,#caa,#8a7a66)'], elegante: ['Elegante', '#d9b877'], moderno: ['Moderno', '#6645d8'], minimal: ['Minimalista', '#e9e6e0'], celestial: ['Celestial', '#1f3266'] };
const SELOS = ['', 'Pronta entrega', 'Novo', 'Últimas unidades', 'Personalizado', 'Sob encomenda', 'Promoção'];

const studio = {
  textosFoto: true, legendaTipo: 'instagram', prodId: null, fotoId: null, src: null, srcId: 0, fromFile: false, formato: null, estilo: null,
  auto: true, intens: 60, brilho: 0, contraste: 0, saturacao: 0, calor: 0, zoom: 100, px: 0, py: 0,
  titulo: '', preco: 0, mostrarPreco: true, selo: 'Pronta entrega', legenda: '', legendaEditada: false,
  _tituloDe: null, _proc: null, _procKey: '',
};
const INSTAGRAM_PADRAO = '@tercos.de.amor.e.fe';
const divCfg = () => {
  const d = (db.params.divulgar ||= { frase: 'Feito à mão com amor e fé', cta: 'Encomende pelo WhatsApp', whatsapp: '', instagram: '', estilo: 'elegante', formato: 'retrato' });
  if (!d.instagram) d.instagram = INSTAGRAM_PADRAO;
  return d;
};

/* ---------- imagem de origem ---------- */
async function srcFromProduct(p) {
  const url = p?.foto || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(art(p?.id || 'x').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" '));
  studio.src = await loadImage(url);
  studio.srcId++; studio.fromFile = false; studio.fotoId = null; studio.px = studio.py = 0; studio.zoom = 100;
}
async function srcFromGaleria(id) {
  const b = await fotoFull(id);
  if (!b) { toast('Foto não encontrada (sem internet?).'); return srcFromProduct(get('produtos', studio.prodId)); }
  studio.src = await blobToImage(b);
  studio.srcId++; studio.fromFile = true; studio.fotoId = id; studio.px = studio.py = 0; studio.zoom = 100;
}
function stripHTML() {
  const fs = galeria().filter(f => f.produtoId === studio.prodId && f.status !== 'arquivada').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 14);
  return fs.length ? `<div class="sec" style="margin-top:0">Fotos deste terço na galeria</div><div class="strip">${fs.map(f => `<button type="button" class="sthumb ${f.id === studio.fotoId ? 'on' : ''}" data-foto="${f.id}" title="${STATUS_G[f.status][0]}"><img data-thumb="${f.id}" alt=""><span class="dot ${f.status}"></span></button>`).join('')}</div>` : '';
}

/* ---------- realce da foto ---------- */
// níveis automáticos por canal (corrige luz e cor), depois brilho, contraste, tom quente e saturação
function enhance(src, o) {
  const w = src.width, h = src.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h), d = im.data;
  const k = o.auto ? o.intens / 100 : 0;
  const lo = [0, 0, 0], hi = [255, 255, 255];
  if (k > 0) {
    const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    for (let i = 0; i < d.length; i += 16) { hist[0][d[i]]++; hist[1][d[i + 1]]++; hist[2][d[i + 2]]++; }
    const n = d.length / 16;
    for (let ch = 0; ch < 3; ch++) {
      let acc = 0, l = 0, hg = 255;
      for (let v = 0; v < 256; v++) { acc += hist[ch][v]; if (acc > n * 0.005) { l = v; break; } }
      acc = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[ch][v]; if (acc > n * 0.005) { hg = v; break; } }
      if (hg - l > 40) { lo[ch] = l * k; hi[ch] = 255 - (255 - hg) * k; }
    }
  }
  const br = o.brilho * 1.2 + k * 6, ct = 1 + o.contraste / 100 + k * 0.1, sat = 1 + o.saturacao / 100 + k * 0.2, warm = o.calor * 0.6 + k * 5;
  const lut = [0, 1, 2].map(ch => {
    const L = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      let x = (v - lo[ch]) * 255 / (hi[ch] - lo[ch]) + br;
      x = (x - 128) * ct + 128;
      if (ch === 0) x += warm; if (ch === 2) x -= warm;
      L[v] = x;
    }
    return L;
  });
  for (let i = 0; i < d.length; i += 4) {
    let r = lut[0][d[i]], gg = lut[1][d[i + 1]], b = lut[2][d[i + 2]];
    const y = 0.299 * r + 0.587 * gg + 0.114 * b;
    d[i] = y + (r - y) * sat; d[i + 1] = y + (gg - y) * sat; d[i + 2] = y + (b - y) * sat;
  }
  g.putImageData(im, 0, 0);
  return c;
}
function processed() {
  const s = studio;
  if (!s.src) return null;
  const key = [s.srcId, s.auto, s.intens, s.brilho, s.contraste, s.saturacao, s.calor].join('|');
  if (key !== s._procKey) { s._proc = enhance(s.src, s); s._procKey = key; }
  return s._proc;
}

/* ---------- desenho ---------- */
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function font(g, w, size, fam = 'Plus Jakarta Sans', style = '') {
  g.font = `${style} ${w} ${size}px "${fam}", ${fam === 'Playfair Display' ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
}
function wrap(g, text, maxW) {
  const lines = []; let cur = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function spaced(g, text, x, y, sp) {
  g.textAlign = 'center';
  if ('letterSpacing' in g) { g.letterSpacing = sp + 'px'; g.fillText(text, x + sp / 2, y); g.letterSpacing = '0px'; }
  else g.fillText(text, x, y);
}
function pill(g, text, x, y, h, bg, fg, align, padX) {
  const w = g.measureText(text).width + padX * 2;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.beginPath(); g.roundRect(left, y, w, h, h / 2); g.fillStyle = bg; g.fill();
  g.fillStyle = fg; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, left + padX, y + h / 2 + 1);
  return w;
}
// itens de texto empilhados e centralizados verticalmente numa faixa
function tItem(g, text, maxW, size, min, maxLines, setFont, color, align, x) {
  let sz = size, lines;
  for (;;) {
    setFont(sz); lines = wrap(g, text, maxW);
    if ((lines.length <= maxLines && lines.every(l => g.measureText(l).width <= maxW)) || sz <= min) break;
    sz -= 2;
  }
  lines = lines.slice(0, maxLines);
  const lh = sz * 1.18;
  return { h: lh * lines.length, draw: y => { setFont(sz); g.fillStyle = color; g.textAlign = align; g.textBaseline = 'top'; lines.forEach((l, i) => g.fillText(l, x, y + i * lh)); } };
}
const pItem = (g, text, h, bg, fg, setFont, align, x, padX) => ({ h, draw: y => { setFont(); pill(g, text, x, y, h, bg, fg, align, padX); } });
function stack(items, top, bottom, gap) {
  const tot = items.reduce((a, i) => a + i.h, 0) + gap * Math.max(0, items.length - 1);
  let y = top + Math.max(0, (bottom - top - tot) / 2);
  for (const it of items) { it.draw(y); y += it.h + gap; }
}
function photo(g, img, x, y, w, h, clip, vignette = true) {
  const s = studio;
  g.save();
  if (clip) clip(); else { g.beginPath(); g.rect(x, y, w, h); }
  g.clip();
  if (img) {
    const k = Math.max(w / img.width, h / img.height) * s.zoom / 100;
    const dw = img.width * k, dh = img.height * k, mx = (dw - w) / 2, my = (dh - h) / 2;
    s.px = Math.max(-mx, Math.min(mx, s.px)); s.py = Math.max(-my, Math.min(my, s.py));
    g.drawImage(img, x + (w - dw) / 2 + s.px, y + (h - dh) / 2 + s.py, dw, dh);
  }
  if (vignette && s.auto && s.intens > 0) {
    const r = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.hypot(w, h) / 2);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${0.3 * s.intens / 100})`);
    g.fillStyle = r; g.fillRect(x, y, w, h);
  }
  g.restore();
}
function selo(g, text, cx, cy, r, bg, fg) {
  g.save(); g.translate(cx, cy); g.rotate(-0.18);
  g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = r * 0.3; g.shadowOffsetY = r * 0.06;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
  g.shadowColor = 'transparent';
  g.setLineDash([r * 0.06, r * 0.05]); g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = r * 0.025;
  g.beginPath(); g.arc(0, 0, r * 0.84, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  const T = text.toUpperCase(); let sz = r * 0.3, lines;
  for (;;) { font(g, 800, sz); lines = wrap(g, T, r * 1.4); if ((lines.length <= 3 && lines.every(l => g.measureText(l).width <= r * 1.45)) || sz < 12) break; sz -= 2; }
  const lh = sz * 1.1; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * lh));
  g.restore();
}
function rosary(g, cx, cy, R, color) {
  const k = R / 28, P = (X, Y) => [cx + (X - 60) * k, cy + (Y - 44) * k];
  g.fillStyle = color;
  for (let i = 0; i < 20; i++) {
    const a = Math.PI / 2 + i / 20 * Math.PI * 2;
    g.beginPath(); g.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), (i % 5 ? 3.3 : 4.4) * k, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 3; i++) { const [x, y] = P(60, 79 + i * 7); g.beginPath(); g.arc(x, y, 3 * k, 0, Math.PI * 2); g.fill(); }
  let [x, y] = P(58, 97); g.fillRect(x, y, 4 * k, 17 * k);
  [x, y] = P(53, 101); g.fillRect(x, y, 14 * k, 4 * k);
}
const contatos = () => {
  const c = divCfg(), ig = c.instagram.trim();
  return [c.whatsapp.trim() && 'WhatsApp ' + c.whatsapp.trim(), ig && (ig.startsWith('@') ? ig : '@' + ig)].filter(Boolean).join('   •   ');
};

// tamanho final do post; "Proporção da foto" segue a foto, dentro do que o Instagram aceita (4:5 até 1,91:1)
function dimensoes() {
  const s = studio;
  if (s.formato !== 'foto') return FORMATOS[s.formato];
  const r = s.src ? Math.min(1.91, Math.max(0.8, s.src.width / s.src.height)) : 0.8;
  return [1080, Math.round(1080 / r)];
}

const TEMPLATES = {
  // a foto inteira, sem moldura; nome, preço e contatos por cima numa faixa escura suave (opcional)
  original(g, W, H, img) {
    const s = studio, c = divCfg();
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    photo(g, img, 0, 0, W, H, null, false);
    if (!s.textosFoto) return;
    const u = Math.min(W, H * 1.1) / 1080;   // fotos deitadas (mais baixas) usam letras menores
    const fh = H * 0.5, fb = g.createLinearGradient(0, H - fh, 0, H);
    fb.addColorStop(0, 'rgba(0,0,0,0)'); fb.addColorStop(0.5, 'rgba(0,0,0,.5)'); fb.addColorStop(1, 'rgba(0,0,0,.78)');
    g.fillStyle = fb; g.fillRect(0, H - fh, W, fh);
    const ft = g.createLinearGradient(0, 0, 0, 150 * u);
    ft.addColorStop(0, 'rgba(0,0,0,.45)'); ft.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ft; g.fillRect(0, 0, W, 150 * u);
    g.save();
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10 * u;
    g.fillStyle = '#fff'; font(g, 700, 24 * u); g.textBaseline = 'middle';
    spaced(g, (db.params.nome || '').toUpperCase(), W / 2, 50 * u, 7 * u);
    if (s.selo) { font(g, 800, 24 * u); pill(g, s.selo.toUpperCase(), 44 * u, 88 * u, 54 * u, '#f1c75b', '#3b2a1a', 'left', 22 * u); }
    const X = 56 * u, maxW = W - 112 * u, items = [];
    items.push(tItem(g, s.titulo, maxW, 64 * u, 34 * u, 2, sz => font(g, 700, sz, 'Playfair Display'), '#fff', 'left', X));
    if (c.frase) items.push(tItem(g, c.frase, maxW, 30 * u, 20 * u, 1, sz => font(g, 500, sz, 'Playfair Display', 'italic'), 'rgba(255,255,255,.9)', 'left', X));
    const temPreco = s.mostrarPreco && s.preco > 0, cta = [c.cta, contatos()].filter(Boolean);
    if (temPreco || cta.length) items.push({
      h: 66 * u, draw: y0 => {
        let pw = 0;
        if (temPreco) { font(g, 800, 34 * u); pw = pill(g, brl(s.preco), X, y0, 66 * u, '#f1c75b', '#2a1d10', 'left', 26 * u) + 22 * u; }
        const room = maxW - pw; let sz = 24 * u; font(g, 600, sz);
        while (cta.some(t => g.measureText(t).width > room) && sz > 14 * u) { sz -= 1; font(g, 600, sz); }
        g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
        cta.slice(0, 2).forEach((t, i, a) => g.fillText(t, X + pw, y0 + 33 * u + (i - (a.length - 1) / 2) * sz * 1.25));
      },
    });
    // empilha de baixo para cima, colado na borda de baixo
    const gap = 12 * u, tot = items.reduce((a, i) => a + i.h, 0) + gap * (items.length - 1);
    let y = H - 44 * u - tot;
    for (const it of items) { it.draw(y); y += it.h + gap; }
    g.restore();
  },

  elegante(g, W, H, img) {
    const u = W / 1080, s = studio, c = divCfg();
    g.fillStyle = '#f6eee2'; g.fillRect(0, 0, W, H);
    const rnd = mulberry32(7);
    for (let i = 0; i < W * H / 260; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(120,90,50,.04)' : 'rgba(255,255,255,.4)'; g.fillRect(rnd() * W, rnd() * H, 2 * u, 2 * u); }
    g.strokeStyle = '#c9a45c'; g.lineWidth = 2 * u; g.strokeRect(34 * u, 34 * u, W - 68 * u, H - 68 * u);
    g.lineWidth = 1 * u; g.strokeRect(46 * u, 46 * u, W - 92 * u, H - 92 * u);
    g.fillStyle = '#a8792a'; font(g, 700, 26 * u); g.textBaseline = 'middle';
    spaced(g, (db.params.nome || '').toUpperCase(), W / 2, 104 * u, 9 * u);
    const bottom = Math.max(370 * u, H * 0.31), x = 130 * u, w = W - 260 * u, y = 150 * u, h = H - y - bottom;
    const r = Math.min(w / 2, h * 0.42);
    const arch = (o = 0) => { g.beginPath(); g.moveTo(x - o, y + h + o); g.lineTo(x - o, y + r); g.arc(x + w / 2, y + r, w / 2 + o, Math.PI, 0); g.lineTo(x + w + o, y + h + o); g.closePath(); };
    g.save(); g.shadowColor = 'rgba(90,60,20,.3)'; g.shadowBlur = 50 * u; g.shadowOffsetY = 18 * u; arch(); g.fillStyle = '#fff'; g.fill(); g.restore();
    photo(g, img, x, y, w, h, () => arch());
    arch(16 * u); g.strokeStyle = '#c9a45c'; g.lineWidth = 3 * u; g.stroke();
    if (s.selo) selo(g, s.selo, x + w - 30 * u, y + h - 50 * u, 92 * u, '#b8893a', '#fff');
    const items = [tItem(g, s.titulo, w + 40 * u, 72 * u, 40 * u, 2, sz => font(g, 700, sz, 'Playfair Display'), '#3b2a1a', 'center', W / 2)];
    if (c.frase) items.push(tItem(g, c.frase, w + 40 * u, 36 * u, 24 * u, 2, sz => font(g, 500, sz, 'Playfair Display', 'italic'), '#80613f', 'center', W / 2));
    if (s.mostrarPreco && s.preco > 0) items.push(pItem(g, brl(s.preco), 74 * u, '#b8893a', '#fff', () => font(g, 800, 38 * u), 'center', W / 2, 34 * u));
    const cta = [c.cta, contatos()].filter(Boolean).join('   •   ');
    if (cta) items.push(tItem(g, cta, W - 180 * u, 26 * u, 18 * u, 2, sz => font(g, 600, sz), '#80613f', 'center', W / 2));
    stack(items, y + h + 34 * u, H - 64 * u, 16 * u);
  },

  moderno(g, W, H, img) {
    const u = W / 1080, s = studio, c = divCfg();
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#3f2799'); gr.addColorStop(0.55, '#6645d8'); gr.addColorStop(1, '#a45fd0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    rosary(g, W - 130 * u, 120 * u, 120 * u, 'rgba(255,255,255,.13)');
    rosary(g, 90 * u, H - 250 * u, 90 * u, 'rgba(255,255,255,.07)');
    g.fillStyle = '#fff'; font(g, 800, 34 * u); g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(db.params.nome || '', 80 * u, 98 * u);
    const bottom = Math.max(340 * u, H * 0.28), x = 70 * u, w = W - 140 * u, y = 150 * u, h = H - y - bottom;
    g.save(); g.shadowColor = 'rgba(20,5,60,.45)'; g.shadowBlur = 60 * u; g.shadowOffsetY = 24 * u;
    g.beginPath(); g.roundRect(x, y, w, h, 44 * u); g.fillStyle = '#fff'; g.fill(); g.restore();
    const ix = x + 16 * u, iy = y + 16 * u, iw = w - 32 * u, ih = h - 32 * u;
    photo(g, img, ix, iy, iw, ih, () => { g.beginPath(); g.roundRect(ix, iy, iw, ih, 30 * u); });
    if (s.selo) { font(g, 800, 26 * u); pill(g, s.selo.toUpperCase(), ix + 26 * u, iy + 26 * u, 58 * u, '#f1c75b', '#3f2799', 'left', 24 * u); }
    const X = 80 * u, maxW = W - 160 * u;
    const items = [tItem(g, s.titulo, maxW, 70 * u, 40 * u, 2, sz => font(g, 800, sz), '#fff', 'left', X)];
    if (c.frase) items.push(tItem(g, c.frase, maxW, 32 * u, 22 * u, 2, sz => font(g, 500, sz), 'rgba(255,255,255,.86)', 'left', X));
    const temPreco = s.mostrarPreco && s.preco > 0, cta = [c.cta, contatos()].filter(Boolean);
    if (temPreco || cta.length) items.push({
      h: 76 * u, draw: y0 => {
        let pw = 0;
        if (temPreco) { font(g, 800, 38 * u); pw = pill(g, brl(s.preco), X, y0, 76 * u, '#fff', '#4b2fb0', 'left', 30 * u) + 26 * u; }
        const room = maxW - pw; let sz = 26 * u; font(g, 600, sz);
        while (cta.some(t => g.measureText(t).width > room) && sz > 16 * u) { sz -= 1; font(g, 600, sz); }
        g.fillStyle = 'rgba(255,255,255,.95)'; g.textAlign = 'left'; g.textBaseline = 'middle';
        cta.slice(0, 2).forEach((t, i, a) => g.fillText(t, X + pw, y0 + 38 * u + (i - (a.length - 1) / 2) * sz * 1.25));
      },
    });
    stack(items, y + h + 30 * u, H - 50 * u, 14 * u);
  },

  minimal(g, W, H, img) {
    const u = W / 1080, s = studio, c = divCfg();
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, W, H);
    const bottom = Math.max(300 * u, H * 0.25), ph = H - bottom;
    photo(g, img, 0, 0, W, ph);
    if (s.selo) { font(g, 800, 24 * u); pill(g, s.selo.toUpperCase(), 48 * u, 48 * u, 56 * u, '#1d1830', '#fff', 'left', 24 * u); }
    g.fillStyle = '#c9a45c'; g.fillRect(64 * u, ph + 40 * u, 90 * u, 5 * u);
    const X = 64 * u, maxW = W - 128 * u;
    const items = [];
    items.push({ h: 30 * u, draw: y0 => { font(g, 700, 22 * u); g.fillStyle = '#8a8398'; g.textAlign = 'left'; g.textBaseline = 'top'; if ('letterSpacing' in g) g.letterSpacing = 6 * u + 'px'; g.fillText((db.params.nome || '').toUpperCase(), X, y0); if ('letterSpacing' in g) g.letterSpacing = '0px'; } });
    const temPreco = s.mostrarPreco && s.preco > 0;
    font(g, 800, 54 * u); const pw = temPreco ? g.measureText(brl(s.preco)).width + 30 * u : 0;
    const tt = tItem(g, s.titulo, maxW - pw, 62 * u, 36 * u, 2, sz => font(g, 700, sz, 'Playfair Display'), '#1d1830', 'left', X);
    items.push({ h: tt.h, draw: y0 => { tt.draw(y0); if (temPreco) { font(g, 800, 54 * u); g.fillStyle = '#5b3fc4'; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText(brl(s.preco), W - X, y0 + 4 * u); } } });
    const linha = [c.frase, c.cta].filter(Boolean).join(' — ');
    if (linha) items.push(tItem(g, linha, maxW, 28 * u, 20 * u, 2, sz => font(g, 500, sz), '#6e6883', 'left', X));
    if (contatos()) items.push(tItem(g, contatos(), maxW, 26 * u, 18 * u, 1, sz => font(g, 700, sz), '#1d1830', 'left', X));
    stack(items, ph + 64 * u, H - 40 * u, 12 * u);
  },

  celestial(g, W, H, img) {
    const u = W / 1080, s = studio, c = divCfg();
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a1430'); gr.addColorStop(1, '#1d2f5e');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const rnd = mulberry32(11);
    for (let i = 0; i < 160; i++) {
      g.globalAlpha = 0.25 + rnd() * 0.65; g.fillStyle = rnd() < 0.35 ? '#f1d38a' : '#ffffff';
      g.beginPath(); g.arc(rnd() * W, rnd() * H, (0.6 + rnd() * 2.2) * u, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      const x = rnd() * W, y = rnd() * H * 0.9, r = (8 + rnd() * 10) * u;
      g.fillStyle = 'rgba(241,211,138,.8)'; g.beginPath();
      g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
    }
    g.fillStyle = '#e8c875'; font(g, 700, 26 * u); g.textBaseline = 'middle';
    spaced(g, (db.params.nome || '').toUpperCase(), W / 2, 96 * u, 9 * u);
    const bottom = Math.max(390 * u, H * 0.32), avail = H - 160 * u - bottom;
    const d = Math.min(W - 240 * u, avail), cx = W / 2, cy = 150 * u + (avail - d) / 2 + d / 2;
    const glow = g.createRadialGradient(cx, cy, d * 0.3, cx, cy, d * 0.8);
    glow.addColorStop(0, 'rgba(241,211,138,.38)'); glow.addColorStop(1, 'rgba(241,211,138,0)');
    g.fillStyle = glow; g.fillRect(0, cy - d, W, d * 2);
    photo(g, img, cx - d / 2, cy - d / 2, d, d, () => { g.beginPath(); g.arc(cx, cy, d / 2, 0, Math.PI * 2); });
    g.strokeStyle = '#e8c875'; g.lineWidth = 8 * u; g.beginPath(); g.arc(cx, cy, d / 2 + 4 * u, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 0.55; g.lineWidth = 2 * u; g.beginPath(); g.arc(cx, cy, d / 2 + 24 * u, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    if (s.selo) selo(g, s.selo, cx + d * 0.36, cy + d * 0.36, 88 * u, '#e8c875', '#0a1430');
    const items = [tItem(g, s.titulo, W - 180 * u, 70 * u, 40 * u, 2, sz => font(g, 700, sz, 'Playfair Display'), '#f3d98f', 'center', W / 2)];
    if (c.frase) items.push(tItem(g, c.frase, W - 180 * u, 34 * u, 22 * u, 2, sz => font(g, 500, sz, 'Playfair Display', 'italic'), '#d6dcf0', 'center', W / 2));
    if (s.mostrarPreco && s.preco > 0) items.push(pItem(g, brl(s.preco), 72 * u, '#e8c875', '#0a1430', () => font(g, 800, 38 * u), 'center', W / 2, 34 * u));
    const cta = [c.cta, contatos()].filter(Boolean).join('   •   ');
    if (cta) items.push(tItem(g, cta, W - 180 * u, 26 * u, 18 * u, 2, sz => font(g, 600, sz), '#b9c3e3', 'center', W / 2));
    stack(items, cy + d / 2 + 50 * u, H - 64 * u, 16 * u);
  },
};

function fitCanvas(cv) {
  const box = cv.parentElement; if (!box) return;
  const k = Math.min(box.clientWidth / cv.width, Math.max(320, innerHeight * 0.68) / cv.height);
  cv.style.width = Math.round(cv.width * k) + 'px'; cv.style.height = Math.round(cv.height * k) + 'px';
}
function drawPost(cv) {
  const s = studio, [W, H] = dimensoes();
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  fitCanvas(cv);
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  TEMPLATES[s.estilo](g, W, H, processed());
}
window.addEventListener('resize', () => { const cv = $('#stCanvas'); if (cv) fitCanvas(cv); });

/* ---------- legenda ---------- */
const noCelular = () => matchMedia('(pointer: coarse)').matches;
function gerarLegenda() {
  const s = studio, c = divCfg();
  if (s.legendaTipo === 'whatsapp') {
    // WhatsApp: curta, com *negrito* e sem hashtags
    const ig = c.instagram.trim();
    const W = [`*✨ ${s.titulo} ✨*`];
    if (c.frase) W.push(`_${c.frase}_ 🙏`);
    W.push('');
    if (s.selo) W.push(`🏷️ ${s.selo}`);
    if (s.mostrarPreco && s.preco > 0) W.push(`💰 *${brl(s.preco)}*`);
    W.push('', '💬 Responda esta mensagem para encomendar!');
    if (ig) W.push(`📸 Mais modelos no Instagram: ${ig.startsWith('@') ? ig : '@' + ig}`);
    return W.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const L = [`✨ ${s.titulo} ✨`];
  if (c.frase) L.push('', c.frase);
  L.push('', '🙏 Peça feita à mão, com carinho e oração.');
  if (s.selo) L.push(`🏷️ ${s.selo}`);
  if (s.mostrarPreco && s.preco > 0) L.push(`💰 ${brl(s.preco)}`);
  const cont = [];
  if (c.cta) cont.push(`👉 ${c.cta}`);
  if (c.whatsapp.trim()) cont.push(`📲 WhatsApp: ${c.whatsapp.trim()}`);
  if (cont.length) L.push('', ...cont);
  // hashtag da marca a partir do @ do Instagram (ex.: @tercos.de.amor.e.fe → #tercosdeamorefe)
  const marca = (c.instagram.trim() || db.params.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  L.push('', ['#terço', '#terçoartesanal', '#terçopersonalizado', '#artesanatocatolico', '#presentereligioso', '#feitoamao', '#fécatólica', '#nossasenhora', marca && '#' + marca].filter(Boolean).join(' '));
  return L.join('\n');
}

/* ---------- tela ---------- */
function viewDivulgar() {
  if (!db.produtos.length) return empty('tag', 'Cadastre um produto primeiro');
  const c = divCfg(), s = studio;
  s.estilo ||= c.estilo; s.formato ||= c.formato;
  if (!get('produtos', s.prodId)) { s.prodId = produtosOrd()[0].id; s.src = null; }
  const p = get('produtos', s.prodId);
  if (s._tituloDe !== p.id) { s.titulo = p.nome; s.preco = p.preco; s._tituloDe = p.id; s.legendaEditada = false; }
  const rng = (n, label, min, max) => `<label>${label} <span class="muted" data-out="${n}">${s[n]}</span><input type="range" name="${n}" min="${min}" max="${max}" value="${s[n]}"></label>`;
  const chips = (k, obj, sw) => `<div class="chips">${Object.entries(obj).map(([v, d]) => `<button type="button" class="chip ${v === s[k] ? 'on' : ''}" data-k="${k}" data-v="${v}">${sw ? `<span class="sw" style="background:${d[1]}"></span>${d[0]}` : d[2]}</button>`).join('')}</div>`;
  return `<div class="studio" id="studio">
    <div class="st-prev"><div class="card">
      <div class="st-canvas"><canvas id="stCanvas" aria-label="Prévia do post"></canvas></div>
      <p class="hint" style="margin:10px 0 12px;text-align:center">Arraste a foto para ajustar o enquadramento.</p>
      <div class="st-actions">
        ${noCelular()
          ? `<button class="btn pri" data-s="share">${ic('share')}Postar / Compartilhar</button>`
          : `<button class="btn pri" data-s="publicar">${ic('instagram')}Publicar no Instagram</button>
             <button class="btn" data-s="share">${ic('share')}Compartilhar</button>`}
        <button class="btn" data-s="download">${ic('download')}Baixar</button>
        <button class="btn" data-s="copy">${ic('copy')}Copiar legenda</button>
      </div>
      <div id="pubStatus"></div>
      <div class="ig-box compacto" style="margin-top:12px"></div>
    </div></div>
    <div class="st-ctrl">
      <div class="card"><div class="card-h">${ic('camera')}<h3>1. Foto</h3></div>
        <label>Terço<select name="prod">${opts(produtosOrd(), s.prodId)}</select></label>
        <div id="stStrip">${stripHTML()}</div>
        <div class="bar"><label class="btn" style="margin:0">${ic('image')}Carregar foto nova<input type="file" name="file" accept="image/*" hidden></label><span class="muted" id="stSrc" style="font-size:13px"></span></div>
        <label class="chk"><input type="checkbox" name="auto" ${s.auto ? 'checked' : ''}>Realce automático (luz, cores e contraste)</label>
        ${rng('intens', 'Intensidade do realce', 0, 100)}
        <details><summary>Ajustes finos</summary>
          ${rng('brilho', 'Brilho', -50, 50)}${rng('contraste', 'Contraste', -50, 50)}${rng('saturacao', 'Cores', -50, 50)}${rng('calor', 'Tom quente', -50, 50)}${rng('zoom', 'Zoom', 100, 250)}
          <button type="button" class="btn sm" data-s="resetAdj">Zerar ajustes</button>
        </details>
        <button type="button" class="btn sm" data-s="usarFoto" style="margin-top:12px">${ic('check')}Usar esta foto no cadastro do terço</button>
      </div>
      <div class="card"><div class="card-h">${ic('sparkles')}<h3>2. Modelo</h3></div>
        ${chips('estilo', ESTILOS, true)}
        ${chips('formato', FORMATOS, false)}
        <label class="chk" id="optTextos" ${s.estilo === 'original' ? '' : 'hidden'}><input type="checkbox" name="textosFoto" ${s.textosFoto ? 'checked' : ''}>Mostrar nome, preço e contatos sobre a foto</label>
      </div>
      <div class="card"><div class="card-h">${ic('tag')}<h3>3. Textos</h3></div>
        <label>Título<input name="titulo" value="${esc(s.titulo)}"></label>
        <label>Frase<input name="frase" value="${esc(c.frase)}"></label>
        <div class="g2"><label>Preço<input name="preco" inputmode="decimal" value="${iv(s.preco)}"></label>
        <label>Selo<select name="selo">${SELOS.map(x => `<option value="${esc(x)}" ${x === s.selo ? 'selected' : ''}>${x || 'Sem selo'}</option>`).join('')}</select></label></div>
        <label class="chk"><input type="checkbox" name="mostrarPreco" ${s.mostrarPreco ? 'checked' : ''}>Mostrar preço na imagem</label>
        <label>Chamada<input name="cta" value="${esc(c.cta)}"></label>
        <div class="g2"><label>WhatsApp<input name="whatsapp" inputmode="tel" value="${esc(c.whatsapp)}" placeholder="(11) 99999-9999"></label>
        <label>Instagram<input name="instagram" value="${esc(c.instagram)}" placeholder="@seuperfil"></label></div>
      </div>
      <div class="card"><div class="card-h">${ic('chat')}<h3>4. Legenda</h3><button type="button" class="btn sm" data-s="regen">${ic('refresh')}Gerar de novo</button></div>
        <div class="chips">${[['instagram', 'instagram', 'Instagram / Facebook'], ['whatsapp', 'chat', 'WhatsApp']].map(([v, i, l]) => `<button type="button" class="chip ${s.legendaTipo === v ? 'on' : ''}" data-leg="${v}">${ic(i)}${l}</button>`).join('')}</div>
        <textarea name="legenda" style="min-height:230px"></textarea>
      </div>
      ${(db.posts || []).length ? `<div class="card"><div class="card-h">${ic('instagram')}<h3>Publicados</h3></div><div class="list">${[...db.posts].reverse().slice(0, 8).map(x => `<div class="li" style="cursor:default">${foto(get('produtos', x.produtoId), 'sm')}<div class="li-main"><div class="li-t">${esc(x.titulo)}</div><div class="li-s">${fdate(x.data)} · ${esc(ESTILOS[x.estilo]?.[0] || '')}</div></div><span class="tag ${x.status === 'publicado' ? 'ok' : 'warn'}">${x.status === 'publicado' ? 'publicado' : 'conferir'}</span></div>`).join('')}</div></div>` : ''}
    </div></div>`;
}

let stRaf = 0;
async function initStudio() {
  const root = $('#studio'); if (!root) return;
  const s = studio, c = divCfg(), cv = $('#stCanvas', root);
  const redraw = () => { cancelAnimationFrame(stRaf); stRaf = requestAnimationFrame(() => drawPost(cv)); };
  const setLeg = () => { if (!s.legendaEditada) s.legenda = gerarLegenda(); root.querySelector('[name=legenda]').value = s.legenda; };
  const srcLabel = () => {
    const f = galeria().find(x => x.id === s.fotoId);
    $('#stSrc', root).textContent = f ? `foto da galeria · ${STATUS_G[f.status][0].toLowerCase()}`
      : get('produtos', s.prodId)?.foto ? 'usando a foto do cadastro (pequena) — escolha uma da galeria ou carregue a original' : 'sem foto — carregue uma';
  };
  const refreshStrip = () => { $('#stStrip', root).innerHTML = stripHTML(); hydrateThumbs($('#stStrip', root)); };
  root.addEventListener('input', e => {
    const t = e.target, n = t.name;
    if (t.type === 'range') { s[n] = +t.value; const o = root.querySelector(`[data-out="${n}"]`); if (o) o.textContent = t.value; redraw(); return; }
    if (n === 'legenda') { s.legenda = t.value; s.legendaEditada = true; return; }
    if (n === 'titulo') s.titulo = t.value;
    else if (n === 'preco') s.preco = pn(t.value);
    else if (['frase', 'cta', 'whatsapp', 'instagram'].includes(n)) c[n] = t.value;
    else return;
    setLeg(); redraw();
  });
  root.addEventListener('change', async e => {
    const t = e.target, n = t.name;
    if (n === 'prod') {
      s.prodId = t.value; const p = get('produtos', s.prodId);
      s.titulo = p.nome; s.preco = p.preco; s._tituloDe = p.id; s.legendaEditada = false;
      root.querySelector('[name=titulo]').value = s.titulo; root.querySelector('[name=preco]').value = iv(s.preco);
      const ult = galeria().filter(f => f.produtoId === p.id && f.status === 'nova').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
      if (ult) await srcFromGaleria(ult.id); else await srcFromProduct(p);
      refreshStrip(); srcLabel(); setLeg(); redraw();
    } else if (n === 'file') {
      const f = t.files[0]; t.value = ''; if (!f) return;
      const [nova] = await adicionarFotos([f], s.prodId); // toda foto nova vai para a galeria
      if (nova) { await srcFromGaleria(nova.id); toast('Foto adicionada à galeria.'); }
      refreshStrip(); srcLabel(); redraw();
    } else if (n === 'auto') { s.auto = t.checked; redraw(); }
    else if (n === 'textosFoto') { s.textosFoto = t.checked; redraw(); }
    else if (n === 'mostrarPreco') { s.mostrarPreco = t.checked; setLeg(); redraw(); }
    else if (n === 'selo') { s.selo = t.value; setLeg(); redraw(); }
    save(); // guarda frase, chamada e contatos
  });
  root.addEventListener('click', e => {
    const leg = e.target.closest('[data-leg]');
    if (leg) {
      s.legendaTipo = leg.dataset.leg; s.legendaEditada = false; setLeg();
      $$('[data-leg]', root).forEach(x => x.classList.toggle('on', x === leg));
      return;
    }
    const chip = e.target.closest('.chip[data-k]');
    if (chip) {
      const k = chip.dataset.k; s[k] = c[k] = chip.dataset.v;
      if (k === 'estilo') $('#optTextos', root).hidden = s.estilo !== 'original';
      $$(`.chip[data-k="${k}"]`, root).forEach(b => b.classList.toggle('on', b === chip));
      save(); redraw(); return;
    }
    const th = e.target.closest('[data-foto]');
    if (th) {
      srcFromGaleria(th.dataset.foto).then(() => { $$('.sthumb', root).forEach(x => x.classList.toggle('on', x === th)); srcLabel(); redraw(); });
      return;
    }
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s;
    if (a === 'marcarPub') { marcarPublicada(s.fotoId); setPub(`${ic('check')}<div>Foto marcada como publicada.</div>`, 'ok'); refreshStrip(); srcLabel(); }
    if (a === 'regen') { s.legendaEditada = false; setLeg(); }
    if (a === 'resetAdj') {
      Object.assign(s, { brilho: 0, contraste: 0, saturacao: 0, calor: 0, zoom: 100, px: 0, py: 0 });
      for (const n of ['brilho', 'contraste', 'saturacao', 'calor', 'zoom']) { root.querySelector(`[name=${n}]`).value = s[n]; root.querySelector(`[data-out=${n}]`).textContent = s[n]; }
      redraw();
    }
    if (a === 'copy') copiarLegenda();
    if (a === 'download') baixarPost(cv).then(oferecerMarcar);
    if (a === 'share') compartilharPost(cv).then(oferecerMarcar);
    if (a === 'publicar') publicarInstagram(cv, b);
    if (a === 'usarFoto') usarFotoNoProduto();
  });
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.classList.add('grab'); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const k = cv.width / cv.getBoundingClientRect().width;
    s.px += (e.clientX - drag.x) * k; s.py += (e.clientY - drag.y) * k; drag = { x: e.clientX, y: e.clientY }; redraw();
  });
  const end = () => { drag = null; cv.classList.remove('grab'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  if (!s.src) {
    const ult = galeria().filter(f => f.produtoId === s.prodId && f.status === 'nova').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
    if (s.fotoId) await srcFromGaleria(s.fotoId);
    else if (ult) await srcFromGaleria(ult.id);
    else await srcFromProduct(get('produtos', s.prodId));
    $$('.sthumb', root).forEach(x => x.classList.toggle('on', x.dataset.foto === s.fotoId));
  }
  hydrateThumbs(root);
  srcLabel(); setLeg();
  drawPost(cv);
  mostrarPostador();
  // redesenha quando as fontes terminarem de carregar (sem travar a primeira prévia)
  Promise.all(['700 60px "Playfair Display"', 'italic 500 40px "Playfair Display"', '800 60px "Plus Jakarta Sans"', '600 30px "Plus Jakarta Sans"'].map(f => document.fonts.load(f)))
    .then(() => { if (cv.isConnected) redraw(); }, () => { });
}

/* ---------- saída ---------- */
const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'terco';
const postBlob = cv => new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92));
async function copiarLegenda(silencioso) {
  try { await navigator.clipboard.writeText(studio.legenda); if (!silencioso) toast('Legenda copiada.'); return true; }
  catch { if (!silencioso) toast('Não foi possível copiar — selecione o texto da legenda e copie.'); return false; }
}
async function baixarPost(cv) { download(`post-${slug(studio.titulo)}.jpg`, await postBlob(cv), 'image/jpeg'); }
async function compartilharPost(cv) {
  const file = new File([await postBlob(cv)], `post-${slug(studio.titulo)}.jpg`, { type: 'image/jpeg' });
  const copiou = await copiarLegenda(true);
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: studio.legenda }); if (copiou) toast('Legenda copiada — é só colar no post.'); }
    catch (e) { if (e.name !== 'AbortError') toast('Não foi possível compartilhar: ' + e.message); }
  } else { await baixarPost(cv); toast('Imagem baixada' + (copiou ? ' e legenda copiada' : '') + '.'); }
}
async function usarFotoNoProduto() {
  const s = studio, p = get('produtos', s.prodId), img = processed();
  if (!img || !s.fromFile) { toast('Carregue uma foto primeiro.'); return; }
  const side = Math.min(img.width, img.height), out = Math.min(520, side);
  const c = document.createElement('canvas'); c.width = c.height = out;
  c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
  const antes = p.foto; p.foto = c.toDataURL('image/jpeg', 0.82);
  if (!save()) { p.foto = antes; return; }
  toast('Foto (já realçada) salva no cadastro do terço.');
}

/* ---------- publicação automática (postador Python) ---------- */
async function postadorStatus() {
  try {
    const r = await fetch(POSTADOR + '/status', { signal: AbortSignal.timeout(1500) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
/* quadro de status da conta (usado em Cadastros > Instagram e no estúdio) */
function igBoxHTML(st, compacto = false) {
  if (!st) return `<div class="alert warn">${ic('alert')}<div><b>Postador desligado.</b> Ele é o programa que publica por você neste computador.
    Na pasta <b>postador-instagram</b> (no OneDrive, em ELISA FERREIRA DE JESUS), clique duas vezes em <b>LIGAR_POSTADOR (so uma vez)</b>.
    Depois disso ele liga sozinho sempre que o computador iniciar.</div></div>
    <div class="bar"><button class="btn" data-ig="recheck">${ic('refresh')}Verificar de novo</button></div>`;
  const oc = st.ocupado;
  let msg;
  if (oc === 'login') msg = `<div class="alert info">${ic('instagram')}<div><b>Abrimos o Instagram numa janela.</b> Entre na conta por lá — ela fecha sozinha quando terminar.</div></div>`;
  else if (oc === 'publicar') msg = `<div class="alert info">${ic('refresh')}<div>Publicando um post… não mexa na janela do Instagram.</div></div>`;
  else if (oc === 'sair') msg = `<div class="alert info">${ic('refresh')}<div>Saindo da conta…</div></div>`;
  else if (st.logado === true) msg = `<div class="alert ok">${ic('check')}<div><b>Instagram conectado${st.usuario ? ` como @${esc(st.usuario)}` : ''}.</b>${compacto ? '' : ' Já está tudo pronto para publicar.'}</div></div>`;
  else if (st.logado === false) msg = `<div class="alert warn">${ic('alert')}<div><b>Instagram não conectado.</b> Clique em “Entrar no Instagram”.</div></div>`;
  else msg = `<div class="alert info">${ic('refresh')}<div>Verificando a conta do Instagram…</div></div>`;
  const dis = oc ? 'disabled' : '';
  const btns = st.logado === true
    ? (compacto ? '' : `<button class="btn" data-ig="verificar" ${dis}>${ic('refresh')}Verificar de novo</button><button class="btn" data-ig="trocar" ${dis}>Trocar de conta</button><button class="btn danger" data-ig="sair" ${dis}>Sair da conta</button>`)
    : `<button class="btn pri" data-ig="login" ${dis}>${ic('instagram')}Entrar no Instagram</button>`;
  return msg + (btns ? `<div class="bar" style="margin:0">${btns}</div>` : '');
}
let igTimer = 0;
async function refreshIg() {
  clearTimeout(igTimer);
  const boxes = $$('.ig-box'); if (!boxes.length) return;
  const st = await postadorStatus();
  for (const b of $$('.ig-box')) b.innerHTML = igBoxHTML(st, b.classList.contains('compacto'));
  // continua acompanhando enquanto a tela estiver aberta (mais rápido se algo estiver em andamento)
  igTimer = setTimeout(refreshIg, st?.ocupado ? 2000 : 8000);
}
const mostrarPostador = refreshIg;
async function igPost(caminho, corpo = {}) {
  const r = await fetch(POSTADOR + caminho, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  return r.json();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-ig]'); if (!b) return;
  const a = b.dataset.ig;
  try {
    if (a === 'login' || a === 'trocar') {
      const j = await igPost('/login', { trocar: a === 'trocar' });
      if (j.jaLogado) toast(`Você já está conectado${j.usuario ? ' como @' + j.usuario : ''}.`);
      else toast('Abrimos o Instagram numa janela: entre na conta por lá.');
    }
    if (a === 'sair') {
      if (!confirm('Desconectar a conta do Instagram deste computador?')) return;
      await igPost('/sair');
    }
    if (a === 'verificar') await igPost('/verificar');
  } catch { toast('Não consegui falar com o postador. Ele está ligado?'); }
  refreshIg();
});

function viewInstagram() {
  return `<div class="card"><div class="card-h">${ic('instagram')}<h3>Conta do Instagram</h3></div>
      <div class="ig-box"><div class="alert info">${ic('refresh')}<div>Verificando…</div></div></div></div>
    <div class="card"><div class="card-h">${ic('sparkles')}<h3>Como funciona</h3></div>
      <ol style="margin:0;padding-left:20px;line-height:1.9">
        <li>Um pequeno programa (o <b>postador</b>) fica ligado neste computador e publica por você.</li>
        <li>Clique em <b>Entrar no Instagram</b> uma vez — o login fica salvo.</li>
        <li>Na <a href="#galeria">Galeria</a>, toque em <b>Publicar</b> numa foto e depois em <b>Publicar no Instagram</b>.</li>
      </ol>
      <p class="hint" style="margin:12px 0 0">Poste num ritmo normal (poucos posts por dia): publicação automática não é incentivada pelo Instagram.</p></div>`;
}
function setPub(html, tone = 'info') { const el = $('#pubStatus'); if (el) el.innerHTML = html ? `<div class="alert ${tone}" style="margin:12px 0 0">${html}</div>` : ''; }
// depois de postar "na mão" (compartilhar/baixar), oferece marcar a foto da galeria como publicada
function oferecerMarcar() {
  const f = galeria().find(x => x.id === studio.fotoId);
  if (f && f.status !== 'publicada') setPub(`${ic('instagram')}<div>Já postou? <button type="button" class="btn sm" data-s="marcarPub">Marcar foto como publicada</button></div>`);
}

async function publicarInstagram(cv, btn) {
  const s = studio;
  // no celular o próprio app do Instagram recebe a imagem pela janela de compartilhar
  if (matchMedia('(pointer: coarse)').matches) { await compartilharPost(cv); oferecerMarcar(); return; }
  if (s.formato === 'story') { toast('Stories só podem ser publicados pelo celular. Use “Compartilhar” ou “Baixar”.'); return; }
  const st = await postadorStatus();
  if (!st || st.logado === false) {
    modal({
      title: !st ? 'Postador desligado' : 'Entre no Instagram',
      body: `<div class="ig-box">${igBoxHTML(st)}</div>
        <p class="hint" style="margin-top:14px">Ou publique manualmente: o botão abaixo baixa a imagem, copia a legenda e abre o Instagram.</p>
        <button type="button" class="btn" id="pubManual">${ic('download')}Baixar e abrir o Instagram</button>`,
      onOpen: root => { refreshIg(); $('#pubManual', root).onclick = async () => { await baixarPost(cv); await copiarLegenda(true); window.open('https://www.instagram.com/', '_blank', 'noopener'); dlg.close(); oferecerMarcar(); toast('Imagem baixada e legenda copiada. No Instagram: Criar → escolher a imagem → colar a legenda.'); }; },
    });
    return;
  }
  if (st.ocupado === 'login') { toast('Termine o login na janela do Instagram primeiro.'); return; }
  if (!confirm(`Publicar agora no Instagram${st.usuario ? ' (@' + st.usuario + ')' : ''}?\n\n“${s.titulo}” — modelo ${ESTILOS[s.estilo][0]}, ${FORMATOS[s.formato][2]}.`)) return;
  btn.disabled = true;
  try {
    const r = await fetch(POSTADOR + '/publicar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagem: cv.toDataURL('image/jpeg', 0.92), legenda: s.legenda, formato: s.formato }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || 'o postador recusou o pedido');
    const reg = { id: uid(), data: today(), produtoId: s.prodId, fotoId: s.fotoId, titulo: s.titulo, estilo: s.estilo, status: 'enviado' };
    (db.posts ||= []).push(reg); save();
    setPub(`${ic('refresh')}<div>Enviado ao postador. O navegador vai abrir e publicar sozinho — não mexa nele até terminar.</div>`);
    const fim = Date.now() + 5 * 60e3;
    while (Date.now() < fim) {
      await new Promise(ok => setTimeout(ok, 3000));
      let job; try { job = await (await fetch(`${POSTADOR}/job/${j.job}`)).json(); } catch { continue; }
      if (job.status === 'publicado') {
        reg.status = 'publicado'; if (reg.fotoId) marcarPublicada(reg.fotoId); save();
        setPub(`${ic('check')}<div><b>Publicado no Instagram!</b>${reg.fotoId ? ' A foto foi marcada como publicada na galeria.' : ''}</div>`, 'ok'); toast('Publicado no Instagram!'); return;
      }
      if (job.status === 'conferir') {
        reg.status = 'conferir'; if (reg.fotoId) marcarPublicada(reg.fotoId); save();
        setPub(`${ic('alert')}<div>O postador terminou mas não viu a confirmação. Confira no Instagram se o post apareceu.</div>`, 'warn'); return;
      }
      if (job.status === 'erro') { reg.status = 'erro'; save(); setPub(`${ic('alert')}<div>Não foi possível publicar: ${esc(job.erro || '')}</div>`, 'bad'); return; }
      setPub(`${ic('refresh')}<div>${job.status === 'na fila' ? 'Na fila do postador…' : 'Publicando no Instagram… não mexa no navegador que abriu.'}</div>`);
    }
    setPub(`${ic('alert')}<div>Demorou demais. Confira a janela do postador e o Instagram.</div>`, 'warn');
  } catch (e) {
    setPub(`${ic('alert')}<div>Erro ao falar com o postador: ${esc(e.message)}</div>`, 'bad');
  } finally { btn.disabled = false; }
}
