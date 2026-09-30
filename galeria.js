'use strict';
/* Galeria de fotos dos terços produzidos.
   Os dados de cada foto (terço, situação, datas) ficam em db.galeria; os arquivos ficam no IndexedDB,
   que aguenta muito mais que o localStorage. */

const FotoDB = (() => {
  let conn;
  const open = () => conn ||= new Promise((ok, err) => {
    const r = indexedDB.open('tercos-fotos', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('full'); r.result.createObjectStore('thumb'); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => err(r.error);
  });
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((ok, err) => {
      const t = d.transaction(store, mode), req = fn(t.objectStore(store));
      t.oncomplete = () => ok(req?.result);
      t.onerror = () => err(t.error);
    });
  };
  return {
    put: (store, k, v) => tx(store, 'readwrite', s => s.put(v, k)),
    get: (store, k) => tx(store, 'readonly', s => s.get(k)),
    keys: store => tx(store, 'readonly', s => s.getAllKeys()),
    delStore: (store, k) => tx(store, 'readwrite', s => s.delete(k)),
    apagarTudo: async () => {
      if (conn) { (await conn).close(); conn = null; }
      await new Promise(ok => { const r = indexedDB.deleteDatabase('tercos-fotos'); r.onsuccess = r.onerror = r.onblocked = ok; });
    },
    del: async k => { await tx('full', 'readwrite', s => s.delete(k)); await tx('thumb', 'readwrite', s => s.delete(k)); },
  };
})();

const galeria = () => (db.galeria ||= []);
const STATUS_G = { nova: ['Não publicada', 'warn'], publicada: ['Publicada', 'ok'], arquivada: ['Arquivada', ''] };
state.galFiltro ||= 'nova';
state.galProd ||= '';

const loadImage = src => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
const canvasBlob = (c, q = 0.88) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
function scaleCanvas(img, max) {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
async function blobToImage(blob) {
  const u = URL.createObjectURL(blob);
  try { return await loadImage(u); } finally { URL.revokeObjectURL(u); }
}

// foto em alta: se não estiver neste aparelho (veio de outro pela sincronização), baixa agora
async function fotoFull(id) {
  const b = await FotoDB.get('full', id);
  if (b || typeof Sync === 'undefined' || !Sync.ativo()) return b;
  try { return await Sync.baixarFoto(id, 'full'); } catch { return null; }
}

const thumbURLs = new Map();
async function thumbURL(id) {
  if (thumbURLs.has(id)) return thumbURLs.get(id);
  const b = await FotoDB.get('thumb', id);
  const u = b ? URL.createObjectURL(b) : '';
  thumbURLs.set(id, u);
  return u;
}
async function hydrateThumbs(root = document) {
  for (const img of $$('img[data-thumb]', root)) {
    const id = img.dataset.thumb; img.removeAttribute('data-thumb');
    const u = await thumbURL(id); if (u) img.src = u;
  }
}

async function guardarFoto(id, img) {
  await FotoDB.put('full', id, await canvasBlob(scaleCanvas(img, 1800), 0.9));
  await FotoDB.put('thumb', id, await canvasBlob(scaleCanvas(img, 420), 0.8));
}
async function adicionarFotos(files, produtoId) {
  const novas = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      const id = uid();
      await guardarFoto(id, await blobToImage(f));
      const m = { id, produtoId, data: today(), criadoEm: new Date().toISOString(), status: 'nova', publicadaEm: null, vezes: 0, obs: '' };
      galeria().push(m); novas.push(m);
    } catch (e) { console.warn(e); toast('Não foi possível ler ' + f.name); }
  }
  save();
  return novas;
}
function marcarPublicada(id) {
  const f = galeria().find(x => x.id === id); if (!f) return;
  f.status = 'publicada'; f.publicadaEm = today(); f.vezes = (f.vezes || 0) + 1;
  save();
}

/* ---------- tela ---------- */
function viewGaleria() {
  const sel = state.galSel;
  topActions(sel ? '' : `<button class="btn" data-act="galSelecionar">${ic('check')}Selecionar</button><label class="btn pri" style="margin:0">${ic('upload')}Enviar fotos<input type="file" id="galUp" accept="image/*" multiple hidden></label>`);
  let fs = galeria().filter(f => !state.galProd || f.produtoId === state.galProd);
  const n = {
    nova: fs.filter(f => f.status === 'nova').length, todas: fs.filter(f => f.status !== 'arquivada').length,
    publicada: fs.filter(f => f.status === 'publicada').length, arquivada: fs.filter(f => f.status === 'arquivada').length,
  };
  const k = state.galFiltro;
  fs = k === 'todas' ? fs.filter(f => f.status !== 'arquivada') : fs.filter(f => f.status === k);
  fs.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const chip = (key, l) => `<button class="chip ${k === key ? 'on' : ''}" data-act="galFiltro" data-id="${key}">${l} <span class="muted">${n[key]}</span></button>`;
  state._galVisiveis = fs.map(f => f.id);
  return `
  ${sel ? `<div class="selbar">
    <b>${sel.size} selecionada(s)</b>
    <button class="btn sm" data-act="galSelTodas">Selecionar todas</button>
    <span class="grow"></span>
    <button class="btn sm" data-act="galArquivarSel" ${sel.size ? '' : 'disabled'}>Arquivar</button>
    <button class="btn sm danger" data-act="galApagarSel" ${sel.size ? '' : 'disabled'}>${ic('trash')}Apagar</button>
    <button class="btn sm ghost" data-act="galSelecionar">Cancelar</button>
  </div>` : ''}
  <div class="bar">
    <div class="chips" style="margin:0">${chip('nova', 'Não publicadas')}${chip('publicada', 'Publicadas')}${chip('todas', 'Todas')}${chip('arquivada', 'Arquivadas')}</div>
    <span class="grow"></span>
    <label>Terço<select data-chg="galProd"><option value="">Todos</option>${opts(produtosOrd(), state.galProd)}</select></label>
  </div>
  ${fs.length ? `<div class="ggrid">${fs.map(f => {
    const [l, t] = STATUS_G[f.status] || STATUS_G.nova;
    const recente = f.status === 'nova' && daysBetween(f.data, today()) <= 7;
    const marcada = sel?.has(f.id);
    return `<div class="gcard ${marcada ? 'sel' : ''}">
      <button class="gimg" data-act="${sel ? 'galToggle' : 'galAbrir'}" data-id="${f.id}" aria-label="${sel ? 'Selecionar foto' : 'Abrir foto'}"><img data-thumb="${f.id}" alt="">
        <span class="gtags">${recente ? '<span class="tag">Recente</span>' : ''}<span class="tag ${t}">${f.status === 'publicada' ? 'Publicada ' + fdate(f.publicadaEm).slice(0, 5) : l}</span></span>
        ${sel ? `<span class="gcheck">${marcada ? ic('check') : ''}</span>` : ''}</button>
      <div class="gbody"><div class="li-t">${esc(nomeProduto(f.produtoId))}</div>
        <div class="li-s">${fdate(f.data)}${f.vezes ? ` · ${f.vezes} post(s)` : ''}${f.obs ? ' · ' + esc(f.obs) : ''}</div>
        <div class="gacts">
          <button class="btn sm ${f.status === 'nova' ? 'pri' : ''}" data-act="galPublicar" data-id="${f.id}">${ic('instagram')}${f.status === 'publicada' ? 'Publicar de novo' : 'Publicar'}</button>
          <button class="btn sm rmfoto" data-act="galApagar" data-id="${f.id}" aria-label="Apagar foto" title="Apagar foto">${ic('trash')}</button>
        </div></div>
    </div>`;
  }).join('')}</div>`
    : empty('image', k === 'nova' ? 'Nenhuma foto esperando publicação' : 'Nenhuma foto aqui', 'Envie as fotos dos terços produzidos em “Enviar fotos”.')}`;
}
function initGaleria() {
  hydrateThumbs($('#view'));
  const up = $('#galUp');
  if (up) up.onchange = () => { const files = [...up.files]; up.value = ''; if (files.length) formEnviarFotos(files); };
}

function formEnviarFotos(files, produtoId) {
  const ultimo = [...db.producoes].sort((a, b) => b.data.localeCompare(a.data))[0]?.produtoId;
  const sel = produtoId || state.galProd || ultimo || produtosOrd()[0]?.id;
  const urls = files.slice(0, 24).map(f => URL.createObjectURL(f));
  modal({
    title: `Enviar ${files.length} foto(s)`,
    body: `<div class="upprev">${urls.map(u => `<img src="${u}" alt="">`).join('')}</div>
      <label>Estas fotos são de qual terço?<select name="prod">${opts(produtosOrd(), sel)}</select></label>
      <p class="hint">Elas entram na galeria como “Não publicadas”. Depois é só tocar em Publicar.</p>`,
    saveLabel: 'Adicionar à galeria',
    onSave: root => {
      const pid = F(root, 'prod'), btn = $('#dlgSave');
      btn.disabled = true; btn.textContent = 'Processando…';
      adicionarFotos(files, pid).then(novas => {
        urls.forEach(u => URL.revokeObjectURL(u));
        btn.disabled = false; dlg.close();
        state.galFiltro = 'nova';
        if (location.hash === '#galeria') render(); else location.hash = 'galeria';
        toast(`${novas.length} foto(s) adicionada(s) à galeria.`);
      });
      return false; // fecha sozinho quando terminar
    },
  });
}

function formFoto(f) {
  modal({
    title: nomeProduto(f.produtoId),
    body: `<div class="gprev"><img id="gFull" alt=""></div>
      <div class="g2">
        <label>Terço<select name="prod">${opts(produtosOrd(), f.produtoId)}</select></label>
        <label>Situação<select name="status">${Object.entries(STATUS_G).map(([k, [l]]) => `<option value="${k}" ${k === f.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label>Observação<input name="obs" value="${esc(f.obs)}" placeholder="Ex.: encomenda da Maria, cor azul…"></label>
      <p class="hint">Enviada em ${fdate(f.data)}${f.publicadaEm ? ` · publicada em ${fdate(f.publicadaEm)}` : ''}${f.vezes ? ` · ${f.vezes} post(s)` : ''}</p>
      <div class="bar">
        <button type="button" class="btn pri" data-f="pub">${ic('instagram')}Publicar</button>
        <button type="button" class="btn" data-f="baixar">${ic('download')}Baixar original</button>
        <button type="button" class="btn" data-f="cadastro">${ic('tag')}Usar como foto do cadastro</button>
      </div>`,
    onOpen: async root => {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-f]'); if (!t) return;
        if (t.dataset.f === 'pub') { dlg.close(); ACTIONS.galPublicar(f.id); }
        if (t.dataset.f === 'baixar') { const b = await fotoFull(f.id); if (b) download(`terco-${slug(nomeProduto(f.produtoId))}-${f.data}.jpg`, b, 'image/jpeg'); }
        if (t.dataset.f === 'cadastro') {
          const b = await fotoFull(f.id); if (!b) return;
          const img = await blobToImage(b), side = Math.min(img.width, img.height), out = Math.min(520, side);
          const c = document.createElement('canvas'); c.width = c.height = out;
          c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
          const p = get('produtos', F(root, 'prod')), antes = p.foto;
          p.foto = c.toDataURL('image/jpeg', 0.82);
          if (save()) toast(`Foto definida para ${p.nome}.`); else p.foto = antes;
        }
      });
      const b = await fotoFull(f.id);
      if (b) { const u = URL.createObjectURL(b), img = $('#gFull', root); img.onload = () => URL.revokeObjectURL(u); img.src = u; }
    },
    onSave: root => {
      const st = F(root, 'status');
      if (st === 'publicada' && f.status !== 'publicada') { f.publicadaEm ||= today(); f.vezes ||= 1; }
      Object.assign(f, { produtoId: F(root, 'prod'), status: st, obs: F(root, 'obs').trim() });
    },
    onDelete: () => { removerFotos([f.id]); },
  });
}

function removerFotos(ids) {
  const set = new Set(ids);
  db.galeria = galeria().filter(x => !set.has(x.id));
  for (const id of ids) { FotoDB.del(id); thumbURLs.delete(id); }
  if (set.has(studio.fotoId)) { studio.fotoId = null; studio.src = null; }
}
function apagarFotos(ids) {
  if (!ids.length) return;
  if (!confirm(`Apagar ${ids.length === 1 ? 'esta foto' : ids.length + ' fotos'}? Isso não pode ser desfeito.`)) return;
  removerFotos(ids);
  state.galSel = null;
  save(); render();
  toast(ids.length === 1 ? 'Foto apagada.' : `${ids.length} fotos apagadas.`);
}

Object.assign(ACTIONS, {
  galFiltro: k => { state.galFiltro = k; render(); },
  galApagar: id => apagarFotos([id]),
  galSelecionar: () => { state.galSel = state.galSel ? null : new Set(); render(); },
  galToggle: id => { const s = state.galSel; s.has(id) ? s.delete(id) : s.add(id); render(); },
  galSelTodas: () => { const s = state.galSel, vis = state._galVisiveis || []; if (vis.every(id => s.has(id))) s.clear(); else vis.forEach(id => s.add(id)); render(); },
  galApagarSel: () => apagarFotos([...state.galSel]),
  galArquivarSel: () => {
    const s = state.galSel;
    for (const f of galeria()) if (s.has(f.id)) f.status = 'arquivada';
    toast(`${s.size} foto(s) arquivada(s).`);
    state.galSel = null; save(); render();
  },
  galAbrir: id => { const f = galeria().find(x => x.id === id); if (f) formFoto(f); },
  galPublicar: id => {
    const f = galeria().find(x => x.id === id); if (!f) return;
    Object.assign(studio, { prodId: f.produtoId, fotoId: id, src: null });
    if (location.hash === '#divulgar') render(); else location.hash = 'divulgar';
  },
});

/* ---------- backup das fotos ---------- */
const blobToDataURL = b => new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => err(r.error); r.readAsDataURL(b); });
async function fotosParaBackup() {
  const out = {};
  for (const f of galeria()) { const b = await FotoDB.get('full', f.id); if (b) out[f.id] = await blobToDataURL(b); }
  return out;
}
async function restaurarFotos(mapa) {
  let n = 0;
  for (const [id, url] of Object.entries(mapa || {})) {
    try { await guardarFoto(id, await loadImage(url)); thumbURLs.delete(id); n++; } catch (e) { console.warn(e); }
  }
  return n;
}
