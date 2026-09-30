'use strict';
/* Sincronização entre aparelhos usando um repositório PRIVADO do GitHub.
   - dados.json          → todos os dados do app
   - fotos/<id>.jpg      → foto da galeria em alta
   - fotos/<id>_t.jpg    → miniatura (o celular baixa só esta; a grande vem quando precisar)
   A chave (token) fica só no navegador de cada aparelho. O celular recebe a chave por QR Code.
   Quando os dois aparelhos mudam ao mesmo tempo, as alterações são juntadas registro a registro. */

const Sync = (() => {
  const CFG_KEY = 'tercos-sync', BASE_KEY = 'tercos-sync-base';
  const APP_URL = 'https://picuuai.github.io/amor_e_fe/';
  let cfg = ler(CFG_KEY);            // { repo, token, sha, ultima, fotos: {id: 1} }
  let status = cfg ? 'pendente' : 'off', msg = '';
  let timer = 0, rodando = false, denovo = false, fotosRodando = false, renderPendente = false;

  function ler(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
  function gravarCfg() { try { if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); else localStorage.removeItem(CFG_KEY); } catch { } }
  const J = x => x === undefined ? undefined : JSON.stringify(x);
  const aparelho = () => /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'celular' : 'computador';

  /* ---------- junção de alterações (3 vias: base comum, este aparelho, nuvem) ---------- */
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const isIdArr = v => Array.isArray(v) && v.every(x => isObj(x) && typeof x.id === 'string');
  function merge(b, l, r) {
    if (J(l) === J(r)) return l;
    if (J(l) === J(b)) return r;          // só a nuvem mudou
    if (J(r) === J(b)) return l;          // só este aparelho mudou
    if (isObj(l) && isObj(r)) {           // os dois mudaram: junta campo a campo
      const bb = isObj(b) ? b : {}, o = {};
      for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) { const v = merge(bb[k], l[k], r[k]); if (v !== undefined) o[k] = v; }
      return o;
    }
    if ((isIdArr(l) || l === undefined) && (isIdArr(r) || r === undefined)) return mergeArr(isIdArr(b) ? b : [], l || [], r || []);
    return l !== undefined ? l : r;       // conflito no mesmo campo: vale o deste aparelho
  }
  function mergeArr(b, l, r) {
    const B = new Map(b.map(x => [x.id, x])), L = new Map(l.map(x => [x.id, x])), R = new Map(r.map(x => [x.id, x]));
    const out = [];
    for (const id of new Set([...r.map(x => x.id), ...l.map(x => x.id)])) {
      const v = merge(B.get(id), L.get(id), R.get(id));
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  // duas vendas criadas ao mesmo tempo em aparelhos diferentes podem pegar o mesmo número
  function corrigirNumeros(d) {
    const vistos = new Set();
    let max = Math.max(0, ...d.vendas.map(v => parseInt(String(v.numero).replace(/\D/g, '')) || 0));
    for (const v of [...d.vendas].sort((a, b) => a.id.localeCompare(b.id))) {
      if (vistos.has(v.numero)) v.numero = 'V' + String(++max).padStart(4, '0');
      vistos.add(v.numero);
    }
  }

  /* ---------- GitHub ---------- */
  const b64enc = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const b64dec = str => Uint8Array.from(atob(str.replace(/\s/g, '')), c => c.charCodeAt(0));
  function gh(caminho, op = {}, c = cfg) {
    return fetch(`https://api.github.com/repos/${c.repo}${caminho}`, {
      cache: 'no-store', ...op,
      headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(op.headers || {}) },
    });
  }
  function erroGH(r, t = '') {
    const e = new Error(
      r.status === 401 ? 'a chave do GitHub é inválida ou venceu'
        : r.status === 403 ? (/rate limit/i.test(t) ? 'limite do GitHub atingido, tente em alguns minutos' : 'a chave não tem permissão de escrita neste repositório')
          : r.status === 404 ? 'repositório não encontrado (confira o nome e se a chave tem acesso a ele)'
            : `o GitHub respondeu ${r.status}`);
    e.status = r.status; return e;
  }
  async function lerArquivo(path, c = cfg) {
    const r = await gh(`/contents/${path}`, {}, c);
    if (r.status === 404) return null;
    if (!r.ok) throw erroGH(r, await r.text());
    const j = await r.json();
    let bytes;
    if (j.encoding === 'base64' && j.content) bytes = b64dec(j.content);
    else { // arquivos acima de 1 MB vêm só pelo modo "raw"
      const r2 = await gh(`/contents/${path}`, { headers: { Accept: 'application/vnd.github.raw+json' } }, c);
      if (!r2.ok) throw erroGH(r2, await r2.text());
      bytes = new Uint8Array(await r2.arrayBuffer());
    }
    return { sha: j.sha, bytes };
  }
  async function gravarArquivo(path, bytes, sha, message) {
    const r = await gh(`/contents/${path}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: b64enc(bytes), ...(sha ? { sha } : {}) }),
    });
    if (r.status === 409 || r.status === 422) { const e = new Error('conflito'); e.conflito = true; throw e; }
    if (!r.ok) throw erroGH(r, await r.text());
    return (await r.json()).content.sha;
  }
  async function apagarArquivo(path) {
    const r = await gh(`/contents/${path}`);
    if (!r.ok) return;
    const { sha } = await r.json();
    await gh(`/contents/${path}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'apagar foto', sha }) });
  }

  /* ---------- sincronização dos dados ---------- */
  function gravarLocal(str) { try { localStorage.setItem(KEY, str); } catch { toast('Memória do navegador cheia.'); } }
  function atualizarTela() {
    if (dlg.open || location.hash === '#divulgar') renderPendente = true;
    else render();
  }
  function agendar(ms = 2500) { if (!cfg) return; clearTimeout(timer); timer = setTimeout(sincronizar, ms); }

  async function sincronizar() {
    if (!cfg) return;
    if (dlg.open) { agendar(4000); return; }   // não troca os dados com uma janela de edição aberta
    if (rodando) { denovo = true; return; }
    if (!navigator.onLine) { setStatus('offline'); return; }
    rodando = true; setStatus('sincronizando');
    try {
      if (!(await verificarAparelho())) return;   // foi desconectado pelo computador principal
      for (let tentativa = 0; tentativa < 4; tentativa++) {
        const snap = J(db), baseStr = localStorage.getItem(BASE_KEY);
        const rem = await lerArquivo('dados.json');
        const remoto = rem ? JSON.parse(new TextDecoder().decode(rem.bytes)) : null;
        if (rem && rem.sha === cfg.sha && snap === baseStr) break;   // nada mudou em lugar nenhum
        let final;
        if (!remoto) final = JSON.parse(snap);                          // nuvem vazia: envia o deste aparelho
        else if (!baseStr) final = remoto;                              // aparelho recém-conectado: usa a nuvem
        else final = merge(JSON.parse(baseStr), JSON.parse(snap), remoto);
        if (Array.isArray(final.vendas)) corrigirNumeros(final);
        const finalStr = J(final);
        let sha = rem?.sha;
        if (!remoto || finalStr !== J(remoto)) {
          try { sha = await gravarArquivo('dados.json', new TextEncoder().encode(finalStr), rem?.sha, `sync ${aparelho()} ${new Date().toLocaleString('pt-BR')}`); }
          catch (e) { if (e.conflito) continue; throw e; }                // outro aparelho gravou antes: junta de novo
        }
        // se algo mudou aqui durante a sincronização, preserva
        if (J(db) !== snap) { db = merge(JSON.parse(snap), db, final); denovo = true; }
        else db = final;
        gravarLocal(J(db));
        try { localStorage.setItem(BASE_KEY, finalStr); } catch { }
        cfg.sha = sha; gravarCfg();
        if (finalStr !== snap) atualizarTela();
        break;
      }
      cfg.ultima = new Date().toISOString(); gravarCfg();
      setStatus('ok');
      sincronizarFotos();
    } catch (e) {
      console.warn(e);
      // chave trocada/apagada: um aparelho secundário fica bloqueado e apaga os dados
      if (e.status === 401 && !ehPrincipal()) { rodando = false; return apagarEsteAparelho('chave'); }
      setStatus(navigator.onLine ? 'erro' : 'offline', e.status === 401 ? 'a chave foi apagada ou venceu — cole uma nova em “Trocar a chave”' : e.message);
    } finally {
      rodando = false;
      if (denovo) { denovo = false; agendar(1500); }
    }
  }

  /* ---------- fotos da galeria ---------- */
  async function baixarFoto(id, tipo = 'full') {
    if (!cfg) return null;
    const arq = await lerArquivo(`fotos/${id}${tipo === 'thumb' ? '_t' : ''}.jpg`);
    if (!arq) return null;
    const blob = new Blob([arq.bytes], { type: 'image/jpeg' });
    await FotoDB.put(tipo, id, blob);
    if (tipo === 'thumb') thumbURLs.delete(id);
    return blob;
  }
  async function sincronizarFotos() {
    if (!cfg || fotosRodando) return;
    fotosRodando = true;
    try {
      cfg.fotos ||= {};
      const ids = new Set((db.galeria || []).map(f => f.id));
      // envia as fotos novas deste aparelho
      const enviar = [...ids].filter(id => !cfg.fotos[id]);
      let n = 0;
      for (const id of enviar) {
        const full = await FotoDB.get('full', id), th = await FotoDB.get('thumb', id);
        if (!full) continue;
        setStatus('fotos', `Enviando fotos ${++n}/${enviar.length}…`);
        for (const [path, b] of [[`fotos/${id}.jpg`, full], [`fotos/${id}_t.jpg`, th]]) {
          if (!b) continue;
          try { await gravarArquivo(path, new Uint8Array(await b.arrayBuffer()), null, 'foto da galeria'); }
          catch (e) { if (!e.conflito) throw e; }   // já estava lá
        }
        cfg.fotos[id] = 1; gravarCfg();
      }
      // apaga da nuvem as fotos apagadas aqui
      for (const id of Object.keys(cfg.fotos)) {
        if (ids.has(id)) continue;
        setStatus('fotos', 'Apagando fotos removidas…');
        await apagarArquivo(`fotos/${id}.jpg`); await apagarArquivo(`fotos/${id}_t.jpg`);
        delete cfg.fotos[id]; gravarCfg();
      }
      // baixa as miniaturas que faltam neste aparelho (a foto grande vem quando for usada)
      let baixou = false;
      for (const id of ids) {
        if (await FotoDB.get('thumb', id)) { cfg.fotos[id] = 1; continue; }
        setStatus('fotos', 'Baixando fotos…');
        if (await baixarFoto(id, 'thumb')) { baixou = true; cfg.fotos[id] = 1; gravarCfg(); }
      }
      // limpa arquivos locais de fotos apagadas em outro aparelho
      for (const store of ['full', 'thumb']) for (const k of await FotoDB.keys(store)) if (!ids.has(k)) await FotoDB.delStore(store, k);
      if (baixou) { if (location.hash === '#galeria' && !dlg.open) render(); else hydrateThumbs(); }
      setStatus('ok');
    } catch (e) {
      console.warn(e);
      setStatus(navigator.onLine ? 'erro' : 'offline', e.message);
    } finally { fotosRodando = false; }
  }

  // descobre por que o repositório não aparece: chave inválida, dono diferente ou repositório não liberado na chave
  async function diagnosticar(c) {
    const api = p => fetch('https://api.github.com' + p, { cache: 'no-store', headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    try {
      const u = await api('/user');
      if (u.status === 401) return 'a chave foi recusada pelo GitHub (copiada pela metade, apagada ou vencida). Gere uma nova e cole de novo.';
      const login = u.ok ? (await u.json()).login : '';
      const dono = c.repo.split('/')[0];
      if (login && login.toLowerCase() !== dono.toLowerCase()) return `a chave é da conta "${login}", mas o repositório informado é de "${dono}". Use ${login}/amor_e_fe_dados ou crie a chave na conta ${dono}.`;
      const rr = await api('/user/repos?per_page=100&sort=updated');
      const nomes = rr.ok ? (await rr.json()).map(x => x.full_name) : [];
      if (!nomes.length) return 'a chave não tem acesso a nenhum repositório. Crie uma chave nova e, em "Repository access", escolha "Only select repositories" e marque amor_e_fe_dados (o repositório precisa existir antes de criar a chave).';
      return `a chave só enxerga: ${nomes.join(', ')}. Confira o nome do repositório (sem espaços, com _ ) ou crie uma chave nova marcando amor_e_fe_dados em "Only select repositories".`;
    } catch {
      return 'repositório não encontrado (confira o nome e se a chave tem acesso a ele)';
    }
  }

  /* ---------- aparelhos conectados (aparelhos.json no repositório) ---------- */
  const DEV_KEY = 'tercos-aparelho', REVOGADO_KEY = 'tercos-revogado';
  function nomePadrao() {
    const ua = navigator.userAgent;
    const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Celular Android' : /Windows/.test(ua) ? 'Computador Windows' : /Mac/.test(ua) ? 'Mac' : 'Aparelho';
    const nav = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : '';
    return nav ? `${so} · ${nav}` : so;
  }
  function meuAparelho() {
    let d = ler(DEV_KEY);
    if (!d) { d = { id: uid(), nome: nomePadrao() }; try { localStorage.setItem(DEV_KEY, JSON.stringify(d)); } catch { } }
    return d;
  }
  // principal = conectado colando a chave (os outros entram pelo QR Code)
  const ehPrincipal = () => !!cfg && (cfg.principal ?? !/Android|iPhone|iPad/i.test(navigator.userAgent));
  async function lerAparelhos() {
    const a = await lerArquivo('aparelhos.json');
    return a ? { sha: a.sha, lista: JSON.parse(new TextDecoder().decode(a.bytes)) } : { sha: null, lista: {} };
  }
  async function alterarAparelhos(fn) {
    for (let t = 0; t < 4; t++) {
      const { sha, lista } = await lerAparelhos();
      const nova = fn(lista);
      try { await gravarArquivo('aparelhos.json', new TextEncoder().encode(JSON.stringify(nova, null, 1)), sha, 'aparelhos conectados'); return nova; }
      catch (e) { if (!e.conflito) throw e; }
    }
    throw new Error('não foi possível atualizar a lista de aparelhos');
  }
  let ultimaVerif = 0;
  // registra este aparelho e confere se o computador principal mandou desconectar
  async function verificarAparelho(forcar = false) {
    if (!forcar && Date.now() - ultimaVerif < 5 * 60e3) return true;
    ultimaVerif = Date.now();
    const eu = meuAparelho(), { lista } = await lerAparelhos(), reg = lista[eu.id];
    if (reg?.revogado) { await apagarEsteAparelho(); return false; }
    const agora = new Date().toISOString();
    if (!reg || reg.principal !== ehPrincipal() || Date.now() - Date.parse(reg.ultimoAcesso || 0) > 15 * 60e3) {
      await alterarAparelhos(l => {
        l[eu.id] = { nome: eu.nome, conectadoEm: agora, ...(l[eu.id] || {}), tipo: aparelho(), principal: ehPrincipal(), ultimoAcesso: agora };
        return l;
      });
    }
    return true;
  }
  // motivo: 'revogado' (desconectado pelo principal), 'chave' (chave trocada) ou 'saiu' (desconectou por conta própria)
  async function apagarEsteAparelho(motivo = 'revogado') {
    const eu = meuAparelho();
    if (motivo !== 'chave') try { await alterarAparelhos(l => { if (l[eu.id]) l[eu.id].removidoEm = new Date().toISOString(); return l; }); } catch { }
    cfg = null; clearTimeout(timer);
    for (const k of [KEY, CFG_KEY, BASE_KEY]) try { localStorage.removeItem(k); } catch { }
    try { await FotoDB.apagarTudo(); } catch { }
    try { if (motivo !== 'saiu') localStorage.setItem(REVOGADO_KEY, motivo); } catch { }
    location.hash = 'inicio'; location.reload();
  }
  const haQuanto = iso => {
    if (!iso) return '—';
    const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    return m < 2 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dia(s)`;
  };
  const dataHora = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  async function carregarAparelhos() {
    const box = $('#devList'); if (!box) return;
    try {
      const { lista } = await lerAparelhos(), eu = meuAparelho().id;
      const devs = Object.entries(lista).sort((a, b) => (b[1].ultimoAcesso || '').localeCompare(a[1].ultimoAcesso || ''));
      box.innerHTML = devs.length ? `<div class="list">${devs.map(([id, d]) => {
        let st, acoes = '';
        if (d.removidoEm) { st = `<span class="tag bad">desconectado ${dataHora(d.removidoEm)}</span>`; acoes = `<button class="btn sm" data-dev="remover" data-id="${id}">Tirar da lista</button>`; }
        else if (d.revogado) { st = `<span class="tag warn">desconexão pendente</span> <span class="li-s" style="display:inline">sai quando abrir o app com internet</span>`; acoes = `<button class="btn sm" data-dev="remover" data-id="${id}">Tirar da lista</button>`; }
        else { st = `último acesso ${haQuanto(d.ultimoAcesso)} · conectado em ${dataHora(d.conectadoEm)}`; if (id !== eu) acoes = `<button class="btn sm" data-dev="renomear" data-id="${id}">Renomear</button><button class="btn sm danger" data-dev="revogar" data-id="${id}">Desconectar</button>`; else acoes = `<button class="btn sm" data-dev="renomear" data-id="${id}">Renomear</button>`; }
        return `<div class="li" style="cursor:default"><div class="av ${d.tipo === 'celular' ? 't-rose' : 't-blue'}">${ic(d.tipo === 'celular' ? 'phone' : 'monitor')}</div>
          <div class="li-main"><div class="li-t" style="white-space:normal">${esc(d.nome || 'Aparelho')} ${id === eu ? '<span class="tag">este aparelho</span>' : ''} ${d.principal ? '<span class="tag ok">principal</span>' : ''}</div>
          <div class="li-s" style="white-space:normal">${st}</div></div>
          <div class="li-r" style="flex-direction:row;gap:6px">${acoes}</div></div>`;
      }).join('')}</div>` : '<div class="muted">Nenhum aparelho registrado ainda.</div>';
    } catch (e) { box.innerHTML = `<div class="alert bad">${ic('alert')}<div>Não foi possível carregar a lista: ${esc(e.message)}</div></div>`; }
  }
  async function acaoAparelho(a, id) {
    const { lista } = await lerAparelhos(), d = lista[id]; if (!d) return carregarAparelhos();
    if (a === 'renomear') {
      const nome = prompt('Nome deste aparelho (ex.: Celular da Elisa):', d.nome || '');
      if (!nome?.trim()) return;
      await alterarAparelhos(l => { if (l[id]) l[id].nome = nome.trim(); return l; });
      if (id === meuAparelho().id) { const eu = meuAparelho(); eu.nome = nome.trim(); localStorage.setItem(DEV_KEY, JSON.stringify(eu)); }
    }
    if (a === 'revogar') {
      if (!confirm(`Desconectar “${d.nome}”?\n\nNa próxima vez que ele abrir o app com internet, ele sai da sincronização e os dados do negócio são apagados dele.\n\nSe o aparelho foi PERDIDO ou ROUBADO, use também “Trocar a chave” — assim ele perde o acesso na hora.`)) return;
      await alterarAparelhos(l => { if (l[id]) { l[id].revogado = true; l[id].revogadoEm = new Date().toISOString(); } return l; });
      toast(`${d.nome} será desconectado.`);
    }
    if (a === 'remover') await alterarAparelhos(l => { delete l[id]; return l; });
    carregarAparelhos();
  }
  async function trocarChave(token) {
    token = token.trim(); if (!token) throw new Error('cole a chave nova');
    const teste = { repo: cfg.repo, token };
    const r = await gh('', {}, teste);
    if (!r.ok) throw new Error(await diagnosticar(teste));
    const w = await gh('/contents/dados.json', {}, teste);
    if (!w.ok && w.status !== 404) throw erroGH(w, await w.text());
    cfg.token = token; gravarCfg();
    // os outros aparelhos passam a ter a chave antiga (inválida); marca como desconectados
    await alterarAparelhos(l => { for (const [id, d] of Object.entries(l)) if (id !== meuAparelho().id && !d.removidoEm) { d.revogado = true; d.removidoEm = new Date().toISOString(); } return l; });
  }

  /* ---------- conectar / desconectar ---------- */
  const temDadosLocais = () => db.vendas.length || db.clientes.length || (db.galeria || []).length || db.producoes.length > 1 || db.compras.length > 15;
  async function conectar(repo, token, principal = true) {
    repo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    token = token.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('o repositório deve ficar no formato usuario/nome');
    if (!token) throw new Error('cole a chave do GitHub');
    const novo = { repo, token, fotos: {} };
    const r = await gh('', {}, novo);
    if (r.status === 404 || r.status === 401) throw new Error(await diagnosticar(novo));
    if (!r.ok) throw erroGH(r, await r.text());
    const info = await r.json();
    if (!info.private) throw new Error('o repositório precisa ser PRIVADO (os dados do negócio ficariam públicos)');
    const rem = await lerArquivo('dados.json', novo);
    if (rem && temDadosLocais() && !confirm('Já existem dados na nuvem.\n\nOs dados deste aparelho serão SUBSTITUÍDOS pelos da nuvem. Continuar?')) return false;
    cfg = { ...novo, principal }; gravarCfg();
    try { localStorage.removeItem(BASE_KEY); } catch { }
    ultimaVerif = 0;
    await sincronizar();
    return true;
  }
  async function desconectar() {
    if (!ehPrincipal()) return apagarEsteAparelho('saiu'); // celular: sai e não deixa dados para trás
    const eu = meuAparelho().id;
    try { await alterarAparelhos(l => { delete l[eu]; return l; }); } catch { }
    cfg = null; gravarCfg();
    try { localStorage.removeItem(BASE_KEY); } catch { }
    clearTimeout(timer); setStatus('off');
  }

  /* ---------- aparência ---------- */
  const TXT = {
    off: ['Só neste aparelho', 'sliders', ''], pendente: ['Alterações a enviar', 'refresh', 'pending'],
    sincronizando: ['Sincronizando…', 'refresh', 'sending'], fotos: ['Sincronizando fotos…', 'refresh', 'sending'],
    ok: ['Sincronizado', 'check', 'ok'], offline: ['Sem internet', 'alert', 'offline'], erro: ['Erro ao sincronizar', 'alert', 'error'],
  };
  function setStatus(s, m = '') { status = s; msg = m; pintar(); }
  function pintar() {
    const [t, i, c] = TXT[status] || TXT.off;
    for (const el of $$('.sync-badge')) {
      el.classList.remove('ok', 'pending', 'sending', 'offline', 'error', 'login');
      if (c) el.classList.add(c);
      el.innerHTML = `${ic(i)}<span>${esc(status === 'fotos' && msg ? msg : t)}</span>`; el.title = msg || t; }
    const box = $('#syncBox'); if (box) box.innerHTML = boxHTML();
  }
  function boxHTML() {
    const [t, i, c] = TXT[status] || TXT.off;
    const tone = { ok: 'ok', error: 'bad', offline: 'warn', '': 'info' }[c] ?? 'info';
    return `<div class="alert ${tone}">${ic(i)}<div><b>${t}</b>${msg ? ` — ${esc(msg)}` : ''}<br>
      <span style="font-weight:500">Repositório <b>${esc(cfg.repo)}</b>${cfg.ultima ? ` · última sincronização ${new Date(cfg.ultima).toLocaleString('pt-BR')}` : ''}</span></div></div>`;
  }

  function view() {
    if (cfg && ehPrincipal()) setTimeout(carregarAparelhos, 0); // depois que a tela for montada
    if (cfg) return `
      <div class="card"><div class="card-h">${ic('refresh')}<h3>Sincronização ligada</h3></div>
        <div id="syncBox">${boxHTML()}</div>
        <div class="bar" style="margin:0">
          <button class="btn pri" data-sync="agora">${ic('refresh')}Sincronizar agora</button>
          ${ehPrincipal() ? `<button class="btn" data-sync="qr">${ic('grid')}Conectar o celular</button>` : ''}
          <button class="btn danger" data-sync="sair">Desconectar este aparelho</button>
        </div></div>
      ${ehPrincipal() ? `
      <div class="card"><div class="card-h">${ic('phone')}<h3>Aparelhos conectados</h3><button class="btn sm" data-sync="devs">${ic('refresh')}Atualizar</button></div>
        <p class="hint" style="margin:0 0 12px">Só aparece aqui, no computador principal. “Desconectar” tira o aparelho da sincronização e apaga dele os dados do negócio na próxima vez que ele abrir o app com internet.</p>
        <div id="devList"><div class="muted">Carregando…</div></div></div>
      <div class="card"><div class="card-h">${ic('key')}<h3>Trocar a chave</h3></div>
        <p class="hint" style="margin:0 0 12px">Use se um aparelho foi <b>perdido ou roubado</b>: o acesso dele cai na hora. Crie uma chave nova no GitHub (igual à primeira), cole aqui e depois <b>apague a chave antiga</b> no GitHub. Os outros aparelhos precisarão ler o QR Code de novo.</p>
        <div class="bar" style="margin:0;align-items:flex-end"><label style="flex:1;min-width:220px;margin:0">Chave nova<input id="syNova" type="password" autocomplete="off" placeholder="github_pat_…"></label>
        <button class="btn" data-sync="trocar">${ic('key')}Trocar a chave</button></div></div>` : ''}
      <div class="card"><div class="card-h">${ic('shield')}<h3>Bom saber</h3></div>
        <ul style="margin:0;padding-left:20px;line-height:1.8">
          <li>As alterações são enviadas sozinhas alguns segundos depois de salvar, e o app busca novidades a cada minuto.</li>
          <li>Se mexer nos dois aparelhos ao mesmo tempo, as alterações são juntadas.</li>
          <li>Sem internet o app continua funcionando e sincroniza quando a conexão voltar.</li>
          <li>Perdeu o celular? No GitHub, em <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener">Settings → Personal access tokens</a>, apague a chave “App Terços” e crie outra.</li>
        </ul></div>`;
    return setupHTML();
  }
  function setupHTML() {
    return `
      <div class="card" style="text-align:left"><div class="card-h">${ic('refresh')}<h3>Configurar o computador principal</h3></div>
        <p class="hint" style="margin:0 0 14px">Os dados e as fotos ficam num repositório <b>privado</b> do seu GitHub. Configure <b>no computador</b>; o celular se conecta depois lendo um QR Code.</p>
        <ol class="steps">
          <li><b>Crie o repositório privado</b> dos dados:
            <a class="btn sm" href="https://github.com/new?name=amor_e_fe_dados&visibility=private" target="_blank" rel="noopener">Abrir no GitHub</a>
            <div class="hint" style="margin:6px 0 0">Nome <code>amor_e_fe_dados</code>, marque <b>Private</b> e clique em <b>Create repository</b>.</div></li>
          <li><b>Crie a chave de acesso</b>:
            <a class="btn sm" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Abrir no GitHub</a>
            <div class="hint" style="margin:6px 0 0">Token name: <code>App Terços</code> · Expiration: a mais longa · Repository access: <b>Only select repositories</b> → <code>amor_e_fe_dados</code> ·
            Permissions → Repository permissions → <b>Contents: Read and write</b> · clique em <b>Generate token</b> e copie.</div></li>
          <li><b>Cole aqui</b> e conecte:
            <div class="g2" style="margin-top:8px">
              <label>Repositório<input id="syRepo" value="picuuai/amor_e_fe_dados" autocomplete="off"></label>
              <label>Chave (token)<input id="syToken" type="password" autocomplete="off" placeholder="github_pat_…"></label>
            </div>
            <button class="btn pri" data-sync="conectar">${ic('check')}Conectar</button></li>
        </ol>
        <p class="hint" style="margin:14px 0 0">No celular não precisa fazer nada disso: no computador, depois de conectado, clique em <b>Conectar o celular</b> e aponte a câmera para o QR Code.</p>
      </div>`;
  }

  // tela mostrada em aparelhos não autorizados: não dá acesso a nada do app
  let conectandoQR = false;
  function lockView() {
    if (conectandoQR) return `<div class="lock"><div class="lock-ic">${ic('refresh', 'big')}</div><h2>Conectando…</h2><p class="muted">Baixando os dados do negócio. Só um instante.</p></div>`;
    return `<div class="lock">
      <div class="lock-ic">${ic('shield', 'big')}</div>
      <h2>Aparelho não autorizado</h2>
      <p class="muted">Este app só abre em aparelhos liberados pelo computador principal.</p>
      <button class="pill-cam" data-sync="scan">${ic('camera')}Ler QR Code</button>
      <div class="card" style="text-align:left">
        <b>Para liberar este aparelho:</b>
        <ol class="steps" style="margin-top:8px">
          <li>No computador principal, abra <b>Cadastros → Computador e celular</b>.</li>
          <li>Clique em <b>Conectar o celular</b>.</li>
          <li>Aqui, toque em <b>Ler QR Code</b> e aponte para o código na tela do computador.</li>
        </ol>
      </div>
      <details class="lock-setup"><summary>Sou o dono e quero configurar este aparelho como computador principal</summary>${setupHTML()}</details>
    </div>`;
  }

  /* ---------- leitor de QR Code (câmera ou foto) ---------- */
  const carregarScript = src => new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = err; document.head.appendChild(s); });
  // usa o leitor nativo do navegador (Android) ou a biblioteca jsQR como alternativa
  async function decodificador() {
    if ('BarcodeDetector' in window) {
      try {
        if ((await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
          const bd = new BarcodeDetector({ formats: ['qr_code'] });
          return async src => (await bd.detect(src))[0]?.rawValue;
        }
      } catch { }
    }
    if (!window.jsQR) await carregarScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js');
    const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
    return async src => {
      const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
      if (!w || !h) return null;
      const k = Math.min(1, 900 / Math.max(w, h));
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      g.drawImage(src, 0, 0, c.width, c.height);
      return jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data;
    };
  }
  function lerQR() {
    let stream = null, parar = false;
    modal({
      title: 'Ler QR Code',
      body: `<div class="scan"><video playsinline muted></video><div class="scan-frame"></div></div>
        <p class="hint" style="text-align:center;margin:12px 0">Aponte para o QR Code na tela do computador principal.</p>
        <div id="scanMsg"></div>
        <div class="bar" style="justify-content:center;margin:0"><label class="btn sm" style="margin:0">${ic('image')}Usar uma foto do QR Code<input type="file" id="scanFoto" accept="image/*" hidden></label></div>`,
      onOpen: async root => {
        const video = $('video', root), msgEl = $('#scanMsg', root);
        const aviso = (t, tom = 'warn') => { msgEl.innerHTML = `<div class="alert ${tom}">${ic('alert')}<div>${t}</div></div>`; };
        dlg.addEventListener('close', () => { parar = true; stream?.getTracks().forEach(t => t.stop()); }, { once: true });
        const tratar = texto => {
          const m = String(texto || '').match(/#conectar=([^&\s]+)/);
          if (!m) { if (texto) aviso('Este QR Code não é o de conexão do app. Use o que aparece em “Conectar o celular”.'); return false; }
          parar = true; dlg.close(); conectarPorCodigo(m[1]); return true;
        };
        let dec;
        try { dec = await decodificador(); } catch { aviso('Não foi possível carregar o leitor (sem internet?).', 'bad'); return; }
        $('#scanFoto', root).onchange = async e => {
          const f = e.target.files[0]; if (!f) return;
          try { if (!tratar(await dec(await blobToImage(f)))) aviso('Não encontrei um QR Code nesta foto. Tente de novo, bem de frente para a tela.'); }
          catch { aviso('Não foi possível ler esta foto.'); }
        };
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          if (parar) { stream.getTracks().forEach(t => t.stop()); return; }
          video.srcObject = stream; await video.play();
        } catch {
          aviso('Não foi possível abrir a câmera. Permita o acesso à câmera nas configurações do navegador, ou use uma foto do QR Code.');
          video.parentElement.hidden = true; return;
        }
        const tick = async () => {
          if (parar) return;
          try { if (tratar(await dec(video))) return; } catch { }
          setTimeout(tick, 250);
        };
        tick();
      },
    });
  }
  function conectarPorCodigo(codigo) {
    try {
      const { r, t } = JSON.parse(atob(decodeURIComponent(codigo)));
      conectandoQR = true; render();
      conectar(r, t, false)
        .then(ok => { if (ok) toast('Aparelho conectado! Os dados foram baixados.'); })
        .catch(err => toast('Não foi possível conectar: ' + err.message))
        .finally(() => { conectandoQR = false; render(); });
    } catch { toast('Código de conexão inválido.'); }
  }

  async function mostrarQR() {
    if (!window.qrcode) {
      await new Promise((ok, err) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = ok; s.onerror = err; document.head.appendChild(s); })
        .catch(() => { toast('Não foi possível gerar o QR Code (sem internet?).'); throw 0; });
    }
    const codigo = btoa(JSON.stringify({ r: cfg.repo, t: cfg.token }));
    const qr = qrcode(0, 'M'); qr.addData(`${APP_URL}#conectar=${encodeURIComponent(codigo)}`); qr.make();
    modal({
      title: 'Conectar o celular',
      body: `<div class="qr">${qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true })}</div>
        <ol class="steps" style="margin-top:14px">
          <li>No celular, abra o app e toque em <b>Ler QR Code</b> (ou use a câmera do celular e toque no link).</li>
          <li>No menu do navegador do celular, escolha <b>Adicionar à tela inicial</b> (ou <b>Instalar app</b>).</li>
        </ol>
        <div class="alert warn" style="margin-top:12px">${ic('shield')}<div>Este código dá acesso aos dados do negócio. Não mostre nem envie para outras pessoas.</div></div>`,
    });
  }

  document.addEventListener('click', async e => {
    const dv = e.target.closest('[data-dev]');
    if (dv) { dv.disabled = true; try { await acaoAparelho(dv.dataset.dev, dv.dataset.id); } catch (err) { toast('Erro: ' + err.message); } dv.disabled = false; return; }
    const b = e.target.closest('[data-sync]'); if (!b) return;
    const a = b.dataset.sync;
    if (a === 'devs') carregarAparelhos();
    if (a === 'scan') lerQR();
    if (a === 'trocar') {
      b.disabled = true;
      try { await trocarChave($('#syNova').value); toast('Chave trocada. Agora apague a chave antiga no GitHub e reconecte os outros aparelhos pelo QR Code.'); render(); }
      catch (err) { toast('Não foi possível trocar: ' + err.message); }
      b.disabled = false;
    }
    if (a === 'agora') { cfg.sha = null; ultimaVerif = 0; await sincronizar(); if (status === 'ok') toast('Sincronizado.'); }
    if (a === 'qr') mostrarQR().catch(() => { });
    if (a === 'sair') {
      const txt = ehPrincipal()
        ? 'Desconectar este computador?\n\nOs dados continuam na nuvem, mas o app fica BLOQUEADO aqui até você colar a chave de novo.'
        : 'Desconectar este aparelho?\n\nO app fica bloqueado e os dados do negócio são apagados daqui (continuam na nuvem). Para voltar, leia o QR Code de novo.';
      if (confirm(txt)) { await desconectar(); render(); }
    }
    if (a === 'conectar') {
      b.disabled = true; b.textContent = 'Conectando…';
      try { if (await conectar($('#syRepo').value, $('#syToken').value)) { toast('Conectado! Agora conecte o celular pelo QR Code.'); render(); } }
      catch (err) {
        // mensagem fica na tela (o aviso rápido some antes de dar para ler)
        let el = $('#syErro');
        if (!el) { b.insertAdjacentHTML('afterend', '<div id="syErro" class="alert bad" style="margin-top:12px"></div>'); el = $('#syErro'); }
        el.innerHTML = `${ic('alert')}<div><b>Não foi possível conectar:</b> ${esc(err.message)}</div>`;
      }
      finally { b.disabled = false; b.innerHTML = `${ic('check')}Conectar`; }
    }
  });

  function init() {
    // este aparelho foi desconectado pelo computador principal
    const rev = localStorage.getItem(REVOGADO_KEY);
    if (rev) {
      try { localStorage.removeItem(REVOGADO_KEY); } catch { }
      const motivo = rev === 'chave' ? 'A chave de acesso foi trocada no computador principal' : 'Este aparelho foi desconectado pelo computador principal';
      setTimeout(() => modal({ title: 'Aparelho desconectado', body: `<div class="alert warn">${ic('shield')}<div>${motivo} e os dados do negócio foram apagados dele.<br>Para voltar a usar, leia de novo o QR Code no computador.</div></div>` }), 300);
    }
    // celular chegando pelo QR Code: #conectar=<código>
    const m = location.hash.match(/^#conectar=(.+)$/);
    if (m) {
      history.replaceState(null, '', location.pathname + location.search + '#inicio'); // tira a chave da barra de endereço
      setTimeout(() => conectarPorCodigo(m[1]), 0);
    }
    setInterval(() => { if (cfg && document.visibilityState === 'visible') agendar(0); }, 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') agendar(0); });
    addEventListener('online', () => agendar(0));
    addEventListener('offline', () => cfg && setStatus('offline'));
    dlg.addEventListener('close', () => { if (renderPendente) { renderPendente = false; render(); } agendar(); });
    if (cfg && !m) agendar(300);
  }

  return {
    init, view, lockView, pintar, baixarFoto,
    ativo: () => !!cfg,
    bloqueado: () => !cfg,
    alterado: () => { if (!cfg) return; if (status !== 'sincronizando') setStatus('pendente'); agendar(); },
  };
})();
