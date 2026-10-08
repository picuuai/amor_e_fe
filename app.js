'use strict';
/* Controle de Terços — dados ficam no navegador (localStorage). Faça backup em Cadastros > Backup. */

const KEY = 'tercos-db-v1';
const THEME_KEY = 'tercos-theme';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = n => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (n, d = 2) => (+n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const pct = n => ((+n || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
const rnd = n => Math.round(n * 1e6) / 1e6;
// aceita "1,5", "1.5" e "1.000,50"
const pn = s => {
  if (typeof s === 'number') return s;
  s = String(s ?? '').trim().replace(/\s|R\$/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const iv = n => (n === '' || n == null) ? '' : String(rnd(+n)).replace('.', ',');
// valor de um campo de dinheiro (class="money"): sempre com centavos, "1.234,50"
const mv = n => (n === '' || n == null) ? '' : (+n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// custo por unidade: materiais baratos (conta, miçanga) custam frações de centavo
const brlU = n => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Math.abs(+n || 0) < 1 ? 4 : 2 });
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fdate = s => s ? s.split('-').reverse().join('/') : '';
const monthLabel = ym => { const s = new Date(ym + '-15T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);

/* ---------------- ícones (traço, 24×24) ---------------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  bag: '<path d="M5.5 7h13l1 14h-15z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  sparkles: '<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M16 15h2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cross: '<path d="M12 3v18M7 8h10"/>',
  alert: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  truck: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h12l2-8H6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3"/><path d="M4 4v4h4M20 20v-4h-4"/>',
  scale: '<path d="M12 3v18M5 21h14M6 7h12"/><path d="m6 7-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M18.5 4.5 21 7"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  pray: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 21H20v-3"/><path d="M12 6.5v8M9 9.5h6"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/>',
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ilustração de terço usada quando o produto não tem foto */
function art(seed, mono = false) {
  let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const bead = mono ? '#fff' : `hsl(${h} 50% 50%)`, gold = mono ? '#fff' : 'hsl(42 75% 52%)';
  let s = '';
  const n = 20;
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 + k / n * 2 * Math.PI, x = 60 + 28 * Math.cos(a), y = 44 + 28 * Math.sin(a);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${k % 5 === 0 ? 4.4 : 3.3}" fill="${k % 5 === 0 ? gold : bead}"/>`;
  }
  for (let k = 0; k < 3; k++) s += `<circle cx="60" cy="${79 + k * 7}" r="3" fill="${bead}"/>`;
  s += `<rect x="58" y="97" width="4" height="17" rx="1" fill="${gold}"/><rect x="53" y="101" width="14" height="4" rx="1" fill="${gold}"/>`;
  const bg = mono ? '' : `<rect width="120" height="120" fill="hsl(${h} 70% 60% / .16)"/>`;
  return `<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bg}<circle cx="60" cy="44" r="28" fill="none" stroke="${bead}" stroke-opacity=".35"/>${s}</svg>`;
}
const foto = (p, cls = '', extra = '') => `<div class="ph ${cls}">${p?.foto ? `<img src="${esc(p.foto)}" alt="">` : art(p?.id || p?.nome || 'x')}${extra}</div>`;
const empty = (icn, t, s = '') => `<div class="empty">${ic(icn, 'big')}<div class="empty-t">${t}</div>${s ? `<div class="empty-s">${s}</div>` : ''}</div>`;
const initials = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

async function resizeImage(file, max = 520) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(url); }
}

/* ---------------- dados ---------------- */
let db;

function seed() {
  const t = today();
  db = {
    versao: 1,
    params: { nome: 'Terços', margem: 0.5, impostos: 0, perdas: 0.03, maoObraHora: 20 },
    pagamentos: [{ nome: 'Pix', taxa: 0 }, { nome: 'Dinheiro', taxa: 0 }, { nome: 'Cartão débito', taxa: 0 }, { nome: 'Cartão crédito', taxa: 0 }],
    insumos: [
      ['i1', 'INS001', 'Conta acrílica 8 mm', 'un', 120, 'Raquel'],
      ['i11', 'INS011', 'Conta acrílica 10 mm', 'un', 120, 'Raquel'],
      ['i2', 'INS002', 'Fio encerado', 'm', 3, 'Raquel'],
      ['i3', 'INS003', 'Cruz', 'un', 3, 'Mercado Livre'],
      ['i4', 'INS004', 'Medalha', 'un', 3, 'Mercado Livre'],
      ['i5', 'INS005', 'Saquinho', 'un', 3, 'Raquel'],
      ['i6', 'INS006', 'Cartão', 'un', 10, 'Raquel'],
      ['i7', 'INS007', 'Meia pérola pequena', 'un', 60, 'Raquel'],
      ['i9', 'INS009', 'Miçanga letras', 'un', 12, 'Raquel'],
      ['i10', 'INS010', 'Conta emborrachada 8 mm', 'un', 120, 'Raquel'],
    ].map(([id, codigo, nome, unidade, estoqueMin, fornecedor]) => ({ id, codigo, nome, unidade, estoqueMin, fornecedor, custoManual: 0 })),
    compras: [
      ['i1', 420, 4.2, 'Raquel'], ['i2', 20, 4, 'Raquel'], ['i3', 10, 29.9, 'Mercado Livre'], ['i4', 10, 20.9, 'Mercado Livre'],
      ['i3', 3, 8.97, 'Mercado Livre'], ['i4', 3, 8.97, 'Mercado Livre'], ['i5', 4, 3.6, 'Raquel'], ['i6', 100, 50, 'Raquel'],
      ['i11', 280, 4.5, 'Raquel'], ['i7', 500, 8.4, 'Raquel'], ['i3', 2, 5, 'Raquel'], ['i4', 2, 5, 'Raquel'], ['i4', 2, 5, 'Raquel'],
      ['i9', 100, 4.3, 'Raquel'], ['i10', 210, 3.6, 'Raquel'],
    ].map(([insumoId, qtd, valor, fornecedor]) => ({ id: uid(), data: t, insumoId, qtd, valor, frete: 0, fornecedor })),
    produtos: [],
    producoes: [],
    vendas: [],
    clientes: [],
    ajustes: [],
    meta: { criadoEm: t, ultimoBackup: null },
  };
  const base = [['i2', 1.2], ['i3', 1], ['i4', 1], ['i5', 1], ['i6', 1], ['i7', 30]];
  const ficha = arr => arr.map(([insumoId, qtd]) => ({ insumoId, qtd }));
  db.produtos = [
    { id: 'p1', codigo: 'TER001', nome: 'Terço Clássico', tempoMin: 30, preco: 45, estoqueMin: 1, foto: '', ficha: ficha([['i1', 59], ...base]) },
    { id: 'p2', codigo: 'TER002', nome: 'Terço Emborrachado', tempoMin: 30, preco: 40, estoqueMin: 1, foto: '', ficha: ficha([['i10', 59], ...base]) },
    { id: 'p3', codigo: 'TER003', nome: 'Terço Letras', tempoMin: 30, preco: 45, estoqueMin: 1, foto: '', ficha: ficha([['i1', 53], ...base, ['i9', 6]]) },
  ];
  db.producoes.push(novaProducao('p1', 1, t));
  return db;
}

function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) { db = JSON.parse(s); return db; }
  } catch (e) { console.warn(e); }
  seed(); save();
  return db;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    if (typeof Sync !== 'undefined') Sync.alterado(); // envia para a nuvem, se estiver conectado
    return true;
  }
  catch (e) { toast('Não foi possível salvar (memória cheia?). Tente fotos menores.'); return false; }
}

/* ---------------- cálculos ---------------- */
const get = (col, id) => db[col].find(x => x.id === id);
const nomeInsumo = id => get('insumos', id)?.nome ?? '(insumo excluído)';
const nomeProduto = id => get('produtos', id)?.nome ?? '(produto excluído)';
const nomeCliente = id => get('clientes', id)?.nome ?? '';

function custoInsumo(id) {
  let q = 0, v = 0;
  for (const c of db.compras) if (c.insumoId === id) { q += +c.qtd || 0; v += (+c.valor || 0) + (+c.frete || 0); }
  return q > 0 ? v / q : (+get('insumos', id)?.custoManual || 0);
}
function estoqueInsumo(id) {
  let e = 0;
  for (const c of db.compras) if (c.insumoId === id) e += +c.qtd || 0;
  for (const p of db.producoes) for (const x of p.consumo || []) if (x.insumoId === id) e -= x.qtd;
  for (const a of db.ajustes) if (a.tipo === 'insumo' && a.refId === id) e += a.qtd;
  return rnd(e);
}
function estoqueProduto(id) {
  let e = 0;
  for (const p of db.producoes) if (p.produtoId === id) e += +p.qtd || 0;
  for (const v of db.vendas) if (v.status !== 'Cancelada') for (const it of v.itens) if (it.produtoId === id) e -= +it.qtd || 0;
  for (const a of db.ajustes) if (a.tipo === 'produto' && a.refId === id) e += a.qtd;
  return rnd(e);
}
const taxaRef = () => Math.max(0, ...db.pagamentos.map(p => +p.taxa || 0));
function custoProduto(p) {
  const P = db.params;
  const mat = (p.ficha || []).reduce((s, f) => s + (+f.qtd || 0) * custoInsumo(f.insumoId), 0);
  const mo = (+p.tempoMin || 0) / 60 * (+P.maoObraHora || 0);
  const perdas = (mat + mo) * (+P.perdas || 0);
  return { mat, mo, perdas, total: mat + mo + perdas };
}
function precoInfo(p, preco = p.preco) {
  const P = db.params, c = custoProduto(p);
  const div = 1 - (+P.margem || 0) - taxaRef() - (+P.impostos || 0);
  const sugerido = div > 0 ? c.total / div : 0;
  const lucro = preco - c.total - preco * (taxaRef() + (+P.impostos || 0));
  return { ...c, sugerido, lucro, margem: preco > 0 ? lucro / preco : 0 };
}
function podeFazer(p) {
  const f = (p.ficha || []).filter(f => f.qtd > 0);
  if (!f.length) return null;
  return Math.max(0, Math.min(...f.map(f => Math.floor(estoqueInsumo(f.insumoId) / f.qtd))));
}
function calcVenda(v) {
  const bruto = v.itens.reduce((s, i) => s + i.qtd * i.preco, 0);
  const liquido = Math.max(0, bruto - (+v.desconto || 0));
  const custo = v.itens.reduce((s, i) => s + i.qtd * (i.custoUnit || 0), 0);
  const taxas = liquido * ((+v.taxaPct || 0) + (+v.impostoPct || 0));
  const qtd = v.itens.reduce((s, i) => s + (+i.qtd || 0), 0);
  return { bruto, liquido, custo, taxas, lucro: liquido - custo - taxas, qtd };
}
function novaProducao(produtoId, qtd, data) {
  const p = get('produtos', produtoId);
  return {
    id: uid(), data, produtoId, qtd,
    custoUnit: custoProduto(p).total,
    consumo: p.ficha.map(f => ({ insumoId: f.insumoId, qtd: rnd(f.qtd * qtd) })),
  };
}
const vendasAtivas = () => db.vendas.filter(v => v.status !== 'Cancelada');
const nextCode = (col, prefix, pad = 3) => {
  const n = Math.max(0, ...db[col].map(x => parseInt(String(x.codigo || x.numero || '').replace(/\D/g, '')) || 0)) + 1;
  return prefix + String(n).padStart(pad, '0');
};
const backupAtrasado = () => !db.meta.ultimoBackup || daysBetween(db.meta.ultimoBackup, today()) > 7;

/* ---------------- UI base ---------------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3400);
}
const dlg = $('#dlg');
function modal({ title, body, onSave, onDelete, saveLabel = 'Salvar', onOpen }) {
  $('#dlgTitle').textContent = title;
  // corpo novo a cada abertura: os eventos que o formulário anterior ligou (onOpen) não podem agir neste
  $('#dlgBody').replaceWith(Object.assign($('#dlgBody').cloneNode(false), { innerHTML: body }));
  $('#dlgDel').hidden = !onDelete;
  $('#dlgSave').hidden = !onSave;
  $('#dlgSave').textContent = saveLabel;
  $('#dlgCancel').textContent = onSave ? 'Cancelar' : 'Fechar';
  dlg._save = onSave; dlg._del = onDelete;
  dlg.showModal();
  $('#dlgBody').scrollTop = 0;
  onOpen && onOpen($('#dlgBody'));
}
$('#dlgSave').onclick = () => {
  if (dlg._save && dlg._save($('#dlgBody')) !== false) { dlg.close(); save(); render(); }
};
$('#dlgDel').onclick = () => {
  if (!confirm('Excluir este registro?')) return;
  if (dlg._del && dlg._del() !== false) { dlg.close(); save(); render(); }
};
$('#dlgCancel').onclick = $('#dlgX').onclick = () => dlg.close();
const F = (root, name) => root.querySelector(`[name="${name}"]`)?.value ?? '';

// campos de dinheiro: é só digitar os números, a vírgula dos centavos entra sozinha (420 → 4,20).
// Na captura, para o valor já estar formatado quando o formulário recalcula.
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.classList?.contains('money')) return;
  const d = el.value.replace(/\D/g, '').slice(0, 11);
  el.value = d ? mv(parseInt(d, 10) / 100) : '';
}, true);
// ao tocar em um campo numérico, o valor fica selecionado: digitar já substitui
document.addEventListener('focusin', e => {
  if (e.target.matches?.('input[inputmode=decimal],input[inputmode=numeric]')) e.target.select();
});

const opts = (arr, sel, label = x => x.nome, val = x => x.id) =>
  arr.map(x => `<option value="${esc(val(x))}" ${val(x) === sel ? 'selected' : ''}>${esc(label(x))}</option>`).join('');
const produtosOrd = () => [...db.produtos].sort((a, b) => a.nome.localeCompare(b.nome));
const insumosOrd = () => [...db.insumos].sort((a, b) => a.nome.localeCompare(b.nome));

/* ---------------- tema ---------------- */
function getTheme() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } }
function setTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch { }
  applyTheme();
}
function applyTheme() {
  const t = getTheme();
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#themeBtn').innerHTML = dark ? `${ic('sun')}<span>Modo claro</span>` : `${ic('moon')}<span>Modo escuro</span>`;
}
$('#themeBtn').onclick = () => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  setTheme(dark ? 'light' : 'dark');
};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

/* ---------------- rotas ---------------- */
const ROUTES = {
  inicio: ['Início', viewInicio], vendas: ['Vendas', viewVendas], producao: ['Produção', viewProducao],
  estoque: ['Estoque', viewEstoque], mais: ['Cadastros', viewMais],
  galeria: ['Galeria de fotos', () => viewGaleria()],
  divulgar: ['Criar post', () => viewDivulgar(), 'galeria'],
  oracoes: ['Oração do dia', () => viewOracoes()],
  produtos: ['Produtos e preços', viewProdutos, 'mais'], insumos: ['Insumos', viewInsumos, 'mais'],
  compras: ['Compras de insumos', viewCompras, 'mais'], clientes: ['Clientes', viewClientes, 'mais'],
  config: ['Configurações', viewConfig, 'mais'], instagram: ['Instagram', () => viewInstagram(), 'mais'],
  sync: ['Computador e celular', () => Sync.view(), 'mais'], backup: ['Backup e exportação', viewBackup, 'mais'],
};
const state = { mesInicio: today().slice(0, 7), mesVendas: today().slice(0, 7), filtroVendas: 'todas' };

function render() {
  // aparelho não autorizado: só a tela de bloqueio, nada dos dados
  const bloqueado = typeof Sync !== 'undefined' && Sync.bloqueado();
  document.body.classList.toggle('locked', bloqueado);
  if (bloqueado) {
    if (dlg.open) dlg.close();
    document.title = 'Controle de Terços';
    $('#view').innerHTML = Sync.lockView();
    $('#fab').hidden = true;
    return;
  }
  const r = location.hash.slice(1) || 'inicio';
  const [title, fn, parent] = ROUTES[r] || ROUTES.inicio;
  $('#title').textContent = title;
  $('.top').hidden = r === 'inicio';
  $('#brandName').textContent = db.params.nome || 'Terços';
  document.title = `${title} · ${db.params.nome || 'Terços'}`;
  $('#back').hidden = !parent;
  $('#back').onclick = () => location.hash = parent;
  $$('.nav a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === (parent || r)));
  const late = backupAtrasado();
  $('#bkBadge').className = 'sync ' + (late ? 'login' : 'ok');
  $('#bkBadge').innerHTML = late ? `${ic('shield')}<span>Fazer backup</span>` : `${ic('shield')}<span>Backup em dia</span>`;
  $('#topAct').innerHTML = '';
  $('#fab').hidden = ['divulgar', 'oracoes', 'galeria', 'instagram', 'sync'].includes(r); // telas com barra própria embaixo
  $('#view').innerHTML = fn();
  if (r === 'divulgar') initStudio();
  if (r === 'galeria') initGaleria();
  if (r === 'oracoes') initOracoes();
  if (r === 'instagram') refreshIg();
  if (typeof Sync !== 'undefined') Sync.pintar();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
const topActions = html => { $('#topAct').innerHTML = html; };

// clique em qualquer [data-act] fora do diálogo
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('dialog')) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset.id, el); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]');
  if (!el || el.closest('dialog')) return;
  state[el.dataset.chg] = el.value; render();
});

/* ---------------- Início ---------------- */
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const kpi = (icn, tone, l, v, s, cls = '') =>
  `<div class="kpi"><div class="kpi-ic ${tone}">${ic(icn)}</div><div><div class="l">${l}</div><div class="v ${cls}">${v}</div><div class="s">${s}</div></div></div>`;

function viewInicio() {
  const m = state.mesInicio;
  const vs = vendasAtivas().filter(v => v.data.startsWith(m));
  let vendido = 0, recebido = 0, lucro = 0, qtd = 0;
  const porProd = {};
  for (const v of vs) {
    const c = calcVenda(v);
    vendido += c.liquido; lucro += c.lucro; qtd += c.qtd;
    if (v.status === 'Pago') recebido += c.liquido;
    for (const it of v.itens) {
      const share = c.bruto > 0 ? (it.qtd * it.preco) / c.bruto : 0;
      const pp = porProd[it.produtoId] ||= { qtd: 0, fat: 0, lucro: 0 };
      pp.qtd += it.qtd; pp.fat += c.liquido * share;
      pp.lucro += c.liquido * share - it.qtd * (it.custoUnit || 0) - c.taxas * share;
    }
  }
  const pend = vendasAtivas().filter(v => v.status === 'Pendente');
  const aReceber = pend.reduce((s, v) => s + calcVenda(v).liquido, 0);

  const alerts = [];
  if (backupAtrasado())
    alerts.push(['warn', 'shield', `${db.meta.ultimoBackup ? 'Último backup em ' + fdate(db.meta.ultimoBackup) : 'Você ainda não fez backup'}. <a href="#backup">Fazer agora</a>`]);
  const naoPub = (db.galeria || []).filter(f => f.status === 'nova').length;
  if (naoPub) alerts.push(['info', 'instagram', `${naoPub} foto(s) na galeria esperando publicação. <a href="#galeria">Ver galeria</a>`]);
  if (!oracaoPostada(today())) alerts.push(['info', 'pray', `Oração de hoje: <b>${esc(oracaoDoDia(today()).t)}</b> — ainda não postada. <a href="#oracoes">Criar o post</a>`]);
  for (const p of produtosOrd()) {
    const e = estoqueProduto(p.id);
    if (e < 0) alerts.push(['bad', 'sparkles', `<b>${esc(p.nome)}</b>: faltam ${fmt(-e)} para entregar — produzir.`]);
    else if (p.estoqueMin > 0 && e <= p.estoqueMin) alerts.push(['warn', 'box', `<b>${esc(p.nome)}</b>: só ${fmt(e)} pronto(s) (mínimo ${fmt(p.estoqueMin)}).`]);
  }
  for (const i of insumosOrd()) {
    const e = estoqueInsumo(i.id);
    if (e < 0) alerts.push(['bad', 'alert', `<b>${esc(i.nome)}</b>: estoque negativo (${fmt(e)} ${esc(i.unidade)}) — confira as compras.`]);
    else if (i.estoqueMin > 0 && e <= i.estoqueMin) alerts.push(['warn', 'cart', `<b>${esc(i.nome)}</b>: restam ${fmt(e)} ${esc(i.unidade)}. <a href="#compras" data-act="novaCompra" data-id="${i.id}">Registrar compra</a>`]);
  }

  const enc = vendasAtivas().filter(v => v.entrega === 'A entregar').sort((a, b) => (a.dataEntrega || '9').localeCompare(b.dataEntrega || '9'));
  const rows = Object.entries(porProd).sort((a, b) => b[1].fat - a[1].fat);
  const maxQ = Math.max(1, ...rows.map(([, r]) => r.qtd));

  return `
  <section class="hero">
    <div class="hero-txt">
      <div class="hero-hi">${saudacao()}! Aqui está o resumo de <a class="sync sync-badge hero-sync" href="#sync"></a></div>
      <h2>${esc(db.params.nome || 'Terços')}</h2>
      <label class="hero-month">${ic('calendar')}<input type="month" value="${m}" data-chg="mesInicio" aria-label="Mês"></label>
    </div>
    <div class="hero-act">
      <button class="btn light" data-act="novaVenda">${ic('plus')}Nova venda</button>
      <button class="btn glass" data-act="novaProducao">${ic('sparkles')}Produção</button>
      <button class="btn glass" data-act="novaCompra">${ic('cart')}Compra</button>
      <a class="btn glass" href="#galeria">${ic('image')}Galeria</a>
    </div>
    <div class="hero-art">${art('hero', true)}</div>
  </section>
  <div class="kpis">
    ${kpi('bag', 't-pri', 'Vendido no mês', brl(vendido), `${vs.length} venda(s)`)}
    ${kpi('trend', 't-ok', 'Lucro no mês', brl(lucro), `margem ${pct(vendido ? lucro / vendido : 0)}`, lucro < 0 ? 'neg' : '')}
    ${kpi('cross', 't-gold', 'Terços vendidos', fmt(qtd), `recebido ${brl(recebido)}`)}
    ${kpi('receipt', 't-blue', 'Ticket médio', brl(vs.length ? vendido / vs.length : 0), 'por venda')}
    ${kpi('clock', 't-rose', 'A receber', brl(aReceber), `${pend.length} pendente(s)`)}
  </div>
  <div class="cols">
    <div>
      <div class="card"><div class="card-h">${ic('alert')}<h3>Avisos</h3></div>
        ${alerts.length ? alerts.map(([t, i, h]) => `<div class="alert ${t}">${ic(i)}<div>${h}</div></div>`).join('') : `<div class="alert ok">${ic('check')}<div>Tudo em ordem por aqui.</div></div>`}
      </div>
      <div class="card"><div class="card-h">${ic('truck')}<h3>Encomendas a entregar</h3></div>
        ${enc.length ? `<div class="list">${enc.map(v => {
          const late = v.dataEntrega && v.dataEntrega < today();
          return `<button class="li" data-act="editVenda" data-id="${v.id}">${foto(get('produtos', v.itens[0]?.produtoId), 'sm')}<div class="li-main"><div class="li-t">${esc(nomeCliente(v.clienteId) || 'Sem cliente')}</div><div class="li-s">${esc(itensTxt(v))}${v.obs ? ' · ' + esc(v.obs) : ''}</div></div><div class="li-r"><span class="tag ${late ? 'bad' : 'warn'}">${ic('calendar')}${v.dataEntrega ? fdate(v.dataEntrega) : 'sem data'}</span></div></button>`;
        }).join('')}</div>` : empty('truck', 'Nenhuma encomenda pendente')}
      </div>
    </div>
    <div class="card"><div class="card-h">${ic('trend')}<h3>Mais vendidos · ${esc(monthLabel(m))}</h3></div>
      ${rows.length ? rows.map(([id, r]) => `<div class="rank-row">${foto(get('produtos', id), 'md')}<div class="rank-main">
        <div class="rank-t"><b>${esc(nomeProduto(id))}</b><span>${brl(r.fat)}</span></div>
        <div class="meter"><span style="width:${(r.qtd / maxQ * 100).toFixed(0)}%"></span></div>
        <div class="rank-s">${fmt(r.qtd)} vendido(s) · lucro ${brl(r.lucro)}</div></div></div>`).join('')
        + `<div class="total-row"><span>Total</span><span>${brl(vendido)}</span></div>`
      : empty('bag', 'Nenhuma venda neste mês', 'Registre a primeira em “Nova venda”.')}
    </div>
  </div>`;
}
const itensTxt = v => v.itens.map(i => `${fmt(i.qtd)}× ${nomeProduto(i.produtoId)}`).join(', ');

/* ---------------- Vendas ---------------- */
function viewVendas() {
  topActions(`<button class="btn pri" data-act="novaVenda">${ic('plus')}Nova venda</button>`);
  const m = state.mesVendas, f = state.filtroVendas;
  let vs = db.vendas.filter(v => !m || v.data.startsWith(m));
  if (f === 'Pendente') vs = vs.filter(v => v.status === 'Pendente');
  if (f === 'A entregar') vs = vs.filter(v => v.entrega === 'A entregar' && v.status !== 'Cancelada');
  if (f === 'Cancelada') vs = vs.filter(v => v.status === 'Cancelada');
  vs.sort((a, b) => b.data.localeCompare(a.data) || b.numero.localeCompare(a.numero));
  const tot = vs.filter(v => v.status !== 'Cancelada').reduce((s, v) => s + calcVenda(v).liquido, 0);
  const lab = { todas: 'Todas', Pendente: 'Pagamento pendente', 'A entregar': 'A entregar', Cancelada: 'Canceladas' };
  return `
  <div class="bar">
    <label>Mês<input type="month" value="${m}" data-chg="mesVendas"></label>
    <label>Mostrar<select data-chg="filtroVendas">${Object.keys(lab).map(x => `<option ${x === f ? 'selected' : ''} value="${x}">${lab[x]}</option>`).join('')}</select></label>
    <span class="grow"></span><span class="tag">${vs.length} venda(s) · ${brl(tot)}</span>
  </div>
  <div class="list">${vs.length ? vs.map(v => {
    const c = calcVenda(v);
    const st = v.status === 'Pago' ? 'ok' : v.status === 'Pendente' ? 'warn' : 'bad';
    return `<button class="li" data-act="editVenda" data-id="${v.id}">
      ${foto(get('produtos', v.itens[0]?.produtoId), 'sm')}
      <div class="li-main"><div class="li-t">${esc(nomeCliente(v.clienteId) || 'Sem cliente')} <span class="muted" style="font-weight:500">· ${esc(v.numero)}</span></div>
      <div class="li-s">${fdate(v.data)} · ${esc(itensTxt(v))} · ${esc(v.pagamento || '')}</div></div>
      <div class="li-r"><div class="li-v">${brl(c.liquido)}</div><div><span class="tag ${st}">${esc(v.status)}</span>${v.entrega === 'A entregar' && v.status !== 'Cancelada' ? ' <span class="tag">A entregar</span>' : ''}</div></div>
    </button>`;
  }).join('') : empty('bag', 'Nenhuma venda encontrada', 'Mude o mês ou o filtro, ou registre uma nova venda.')}</div>`;
}

function itemRow(it = {}) {
  return `<div class="row item">
    <select name="produtoId" aria-label="Produto"><option value="">Produto…</option>${opts(produtosOrd(), it.produtoId)}</select>
    <input name="qtd" inputmode="decimal" placeholder="Qtd" aria-label="Quantidade" value="${iv(it.qtd ?? 1)}">
    <input name="preco" class="money" inputmode="numeric" placeholder="Preço" aria-label="Preço" value="${mv(it.preco ?? '')}">
    <button type="button" class="rm" data-f="rm" aria-label="Remover">${ic('trash')}</button></div>`;
}
function formVenda(v) {
  const novo = !v;
  v = v || { data: today(), itens: [], desconto: 0, pagamento: db.pagamentos[0]?.nome, status: 'Pago', entrega: 'Entregue' };
  const pagOpts = db.pagamentos.map(p => p.nome);
  if (v.pagamento && !pagOpts.includes(v.pagamento)) pagOpts.push(v.pagamento);
  modal({
    title: novo ? 'Nova venda' : `Venda ${v.numero}`,
    body: `
      <div class="g2">
        <label>Data<input type="date" name="data" value="${v.data}"></label>
        <label>Cliente<input name="cliente" list="dlCli" value="${esc(nomeCliente(v.clienteId))}" placeholder="Nome (novo ou existente)"></label>
      </div>
      <datalist id="dlCli">${db.clientes.map(c => `<option value="${esc(c.nome)}">`).join('')}</datalist>
      <div class="sec" style="margin-top:4px">Toque para adicionar</div>
      <div class="picks">${produtosOrd().map(p => `<button type="button" class="pick" data-f="pick" data-id="${p.id}">${foto(p)}<span class="pick-n">${esc(p.nome)}</span><span class="pick-p">${brl(p.preco)}</span><span class="pick-e">${fmt(estoqueProduto(p.id))} em estoque</span></button>`).join('')}</div>
      <div class="sec">Itens da venda</div>
      <div class="rows" id="itens">${v.itens.map(itemRow).join('')}</div>
      <div class="g3" style="margin-top:14px">
        <label>Desconto (R$)<input name="desconto" class="money" inputmode="numeric" value="${mv(v.desconto)}"></label>
        <label>Forma de pagamento<select name="pagamento">${pagOpts.map(p => `<option ${p === v.pagamento ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <label>Pagamento<select name="status">${['Pago', 'Pendente', 'Cancelada'].map(s => `<option ${s === v.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label>Entrega<select name="entrega">${['Entregue', 'A entregar'].map(s => `<option ${s === v.entrega ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label>Data de entrega<input type="date" name="dataEntrega" value="${v.dataEntrega || ''}"></label>
      </div>
      <label>Personalização / observação<textarea name="obs" placeholder="Ex.: nome no terço, cor, recado…">${esc(v.obs)}</textarea></label>
      <div class="sum" id="resumo"></div>`,
    onOpen: root => {
      const readItens = () => $$('.item', root).map(r => ({ produtoId: F(r, 'produtoId'), qtd: pn(F(r, 'qtd')), preco: pn(F(r, 'preco')) })).filter(i => i.produtoId && i.qtd > 0);
      const upd = () => {
        const itens = readItens().map(i => ({ ...i, custoUnit: custoProduto(get('produtos', i.produtoId)).total }));
        const taxa = db.pagamentos.find(p => p.nome === F(root, 'pagamento'))?.taxa || 0;
        const c = calcVenda({ itens, desconto: pn(F(root, 'desconto')), taxaPct: taxa, impostoPct: db.params.impostos });
        $('#resumo', root).innerHTML = `<div><span>Total bruto</span><span>${brl(c.bruto)}</span></div>
          <div><span>Total com desconto</span><b>${brl(c.liquido)}</b></div>
          <div class="muted"><span>Custo dos terços</span><span>− ${brl(c.custo)}</span></div>
          <div class="muted"><span>Taxas e impostos</span><span>− ${brl(c.taxas)}</span></div>
          <div class="b"><span>Lucro</span><span class="${c.lucro < 0 ? 'neg' : 'pos'}">${brl(c.lucro)}</span></div>`;
      };
      root.addEventListener('input', upd);
      root.addEventListener('change', e => {
        if (e.target.name === 'produtoId') {
          const p = get('produtos', e.target.value);
          if (p) e.target.closest('.item').querySelector('[name=preco]').value = mv(p.preco);
        }
        upd();
      });
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-f]'); if (!t) return;
        if (t.dataset.f === 'rm') { t.closest('.row').remove(); upd(); }
        if (t.dataset.f === 'pick') {
          const p = get('produtos', t.dataset.id);
          const ex = $$('.item', root).find(r => F(r, 'produtoId') === p.id);
          if (ex) { const q = ex.querySelector('[name=qtd]'); q.value = iv(pn(q.value) + 1); }
          else $('#itens', root).insertAdjacentHTML('beforeend', itemRow({ produtoId: p.id, qtd: 1, preco: p.preco }));
          upd();
        }
      });
      upd();
      root._readItens = readItens;
    },
    onSave: root => {
      const itensIn = root._readItens();
      if (!itensIn.length) { toast('Adicione pelo menos um terço à venda.'); return false; }
      const nomeCli = F(root, 'cliente').trim();
      let clienteId = '';
      if (nomeCli) {
        let c = db.clientes.find(c => c.nome.toLowerCase() === nomeCli.toLowerCase());
        if (!c) { c = { id: uid(), nome: nomeCli, telefone: '', obs: '' }; db.clientes.push(c); }
        clienteId = c.id;
      }
      // custo fica "congelado" no momento da venda; mantém o custo original de itens já existentes
      const antigos = novo ? [] : [...v.itens];
      const itens = itensIn.map(i => {
        const k = antigos.findIndex(a => a.produtoId === i.produtoId);
        const custoUnit = k >= 0 ? antigos.splice(k, 1)[0].custoUnit : custoProduto(get('produtos', i.produtoId)).total;
        return { ...i, custoUnit };
      });
      const pagamento = F(root, 'pagamento');
      const taxaPct = (!novo && pagamento === v.pagamento) ? v.taxaPct : (db.pagamentos.find(p => p.nome === pagamento)?.taxa || 0);
      const dados = {
        data: F(root, 'data') || today(), clienteId, itens, desconto: pn(F(root, 'desconto')), pagamento, taxaPct,
        impostoPct: novo ? (+db.params.impostos || 0) : v.impostoPct,
        status: F(root, 'status'), entrega: F(root, 'entrega'), dataEntrega: F(root, 'dataEntrega'), obs: F(root, 'obs').trim(),
      };
      if (novo) {
        const nv = { id: uid(), numero: nextCode('vendas', 'V', 4), ...dados };
        db.vendas.push(nv);
        const falta = itens.filter(i => estoqueProduto(i.produtoId) < 0);
        toast(`Venda ${nv.numero} salva.` + (falta.length ? ' Estoque ficou negativo — registre a produção.' : ''));
      } else { Object.assign(v, dados); toast('Venda atualizada.'); }
    },
    onDelete: novo ? null : () => { db.vendas = db.vendas.filter(x => x !== v); },
  });
}

/* ---------------- Produção ---------------- */
function viewProducao() {
  topActions(`<button class="btn pri" data-act="novaProducao">${ic('plus')}Registrar produção</button>`);
  const ps = [...db.producoes].sort((a, b) => b.data.localeCompare(a.data));
  return `
  <div class="alert info">${ic('sparkles')}<div>Ao registrar terços feitos, os materiais da ficha técnica saem do estoque de insumos e os terços entram no estoque de prontos.</div></div>
  <div class="list">${ps.length ? ps.map(p => `<button class="li" data-act="editProducao" data-id="${p.id}">
    ${foto(get('produtos', p.produtoId), 'sm')}
    <div class="li-main"><div class="li-t">${fmt(p.qtd)}× ${esc(nomeProduto(p.produtoId))}</div><div class="li-s">${fdate(p.data)} · custo ${brl(p.custoUnit)} cada</div></div>
    <div class="li-r"><div class="li-v">${brl(p.custoUnit * p.qtd)}</div></div></button>`).join('') : empty('sparkles', 'Nenhuma produção registrada')}</div>`;
}
function formProducao(pr) {
  const novo = !pr;
  modal({
    title: novo ? 'Registrar produção' : 'Produção',
    body: novo ? `
      <div class="g3">
        <label>Data<input type="date" name="data" value="${today()}"></label>
        <label>Produto<select name="produtoId">${opts(produtosOrd(), produtosOrd()[0]?.id)}</select></label>
        <label>Quantidade<input name="qtd" inputmode="decimal" value="1"></label>
      </div>
      <div id="prev"></div>` : `
      <div class="cell" style="margin-bottom:12px">${foto(get('produtos', pr.produtoId), 'md')}<div><b>${fmt(pr.qtd)}× ${esc(nomeProduto(pr.produtoId))}</b><div class="muted">${fdate(pr.data)} · custo ${brl(pr.custoUnit)} cada</div></div></div>
      <div class="tw"><table><thead><tr><th>Material usado</th><th class="n">Qtd</th></tr></thead><tbody>
      ${pr.consumo.map(c => `<tr><td>${esc(nomeInsumo(c.insumoId))}</td><td class="n">${fmt(c.qtd, 3)} ${esc(get('insumos', c.insumoId)?.unidade || '')}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint" style="margin-top:12px">Para corrigir, exclua e registre de novo. Excluir devolve os materiais ao estoque.</p>
      <button type="button" class="btn sm" data-f="divulgar">${ic('instagram')}Criar post deste terço</button>`,
    onOpen: root => {
      if (!novo) {
        root.addEventListener('click', e => { if (e.target.closest('[data-f=divulgar]')) { dlg.close(); ACTIONS.divulgar(pr.produtoId); } });
        return;
      }
      const upd = () => {
        const p = get('produtos', F(root, 'produtoId')); const q = pn(F(root, 'qtd'));
        if (!p) return;
        let falta = false;
        const linhas = p.ficha.map(f => {
          const precisa = f.qtd * q, tem = estoqueInsumo(f.insumoId), ok = tem >= precisa;
          if (!ok) falta = true;
          return `<tr><td>${esc(nomeInsumo(f.insumoId))}</td><td class="n">${fmt(precisa, 3)}</td><td class="n ${ok ? '' : 'neg'}">${fmt(tem, 3)}</td></tr>`;
        }).join('');
        $('#prev', root).innerHTML = `<div class="cell" style="margin-bottom:10px">${foto(p, 'md')}<div><b>${esc(p.nome)}</b><div class="muted">dá para fazer ${fmt(podeFazer(p) ?? 0)} com o estoque atual</div></div></div>
          <div class="tw"><table><thead><tr><th>Material</th><th class="n">Precisa</th><th class="n">Em estoque</th></tr></thead><tbody>${linhas}</tbody></table></div>
          ${falta ? `<div class="alert warn" style="margin-top:10px">${ic('alert')}<div>Algum material não tem estoque suficiente. Registre a compra antes, ou salve assim mesmo e o estoque ficará negativo.</div></div>` : ''}
          <div class="sum"><div class="b"><span>Custo desta produção</span><span>${brl(custoProduto(p).total * q)}</span></div></div>`;
      };
      root.addEventListener('input', upd); root.addEventListener('change', upd); upd();
    },
    saveLabel: 'Registrar',
    onSave: novo ? root => {
      const q = pn(F(root, 'qtd')), pid = F(root, 'produtoId');
      if (!pid || q <= 0) { toast('Escolha o produto e a quantidade.'); return false; }
      db.producoes.push(novaProducao(pid, q, F(root, 'data') || today()));
      toast('Produção registrada.');
    } : null,
    onDelete: novo ? null : () => { db.producoes = db.producoes.filter(x => x !== pr); },
  });
}

/* ---------------- Estoque ---------------- */
function viewEstoque() {
  const prods = produtosOrd(), ins = insumosOrd();
  const valProd = prods.reduce((s, p) => s + Math.max(0, estoqueProduto(p.id)) * custoProduto(p).total, 0);
  const valIns = ins.reduce((s, i) => s + Math.max(0, estoqueInsumo(i.id)) * custoInsumo(i.id), 0);
  const nBaixo = ins.filter(i => { const e = estoqueInsumo(i.id); return e < 0 || (i.estoqueMin > 0 && e <= i.estoqueMin); }).length;
  const tag = (e, min) => e < 0 ? '<span class="tag bad">negativo</span>' : (min > 0 && e <= min) ? '<span class="tag warn">baixo</span>' : '<span class="tag ok">ok</span>';
  return `
  <div class="kpis">
    ${kpi('cross', 't-pri', 'Terços prontos', fmt(prods.reduce((s, p) => s + Math.max(0, estoqueProduto(p.id)), 0)), `${brl(valProd)} a custo`)}
    ${kpi('layers', 't-gold', 'Insumos em estoque', brl(valIns), `${ins.length} materiais`)}
    ${kpi('cart', nBaixo ? 't-warn' : 't-ok', 'Para comprar', fmt(nBaixo), nBaixo ? 'materiais no mínimo' : 'nada em falta')}
  </div>
  <div class="sec">Terços prontos</div>
  <div class="pgrid">${prods.map(p => {
    const e = estoqueProduto(p.id), pf = podeFazer(p);
    return `<div class="pcard" style="cursor:default">${foto(p, '', `<span class="badge">${tag(e, p.estoqueMin)}</span>`)}
      <div class="pbody"><div class="pname">${esc(p.nome)}</div>
      <div class="pline" style="align-items:flex-end"><span><span class="stock-big">${fmt(e)}</span> pronto(s)</span><span>mín. ${fmt(p.estoqueMin)}</span></div>
      <div class="pline"><span>Dá para fazer</span><b>${pf == null ? '—' : fmt(pf)}</b></div>
      <div class="bar" style="margin:8px 0 0;gap:6px"><button class="btn sm" data-act="ajuste" data-id="produto:${p.id}">${ic('sliders')}Ajustar</button><button class="btn sm" data-act="divulgar" data-id="${p.id}">${ic('instagram')}Divulgar</button></div></div></div>`;
  }).join('')}</div>
  <div class="card"><div class="card-h">${ic('layers')}<h3>Insumos</h3><a class="btn sm" href="#compras">${ic('cart')}Compras</a></div><div class="tw"><table>
    <thead><tr><th>Material</th><th class="n">Em estoque</th><th class="n hide-sm">Mínimo</th><th class="n hide-sm">Custo un.</th><th class="n hide-sm">Valor</th><th></th><th></th></tr></thead><tbody>
    ${ins.map(i => { const e = estoqueInsumo(i.id), c = custoInsumo(i.id); return `<tr><td><b>${esc(i.nome)}</b></td><td class="n">${fmt(e, 3)} ${esc(i.unidade)}</td><td class="n hide-sm">${fmt(i.estoqueMin)}</td><td class="n hide-sm">${brlU(c)}</td><td class="n hide-sm">${brl(Math.max(0, e) * c)}</td><td>${tag(e, i.estoqueMin)}</td><td class="n"><button class="btn sm" data-act="ajuste" data-id="insumo:${i.id}">Ajustar</button></td></tr>`; }).join('')}
    </tbody></table></div></div>
  ${db.ajustes.length ? `<div class="card"><div class="card-h">${ic('sliders')}<h3>Ajustes de contagem</h3></div><div class="tw"><table><thead><tr><th>Data</th><th>Item</th><th class="n">Diferença</th><th>Motivo</th></tr></thead><tbody>
    ${[...db.ajustes].reverse().slice(0, 30).map(a => `<tr><td>${fdate(a.data)}</td><td>${esc(a.tipo === 'insumo' ? nomeInsumo(a.refId) : nomeProduto(a.refId))}</td><td class="n ${a.qtd < 0 ? 'neg' : 'pos'}">${a.qtd > 0 ? '+' : ''}${fmt(a.qtd, 3)}</td><td>${esc(a.motivo)}</td></tr>`).join('')}
  </tbody></table></div></div>` : ''}`;
}
function formAjuste(ref) {
  const [tipo, id] = ref.split(':');
  const item = get(tipo === 'insumo' ? 'insumos' : 'produtos', id);
  const atual = tipo === 'insumo' ? estoqueInsumo(id) : estoqueProduto(id);
  modal({
    title: `Ajustar estoque`,
    body: `<div class="cell" style="margin-bottom:12px">${tipo === 'produto' ? foto(item, 'md') : `<div class="av t-gold">${ic('layers')}</div>`}<div><b>${esc(item.nome)}</b><div class="muted">Informe quanto existe de verdade agora. A diferença fica registrada.</div></div></div>
      <div class="g2"><label>O app mostra<input value="${fmt(atual, 3)}" disabled></label>
      <label>Contagem real${tipo === 'insumo' ? ' (' + esc(item.unidade) + ')' : ''}<input name="qtd" inputmode="decimal" value="${iv(atual)}"></label></div>
      <label>Motivo<input name="motivo" placeholder="Ex.: contagem, perda, brinde, quebrou…" value="Contagem"></label>`,
    onSave: root => {
      const diff = rnd(pn(F(root, 'qtd')) - atual);
      if (!diff) return;
      db.ajustes.push({ id: uid(), data: today(), tipo, refId: id, qtd: diff, motivo: F(root, 'motivo').trim() });
      toast('Estoque ajustado.');
    },
  });
}

/* ---------------- Cadastros ---------------- */
function viewMais() {
  const t = (r, icn, tone, title, s) => `<a class="tile" href="#${r}"><div class="kpi-ic ${tone}">${ic(icn)}</div><div class="grow"><b>${title}</b><span>${s}</span></div>${ic('chevron')}</a>`;
  return `<div class="tiles">
    ${t('produtos', 'tag', 't-pri', 'Produtos e preços', `${db.produtos.length} modelos · fotos, ficha técnica e preço`)}
    ${t('insumos', 'layers', 't-gold', 'Insumos', `${db.insumos.length} materiais cadastrados`)}
    ${t('compras', 'cart', 't-blue', 'Compras de insumos', `${db.compras.length} compras registradas`)}
    ${t('clientes', 'users', 't-rose', 'Clientes', `${db.clientes.length} clientes`)}
    ${t('sync', 'refresh', 't-blue', 'Computador e celular', typeof Sync !== 'undefined' && Sync.ativo() ? 'Sincronização ligada' : 'Usar nos dois ao mesmo tempo')}
    ${t('instagram', 'instagram', 't-rose', 'Instagram', 'Conta conectada, entrar e sair')}
    ${t('config', 'sliders', 't-ok', 'Configurações', 'Margem, mão de obra, taxas, tema')}
    ${t('backup', 'shield', backupAtrasado() ? 't-warn' : 't-ok', 'Backup e exportação', db.meta.ultimoBackup ? 'Último em ' + fdate(db.meta.ultimoBackup) : 'Nenhum backup ainda')}
  </div>`;
}

function viewProdutos() {
  topActions(`<button class="btn pri" data-act="novoProduto">${ic('plus')}Novo produto</button>`);
  const ps = produtosOrd();
  return `<div class="pgrid">${ps.map(p => {
    const i = precoInfo(p), e = estoqueProduto(p.id), baixa = i.margem < db.params.margem;
    return `<button class="pcard" data-act="editProduto" data-id="${p.id}">${foto(p, '', `<span class="badge"><span class="tag ${baixa ? 'warn' : 'ok'}">margem ${pct(i.margem)}</span></span>`)}
      <div class="pbody"><div class="pcode">${esc(p.codigo)}</div><div class="pname">${esc(p.nome)}</div><div class="pprice">${brl(p.preco)}</div>
      <div class="pline"><span>Custo</span><b>${brl(i.total)}</b></div>
      <div class="pline"><span>Lucro por terço</span><b class="${i.lucro < 0 ? 'neg' : ''}">${brl(i.lucro)}</b></div>
      <div class="pline"><span>Preço sugerido</span><b>${brl(i.sugerido)}</b></div>
      <div class="pline"><span>Em estoque</span><b>${fmt(e)}</b></div></div></button>`;
  }).join('')}</div>
  ${ps.length ? '' : empty('tag', 'Nenhum produto', 'Cadastre seu primeiro modelo de terço.')}
  <div class="alert info">${ic('scale')}<div>Custo = materiais + mão de obra (${brl(db.params.maoObraHora)}/h) + perdas (${pct(db.params.perdas)}). O preço sugerido garante margem de ${pct(db.params.margem)} já descontando taxa de ${pct(taxaRef())} e impostos de ${pct(db.params.impostos)}.</div></div>`;
}
function fichaRow(f = {}) {
  return `<div class="row">
    <select name="insumoId" aria-label="Material"><option value="">Material…</option>${opts(insumosOrd(), f.insumoId)}</select>
    <input name="qtd" inputmode="decimal" placeholder="Qtd" aria-label="Quantidade" value="${iv(f.qtd ?? '')}">
    <span class="unit"></span>
    <button type="button" class="rm" data-f="rm" aria-label="Remover">${ic('trash')}</button></div>`;
}
function formProduto(p) {
  const novo = !p;
  p = p || { id: uid(), codigo: nextCode('produtos', 'TER'), nome: '', tempoMin: 30, preco: 0, estoqueMin: 1, foto: '', ficha: [{}] };
  modal({
    title: novo ? 'Novo produto' : p.nome,
    body: `
      <div class="foto-edit">
        <div>
          <div id="fotoPrev">${foto(p)}</div>
          <div class="foto-btns">
            <label class="btn sm" style="margin:0">${ic('camera')}Foto<input type="file" name="fotoFile" accept="image/*" hidden></label>
            <button type="button" class="btn sm ghost" data-f="semFoto">Tirar</button>
            ${novo ? '' : `<button type="button" class="btn sm" data-f="divulgar">${ic('instagram')}Criar post</button>`}
          </div>
        </div>
        <div class="g2">
          <label>Código<input name="codigo" value="${esc(p.codigo)}"></label>
          <label>Nome<input name="nome" value="${esc(p.nome)}"></label>
          <label>Tempo (min)<input name="tempoMin" inputmode="decimal" value="${iv(p.tempoMin)}"></label>
          <label>Preço de venda<input name="preco" class="money" inputmode="numeric" value="${mv(p.preco)}"></label>
          <label>Estoque mínimo<input name="estoqueMin" inputmode="decimal" value="${iv(p.estoqueMin)}"></label>
        </div>
      </div>
      <div class="sec">Ficha técnica · materiais de 1 terço</div>
      <div class="rows ficha" id="ficha">${p.ficha.map(fichaRow).join('')}</div>
      <button type="button" class="btn sm" data-f="add">${ic('plus')}Material</button>
      <div class="sum" id="resumo"></div>`,
    onOpen: root => {
      root._foto = p.foto || '';
      const read = () => $$('#ficha .row', root).map(r => ({ insumoId: F(r, 'insumoId'), qtd: pn(F(r, 'qtd')) })).filter(f => f.insumoId && f.qtd > 0);
      const upd = () => {
        $$('#ficha .row', root).forEach(r => {
          const id = F(r, 'insumoId');
          r.querySelector('.unit').textContent = get('insumos', id) ? brl(pn(F(r, 'qtd')) * custoInsumo(id)) : '';
        });
        const preco = pn(F(root, 'preco')), i = precoInfo({ ficha: read(), tempoMin: pn(F(root, 'tempoMin')) }, preco);
        $('#resumo', root).innerHTML = `
          <div><span>Materiais</span><span>${brl(i.mat)}</span></div>
          <div><span>Mão de obra</span><span>${brl(i.mo)}</span></div>
          <div><span>Perdas</span><span>${brl(i.perdas)}</span></div>
          <div class="b"><span>Custo total</span><span>${brl(i.total)}</span></div>
          <div><span>Preço sugerido</span><span>${brl(i.sugerido)} <button type="button" class="btn sm" data-f="usar">usar ${brl(Math.ceil(i.sugerido))}</button></span></div>
          <div class="b"><span>Lucro por terço · margem</span><span class="${i.margem < db.params.margem ? 'neg' : 'pos'}">${brl(i.lucro)} · ${pct(i.margem)}</span></div>`;
        root._sug = Math.ceil(i.sugerido);
      };
      root.addEventListener('input', upd);
      root.addEventListener('change', async e => {
        if (e.target.name === 'fotoFile') {
          const f = e.target.files[0]; if (!f) return;
          try { root._foto = await resizeImage(f); $('#fotoPrev', root).innerHTML = foto({ foto: root._foto }); }
          catch { toast('Não foi possível ler essa imagem.'); }
          return;
        }
        upd();
      });
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-f]'); if (!t) return;
        const f = t.dataset.f;
        if (f === 'add') { $('#ficha', root).insertAdjacentHTML('beforeend', fichaRow()); upd(); }
        if (f === 'rm') { t.closest('.row').remove(); upd(); }
        if (f === 'usar') { root.querySelector('[name=preco]').value = mv(root._sug); upd(); }
        if (f === 'semFoto') { root._foto = ''; $('#fotoPrev', root).innerHTML = foto({ id: p.id }); }
        if (f === 'divulgar') { dlg.close(); ACTIONS.divulgar(p.id); }
      });
      upd(); root._read = read;
    },
    onSave: root => {
      const nome = F(root, 'nome').trim();
      if (!nome) { toast('Informe o nome.'); return false; }
      const codigo = F(root, 'codigo').trim();
      if (db.produtos.some(x => x !== p && x.codigo === codigo)) { toast('Já existe um produto com esse código.'); return false; }
      const dados = { codigo, nome, tempoMin: pn(F(root, 'tempoMin')), preco: pn(F(root, 'preco')), estoqueMin: pn(F(root, 'estoqueMin')), ficha: root._read(), foto: root._foto };
      const antes = novo ? null : { ...p };
      if (novo) db.produtos.push({ ...p, ...dados }); else Object.assign(p, dados);
      if (!save()) { if (novo) db.produtos.pop(); else Object.assign(p, antes); return false; }
    },
    onDelete: novo ? null : () => {
      if (db.vendas.some(v => v.itens.some(i => i.produtoId === p.id)) || db.producoes.some(x => x.produtoId === p.id)) {
        toast('Este produto tem vendas ou produções — não dá para excluir.'); return false;
      }
      db.produtos = db.produtos.filter(x => x !== p);
    },
  });
}

function viewInsumos() {
  topActions(`<button class="btn" data-act="novaCompra">${ic('cart')}Compra</button><button class="btn pri" data-act="novoInsumo">${ic('plus')}Insumo</button>`);
  return `<div class="list">${insumosOrd().map(i => {
    const n = db.compras.filter(c => c.insumoId === i.id).length, e = estoqueInsumo(i.id);
    const low = e < 0 || (i.estoqueMin > 0 && e <= i.estoqueMin);
    return `<button class="li" data-act="editInsumo" data-id="${i.id}"><div class="av ${low ? 't-warn' : 't-gold'}">${ic('layers')}</div><div class="li-main"><div class="li-t">${esc(i.nome)}</div>
      <div class="li-s">${fatorDe(i) > 1 ? `${esc(embDe(i))} com ${fmt(fatorDe(i), 3)} ${esc(i.unidade)} · ` : ''}${esc(i.fornecedor || 'sem fornecedor')} · ${n} compra(s)</div></div>
      <div class="li-r"><div class="li-v">${brlU(custoInsumo(i.id))}<span class="muted" style="font-weight:500">/${esc(i.unidade)}</span></div><span class="tag ${low ? 'warn' : ''}">${fmt(e, 3)} ${esc(i.unidade)} em estoque</span></div></button>`;
  }).join('') || empty('layers', 'Nenhum insumo')}</div>
  <p class="hint">O custo é a média de todas as compras daquele material (inclui frete).</p>`;
}
// como o material é comprado: nome da embalagem e quanto vem em cada uma (fator de conversão para a unidade de uso)
const embDe = i => i?.embalagem || 'pacote';
const fatorDe = i => +i?.fator > 0 ? +i.fator : 1;
function formInsumo(i) {
  const novo = !i;
  i = i || { codigo: nextCode('insumos', 'INS'), nome: '', unidade: 'un', estoqueMin: 0, fornecedor: '', custoManual: 0, embalagem: 'pacote', fator: 1 };
  const compras = novo ? [] : db.compras.filter(c => c.insumoId === i.id).sort((a, b) => b.data.localeCompare(a.data));
  modal({
    title: novo ? 'Novo insumo' : i.nome,
    body: `
      <div class="g3">
        <label>Código<input name="codigo" value="${esc(i.codigo)}"></label>
        <label style="grid-column:span 2">Descrição<input name="nome" value="${esc(i.nome)}"></label>
        <label>Unidade de uso<input name="unidade" list="dlUn" value="${esc(i.unidade)}"></label>
        <label>Estoque mínimo<input name="estoqueMin" inputmode="decimal" value="${iv(i.estoqueMin)}"></label>
        <label>Fornecedor<input name="fornecedor" value="${esc(i.fornecedor)}"></label>
      </div>
      <datalist id="dlUn"><option value="un"><option value="m"><option value="cm"><option value="g"></datalist>
      <div class="sec">Como você compra</div>
      <div class="g2">
        <label>Embalagem<input name="embalagem" list="dlEmb" value="${esc(embDe(i))}"></label>
        <label>Cada embalagem vem com <span id="unEmb"></span><input name="fator" inputmode="decimal" value="${iv(fatorDe(i))}"></label>
      </div>
      <datalist id="dlEmb"><option value="pacote"><option value="caixa"><option value="rolo"><option value="cartela"><option value="fio"><option value="unidade"></datalist>
      <p class="hint">Ex.: pacote com 420 contas → embalagem “pacote”, vem com 420. Na compra você informa só quantos pacotes e o preço de cada um.</p>
      ${novo ? '' : `<button type="button" class="btn sm" data-f="comprar">${ic('cart')}Registrar compra deste material</button>`}
      ${compras.length ? `<div class="sec">Compras</div><div class="tw"><table><thead><tr><th>Data</th><th class="n">Qtd</th><th class="n">Valor</th><th class="n">Custo un.</th><th class="hide-sm">Fornecedor</th></tr></thead><tbody>
        ${compras.map(c => `<tr><td>${fdate(c.data)}</td><td class="n">${fmt(c.qtd, 3)}</td><td class="n">${brl(+c.valor + +c.frete)}</td><td class="n">${brlU((+c.valor + +c.frete) / c.qtd)}</td><td class="hide-sm">${esc(c.fornecedor)}</td></tr>`).join('')}
        </tbody></table></div><div class="sum"><div class="b"><span>Custo médio</span><span>${brlU(custoInsumo(i.id))} / ${esc(i.unidade)}</span></div></div>`
        : `<label>Custo por unidade (enquanto não houver compra registrada)<input name="custoManual" inputmode="decimal" placeholder="Ex.: 0,015" value="${iv(i.custoManual)}"></label>`}`,
    onOpen: root => {
      const upd = () => { $('#unEmb', root).textContent = `(${F(root, 'unidade').trim() || 'un'})`; };
      root.addEventListener('input', upd); upd();
      root.addEventListener('click', e => { if (e.target.closest('[data-f=comprar]')) { dlg.close(); formCompra(null, i.id); } });
    },
    onSave: root => {
      const nome = F(root, 'nome').trim();
      if (!nome) { toast('Informe a descrição.'); return false; }
      const codigo = F(root, 'codigo').trim();
      if (db.insumos.some(x => x !== i && x.codigo === codigo)) { toast('Já existe um insumo com esse código.'); return false; }
      const dados = { codigo, nome, unidade: F(root, 'unidade').trim() || 'un', estoqueMin: pn(F(root, 'estoqueMin')), fornecedor: F(root, 'fornecedor').trim(),
        embalagem: F(root, 'embalagem').trim() || 'pacote', fator: pn(F(root, 'fator')) > 0 ? pn(F(root, 'fator')) : 1 };
      if (root.querySelector('[name=custoManual]')) dados.custoManual = pn(F(root, 'custoManual'));
      if (novo) db.insumos.push({ id: uid(), custoManual: 0, ...dados }); else Object.assign(i, dados);
    },
    onDelete: novo ? null : () => {
      if (db.produtos.some(p => p.ficha.some(f => f.insumoId === i.id)) || db.compras.some(c => c.insumoId === i.id)) {
        toast('Este insumo está em uma ficha técnica ou tem compras — não dá para excluir.'); return false;
      }
      db.insumos = db.insumos.filter(x => x !== i);
    },
  });
}

function viewCompras() {
  topActions(`<button class="btn pri" data-act="novaCompra">${ic('plus')}Nova compra</button>`);
  const cs = [...db.compras].sort((a, b) => b.data.localeCompare(a.data));
  const mes = today().slice(0, 7), totMes = cs.filter(c => c.data.startsWith(mes)).reduce((s, c) => s + (+c.valor || 0) + (+c.frete || 0), 0);
  return `${cs.length ? `<div class="bar"><span class="grow"></span><span class="tag">${esc(monthLabel(mes))} · ${brl(totMes)} em compras</span></div>` : ''}
  <div class="list">${cs.map(c => {
    const i = get('insumos', c.insumoId), un = i?.unidade || 'un';
    const conta = c.pacotes && c.fator > 1 ? `${fmt(c.pacotes, 3)} ${esc(embDe(i))} × ${fmt(c.fator, 3)} = ` : '';
    return `<button class="li" data-act="editCompra" data-id="${c.id}"><div class="av t-blue">${ic('cart')}</div><div class="li-main"><div class="li-t">${esc(nomeInsumo(c.insumoId))}</div>
      <div class="li-s">${fdate(c.data)} · ${conta}${fmt(c.qtd, 3)} ${esc(un)}${c.fornecedor ? ' · ' + esc(c.fornecedor) : ''}</div></div>
      <div class="li-r"><div class="li-v">${brl(+c.valor + +c.frete)}</div><div class="li-s">${brlU((+c.valor + +c.frete) / c.qtd)}/${esc(un)}</div></div></button>`;
  }).join('') || empty('cart', 'Nenhuma compra registrada')}</div>`;
}
function formCompra(c, insumoId) {
  const novo = !c;
  c = c || { data: today(), insumoId: insumoId || insumosOrd()[0]?.id, valor: '', frete: 0, fornecedor: '' };
  // compras antigas não tinham embalagem: aparecem como 1 embalagem com tudo dentro
  const pac0 = novo ? 1 : (c.pacotes || 1);
  const fator0 = novo ? fatorDe(get('insumos', c.insumoId)) : (c.pacotes ? c.fator : c.qtd);
  modal({
    title: novo ? 'Nova compra de insumo' : 'Compra',
    body: `
      <div class="g2">
        <label>Data<input type="date" name="data" value="${c.data}"></label>
        <label>Material<select name="insumoId">${opts(insumosOrd(), c.insumoId)}</select></label>
        <label><span id="lQtd"></span><input name="pacotes" inputmode="decimal" value="${iv(pac0)}"></label>
        <label><span id="lFator"></span><input name="fator" inputmode="decimal" value="${iv(fator0)}"></label>
        <label><span id="lPreco"></span><input name="preco" class="money" inputmode="numeric" placeholder="0,00" value="${novo ? '' : mv(c.valor / pac0)}"></label>
        <label>Total pago (R$)<input name="valor" class="money" inputmode="numeric" placeholder="0,00" value="${mv(c.valor)}"></label>
        <label>Frete / extra (R$)<input name="frete" class="money" inputmode="numeric" placeholder="0,00" value="${mv(c.frete)}"></label>
        <label>Fornecedor<input name="fornecedor" value="${esc(c.fornecedor)}"></label>
      </div>
      <div class="sum" id="resumo"></div>`,
    onOpen: root => {
      const el = n => root.querySelector(`[name=${n}]`);
      // o total é quantidade × preço; se a pessoa digitar o total, o preço de cada é que se ajusta
      let digitou = novo ? 'preco' : 'valor';
      const upd = e => {
        const n = e?.target?.name, i = get('insumos', F(root, 'insumoId'));
        const emb = embDe(i), un = i?.unidade || 'un';
        if (n === 'insumoId' && i) { el('fornecedor').value = i.fornecedor || ''; el('fator').value = iv(fatorDe(i)); }
        $('#lQtd', root).textContent = `Quantidade (${emb})`;
        $('#lFator', root).textContent = `Cada ${emb} vem com (${un})`;
        $('#lPreco', root).textContent = `Preço por ${emb} (R$)`;
        if (n === 'preco' || n === 'valor') digitou = n;
        const p = pn(F(root, 'pacotes'));
        if (n === 'preco' || n === 'valor' || n === 'pacotes') {
          if (digitou === 'valor') el('preco').value = p > 0 && F(root, 'valor') ? mv(pn(F(root, 'valor')) / p) : '';
          else el('valor').value = F(root, 'preco') ? mv(p * pn(F(root, 'preco'))) : '';
        }
        const q = rnd(p * pn(F(root, 'fator'))), v = pn(F(root, 'valor')) + pn(F(root, 'frete'));
        $('#resumo', root).innerHTML = `<div><span>Entra no estoque</span><b>${fmt(q, 3)} ${esc(un)}</b></div>
          <div><span>Total da compra</span><span>${brl(v)}</span></div>
          <div class="b"><span>Custo por ${esc(un)}</span><span>${q > 0 ? brlU(v / q) : '—'}</span></div>
          <div class="muted"><span>Custo médio atual</span><span>${i ? brlU(custoInsumo(i.id)) : '—'}</span></div>`;
      };
      root.addEventListener('input', upd); root.addEventListener('change', upd);
      if (novo) { const i = get('insumos', c.insumoId); if (i) el('fornecedor').value = i.fornecedor || ''; }
      upd();
    },
    onSave: root => {
      const pacotes = pn(F(root, 'pacotes')), fator = pn(F(root, 'fator'));
      // qtd (na unidade de uso) e valor (total) continuam sendo a base do estoque e do custo médio
      const dados = { data: F(root, 'data') || today(), insumoId: F(root, 'insumoId'), pacotes, fator, qtd: rnd(pacotes * fator), valor: pn(F(root, 'valor')), frete: pn(F(root, 'frete')), fornecedor: F(root, 'fornecedor').trim() };
      if (!dados.insumoId || dados.qtd <= 0) { toast('Informe o material, a quantidade e quanto vem em cada embalagem.'); return false; }
      if (novo) {
        db.compras.push({ id: uid(), ...dados });
        const i = get('insumos', dados.insumoId); if (i) i.fator = fator; // já vem preenchido na próxima compra
      } else Object.assign(c, dados);
      toast('Compra salva — custo e estoque atualizados.');
    },
    onDelete: novo ? null : () => { db.compras = db.compras.filter(x => x !== c); },
  });
}

function viewClientes() {
  topActions(`<button class="btn pri" data-act="novoCliente">${ic('plus')}Cliente</button>`);
  const info = id => {
    const vs = vendasAtivas().filter(v => v.clienteId === id);
    return { n: vs.length, total: vs.reduce((s, v) => s + calcVenda(v).liquido, 0), ult: vs.map(v => v.data).sort().pop() };
  };
  const tones = ['t-pri', 't-rose', 't-blue', 't-gold', 't-ok'];
  const cs = db.clientes.map(c => ({ c, ...info(c.id) })).sort((a, b) => b.total - a.total || a.c.nome.localeCompare(b.c.nome));
  return `<div class="list">${cs.map(({ c, n, total, ult }, k) => `<button class="li" data-act="editCliente" data-id="${c.id}">
    <div class="av ${tones[k % tones.length]}">${esc(initials(c.nome))}</div>
    <div class="li-main"><div class="li-t">${esc(c.nome)}</div><div class="li-s">${esc(c.telefone || 'sem telefone')}${ult ? ' · última compra ' + fdate(ult) : ''}</div></div>
    <div class="li-r"><div class="li-v">${brl(total)}</div><div class="li-s">${n} compra(s)</div></div></button>`).join('') || empty('users', 'Nenhum cliente ainda', 'Eles aparecem aqui ao registrar vendas.')}</div>`;
}
function formCliente(c) {
  const novo = !c;
  c = c || { nome: '', telefone: '', obs: '' };
  const vs = novo ? [] : db.vendas.filter(v => v.clienteId === c.id).sort((a, b) => b.data.localeCompare(a.data));
  const fone = String(c.telefone || '').replace(/\D/g, '');
  modal({
    title: novo ? 'Novo cliente' : c.nome,
    body: `
      <div class="g2"><label>Nome<input name="nome" value="${esc(c.nome)}"></label>
      <label>Telefone / WhatsApp<input name="telefone" inputmode="tel" value="${esc(c.telefone)}"></label></div>
      <label>Observações<textarea name="obs">${esc(c.obs)}</textarea></label>
      ${fone.length >= 10 ? `<p><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${fone.length <= 11 ? '55' + fone : fone}">${ic('chat')}Abrir no WhatsApp</a></p>` : ''}
      ${vs.length ? `<div class="sec">Compras</div><div class="tw"><table><tbody>${vs.map(v => `<tr><td>${fdate(v.data)}</td><td>${esc(itensTxt(v))}</td><td class="n">${brl(calcVenda(v).liquido)}</td><td>${esc(v.status)}</td></tr>`).join('')}</tbody></table></div>` : ''}`,
    onSave: root => {
      const nome = F(root, 'nome').trim();
      if (!nome) { toast('Informe o nome.'); return false; }
      const dados = { nome, telefone: F(root, 'telefone').trim(), obs: F(root, 'obs').trim() };
      if (novo) db.clientes.push({ id: uid(), ...dados }); else Object.assign(c, dados);
    },
    onDelete: novo ? null : () => {
      if (db.vendas.some(v => v.clienteId === c.id)) { toast('Este cliente tem vendas — não dá para excluir.'); return false; }
      db.clientes = db.clientes.filter(x => x !== c);
    },
  });
}

function viewConfig() {
  const P = db.params, th = getTheme();
  return `<div class="card"><div class="card-h">${ic('sliders')}<h3>Negócio e preços</h3></div>
    <div class="g2">
      <label>Nome do negócio<input id="c_nome" value="${esc(P.nome)}"></label>
      <label>Margem de lucro desejada (%)<input id="c_margem" inputmode="decimal" value="${iv(P.margem * 100)}"></label>
      <label>Mão de obra por hora (R$)<input id="c_mo" class="money" inputmode="numeric" value="${mv(P.maoObraHora)}"></label>
      <label>Perdas / desperdício (%)<input id="c_perdas" inputmode="decimal" value="${iv(P.perdas * 100)}"></label>
      <label>Impostos estimados (%)<input id="c_imp" inputmode="decimal" value="${iv(P.impostos * 100)}"></label>
      <label>Aparência<select id="c_tema">${[['auto', 'Automática (segue o sistema)'], ['light', 'Clara'], ['dark', 'Escura']].map(([v, l]) => `<option value="${v}" ${v === th ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <div class="sec">Formas de pagamento · nome e taxa (%)</div>
    <div id="pags">${db.pagamentos.map(p => `<div class="g2 pag"><input class="pn" value="${esc(p.nome)}" aria-label="Nome"><input class="pt" inputmode="decimal" value="${iv(p.taxa * 100)}" aria-label="Taxa %"></div>`).join('')}</div>
    <button class="btn sm" data-act="addPag" style="margin-top:8px">${ic('plus')}Forma de pagamento</button>
    <p class="hint" style="margin-top:14px">Para remover uma forma de pagamento, apague o nome. Taxas e impostos novos valem para vendas novas; as antigas mantêm o que foi gravado.</p>
    <button class="btn pri" data-act="salvarConfig">${ic('check')}Salvar configurações</button>
  </div>`;
}

function viewBackup() {
  const late = backupAtrasado();
  return `<div class="card"><div class="card-h">${ic('shield')}<h3>Backup</h3><span class="tag ${late ? 'warn' : 'ok'}">${db.meta.ultimoBackup ? 'último em ' + fdate(db.meta.ultimoBackup) : 'nunca feito'}</span></div>
    <p class="hint" style="margin:0 0 14px">Os dados ficam guardados neste navegador, neste computador. Baixe o backup toda semana e guarde no OneDrive: se limpar o navegador ou trocar de computador, é só restaurar. O backup inclui as fotos da galeria.</p>
    <div class="bar"><button class="btn pri" data-act="exportJson">${ic('download')}Baixar backup</button><button class="btn" data-act="importJson">${ic('upload')}Restaurar backup…</button></div></div>
  <div class="card"><div class="card-h">${ic('sheet')}<h3>Exportar para Excel</h3></div>
    <div class="bar"><button class="btn" data-act="csvVendas">${ic('bag')}Vendas</button><button class="btn" data-act="csvEstoque">${ic('box')}Estoque</button><button class="btn" data-act="csvProdutos">${ic('tag')}Produtos e preços</button></div></div>
  <div class="card"><div class="card-h">${ic('refresh')}<h3>Recomeçar</h3></div>
    <p class="hint" style="margin:0 0 14px">Apaga tudo e volta aos dados iniciais da planilha. Faça um backup antes.</p>
    <button class="btn danger" data-act="reset">${ic('trash')}Apagar tudo e recomeçar</button></div>`;
}

/* ---------------- arquivos ---------------- */
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = v => typeof v === 'number' ? String(rnd(v)).replace('.', ',') : `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');

$('#fileImport').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data.produtos || !data.insumos || !data.vendas) throw new Error('arquivo não é um backup deste app');
    if (!confirm(`Substituir todos os dados atuais pelo backup "${f.name}"?`)) return;
    const fotos = data._fotosGaleria; delete data._fotosGaleria;
    db = data; save();
    const n = fotos ? await restaurarFotos(fotos) : 0;
    render(); toast('Backup restaurado' + (n ? ` com ${n} foto(s).` : '.'));
  } catch (err) { toast('Não foi possível importar: ' + err.message); }
});

/* ---------------- ações ---------------- */
const ACTIONS = {
  novaVenda: () => db.produtos.length ? formVenda() : toast('Cadastre um produto primeiro.'),
  editVenda: id => formVenda(get('vendas', id)),
  novaProducao: () => db.produtos.length ? formProducao() : toast('Cadastre um produto primeiro.'),
  editProducao: id => formProducao(get('producoes', id)),
  ajuste: ref => formAjuste(ref),
  divulgar: id => {
    if (id && id !== studio.prodId) { studio.prodId = id; studio.src = null; }
    if (location.hash === '#divulgar') render(); else location.hash = 'divulgar';
  },
  novoProduto: () => formProduto(),
  editProduto: id => formProduto(get('produtos', id)),
  novoInsumo: () => formInsumo(),
  editInsumo: id => formInsumo(get('insumos', id)),
  novaCompra: id => db.insumos.length ? formCompra(null, id) : toast('Cadastre um insumo primeiro.'),
  editCompra: id => formCompra(get('compras', id)),
  // celular: o botão "+" abre os lançamentos do dia a dia
  lancar: () => modal({
    title: 'O que você quer lançar?',
    body: `<div class="quick">${[['novaVenda', 'bag', 't-pri', 'Venda', 'Vendi um terço'], ['novaProducao', 'sparkles', 't-gold', 'Produção', 'Fiz terços novos'], ['novaCompra', 'cart', 't-blue', 'Compra de material', 'Comprei contas, fio, cruz…']]
      .map(([a, i, t, n, d]) => `<button type="button" class="tile" data-f="${a}"><div class="kpi-ic ${t}">${ic(i)}</div><div class="grow"><b>${n}</b><span>${d}</span></div>${ic('chevron')}</button>`).join('')}</div>`,
    onOpen: root => root.addEventListener('click', e => { const t = e.target.closest('[data-f]'); if (t) { dlg.close(); ACTIONS[t.dataset.f](); } }),
  }),
  novoCliente: () => formCliente(),
  editCliente: id => formCliente(get('clientes', id)),
  addPag: () => $('#pags').insertAdjacentHTML('beforeend', `<div class="g2 pag"><input class="pn" placeholder="Nome" aria-label="Nome"><input class="pt" inputmode="decimal" value="0" aria-label="Taxa %"></div>`),
  salvarConfig: () => {
    const P = db.params;
    P.nome = $('#c_nome').value.trim() || 'Terços';
    P.margem = pn($('#c_margem').value) / 100;
    P.maoObraHora = pn($('#c_mo').value);
    P.perdas = pn($('#c_perdas').value) / 100;
    P.impostos = pn($('#c_imp').value) / 100;
    db.pagamentos = $$('.pag').map(r => ({ nome: $('.pn', r).value.trim(), taxa: pn($('.pt', r).value) / 100 })).filter(p => p.nome);
    setTheme($('#c_tema').value);
    if (P.margem + P.impostos + taxaRef() >= 1) toast('Atenção: margem + taxas + impostos passam de 100%.');
    else toast('Configurações salvas.');
    save(); render();
  },
  exportJson: async () => {
    const n = (db.galeria || []).length;
    if (n) toast(`Preparando backup com ${n} foto(s)…`);
    const fotos = n ? await fotosParaBackup() : {};
    db.meta.ultimoBackup = today(); save();
    download(`tercos-backup-${today()}.json`, JSON.stringify({ ...db, _fotosGaleria: fotos }), 'application/json');
    render();
  },
  importJson: () => $('#fileImport').click(),
  csvVendas: () => {
    const rows = [['Data', 'Nº', 'Cliente', 'Produto', 'Qtd', 'Preço unit.', 'Venda líquida', 'Custo', 'Taxas', 'Lucro', 'Pagamento', 'Status', 'Entrega', 'Obs']];
    for (const v of [...db.vendas].sort((a, b) => a.data.localeCompare(b.data))) {
      const c = calcVenda(v);
      for (const it of v.itens) {
        const sh = c.bruto > 0 ? it.qtd * it.preco / c.bruto : 0;
        const liq = c.liquido * sh, cus = it.qtd * (it.custoUnit || 0), tx = c.taxas * sh;
        rows.push([fdate(v.data), v.numero, nomeCliente(v.clienteId), nomeProduto(it.produtoId), it.qtd, it.preco, liq, cus, tx, liq - cus - tx, v.pagamento, v.status, v.entrega, v.obs]);
      }
    }
    download(`vendas-${today()}.csv`, csv(rows), 'text/csv;charset=utf-8');
  },
  csvEstoque: () => {
    const rows = [['Tipo', 'Código', 'Item', 'Unidade', 'Estoque', 'Mínimo', 'Custo unit.', 'Valor']];
    for (const p of produtosOrd()) { const e = estoqueProduto(p.id), c = custoProduto(p).total; rows.push(['Terço pronto', p.codigo, p.nome, 'un', e, p.estoqueMin, c, Math.max(0, e) * c]); }
    for (const i of insumosOrd()) { const e = estoqueInsumo(i.id), c = custoInsumo(i.id); rows.push(['Insumo', i.codigo, i.nome, i.unidade, e, i.estoqueMin, c, Math.max(0, e) * c]); }
    download(`estoque-${today()}.csv`, csv(rows), 'text/csv;charset=utf-8');
  },
  csvProdutos: () => {
    const rows = [['Código', 'Produto', 'Tempo (min)', 'Materiais', 'Mão de obra', 'Perdas', 'Custo total', 'Preço sugerido', 'Preço praticado', 'Lucro unit.', 'Margem real']];
    for (const p of produtosOrd()) { const i = precoInfo(p); rows.push([p.codigo, p.nome, p.tempoMin, i.mat, i.mo, i.perdas, i.total, i.sugerido, p.preco, i.lucro, i.margem]); }
    download(`produtos-${today()}.csv`, csv(rows), 'text/csv;charset=utf-8');
  },
  reset: () => {
    const nuvem = typeof Sync !== 'undefined' && Sync.ativo() ? '\n\nATENÇÃO: com a sincronização ligada, isso também apaga na nuvem e nos outros aparelhos.' : '';
    if (!confirm('Apagar TODOS os dados e voltar ao início? Isso não pode ser desfeito.' + nuvem)) return;
    seed(); save(); location.hash = 'inicio'; render(); toast('Dados reiniciados.');
  },
};

/* ---------------- início ---------------- */
// espera o studio.js carregar antes de desenhar a primeira tela
document.addEventListener('DOMContentLoaded', () => {
  $$('.nav a[data-ic]').forEach(a => a.insertAdjacentHTML('afterbegin', ic(a.dataset.ic)));
  $('#back').innerHTML = ic('back');
  $('#dlgX').innerHTML = ic('x');
  $('#fab').innerHTML = ic('plus');
  applyTheme();
  load();
  if (typeof Sync !== 'undefined') Sync.init(); // antes do render: trata o link do QR Code (#conectar=…)
  render();
  if (!document.body.classList.contains('locked')) orAtualizarRss(); // oração do dia vinda do site
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
});
