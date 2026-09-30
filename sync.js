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
      setStatus(navigator.onLine ? 'erro' : 'offline', e.message);
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

  /* ---------- conectar / desconectar ---------- */
  const temDadosLocais = () => db.vendas.length || db.clientes.length || (db.galeria || []).length || db.producoes.length > 1 || db.compras.length > 15;
  async function conectar(repo, token) {
    repo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    token = token.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('o repositório deve ficar no formato usuario/nome');
    if (!token) throw new Error('cole a chave do GitHub');
    const novo = { repo, token, fotos: {} };
    const r = await gh('', {}, novo);
    if (!r.ok) throw erroGH(r, await r.text());
    const info = await r.json();
    if (!info.private) throw new Error('o repositório precisa ser PRIVADO (os dados do negócio ficariam públicos)');
    const rem = await lerArquivo('dados.json', novo);
    if (rem && temDadosLocais() && !confirm('Já existem dados na nuvem.\n\nOs dados deste aparelho serão SUBSTITUÍDOS pelos da nuvem. Continuar?')) return false;
    cfg = novo; gravarCfg();
    try { localStorage.removeItem(BASE_KEY); } catch { }
    await sincronizar();
    return true;
  }
  function desconectar() {
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
    if (cfg) return `
      <div class="card"><div class="card-h">${ic('refresh')}<h3>Sincronização ligada</h3></div>
        <div id="syncBox">${boxHTML()}</div>
        <div class="bar" style="margin:0">
          <button class="btn pri" data-sync="agora">${ic('refresh')}Sincronizar agora</button>
          <button class="btn" data-sync="qr">${ic('grid')}Conectar o celular</button>
          <button class="btn danger" data-sync="sair">Desconectar este aparelho</button>
        </div></div>
      <div class="card"><div class="card-h">${ic('shield')}<h3>Bom saber</h3></div>
        <ul style="margin:0;padding-left:20px;line-height:1.8">
          <li>As alterações são enviadas sozinhas alguns segundos depois de salvar, e o app busca novidades a cada minuto.</li>
          <li>Se mexer nos dois aparelhos ao mesmo tempo, as alterações são juntadas.</li>
          <li>Sem internet o app continua funcionando e sincroniza quando a conexão voltar.</li>
          <li>Perdeu o celular? No GitHub, em <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener">Settings → Personal access tokens</a>, apague a chave “App Terços” e crie outra.</li>
        </ul></div>`;
    return `
      <div class="card"><div class="card-h">${ic('refresh')}<h3>Usar no computador e no celular ao mesmo tempo</h3></div>
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
          <li>Abra a <b>câmera</b> do celular e aponte para o código.</li>
          <li>Toque no link que aparecer: o app abre já conectado e baixa os dados.</li>
          <li>No menu do navegador do celular, escolha <b>Adicionar à tela inicial</b> (ou <b>Instalar app</b>).</li>
        </ol>
        <div class="alert warn" style="margin-top:12px">${ic('shield')}<div>Este código dá acesso aos dados do negócio. Não mostre nem envie para outras pessoas.</div></div>`,
    });
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-sync]'); if (!b) return;
    const a = b.dataset.sync;
    if (a === 'agora') { cfg.sha = null; await sincronizar(); if (status === 'ok') toast('Sincronizado.'); }
    if (a === 'qr') mostrarQR().catch(() => { });
    if (a === 'sair') { if (confirm('Desconectar este aparelho? Os dados continuam aqui e na nuvem, mas param de sincronizar.')) { desconectar(); render(); } }
    if (a === 'conectar') {
      b.disabled = true; b.textContent = 'Conectando…';
      try { if (await conectar($('#syRepo').value, $('#syToken').value)) { toast('Conectado! Agora conecte o celular pelo QR Code.'); render(); } }
      catch (err) { toast('Não foi possível conectar: ' + err.message); }
      finally { b.disabled = false; b.innerHTML = `${ic('check')}Conectar`; }
    }
  });

  function init() {
    // celular chegando pelo QR Code: #conectar=<código>
    const m = location.hash.match(/^#conectar=(.+)$/);
    if (m) {
      history.replaceState(null, '', location.pathname + location.search + '#inicio'); // tira a chave da barra de endereço
      try {
        const { r, t } = JSON.parse(atob(decodeURIComponent(m[1])));
        conectar(r, t).then(ok => { if (ok) toast('Aparelho conectado! Os dados foram baixados.'); })
          .catch(err => toast('Não foi possível conectar: ' + err.message));
      } catch { toast('Código de conexão inválido.'); }
    }
    setInterval(() => { if (cfg && document.visibilityState === 'visible') agendar(0); }, 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') agendar(0); });
    addEventListener('online', () => agendar(0));
    addEventListener('offline', () => cfg && setStatus('offline'));
    dlg.addEventListener('close', () => { if (renderPendente) { renderPendente = false; render(); } agendar(); });
    if (cfg && !m) agendar(300);
  }

  return {
    init, view, pintar, baixarFoto,
    ativo: () => !!cfg,
    alterado: () => { if (!cfg) return; if (status !== 'sincronizando') setStatus('pendente'); agendar(); },
  };
})();
