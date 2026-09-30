'use strict';
/* Controle de Terços — dados ficam no navegador (localStorage). Faça backup em Cadastros > Backup. */

const KEY = 'tercos-db-v1';
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
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fdate = s => s ? s.split('-').reverse().join('/') : '';
const monthLabel = ym => { const s = new Date(ym + '-15T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);

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
    { id: 'p1', codigo: 'TER001', nome: 'Terço Clássico', tempoMin: 30, preco: 45, estoqueMin: 1, ficha: ficha([['i1', 59], ...base]) },
    { id: 'p2', codigo: 'TER002', nome: 'Terço Emborrachado', tempoMin: 30, preco: 40, estoqueMin: 1, ficha: ficha([['i10', 59], ...base]) },
    { id: 'p3', codigo: 'TER003', nome: 'Terço Letras', tempoMin: 30, preco: 45, estoqueMin: 1, ficha: ficha([['i1', 53], ...base, ['i9', 6]]) },
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
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('Não foi possível salvar: ' + e.message); }
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
  if (!p.ficha?.length) return null;
  return Math.max(0, Math.min(...p.ficha.filter(f => f.qtd > 0).map(f => Math.floor(estoqueInsumo(f.insumoId) / f.qtd))));
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

/* ---------------- UI base ---------------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3200);
}
const dlg = $('#dlg');
function modal({ title, body, onSave, onDelete, saveLabel = 'Salvar', onOpen }) {
  $('#dlgTitle').textContent = title;
  $('#dlgBody').innerHTML = body;
  $('#dlgDel').hidden = !onDelete;
  $('#dlgSave').hidden = !onSave;
  $('#dlgSave').textContent = saveLabel;
  dlg._save = onSave; dlg._del = onDelete;
  dlg.showModal();
  onOpen && onOpen($('#dlgBody'));
  const first = $('#dlgBody input, #dlgBody select'); first && first.focus();
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

const opts = (arr, sel, label = x => x.nome, val = x => x.id) =>
  arr.map(x => `<option value="${esc(val(x))}" ${val(x) === sel ? 'selected' : ''}>${esc(label(x))}</option>`).join('');
const produtosOrd = () => [...db.produtos].sort((a, b) => a.nome.localeCompare(b.nome));
const insumosOrd = () => [...db.insumos].sort((a, b) => a.nome.localeCompare(b.nome));

/* ---------------- rotas ---------------- */
const ROUTES = {
  inicio: ['Início', viewInicio], vendas: ['Vendas', viewVendas], producao: ['Produção', viewProducao],
  estoque: ['Estoque', viewEstoque], mais: ['Cadastros', viewMais],
  produtos: ['Produtos e preços', viewProdutos, 'mais'], insumos: ['Insumos', viewInsumos, 'mais'],
  compras: ['Compras de insumos', viewCompras, 'mais'], clientes: ['Clientes', viewClientes, 'mais'],
  config: ['Configurações', viewConfig, 'mais'], backup: ['Backup e exportação', viewBackup, 'mais'],
};
const state = { mesInicio: today().slice(0, 7), mesVendas: today().slice(0, 7), filtroVendas: 'todas' };

function render() {
  const r = location.hash.slice(1) || 'inicio';
  const [title, fn, parent] = ROUTES[r] || ROUTES.inicio;
  $('#title').textContent = title;
  $('#brandName').textContent = db.params.nome || 'Terços';
  $('#back').hidden = !parent;
  $('#back').onclick = () => location.hash = parent;
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === (parent || r)));
  $('#topAct').innerHTML = '';
  $('#view').innerHTML = fn();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
const topActions = html => { $('#topAct').innerHTML = html; };

// clique em qualquer [data-act] dentro da página ou do cabeçalho
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
function viewInicio() {
  topActions(`<button class="btn pri" data-act="novaVenda">+ Venda</button><button class="btn" data-act="novaProducao">+ Produção</button>`);
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
  const aReceber = vendasAtivas().filter(v => v.status === 'Pendente').reduce((s, v) => s + calcVenda(v).liquido, 0);
  const nPend = vendasAtivas().filter(v => v.status === 'Pendente').length;

  // alertas
  const alerts = [];
  const bk = db.meta.ultimoBackup;
  if (!bk || daysBetween(bk, today()) > 7)
    alerts.push(['warn', `${bk ? 'Último backup em ' + fdate(bk) : 'Você ainda não fez backup'}. <a href="#backup">Fazer backup agora</a>.`]);
  for (const p of produtosOrd()) {
    const e = estoqueProduto(p.id);
    if (e < 0) alerts.push(['bad', `<b>${esc(p.nome)}</b>: faltam ${fmt(-e)} para entregar vendas feitas — produzir.`]);
    else if (p.estoqueMin > 0 && e < p.estoqueMin) alerts.push(['warn', `<b>${esc(p.nome)}</b>: só ${fmt(e)} pronto(s) (mínimo ${fmt(p.estoqueMin)}).`]);
  }
  for (const i of insumosOrd()) {
    const e = estoqueInsumo(i.id);
    if (e < 0) alerts.push(['bad', `<b>${esc(i.nome)}</b>: estoque negativo (${fmt(e)} ${esc(i.unidade)}) — confira as compras.`]);
    else if (i.estoqueMin > 0 && e <= i.estoqueMin) alerts.push(['warn', `<b>${esc(i.nome)}</b>: restam ${fmt(e)} ${esc(i.unidade)} (mínimo ${fmt(i.estoqueMin)}) — comprar.`]);
  }

  const enc = vendasAtivas().filter(v => v.entrega === 'A entregar').sort((a, b) => (a.dataEntrega || '9').localeCompare(b.dataEntrega || '9'));
  const rows = Object.entries(porProd).sort((a, b) => b[1].fat - a[1].fat);

  return `
  <div class="bar"><label style="margin:0">Mês <input type="month" value="${m}" data-chg="mesInicio"></label></div>
  <div class="kpis">
    <div class="kpi"><div class="l">Vendido no mês</div><div class="v">${brl(vendido)}</div><div class="s">${vs.length} venda(s)</div></div>
    <div class="kpi"><div class="l">Lucro no mês</div><div class="v ${lucro < 0 ? 'neg' : ''}">${brl(lucro)}</div><div class="s">margem ${pct(vendido ? lucro / vendido : 0)}</div></div>
    <div class="kpi"><div class="l">Terços vendidos</div><div class="v">${fmt(qtd)}</div><div class="s">recebido ${brl(recebido)}</div></div>
    <div class="kpi"><div class="l">Ticket médio</div><div class="v">${brl(vs.length ? vendido / vs.length : 0)}</div><div class="s">por venda</div></div>
    <div class="kpi"><div class="l">A receber (total)</div><div class="v">${brl(aReceber)}</div><div class="s">${nPend} pendente(s)</div></div>
  </div>
  <div class="cols">
    <div>
      <div class="card"><h3>Avisos</h3>
        ${alerts.length ? alerts.map(([t, h]) => `<div class="alert ${t}">${h}</div>`).join('') : '<div class="alert ok">Tudo em ordem.</div>'}
      </div>
      <div class="card"><h3>Encomendas a entregar</h3>
        ${enc.length ? `<div class="list" style="margin:0">${enc.map(v => {
          const late = v.dataEntrega && v.dataEntrega < today();
          return `<button class="li" data-act="editVenda" data-id="${v.id}"><div class="li-main"><div class="li-t">${esc(nomeCliente(v.clienteId) || 'Sem cliente')}</div><div class="li-s">${esc(itensTxt(v))}${v.obs ? ' · ' + esc(v.obs) : ''}</div></div><div class="li-r"><span class="tag ${late ? 'bad' : 'warn'}">${v.dataEntrega ? fdate(v.dataEntrega) : 'sem data'}</span></div></button>`;
        }).join('')}</div>` : '<div class="muted">Nenhuma encomenda pendente.</div>'}
      </div>
    </div>
    <div class="card"><h3>Por produto — ${esc(monthLabel(m))}</h3>
      ${rows.length ? `<div class="tw"><table><thead><tr><th>Produto</th><th class="n">Qtd</th><th class="n">Vendido</th><th class="n">Lucro</th></tr></thead><tbody>
      ${rows.map(([id, r]) => `<tr><td>${esc(nomeProduto(id))}</td><td class="n">${fmt(r.qtd)}</td><td class="n">${brl(r.fat)}</td><td class="n">${brl(r.lucro)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td class="n">${fmt(qtd)}</td><td class="n">${brl(vendido)}</td><td class="n">${brl(lucro)}</td></tr></tfoot></table></div>`
      : '<div class="muted">Nenhuma venda neste mês.</div>'}
    </div>
  </div>`;
}
const itensTxt = v => v.itens.map(i => `${fmt(i.qtd)}× ${nomeProduto(i.produtoId)}`).join(', ');

/* ---------------- Vendas ---------------- */
function viewVendas() {
  topActions(`<button class="btn pri" data-act="novaVenda">+ Nova venda</button>`);
  const m = state.mesVendas, f = state.filtroVendas;
  let vs = db.vendas.filter(v => !m || v.data.startsWith(m));
  if (f === 'Pendente') vs = vs.filter(v => v.status === 'Pendente');
  if (f === 'A entregar') vs = vs.filter(v => v.entrega === 'A entregar' && v.status !== 'Cancelada');
  if (f === 'Cancelada') vs = vs.filter(v => v.status === 'Cancelada');
  vs.sort((a, b) => b.data.localeCompare(a.data) || b.numero.localeCompare(a.numero));
  const tot = vs.filter(v => v.status !== 'Cancelada').reduce((s, v) => s + calcVenda(v).liquido, 0);
  return `
  <div class="bar">
    <label style="margin:0">Mês <input type="month" value="${m}" data-chg="mesVendas"></label>
    <label style="margin:0">Mostrar <select data-chg="filtroVendas">${['todas', 'Pendente', 'A entregar', 'Cancelada'].map(x => `<option ${x === f ? 'selected' : ''} value="${x}">${x === 'todas' ? 'Todas' : x === 'Pendente' ? 'Pagamento pendente' : x === 'Cancelada' ? 'Canceladas' : 'A entregar'}</option>`).join('')}</select></label>
    <span class="grow"></span><span class="muted">${vs.length} venda(s) · ${brl(tot)}</span>
  </div>
  <div class="list">${vs.length ? vs.map(v => {
    const c = calcVenda(v);
    const st = v.status === 'Pago' ? 'ok' : v.status === 'Pendente' ? 'warn' : 'bad';
    return `<button class="li" data-act="editVenda" data-id="${v.id}">
      <div class="li-main"><div class="li-t">${esc(v.numero)} · ${esc(nomeCliente(v.clienteId) || 'Sem cliente')}</div>
      <div class="li-s">${fdate(v.data)} · ${esc(itensTxt(v))} · ${esc(v.pagamento || '')}</div></div>
      <div class="li-r"><div class="li-v">${brl(c.liquido)}</div><span class="tag ${st}">${esc(v.status)}</span>${v.entrega === 'A entregar' && v.status !== 'Cancelada' ? '<span class="tag">A entregar</span>' : ''}</div>
    </button>`;
  }).join('') : '<div class="empty">Nenhuma venda encontrada.</div>'}</div>`;
}

function itemRow(it = {}) {
  return `<div class="row item">
    <select name="produtoId"><option value="">Produto…</option>${opts(produtosOrd(), it.produtoId)}</select>
    <input name="qtd" inputmode="decimal" placeholder="Qtd" value="${iv(it.qtd ?? 1)}">
    <input name="preco" inputmode="decimal" placeholder="Preço" value="${iv(it.preco ?? '')}">
    <button type="button" class="rm" data-f="rm" aria-label="Remover">×</button></div>`;
}
function formVenda(v) {
  const novo = !v;
  v = v || { data: today(), itens: [{}], desconto: 0, pagamento: db.pagamentos[0]?.nome, status: 'Pago', entrega: 'Entregue' };
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
      <div class="sec">Itens</div>
      <div class="rows" id="itens">${v.itens.map(itemRow).join('')}</div>
      <button type="button" class="btn sm" data-f="addItem">+ item</button>
      <div class="g3" style="margin-top:12px">
        <label>Desconto (R$)<input name="desconto" inputmode="decimal" value="${iv(v.desconto)}"></label>
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
          <div><span>Total com desconto</span><span>${brl(c.liquido)}</span></div>
          <div class="muted"><span>Custo dos terços</span><span>− ${brl(c.custo)}</span></div>
          <div class="muted"><span>Taxas e impostos</span><span>− ${brl(c.taxas)}</span></div>
          <div class="b"><span>Lucro</span><span class="${c.lucro < 0 ? 'neg' : 'pos'}">${brl(c.lucro)}</span></div>`;
      };
      root.addEventListener('input', upd);
      root.addEventListener('change', e => {
        if (e.target.name === 'produtoId') {
          const p = get('produtos', e.target.value);
          if (p) e.target.closest('.item').querySelector('[name=preco]').value = iv(p.preco);
        }
        if (e.target.name === 'entrega' && e.target.value === 'Entregue') root.querySelector('[name=dataEntrega]').value ||= '';
        upd();
      });
      root.addEventListener('click', e => {
        const f = e.target.dataset.f;
        if (f === 'addItem') { $('#itens', root).insertAdjacentHTML('beforeend', itemRow()); upd(); }
        if (f === 'rm') { e.target.closest('.row').remove(); upd(); }
      });
      upd();
      root._readItens = readItens;
    },
    onSave: root => {
      const itensIn = root._readItens();
      if (!itensIn.length) { toast('Adicione pelo menos um item com produto e quantidade.'); return false; }
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
        toast(`Venda ${nv.numero} salva.` + (falta.length ? ' Atenção: estoque ficou negativo — registre a produção.' : ''));
      } else { Object.assign(v, dados); toast('Venda atualizada.'); }
    },
    onDelete: novo ? null : () => { db.vendas = db.vendas.filter(x => x !== v); },
  });
}

/* ---------------- Produção ---------------- */
function viewProducao() {
  topActions(`<button class="btn pri" data-act="novaProducao">+ Registrar produção</button>`);
  const ps = [...db.producoes].sort((a, b) => b.data.localeCompare(a.data));
  return `
  <p class="hint" style="margin:0 0 12px">Ao registrar terços feitos, os insumos da ficha técnica saem do estoque e os terços entram no estoque de prontos.</p>
  <div class="list">${ps.length ? ps.map(p => `<button class="li" data-act="editProducao" data-id="${p.id}">
    <div class="li-main"><div class="li-t">${fmt(p.qtd)}× ${esc(nomeProduto(p.produtoId))}</div><div class="li-s">${fdate(p.data)} · custo ${brl(p.custoUnit)} cada</div></div>
    <div class="li-r"><div class="li-v">${brl(p.custoUnit * p.qtd)}</div></div></button>`).join('') : '<div class="empty">Nenhuma produção registrada.</div>'}</div>`;
}
function formProducao(pr) {
  const novo = !pr;
  modal({
    title: novo ? 'Registrar produção' : 'Produção',
    body: novo ? `
      <div class="g3">
        <label>Data<input type="date" name="data" value="${today()}"></label>
        <label style="grid-column:span 1">Produto<select name="produtoId">${opts(produtosOrd(), db.produtos[0]?.id)}</select></label>
        <label>Quantidade<input name="qtd" inputmode="decimal" value="1"></label>
      </div>
      <div id="prev"></div>` : `
      <p><b>${fmt(pr.qtd)}× ${esc(nomeProduto(pr.produtoId))}</b> em ${fdate(pr.data)} — custo ${brl(pr.custoUnit)} cada.</p>
      <div class="tw"><table><thead><tr><th>Insumo usado</th><th class="n">Qtd</th></tr></thead><tbody>
      ${pr.consumo.map(c => `<tr><td>${esc(nomeInsumo(c.insumoId))}</td><td class="n">${fmt(c.qtd, 3)} ${esc(get('insumos', c.insumoId)?.unidade || '')}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint" style="margin-top:10px">Para corrigir, exclua e registre de novo. Excluir devolve os insumos ao estoque.</p>`,
    onOpen: root => {
      if (!novo) return;
      const upd = () => {
        const p = get('produtos', F(root, 'produtoId')); const q = pn(F(root, 'qtd'));
        if (!p) return;
        let falta = false;
        const linhas = p.ficha.map(f => {
          const precisa = f.qtd * q, tem = estoqueInsumo(f.insumoId), ok = tem >= precisa;
          if (!ok) falta = true;
          return `<tr><td>${esc(nomeInsumo(f.insumoId))}</td><td class="n">${fmt(precisa, 3)}</td><td class="n ${ok ? '' : 'neg'}">${fmt(tem, 3)}</td></tr>`;
        }).join('');
        $('#prev', root).innerHTML = `<div class="tw"><table><thead><tr><th>Insumo</th><th class="n">Precisa</th><th class="n">Em estoque</th></tr></thead><tbody>${linhas}</tbody></table></div>
          ${falta ? '<div class="alert warn" style="margin-top:10px">Algum insumo não tem estoque suficiente. Registre a compra antes, ou salve assim mesmo e o estoque ficará negativo.</div>' : ''}
          <div class="sum"><div class="b"><span>Custo desta produção</span><span>${brl(custoProduto(p).total * q)}</span></div></div>`;
      };
      root.addEventListener('input', upd); root.addEventListener('change', upd); upd();
    },
    saveLabel: novo ? 'Registrar' : 'Salvar',
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
  const tag = (e, min) => e < 0 ? '<span class="tag bad">negativo</span>' : (min > 0 && e <= min) ? '<span class="tag warn">baixo</span>' : '<span class="tag ok">ok</span>';
  return `
  <div class="kpis" style="grid-template-columns:repeat(2,1fr)">
    <div class="kpi"><div class="l">Terços prontos (a custo)</div><div class="v">${brl(valProd)}</div></div>
    <div class="kpi"><div class="l">Insumos (a custo)</div><div class="v">${brl(valIns)}</div></div>
  </div>
  <div class="card"><h3>Terços prontos</h3><div class="tw"><table>
    <thead><tr><th>Produto</th><th class="n">Em estoque</th><th class="n">Mínimo</th><th class="n">Dá p/ fazer*</th><th></th><th></th></tr></thead><tbody>
    ${prods.map(p => { const e = estoqueProduto(p.id), pf = podeFazer(p); return `<tr><td>${esc(p.nome)}</td><td class="n">${fmt(e)}</td><td class="n">${fmt(p.estoqueMin)}</td><td class="n">${pf == null ? '—' : fmt(pf)}</td><td>${tag(e, p.estoqueMin)}</td><td class="n"><button class="btn sm" data-act="ajuste" data-id="produto:${p.id}">Ajustar</button></td></tr>`; }).join('')}
    </tbody></table></div><p class="hint" style="margin:8px 0 0">* Quantos ainda dá para fazer com os insumos em estoque.</p></div>
  <div class="card"><h3>Insumos</h3><div class="tw"><table>
    <thead><tr><th>Insumo</th><th class="n">Em estoque</th><th class="n">Mínimo</th><th class="n">Custo un.</th><th class="n">Valor</th><th></th><th></th></tr></thead><tbody>
    ${ins.map(i => { const e = estoqueInsumo(i.id), c = custoInsumo(i.id); return `<tr><td>${esc(i.nome)}</td><td class="n">${fmt(e, 3)} ${esc(i.unidade)}</td><td class="n">${fmt(i.estoqueMin)}</td><td class="n">${brl(c)}</td><td class="n">${brl(Math.max(0, e) * c)}</td><td>${tag(e, i.estoqueMin)}</td><td class="n"><button class="btn sm" data-act="ajuste" data-id="insumo:${i.id}">Ajustar</button></td></tr>`; }).join('')}
    </tbody></table></div></div>
  ${db.ajustes.length ? `<div class="card"><h3>Ajustes de contagem</h3><div class="tw"><table><thead><tr><th>Data</th><th>Item</th><th class="n">Diferença</th><th>Motivo</th></tr></thead><tbody>
    ${[...db.ajustes].reverse().slice(0, 30).map(a => `<tr><td>${fdate(a.data)}</td><td>${esc(a.tipo === 'insumo' ? nomeInsumo(a.refId) : nomeProduto(a.refId))}</td><td class="n ${a.qtd < 0 ? 'neg' : 'pos'}">${a.qtd > 0 ? '+' : ''}${fmt(a.qtd, 3)}</td><td>${esc(a.motivo)}</td></tr>`).join('')}
  </tbody></table></div></div>` : ''}`;
}
function formAjuste(ref) {
  const [tipo, id] = ref.split(':');
  const item = get(tipo === 'insumo' ? 'insumos' : 'produtos', id);
  const atual = tipo === 'insumo' ? estoqueInsumo(id) : estoqueProduto(id);
  modal({
    title: `Ajustar estoque — ${item.nome}`,
    body: `<p class="hint" style="margin:0 0 12px">Informe quanto existe de verdade agora (contagem). A diferença fica registrada.</p>
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
  const it = (r, t, s) => `<a class="li" href="#${r}" style="text-decoration:none;color:inherit"><div class="li-main"><div class="li-t">${t}</div><div class="li-s">${s}</div></div><div class="li-r muted">›</div></a>`;
  return `<div class="list">
    ${it('produtos', 'Produtos e preços', `${db.produtos.length} modelos · ficha técnica, custo e preço sugerido`)}
    ${it('insumos', 'Insumos', `${db.insumos.length} materiais cadastrados`)}
    ${it('compras', 'Compras de insumos', `${db.compras.length} compras · atualizam custo médio e estoque`)}
    ${it('clientes', 'Clientes', `${db.clientes.length} clientes`)}
    ${it('config', 'Configurações', 'Margem, mão de obra, perdas, impostos, formas de pagamento')}
    ${it('backup', 'Backup e exportação', db.meta.ultimoBackup ? 'Último backup ' + fdate(db.meta.ultimoBackup) : 'Nenhum backup feito ainda')}
  </div>`;
}

function viewProdutos() {
  topActions(`<button class="btn pri" data-act="novoProduto">+ Produto</button>`);
  return `<div class="card"><div class="tw"><table>
    <thead><tr><th>Produto</th><th class="n">Custo</th><th class="n">Sugerido</th><th class="n">Preço</th><th class="n">Lucro un.</th><th class="n">Margem</th><th></th></tr></thead><tbody>
    ${produtosOrd().map(p => { const i = precoInfo(p); return `<tr><td><b>${esc(p.nome)}</b><div class="muted" style="font-size:12px">${esc(p.codigo)}</div></td><td class="n">${brl(i.total)}</td><td class="n">${brl(i.sugerido)}</td><td class="n"><b>${brl(p.preco)}</b></td><td class="n">${brl(i.lucro)}</td><td class="n ${i.margem < db.params.margem ? 'neg' : 'pos'}">${pct(i.margem)}</td><td class="n"><button class="btn sm" data-act="editProduto" data-id="${p.id}">Abrir</button></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="hint" style="margin:10px 0 0">Custo = materiais + mão de obra (${brl(db.params.maoObraHora)}/h) + perdas (${pct(db.params.perdas)}). Sugerido garante margem de ${pct(db.params.margem)} já descontando taxa de ${pct(taxaRef())} e impostos de ${pct(db.params.impostos)}. Margem em vermelho = abaixo da desejada.</p></div>`;
}
function fichaRow(f = {}) {
  return `<div class="row">
    <select name="insumoId"><option value="">Insumo…</option>${opts(insumosOrd(), f.insumoId)}</select>
    <input name="qtd" inputmode="decimal" placeholder="Qtd" value="${iv(f.qtd ?? '')}">
    <span class="unit"></span>
    <button type="button" class="rm" data-f="rm" aria-label="Remover">×</button></div>`;
}
function formProduto(p) {
  const novo = !p;
  p = p || { codigo: nextCode('produtos', 'TER'), nome: '', tempoMin: 30, preco: 0, estoqueMin: 1, ficha: [{}] };
  modal({
    title: novo ? 'Novo produto' : p.nome,
    body: `
      <div class="g3">
        <label>Código<input name="codigo" value="${esc(p.codigo)}"></label>
        <label style="grid-column:span 2">Nome<input name="nome" value="${esc(p.nome)}"></label>
        <label>Tempo (min)<input name="tempoMin" inputmode="decimal" value="${iv(p.tempoMin)}"></label>
        <label>Preço de venda<input name="preco" inputmode="decimal" value="${iv(p.preco)}"></label>
        <label>Estoque mínimo<input name="estoqueMin" inputmode="decimal" value="${iv(p.estoqueMin)}"></label>
      </div>
      <div class="sec">Ficha técnica (materiais de 1 terço)</div>
      <div class="rows ficha" id="ficha">${p.ficha.map(fichaRow).join('')}</div>
      <button type="button" class="btn sm" data-f="add">+ insumo</button>
      <div class="sum" id="resumo"></div>`,
    onOpen: root => {
      const read = () => $$('#ficha .row', root).map(r => ({ insumoId: F(r, 'insumoId'), qtd: pn(F(r, 'qtd')) })).filter(f => f.insumoId && f.qtd > 0);
      const upd = () => {
        $$('#ficha .row', root).forEach(r => {
          const id = F(r, 'insumoId'), i = get('insumos', id);
          r.querySelector('.unit').textContent = i ? brl(pn(F(r, 'qtd')) * custoInsumo(id)) : '';
        });
        const tmp = { ficha: read(), tempoMin: pn(F(root, 'tempoMin')) };
        const preco = pn(F(root, 'preco')), i = precoInfo(tmp, preco);
        $('#resumo', root).innerHTML = `
          <div><span>Materiais</span><span>${brl(i.mat)}</span></div>
          <div><span>Mão de obra</span><span>${brl(i.mo)}</span></div>
          <div><span>Perdas</span><span>${brl(i.perdas)}</span></div>
          <div class="b"><span>Custo total</span><span>${brl(i.total)}</span></div>
          <div><span>Preço sugerido <button type="button" class="btn sm" data-f="usar">usar ${brl(Math.ceil(i.sugerido))}</button></span><span>${brl(i.sugerido)}</span></div>
          <div class="b"><span>Lucro por terço / margem</span><span class="${i.margem < db.params.margem ? 'neg' : 'pos'}">${brl(i.lucro)} · ${pct(i.margem)}</span></div>`;
        root._sug = Math.ceil(i.sugerido);
      };
      root.addEventListener('input', upd); root.addEventListener('change', upd);
      root.addEventListener('click', e => {
        const f = e.target.dataset.f;
        if (f === 'add') { $('#ficha', root).insertAdjacentHTML('beforeend', fichaRow()); upd(); }
        if (f === 'rm') { e.target.closest('.row').remove(); upd(); }
        if (f === 'usar') { root.querySelector('[name=preco]').value = iv(root._sug); upd(); }
      });
      upd(); root._read = read;
    },
    onSave: root => {
      const nome = F(root, 'nome').trim();
      if (!nome) { toast('Informe o nome.'); return false; }
      const codigo = F(root, 'codigo').trim();
      if (db.produtos.some(x => x !== p && x.codigo === codigo)) { toast('Já existe um produto com esse código.'); return false; }
      const dados = { codigo, nome, tempoMin: pn(F(root, 'tempoMin')), preco: pn(F(root, 'preco')), estoqueMin: pn(F(root, 'estoqueMin')), ficha: root._read() };
      if (novo) db.produtos.push({ id: uid(), ...dados }); else Object.assign(p, dados);
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
  topActions(`<button class="btn pri" data-act="novoInsumo">+ Insumo</button><button class="btn" data-act="novaCompra">+ Compra</button>`);
  return `<div class="list">${insumosOrd().map(i => {
    const n = db.compras.filter(c => c.insumoId === i.id).length;
    return `<button class="li" data-act="editInsumo" data-id="${i.id}"><div class="li-main"><div class="li-t">${esc(i.nome)}</div>
      <div class="li-s">${esc(i.codigo)} · ${esc(i.fornecedor || 'sem fornecedor')} · ${n} compra(s)</div></div>
      <div class="li-r"><div class="li-v">${brl(custoInsumo(i.id))}<span class="muted" style="font-weight:400">/${esc(i.unidade)}</span></div><div class="li-s">${fmt(estoqueInsumo(i.id), 3)} em estoque</div></div></button>`;
  }).join('') || '<div class="empty">Nenhum insumo.</div>'}</div>
  <p class="hint">O custo é a média ponderada de todas as compras daquele insumo (inclui frete).</p>`;
}
function formInsumo(i) {
  const novo = !i;
  i = i || { codigo: nextCode('insumos', 'INS'), nome: '', unidade: 'un', estoqueMin: 0, fornecedor: '', custoManual: 0 };
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
      ${compras.length ? `<div class="sec">Compras</div><div class="tw"><table><thead><tr><th>Data</th><th class="n">Qtd</th><th class="n">Valor</th><th class="n">Custo un.</th><th>Fornecedor</th></tr></thead><tbody>
        ${compras.map(c => `<tr><td>${fdate(c.data)}</td><td class="n">${fmt(c.qtd, 3)}</td><td class="n">${brl(+c.valor + +c.frete)}</td><td class="n">${brl((+c.valor + +c.frete) / c.qtd)}</td><td>${esc(c.fornecedor)}</td></tr>`).join('')}
        </tbody></table></div><p class="hint" style="margin-top:8px">Custo médio: <b>${brl(custoInsumo(i.id))}</b> por ${esc(i.unidade)}.</p>`
        : `<label>Custo por unidade (enquanto não houver compra registrada)<input name="custoManual" inputmode="decimal" value="${iv(i.custoManual)}"></label>`}`,
    onSave: root => {
      const nome = F(root, 'nome').trim();
      if (!nome) { toast('Informe a descrição.'); return false; }
      const codigo = F(root, 'codigo').trim();
      if (db.insumos.some(x => x !== i && x.codigo === codigo)) { toast('Já existe um insumo com esse código.'); return false; }
      const dados = { codigo, nome, unidade: F(root, 'unidade').trim() || 'un', estoqueMin: pn(F(root, 'estoqueMin')), fornecedor: F(root, 'fornecedor').trim() };
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
  topActions(`<button class="btn pri" data-act="novaCompra">+ Compra</button>`);
  const cs = [...db.compras].sort((a, b) => b.data.localeCompare(a.data));
  return `<div class="list">${cs.map(c => {
    const i = get('insumos', c.insumoId);
    return `<button class="li" data-act="editCompra" data-id="${c.id}"><div class="li-main"><div class="li-t">${esc(nomeInsumo(c.insumoId))}</div>
      <div class="li-s">${fdate(c.data)} · ${fmt(c.qtd, 3)} ${esc(i?.unidade || '')} · ${esc(c.fornecedor || '')}</div></div>
      <div class="li-r"><div class="li-v">${brl(+c.valor + +c.frete)}</div><div class="li-s">${brl((+c.valor + +c.frete) / c.qtd)}/${esc(i?.unidade || 'un')}</div></div></button>`;
  }).join('') || '<div class="empty">Nenhuma compra.</div>'}</div>`;
}
function formCompra(c) {
  const novo = !c;
  c = c || { data: today(), insumoId: insumosOrd()[0]?.id, qtd: '', valor: '', frete: 0, fornecedor: '' };
  modal({
    title: novo ? 'Nova compra de insumo' : 'Compra',
    body: `
      <div class="g2">
        <label>Data<input type="date" name="data" value="${c.data}"></label>
        <label>Insumo<select name="insumoId">${opts(insumosOrd(), c.insumoId)}</select></label>
        <label>Quantidade comprada <span id="un"></span><input name="qtd" inputmode="decimal" value="${iv(c.qtd)}"></label>
        <label>Valor pago (R$)<input name="valor" inputmode="decimal" value="${iv(c.valor)}"></label>
        <label>Frete / extra (R$)<input name="frete" inputmode="decimal" value="${iv(c.frete)}"></label>
        <label>Fornecedor<input name="fornecedor" value="${esc(c.fornecedor)}"></label>
      </div>
      <p class="hint">Informe a quantidade na unidade de uso. Ex.: pacote com 420 contas por R$ 4,20 → quantidade 420, valor 4,20.</p>
      <div class="sum" id="resumo"></div>`,
    onOpen: root => {
      const upd = e => {
        const i = get('insumos', F(root, 'insumoId'));
        $('#un', root).textContent = i ? `(${i.unidade})` : '';
        if (e?.target?.name === 'insumoId' && i) root.querySelector('[name=fornecedor]').value = i.fornecedor || '';
        const q = pn(F(root, 'qtd')), v = pn(F(root, 'valor')) + pn(F(root, 'frete'));
        $('#resumo', root).innerHTML = `<div class="b"><span>Custo por ${esc(i?.unidade || 'un')}</span><span>${q > 0 ? brl(v / q) : '—'}</span></div>
          <div class="muted"><span>Custo médio atual</span><span>${i ? brl(custoInsumo(i.id)) : '—'}</span></div>`;
      };
      root.addEventListener('input', upd); root.addEventListener('change', upd);
      if (novo) { const i = get('insumos', c.insumoId); if (i) root.querySelector('[name=fornecedor]').value = i.fornecedor || ''; }
      upd();
    },
    onSave: root => {
      const dados = { data: F(root, 'data') || today(), insumoId: F(root, 'insumoId'), qtd: pn(F(root, 'qtd')), valor: pn(F(root, 'valor')), frete: pn(F(root, 'frete')), fornecedor: F(root, 'fornecedor').trim() };
      if (!dados.insumoId || dados.qtd <= 0) { toast('Informe o insumo e a quantidade.'); return false; }
      if (novo) db.compras.push({ id: uid(), ...dados }); else Object.assign(c, dados);
      toast('Compra salva — custo e estoque atualizados.');
    },
    onDelete: novo ? null : () => { db.compras = db.compras.filter(x => x !== c); },
  });
}

function viewClientes() {
  topActions(`<button class="btn pri" data-act="novoCliente">+ Cliente</button>`);
  const info = id => {
    const vs = vendasAtivas().filter(v => v.clienteId === id);
    return { n: vs.length, total: vs.reduce((s, v) => s + calcVenda(v).liquido, 0), ult: vs.map(v => v.data).sort().pop() };
  };
  const cs = db.clientes.map(c => ({ c, ...info(c.id) })).sort((a, b) => b.total - a.total || a.c.nome.localeCompare(b.c.nome));
  return `<div class="list">${cs.map(({ c, n, total, ult }) => `<button class="li" data-act="editCliente" data-id="${c.id}">
    <div class="li-main"><div class="li-t">${esc(c.nome)}</div><div class="li-s">${esc(c.telefone || 'sem telefone')}${ult ? ' · última compra ' + fdate(ult) : ''}</div></div>
    <div class="li-r"><div class="li-v">${brl(total)}</div><div class="li-s">${n} compra(s)</div></div></button>`).join('') || '<div class="empty">Clientes aparecem aqui ao registrar vendas.</div>'}</div>`;
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
      ${fone.length >= 10 ? `<p><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${fone.length <= 11 ? '55' + fone : fone}">Abrir conversa no WhatsApp</a></p>` : ''}
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
  const P = db.params;
  return `<div class="card">
    <div class="g2">
      <label>Nome do negócio<input id="c_nome" value="${esc(P.nome)}"></label>
      <label>Margem de lucro desejada (%)<input id="c_margem" inputmode="decimal" value="${iv(P.margem * 100)}"></label>
      <label>Mão de obra por hora (R$)<input id="c_mo" inputmode="decimal" value="${iv(P.maoObraHora)}"></label>
      <label>Perdas / desperdício (%)<input id="c_perdas" inputmode="decimal" value="${iv(P.perdas * 100)}"></label>
      <label>Impostos estimados (%)<input id="c_imp" inputmode="decimal" value="${iv(P.impostos * 100)}"></label>
    </div>
    <div class="sec">Formas de pagamento e taxa (%)</div>
    <div id="pags">${db.pagamentos.map(p => `<div class="g2 pag"><input class="pn" value="${esc(p.nome)}"><input class="pt" inputmode="decimal" value="${iv(p.taxa * 100)}"></div>`).join('')}</div>
    <button class="btn sm" data-act="addPag">+ forma de pagamento</button>
    <p class="hint" style="margin-top:12px">Para remover uma forma de pagamento, apague o nome. Mudanças nas taxas e impostos valem para vendas novas; vendas antigas mantêm o que foi gravado.</p>
    <button class="btn pri" data-act="salvarConfig">Salvar configurações</button>
  </div>`;
}

function viewBackup() {
  return `<div class="card"><h3>Backup</h3>
    <p class="hint" style="margin:0 0 12px">Os dados ficam guardados neste navegador, neste computador. Baixe o backup toda semana e guarde no OneDrive: se limpar o navegador ou trocar de computador, é só importar.</p>
    <div class="bar"><button class="btn pri" data-act="exportJson">Baixar backup (.json)</button><button class="btn" data-act="importJson">Restaurar backup…</button></div>
    <p class="muted" style="margin:0">Último backup: ${db.meta.ultimoBackup ? fdate(db.meta.ultimoBackup) : 'nunca'}</p></div>
  <div class="card"><h3>Exportar para Excel</h3>
    <div class="bar"><button class="btn" data-act="csvVendas">Vendas (.csv)</button><button class="btn" data-act="csvEstoque">Estoque (.csv)</button><button class="btn" data-act="csvProdutos">Produtos e preços (.csv)</button></div></div>
  <div class="card"><h3>Recomeçar</h3>
    <p class="hint" style="margin:0 0 12px">Apaga tudo e volta aos dados iniciais da planilha. Faça um backup antes.</p>
    <button class="btn danger" data-act="reset">Apagar tudo e recomeçar</button></div>`;
}

/* ---------------- arquivos ---------------- */
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = v => typeof v === 'number' ? String(rnd(v)).replace('.', ',') : `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = (rows) => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');

$('#fileImport').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data.produtos || !data.insumos || !data.vendas) throw new Error('arquivo não é um backup deste app');
    if (!confirm(`Substituir todos os dados atuais pelo backup "${f.name}"?`)) return;
    db = data; save(); render(); toast('Backup restaurado.');
  } catch (err) { toast('Não foi possível importar: ' + err.message); }
});

/* ---------------- ações ---------------- */
const ACTIONS = {
  novaVenda: () => formVenda(),
  editVenda: id => formVenda(get('vendas', id)),
  novaProducao: () => db.produtos.length ? formProducao() : toast('Cadastre um produto primeiro.'),
  editProducao: id => formProducao(get('producoes', id)),
  ajuste: ref => formAjuste(ref),
  novoProduto: () => formProduto(),
  editProduto: id => formProduto(get('produtos', id)),
  novoInsumo: () => formInsumo(),
  editInsumo: id => formInsumo(get('insumos', id)),
  novaCompra: () => db.insumos.length ? formCompra() : toast('Cadastre um insumo primeiro.'),
  editCompra: id => formCompra(get('compras', id)),
  novoCliente: () => formCliente(),
  editCliente: id => formCliente(get('clientes', id)),
  addPag: () => $('#pags').insertAdjacentHTML('beforeend', `<div class="g2 pag"><input class="pn" placeholder="Nome"><input class="pt" inputmode="decimal" value="0"></div>`),
  salvarConfig: () => {
    const P = db.params;
    P.nome = $('#c_nome').value.trim() || 'Terços';
    P.margem = pn($('#c_margem').value) / 100;
    P.maoObraHora = pn($('#c_mo').value);
    P.perdas = pn($('#c_perdas').value) / 100;
    P.impostos = pn($('#c_imp').value) / 100;
    db.pagamentos = $$('.pag').map(r => ({ nome: $('.pn', r).value.trim(), taxa: pn($('.pt', r).value) / 100 })).filter(p => p.nome);
    if (P.margem + P.impostos + taxaRef() >= 1) toast('Atenção: margem + taxas + impostos passam de 100%.');
    else toast('Configurações salvas.');
    save(); render();
  },
  exportJson: () => {
    db.meta.ultimoBackup = today(); save();
    download(`tercos-backup-${today()}.json`, JSON.stringify(db, null, 1), 'application/json');
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
    if (!confirm('Apagar TODOS os dados e voltar ao início? Isso não pode ser desfeito.')) return;
    seed(); save(); location.hash = 'inicio'; render(); toast('Dados reiniciados.');
  },
};

/* ---------------- início ---------------- */
load();
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
