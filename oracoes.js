'use strict';
/* Oração do dia: monta o cartão da oração (canvas), toca uma música suave gerada aqui mesmo
   (sem arquivo de áudio, então sem problema de direito autoral) e grava o vídeo para Reels/Stories.
   A imagem é publicada pelo mesmo "postador" do estúdio; o vídeo é baixado ou compartilhado. */

const ORACOES = [
  { id: 'pai-nosso', t: 'Pai Nosso', x: 'Pai nosso que estais nos céus,\nsantificado seja o vosso nome,\nvenha a nós o vosso reino,\nseja feita a vossa vontade,\nassim na terra como no céu.\nO pão nosso de cada dia nos dai hoje,\nperdoai-nos as nossas ofensas,\nassim como nós perdoamos a quem nos tem ofendido,\ne não nos deixeis cair em tentação,\nmas livrai-nos do mal.\nAmém.' },
  { id: 'ave-maria', t: 'Ave Maria', x: 'Ave Maria, cheia de graça,\no Senhor é convosco,\nbendita sois vós entre as mulheres\ne bendito é o fruto do vosso ventre, Jesus.\nSanta Maria, Mãe de Deus,\nrogai por nós, pecadores,\nagora e na hora de nossa morte.\nAmém.' },
  { id: 'santo-anjo', t: 'Santo Anjo', x: 'Santo Anjo do Senhor,\nmeu zeloso guardador,\nse a ti me confiou a piedade divina,\nsempre me rege, me guarda,\nme governa e me ilumina.\nAmém.' },
  { id: 'sao-francisco', t: 'Oração de São Francisco', x: 'Senhor, fazei-me instrumento de vossa paz.\nOnde houver ódio, que eu leve o amor;\nonde houver ofensa, que eu leve o perdão;\nonde houver discórdia, que eu leve a união;\nonde houver dúvida, que eu leve a fé;\nonde houver desespero, que eu leve a esperança;\nonde houver tristeza, que eu leve a alegria;\nonde houver trevas, que eu leve a luz.\nAmém.' },
  { id: 'manha', t: 'Oração da manhã', x: 'Senhor, no silêncio deste dia que amanhece,\nvenho pedir-te a paz, a sabedoria e a força.\nQue eu veja o mundo com olhos cheios de amor,\nseja paciente, compreensivo e manso,\ne que todos os que hoje se aproximarem de mim\nsintam a tua presença.\nAmém.' },
  { id: 'salve-rainha', t: 'Salve Rainha', x: 'Salve, Rainha, Mãe de misericórdia,\nvida, doçura e esperança nossa, salve!\nA vós bradamos, os degredados filhos de Eva.\nA vós suspiramos, gemendo e chorando\nneste vale de lágrimas.\nEia, pois, advogada nossa,\nesses vossos olhos misericordiosos a nós volvei,\ne depois deste desterro mostrai-nos Jesus,\nbendito fruto do vosso ventre.\nÓ clemente, ó piedosa, ó doce sempre Virgem Maria.\nAmém.' },
  { id: 'espirito-santo', t: 'Vinde, Espírito Santo', x: 'Vinde, Espírito Santo,\nenchei os corações dos vossos fiéis\ne acendei neles o fogo do vosso amor.\nEnviai o vosso Espírito e tudo será criado,\ne renovareis a face da terra.\nAmém.' },
  { id: 'gloria', t: 'Glória ao Pai', x: 'Glória ao Pai,\nao Filho\ne ao Espírito Santo.\nComo era no princípio,\nagora e sempre.\nAmém.' },
  { id: 'lembrai-vos', t: 'Lembrai-vos', x: 'Lembrai-vos, ó piíssima Virgem Maria,\nque nunca se ouviu dizer\nque algum daqueles que recorreram à vossa proteção,\nimploraram a vossa assistência\ne reclamaram o vosso socorro\nfosse por vós desamparado.\nAnimado, pois, com igual confiança,\na vós recorro, ó Virgem das virgens.\nNão desprezeis as minhas súplicas,\nmas dignai-vos de as ouvir e atender.\nAmém.' },
  { id: 'alma-de-cristo', t: 'Alma de Cristo', x: 'Alma de Cristo, santificai-me.\nCorpo de Cristo, salvai-me.\nSangue de Cristo, inebriai-me.\nÁgua do lado de Cristo, lavai-me.\nPaixão de Cristo, confortai-me.\nÓ bom Jesus, ouvi-me.\nDentro de vossas chagas, escondei-me.\nNão permitais que eu me separe de vós.\nAmém.' },
  { id: 'sao-miguel', t: 'São Miguel Arcanjo', x: 'São Miguel Arcanjo,\ndefendei-nos no combate,\nsede o nosso refúgio contra as maldades\ne ciladas do demônio.\nOrdene-lhe Deus, instantemente o pedimos,\ne vós, príncipe da milícia celeste,\npela virtude divina,\nprecipitai no inferno a Satanás\ne aos outros espíritos malignos\nque andam pelo mundo para perder as almas.\nAmém.' },
  { id: 'vossa-protecao', t: 'À vossa proteção', x: 'À vossa proteção recorremos,\nSanta Mãe de Deus.\nNão desprezeis as nossas súplicas\nem nossas necessidades,\nmas livrai-nos sempre de todos os perigos,\nó Virgem gloriosa e bendita.\nAmém.' },
  { id: 'noite', t: 'Oração da noite', x: 'Senhor, obrigado por este dia que termina.\nPerdoa as minhas faltas\ne acolhe o bem que consegui fazer.\nGuarda a minha casa e a minha família,\ndá descanso ao meu corpo e paz ao meu coração,\ne que eu acorde amanhã para te servir melhor.\nAmém.' },
  { id: 'contricao', t: 'Ato de Contrição', x: 'Meu Deus, eu me arrependo de todo o coração\nde vos ter ofendido,\nporque sois tão bom e amável.\nPrometo, com a vossa graça,\nesforçar-me para ser bom.\nMeu Jesus, misericórdia!\nAmém.' },
  { id: 'fatima', t: 'Ó meu Jesus', x: 'Ó meu Jesus,\nperdoai-nos, livrai-nos do fogo do inferno,\nlevai as almas todas para o céu\ne socorrei principalmente\nas que mais precisarem.\nAmém.' },
  { id: 'consagracao', t: 'Consagração a Nossa Senhora', x: 'Ó Senhora minha, ó minha Mãe,\neu me ofereço todo a vós\ne, em prova da minha devoção para convosco,\nvos consagro neste dia\nos meus olhos, os meus ouvidos, a minha boca,\no meu coração e inteiramente todo o meu ser.\nE, como assim sou vosso,\nó incomparável Mãe,\nguardai-me e defendei-me como coisa e propriedade vossa.\nAmém.' },
  { id: 'so-deus-basta', t: 'Só Deus basta', x: 'Nada te perturbe,\nnada te espante.\nTudo passa,\nDeus não muda.\nA paciência tudo alcança.\nQuem a Deus tem, nada lhe falta.\nSó Deus basta.', a: 'Santa Teresa de Ávila' },
  { id: 'bencao', t: 'Bênção', x: 'O Senhor te abençoe e te guarde.\nO Senhor faça resplandecer o seu rosto sobre ti\ne tenha misericórdia de ti.\nO Senhor volte para ti o seu olhar\ne te dê a paz.\nAmém.', a: 'Números 6, 24-26' },
  { id: 'serenidade', t: 'Oração da serenidade', x: 'Senhor, concedei-me a serenidade\npara aceitar as coisas que não posso mudar,\na coragem para mudar as que posso\ne a sabedoria para distinguir umas das outras.\nAmém.' },
  { id: 'sao-jose', t: 'Oração a São José', x: 'Glorioso São José,\nesposo de Maria e guardião de Jesus,\nolhai pela nossa família.\nEnsinai-nos o trabalho honesto,\no silêncio que escuta\ne a confiança em Deus em todas as horas.\nProtegei o nosso lar hoje e sempre.\nAmém.' },
  { id: 'familia', t: 'Oração pela família', x: 'Senhor, abençoa a minha família.\nQue em nossa casa haja respeito, perdão e alegria.\nUne-nos nos dias difíceis,\ncuida dos que estão longe,\nconsola os que sofrem\ne faz do nosso lar um lugar de paz.\nAmém.' },
  { id: 'gratidao', t: 'Oração de agradecimento', x: 'Obrigado, Senhor,\npela vida, pelo pão e pelo teto,\npelas pessoas que colocaste no meu caminho,\npelas alegrias e também pelas provações\nque me ensinaram a confiar.\nQue eu nunca me esqueça de agradecer.\nAmém.' },
  { id: 'angelus', t: 'O Anjo do Senhor', x: 'O Anjo do Senhor anunciou a Maria,\ne ela concebeu do Espírito Santo.\nEis aqui a serva do Senhor,\nfaça-se em mim segundo a vossa palavra.\nE o Verbo se fez carne\ne habitou entre nós.\nRogai por nós, Santa Mãe de Deus,\npara que sejamos dignos das promessas de Cristo.\nAmém.' },
  { id: 'coracao-de-jesus', t: 'Sagrado Coração de Jesus', x: 'Jesus, manso e humilde de coração,\nfazei o nosso coração semelhante ao vosso.\nSagrado Coração de Jesus,\neu confio em vós.\nAmém.' },
  { id: 'enfermos', t: 'Oração pelos enfermos', x: 'Senhor Jesus, que passaste fazendo o bem\ne curando os doentes,\nolha com amor por quem hoje sofre.\nAlivia a dor, fortalece a fé,\nilumina os médicos e os que cuidam,\ne dá a todos a tua paz.\nAmém.' },
  { id: 'aparecida', t: 'Nossa Senhora Aparecida', x: 'Ó Mãe Aparecida, Padroeira do Brasil,\ncobri com o vosso manto os vossos filhos.\nLivrai-nos de todo mal,\nconsolai os aflitos,\namparai as famílias\ne conduzi-nos sempre a Jesus.\nAmém.' },
  { id: 'fe-esperanca', t: 'Fé, esperança e caridade', x: 'Meu Deus, eu creio em vós,\nporque sois a verdade.\nEspero em vós,\nporque sois fiel às vossas promessas.\nAmo-vos de todo o coração,\nporque sois infinitamente bom.\nAumentai a minha fé, a minha esperança e o meu amor.\nAmém.' },
  { id: 'trabalho', t: 'Oração antes do trabalho', x: 'Senhor, abençoa o trabalho das minhas mãos.\nDá-me disposição, paciência e capricho,\npara que tudo o que eu fizer hoje\nseja bem feito e sirva a alguém.\nQue o meu esforço seja também uma oração.\nAmém.' },
  { id: 'paz', t: 'Oração pela paz', x: 'Senhor, Príncipe da Paz,\ndesarma os corações cheios de raiva,\naproxima os que estão divididos\ne ensina-nos a começar a paz dentro de casa.\nQue cada gesto meu de hoje\nseja uma semente de reconciliação.\nAmém.' },
  { id: 'bom-pastor', t: 'O Senhor é meu pastor', x: 'O Senhor é o meu pastor,\nnada me faltará.\nEm verdes prados me faz descansar\ne conduz-me às águas tranquilas.\nAinda que eu ande por um vale escuro,\nnão temerei mal algum,\nporque tu estás comigo.', a: 'Salmo 23' },
  { id: 'confio', t: 'Jesus, eu confio em vós', x: 'Jesus, eu confio em vós.\nNas horas de alegria e nas de aflição,\nquando entendo e quando não entendo,\nquando tenho forças e quando me faltam,\nJesus, eu confio em vós.\nAmém.' },
];

const OR_ESTILOS = { celestial: ['Celestial', '#1f3266'], aurora: ['Aurora', 'linear-gradient(135deg,#f6b26b,#c9698f)'], pergaminho: ['Pergaminho', '#efe2c4'], luz: ['Luz', '#4b2fb0'] };
const OR_FORMATOS = { retrato: [1080, 1350, 'Feed 4:5'], story: [1080, 1920, 'Reels / Stories'], quadrado: [1080, 1080, 'Quadrado'] };
const OR_CORES = {
  celestial: { bg: ['#070f26', '#1d2f5e'], marca: '#e8c875', titulo: '#f3d98f', texto: '#eef1fb', rodape: '#b9c3e3', brilho: '241,211,138' },
  aurora: { bg: ['#2b2350', '#b85a84', '#f3b06a'], marca: '#fff1d2', titulo: '#ffffff', texto: '#fff8ee', rodape: '#ffe9cf', brilho: '255,236,190' },
  pergaminho: { bg: ['#f6ecd4', '#e7d5ae'], marca: '#9a6a14', titulo: '#5a3a12', texto: '#3b2a17', rodape: '#7a5a2c', brilho: '168,118,15' },
  luz: { bg: ['#1c1140', '#4b2fb0'], marca: '#e8c875', titulo: '#ffffff', texto: '#f1edff', rodape: '#cdc2f5', brilho: '255,255,255' },
};
// acordes em notas MIDI; cada trilha combina um "colchão" de notas longas com sinos, harpa ou coro
const OR_TRILHAS = {
  serena: { nome: 'Serena', acordes: [[48, 55, 64, 67, 74], [47, 55, 62, 67, 74], [45, 52, 60, 64, 67], [41, 53, 57, 60, 64]], passo: 5, pad: 0.075 },
  sinos: { nome: 'Sinos', acordes: [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 57, 60, 65], [43, 50, 55, 59, 62]], passo: 5, pad: 0.07, sino: 0.16 },
  harpa: { nome: 'Harpa', acordes: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]], passo: 4, pad: 0.06, harpa: 0.2 },
  coral: { nome: 'Coral', acordes: [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [41, 48, 53, 57, 60], [36, 48, 52, 55, 60]], passo: 6, coro: 0.09, pad: 0.05 },
  nenhuma: { nome: 'Sem música' },
};
const OR_DURACOES = [15, 20, 30, 45];
// voz que lê a oração no vídeo: as "automáticas" são vozes do Windows geradas pelo postador (só no computador)
const OR_VOZES = { nenhuma: { nome: 'Sem voz' }, Maria: { nome: 'Maria (automática)' }, Daniel: { nome: 'Daniel (automática)' }, minha: { nome: 'Minha voz' } };

const orac = { data: null, id: null, estilo: null, formato: null, trilha: null, dur: null, legenda: '', legendaEditada: false, _lay: null, _layKey: '', _bg: null, _bgKey: '', _anim: null };
const orCfg = () => { const c = (db.params.oracao ||= { estilo: 'celestial', formato: 'retrato', trilha: 'serena', dur: 20, mostrarData: true }); if (!c.fonteV2) { c.fonte = 'salmo'; c.fonteV2 = 1; } return c; };
const oracoesRodizio = () => [...ORACOES, ...(db.oracoes || [])];
const oracoesTodas = () => [...oracoesRodizio(), ...(db.oracoesRss || [])];
// oração do dia: a que veio do site (RSS) para aquela data; se não houver, a do rodízio do app
const oracaoDoDia = data => {
  const f = orCfg().fonte, doSite = f !== 'app' && (db.oracoesRss || []).find(o => o.data === data && (o.fonte || 'rss') === f);
  if (doSite) return doSite;
  const l = oracoesRodizio(), n = daysBetween('2026-01-01', data); return l[((n % l.length) + l.length) % l.length];
};
const oracaoAtual = () => oracoesTodas().find(o => o.id === orac.id) || oracaoDoDia(orac.data || today());
const oracaoPostada = data => (db.oracoesPosts || []).some(p => p.data === data && p.status !== 'erro');
const dataExtenso = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
const somaDias = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

/* ---------- oração do dia vinda de um site (RSS) ---------- */
// O feed "Prayer of the Day" do Catholic Online vem em inglês e o site não deixa o navegador ler direto:
// quem baixa é o postador (neste computador); o texto é traduzido e fica salvo em db.oracoesRss,
// então o celular recebe pela sincronização. Sem conseguir buscar, vale o rodízio do app.
const RSS_URL = 'https://www.catholic.org/xml/rss_pofd.php';
const RSS_NOME = 'Catholic Online';
const orDecod = s => { const t = document.createElement('textarea'); t.innerHTML = s; t.innerHTML = t.value; return t.value; };
async function rssBaixar() {
  const fontes = [
    async () => { const j = await (await fetch(POSTADOR + '/rss', { signal: AbortSignal.timeout(25000) })).json(); if (!j.ok) throw 0; return j.xml; },
    ...['https://api.allorigins.win/raw?url=', 'https://api.codetabs.com/v1/proxy?quest='].map(p => async () => {
      const r = await fetch(p + encodeURIComponent(RSS_URL), { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw 0; return r.text();
    }),
  ];
  for (const f of fontes) { try { const x = await f(); if (x && x.includes('<item')) return x; } catch { } }
  return null;
}
function rssItens(xml) {
  const campo = (it, n) => orDecod((it.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)) || [, ''])[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, ''));
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map(it => {
    const link = campo(it, 'link').trim(), data = ((link + ' ' + campo(it, 'pubDate')).match(/(\d{4}-\d\d-\d\d)/) || [])[1];
    const t = campo(it, 'title').split(/:\s*Prayer of the Day/i)[0].replace(/\s*#\s*\d+\s*$/, '').trim();
    let x = campo(it, 'description').replace(/<[^>]+>/g, ' ').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    // o feed corta as orações longas com "..."; fica só até a última frase completa (e cabe melhor no cartão)
    if (/\.\.\.$/.test(x) || x.length > 560) {
      x = x.replace(/\.\.\.$/, '').slice(0, 560);
      const fim = Math.max(...['.', '!', '?'].map(p => x.lastIndexOf(p)));
      x = fim > 140 ? x.slice(0, fim + 1) : x.slice(0, Math.max(x.lastIndexOf('\n'), 0) || x.length).replace(/[,;:\s]+$/, '') + '.';
    }
    return data && t && x ? { data, t, x, link } : null;
  }).filter(Boolean);
}
async function orTraduzir(texto) {
  const blocos = []; let cur = '';
  for (const l of texto.split('\n')) { if (cur && (cur + '\n' + l).length > 430) { blocos.push(cur); cur = l; } else cur = cur ? cur + '\n' + l : l; }
  if (cur) blocos.push(cur);
  const out = [];
  for (const b of blocos) {
    const j = await (await fetch('https://api.mymemory.translated.net/get?langpair=en|pt-BR&q=' + encodeURIComponent(b), { signal: AbortSignal.timeout(20000) })).json();
    const tr = j.responseData?.translatedText;
    if (+j.responseStatus !== 200 || !tr || /MYMEMORY WARNING/i.test(tr)) throw new Error('o tradutor gratuito atingiu o limite de hoje');
    out.push(orDecod(tr));
  }
  return out.join('\n');
}
// Salmo da liturgia do dia, já em português, do Evangelho Quotidiano (evangelizo.org).
// O feed deles aceita leitura direta pelo navegador (funciona no celular, sem postador) e tem qualquer data.
const SALMO_NOME = 'Evangelho Quotidiano';
async function salmoBaixar(data) {
  const ler = async q => {
    const r = await fetch(`https://feed.evangelizo.org/v2/reader.php?date=${data.replace(/-/g, '')}&lang=PT&${q}`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('o site não respondeu');
    const txt = await r.text();
    // fora do intervalo (só até 30 dias de hoje) o site devolve a página de ajuda em vez do texto
    if (/Reader Evangelizo/i.test(txt)) throw new Error('o site só tem os salmos até 30 dias de hoje');
    return orDecod(txt.replace(/\s*<br\s*\/?>[ \t]*\r?\n?/gi, '\n').replace(/<[^>]+>/g, ''));
  };
  const [texto, ref, dia] = await Promise.all([ler('type=reading&content=PS'), ler('type=reading_lt&content=PS'), ler('type=liturgic_t').catch(() => '')]);
  // tira o rodapé do site e separa as estrofes
  const estrofes = texto.split(/Tradução litúrgica|Para receber/)[0].split(/\n\s*\n/).map(e => e.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)).filter(e => e.length);
  const num = (ref.match(/(\d+)\s*\((\d+)\)/) || ref.match(/(\d+)/) || [])[1];
  if (!estrofes.length || !num) return null;
  // no cartão vai o começo (até umas 9 linhas, sempre estrofes inteiras); a legenda leva o salmo todo
  let cartao = [];
  for (const e of estrofes) { if (cartao.length && cartao.length + e.length > 9) break; cartao = cartao.concat(e); }
  return { id: 'sl-' + data, rss: true, fonte: 'salmo', data, t: 'Salmo ' + num, x: cartao.join('\n').replace(/[,;:]$/, '.'), a: dia.replace(/\s+/g, ' ').trim(),
    completo: estrofes.map(e => e.join('\n')).join('\n\n'), link: 'https://evangelhoquotidiano.org/PT/gospel/' + data };
}
// busca a oração do dia na fonte escolhida, se ainda não temos (uma tentativa a cada 10 min por dia, salvo "Buscar agora")
async function orAtualizarRss(forcar) {
  const c = orCfg(), fonte = c.fonte, hoje = today(), nome = fonte === 'salmo' ? SALMO_NOME : RSS_NOME;
  const dia = fonte === 'salmo' && location.hash === '#oracoes' && orac.data ? orac.data : hoje;
  const tem = d => (db.oracoesRss || []).some(o => o.data === d && (o.fonte || 'rss') === fonte);
  if (fonte === 'app' || orac._rssBusy) return;
  const chave = fonte + dia;
  if (!forcar && (tem(dia) || Date.now() - ((orac._rssTent ||= {})[chave] || 0) < 10 * 60e3)) return;
  const aviso = (msg, tone = '') => { orac._rssMsg = msg; orac._rssTone = tone; const el = $('#orRss'); if (el) { el.textContent = msg; el.className = 'hint ' + tone; } };
  orac._rssBusy = true; (orac._rssTent ||= {})[chave] = Date.now(); aviso(`Buscando no ${nome}…`);
  try {
    let novos = 0;
    if (fonte === 'salmo') {
      if (!tem(dia)) { const s = await salmoBaixar(dia); if (s) { (db.oracoesRss ||= []).push(s); novos++; } }
    } else {
      const xml = await rssBaixar();
      if (!xml) throw new Error(`não consegui abrir o ${nome} (o postador precisa estar ligado neste computador)`);
      for (const i of rssItens(xml).filter(i => i.data >= hoje && !tem(i.data)).slice(0, 2)) {
        let x = await orTraduzir(i.x); const t = (await orTraduzir(i.t)).replace(/\.$/, '');
        if (!/am[ée]m[.!]?\s*$/i.test(x)) x += '\nAmém.';
        (db.oracoesRss ||= []).push({ id: 'rss-' + i.data, rss: true, fonte: 'rss', data: i.data, t, x, a: '', link: i.link, original: { t: i.t, x: i.x } });
        novos++;
      }
    }
    db.oracoesRss = (db.oracoesRss || []).sort((a, b) => a.data.localeCompare(b.data)).slice(-60);
    if (novos) save();
    aviso(tem(dia) ? `Recebido do ${nome}.` : `O ${nome} não tem nada para este dia — usando a lista do app.`, tem(dia) ? 'ok' : '');
    // troca a oração na tela só se a pessoa não tinha escolhido outra à mão
    const r = location.hash.slice(1);
    if (novos && !dlg.open && !orac._anim && (r === 'oracoes' || r === 'inicio' || !r)) { if (orac._auto) orac.id = null; render(); }
  } catch (e) { aviso(`Não deu para buscar agora: ${e.message || 'sem conexão'}. Usando a lista do app.`, 'neg'); }
  finally { orac._rssBusy = false; }
}

/* ---------- desenho ---------- */
function orFundo(W, H) {
  const key = [orac.estilo, W, H].join('|');
  if (orac._bgKey === key) return orac._bg;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), cor = OR_CORES[orac.estilo], u = W / 1080;
  const gr = g.createLinearGradient(0, 0, 0, H);
  cor.bg.forEach((x, i) => gr.addColorStop(i / (cor.bg.length - 1), x));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // clarão suave atrás do texto
  const rg = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.75);
  rg.addColorStop(0, `rgba(${cor.brilho},${orac.estilo === 'pergaminho' ? 0.1 : 0.2})`); rg.addColorStop(1, `rgba(${cor.brilho},0)`);
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  if (orac.estilo === 'pergaminho') {
    const rnd = mulberry32(5);
    for (let i = 0; i < 900; i++) { g.globalAlpha = rnd() * 0.05; g.fillStyle = '#6b4a1c'; g.fillRect(rnd() * W, rnd() * H, (1 + rnd() * 3) * u, (1 + rnd() * 3) * u); }
    g.globalAlpha = 1;
  }
  if (orac.estilo === 'aurora') {
    g.save(); g.translate(W / 2, H * 1.02); g.globalAlpha = 0.07; g.fillStyle = '#fff';
    for (let i = -6; i <= 6; i++) { g.save(); g.rotate(i * 0.2); g.beginPath(); g.moveTo(0, 0); g.lineTo(-46 * u, -H * 1.3); g.lineTo(46 * u, -H * 1.3); g.fill(); g.restore(); }
    g.restore();
  }
  // moldura fina dupla
  const m = 34 * u;
  g.strokeStyle = cor.marca; g.globalAlpha = 0.75; g.lineWidth = 2.5 * u; g.beginPath(); g.roundRect(m, m, W - 2 * m, H - 2 * m, 22 * u); g.stroke();
  g.globalAlpha = 0.35; g.lineWidth = 1.2 * u; g.beginPath(); g.roundRect(m + 12 * u, m + 12 * u, W - 2 * m - 24 * u, H - 2 * m - 24 * u, 14 * u); g.stroke();
  g.globalAlpha = 1;
  orac._bg = c; orac._bgKey = key;
  return c;
}
// estrelas que piscam e luzes que sobem devagar (no vídeo); na imagem ficam paradas
function orParticulas(g, W, H, t) {
  const u = W / 1080, cor = OR_CORES[orac.estilo], rnd = mulberry32(23), papel = orac.estilo === 'pergaminho';
  for (let i = 0; i < (papel ? 26 : 120); i++) {
    const x = rnd() * W, y0 = rnd() * H, r = (0.7 + rnd() * 2.3) * u, fase = rnd() * 6.28, vel = 0.6 + rnd() * 1.6, sobe = rnd() < 0.3 ? (8 + rnd() * 22) * u : 0;
    const y = sobe ? ((y0 - sobe * t) % H + H) % H : y0;
    g.globalAlpha = (papel ? 0.25 : 0.75) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(fase + t * vel)));
    g.fillStyle = rnd() < 0.4 ? `rgb(${cor.brilho})` : (papel ? '#b98a2e' : '#ffffff');
    g.beginPath(); g.arc(x, y, sobe ? r * 1.5 : r, 0, 6.2832); g.fill();
  }
  g.globalAlpha = 1;
}
function orCruz(g, cx, cy, h, color) {
  g.fillStyle = color; const w = h * 0.13;
  g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, w / 2); g.fill();
  g.beginPath(); g.roundRect(cx - h * 0.3, cy - h * 0.22, h * 0.6, w, w / 2); g.fill();
}
function orLayout(g, W, H) {
  const o = oracaoAtual(), u = W / 1080, story = H / W > 1.5;
  const key = [o.id, o.t, o.x, o.a, W, H, orCfg().mostrarData, orac.data, divCfg().instagram].join('|');
  if (orac._layKey === key) return orac._lay;
  const maxW = W - 2 * (SEG + 18) * u;
  const topo = (story ? 250 : 92) * u, base = H - (story ? 330 : 96) * u;   // no 9:16 o Instagram cobre o topo e o rodapé
  let tsz = 78 * u, tl;
  for (;;) { font(g, 700, tsz, 'Playfair Display'); tl = wrap(g, o.t, maxW); if (tl.length <= 2 || tsz <= 46 * u) break; tsz -= 4 * u; }
  const cabec = 62 * u + 44 * u + tl.length * tsz * 1.14 + 54 * u;           // cruz + "oração do dia" + título + enfeite
  const rod = (o.a ? 54 * u : 0) + 64 * u;                                    // autor + @ da marca
  const area = base - topo - cabec - rod;
  const frases = String(o.x).split('\n');
  const quebra = sz => { font(g, 500, sz, 'Playfair Display'); return frases.flatMap(p => p.trim() ? wrap(g, p, maxW) : ['']); };
  let sz = 60 * u, lines;
  for (;;) { lines = quebra(sz); if (lines.length * sz * 1.42 <= area || sz <= 22 * u) break; sz -= 1.5 * u; }
  // se diminuir um pouco a letra faz cada frase caber numa linha só (sem palavra solta), prefere assim
  for (let s2 = sz; s2 >= sz * 0.74; s2 -= 1.5 * u) { const l2 = quebra(s2); if (l2.length === frases.length) { sz = s2; lines = l2; break; } }
  const corpo = lines.length * sz * 1.42;
  const y0 = topo + Math.max(0, (area - corpo) / 2) * 0.85;                   // um pouco acima do centro
  orac._lay = { o, u, tl, tsz, sz, lines, y0, cabec, corpo, base, maxW }; orac._layKey = key;
  return orac._lay;
}
// t = segundos de animação (vídeo); t = null desenha a imagem final parada
function drawOracao(cv, t = null) {
  const [W, H] = OR_FORMATOS[orac.formato];
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'), cor = OR_CORES[orac.estilo], L = orLayout(g, W, H), { u, o } = L;
  const parado = t == null, tt = parado ? 7.3 : t;
  const fade = (ini, d = 1) => parado ? 1 : Math.min(1, Math.max(0, (tt - ini) / d));
  g.globalAlpha = 1; g.drawImage(orFundo(W, H), 0, 0);
  orParticulas(g, W, H, tt);
  let y = L.y0;
  g.globalAlpha = fade(0.2, 1.2);
  orCruz(g, W / 2, y + 28 * u, 56 * u, cor.marca); y += 62 * u;
  g.fillStyle = cor.marca; font(g, 700, 21 * u); g.textBaseline = 'top';
  spaced(g, 'ORAÇÃO DO DIA' + (orCfg().mostrarData ? '  •  ' + dataExtenso(orac.data).toUpperCase() : ''), W / 2, y + 10 * u, 6 * u); y += 44 * u;
  g.fillStyle = cor.titulo; g.textAlign = 'center'; font(g, 700, L.tsz, 'Playfair Display');
  L.tl.forEach((l, i) => g.fillText(l, W / 2, y + i * L.tsz * 1.14)); y += L.tl.length * L.tsz * 1.14;
  g.strokeStyle = cor.marca; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(W / 2 - 110 * u, y + 24 * u); g.lineTo(W / 2 - 18 * u, y + 24 * u); g.moveTo(W / 2 + 18 * u, y + 24 * u); g.lineTo(W / 2 + 110 * u, y + 24 * u); g.stroke();
  g.fillStyle = cor.marca; g.beginPath(); g.moveTo(W / 2, y + 15 * u); g.lineTo(W / 2 + 9 * u, y + 24 * u); g.lineTo(W / 2, y + 33 * u); g.lineTo(W / 2 - 9 * u, y + 24 * u); g.fill();
  y += 54 * u;
  // as linhas da oração vão aparecendo uma a uma na primeira metade do vídeo
  const lh = L.sz * 1.42, janela = Math.max(3, (orac._durAnim || orac.dur) * 0.55 - 1.5);
  // com voz, cada linha aparece mais ou menos na hora em que é lida (proporcional ao tamanho do texto)
  const vz = !parado && orac._vozAnim, pesos = L.lines.map(l => l.length + 7), totP = o.t.length + 10 + pesos.reduce((a, b) => a + b, 0);
  let lido = o.t.length + 10;
  g.fillStyle = cor.texto; font(g, 500, L.sz, 'Playfair Display');
  L.lines.forEach((l, i) => {
    g.globalAlpha = vz ? fade(vz.ini + vz.dur * lido / totP - 0.3, 0.6) : fade(1.4 + janela * i / L.lines.length, 0.9);
    lido += pesos[i]; g.fillText(l, W / 2, y + i * lh);
  });
  y += L.corpo;
  g.globalAlpha = fade(vz ? vz.ini + vz.dur : 1.4 + janela, 1);
  if (o.a) { g.fillStyle = cor.marca; font(g, 500, 27 * u, 'Playfair Display', 'italic'); g.fillText('— ' + o.a, W / 2, y + 16 * u); }
  const ig = divCfg().instagram.trim();
  if (ig) { g.fillStyle = cor.rodape; font(g, 600, 24 * u); g.globalAlpha *= 0.95; g.fillText(ig.startsWith('@') ? ig : '@' + ig, W / 2, L.base - 34 * u); }
  g.globalAlpha = 1;
}

/* ---------- música (gerada pelo navegador) ---------- */
const m2f = m => 440 * 2 ** ((m - 69) / 12);
function orImpulso(ctx) {
  const n = Math.floor(ctx.sampleRate * 3.2), b = ctx.createBuffer(2, n, ctx.sampleRate), rnd = mulberry32(77);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n) ** 2.6; }
  return b;
}
// agenda a trilha inteira de uma vez (dur segundos) e devolve o nó de saída
function montarTrilha(ctx, id, dur) {
  const T = OR_TRILHAS[id], saida = ctx.createGain();
  if (!T?.acordes) return saida;
  const t0 = ctx.currentTime + 0.08, fim = t0 + dur, rnd = mulberry32(dur * 31 + id.length);
  const bus = ctx.createGain(), rev = ctx.createConvolver(), molhado = ctx.createGain();
  rev.buffer = orImpulso(ctx); molhado.gain.value = 0.55;
  bus.connect(saida); bus.connect(rev); rev.connect(molhado); molhado.connect(saida);
  saida.gain.setValueAtTime(0, t0); saida.gain.linearRampToValueAtTime(1, t0 + 1.5);
  saida.gain.setValueAtTime(1, Math.max(t0 + 1.5, fim - 3)); saida.gain.linearRampToValueAtTime(0, fim);
  const voz = (tipo, f, quando, vol, ataque, cauda, corte, det = 0) => {
    const o = ctx.createOscillator(), a = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = tipo; o.frequency.value = f; o.detune.value = det; lp.type = 'lowpass'; lp.frequency.value = corte;
    a.gain.setValueAtTime(0.0001, quando); a.gain.linearRampToValueAtTime(vol, quando + ataque);
    return { o, a, lp, liga: fimNota => { o.connect(lp); lp.connect(a); a.connect(bus); o.start(quando); o.stop(Math.min(fimNota, fim) + 0.1); } };
  };
  const longa = (tipo, f, quando, d, vol, corte, det) => {            // nota sustentada (colchão / coro)
    const v = voz(tipo, f, quando, vol, 1.6, 0, corte, det);
    v.a.gain.setValueAtTime(vol, quando + d); v.a.gain.linearRampToValueAtTime(0.0001, quando + d + 1.8);
    v.liga(quando + d + 1.8); return v;
  };
  const curta = (tipo, f, quando, vol, cauda, corte) => {              // nota que bate e some (sino / harpa)
    const v = voz(tipo, f, quando, vol, 0.012, cauda, corte);
    v.a.gain.exponentialRampToValueAtTime(0.0001, quando + cauda);
    v.liga(quando + cauda);
  };
  for (let k = 0, q = t0; q < fim; k++, q += T.passo) {
    const ac = T.acordes[k % T.acordes.length];
    if (T.pad) ac.forEach((m, i) => { longa('sine', m2f(m), q, T.passo, T.pad * (i ? 1 : 1.5), 1400, -5); longa('triangle', m2f(m), q, T.passo, T.pad * 0.5, 800, 6); });
    if (T.coro) ac.slice(1).forEach(m => [-9, 8].forEach(det => {
      const v = longa('sawtooth', m2f(m + 12), q, T.passo, T.coro, 2200, det);
      v.lp.type = 'bandpass'; v.lp.frequency.value = 820; v.lp.Q.value = 1.6;   // formante de "aaah"
    }));
    if (T.sino) for (let s = 0.4; s < T.passo; s += 1.25) {
      if (rnd() < 0.3) continue;
      const m = ac[2 + Math.floor(rnd() * 3)] + 12 + (rnd() < 0.3 ? 12 : 0), vol = T.sino * (0.6 + rnd() * 0.4);
      curta('sine', m2f(m), q + s, vol, 3.4, 6000); curta('sine', m2f(m) * 2.01, q + s, vol * 0.3, 2.2, 8000); curta('sine', m2f(m) * 3.02, q + s, vol * 0.1, 1.2, 9000);
    }
    if (T.harpa) {
      const sobe = [0, 1, 2, 3, 4, 3, 2, 1], n = Math.round(T.passo / 0.5);
      for (let s = 0; s < n; s++) curta('triangle', m2f(ac[sobe[s % 8]] + 12), q + s * 0.5 + rnd() * 0.02, T.harpa * (s % 4 ? 0.7 : 1), 1.9, 2600);
    }
  }
  return saida;
}

/* ---------- prévia animada e gravação do vídeo ---------- */
function orParar() {
  const a = orac._anim; if (!a) return;
  orac._anim = null; clearTimeout(a.raf);
  try { if (a.rec && a.rec.state !== 'inactive') { a.cancelado = true; a.rec.stop(); } } catch { }
  a.ctx?.close().catch(() => { });
  a.fim?.(null);
}
const orMime = () => typeof MediaRecorder === 'undefined' ? null
  : ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
/* ---------- voz lendo a oração ---------- */
const orTextoVoz = () => { const o = oracaoAtual(); return o.t + '.\n' + o.x; };
const orDecodAudio = buf => new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 2, 44100).decodeAudioData(buf);
// devolve o áudio da voz escolhida (AudioBuffer), null se "Sem voz", ou lança um erro explicando o que falta
async function orPrepararVoz() {
  const v = orac.voz;
  if (!v || v === 'nenhuma') return null;
  if (v === 'minha') {
    const m = orac._minhaVoz;
    if (!m || m.id !== oracaoAtual().id) throw new Error('grave a sua voz lendo esta oração primeiro (botão “Gravar minha voz”).');
    return m.buffer;
  }
  const chave = v + '|' + orTextoVoz();
  if (orac._vozAuto?.chave === chave) return orac._vozAuto.buffer;
  let j;
  try {
    j = await (await fetch(POSTADOR + '/voz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: orTextoVoz(), voz: v }), signal: AbortSignal.timeout(90000) })).json();
  } catch { throw new Error('a voz automática precisa do postador ligado neste computador. No celular, use “Minha voz”.'); }
  if (!j.ok) throw new Error(j.erro || 'o postador não gerou a voz.');
  const buffer = await orDecodAudio(await (await fetch(j.audio)).arrayBuffer());
  orac._vozAuto = { chave, buffer };
  return buffer;
}
// grava a voz da pessoa pelo microfone (um clique começa, outro termina)
async function orGravarVoz(aoMudar) {
  const m = orac._mic;
  if (m) { m.rec.stop(); return; }
  orParar();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { toast('Não consegui usar o microfone. Permita o acesso no navegador e tente de novo.'); return; }
  const rec = new MediaRecorder(stream), pedacos = [], id = oracaoAtual().id;
  rec.ondataavailable = e => e.data.size && pedacos.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop()); clearInterval(orac._mic?.relogio); orac._mic = null;
    try { orac._minhaVoz = { id, buffer: await orDecodAudio(await new Blob(pedacos, { type: rec.mimeType }).arrayBuffer()) }; }
    catch { toast('Não consegui ler a gravação. Tente de novo.'); }
    aoMudar();
  };
  orac._mic = { rec, ini: Date.now(), relogio: setInterval(aoMudar, 500) };
  rec.start(); aoMudar();
}

// toca a animação com a música (e a voz, se houver); com gravar=true devolve o vídeo (Blob) no final
function orAnimar(cv, gravar, aCada, voz) {
  orParar();
  return new Promise(fim => {
    // com voz, o vídeo dura pelo menos o tempo da leitura mais um respiro no final
    const dur = Math.max(orac.dur, voz ? Math.ceil(voz.duration + 4.5) : 0), a = orac._anim = { fim, raf: 0 };
    orac._durAnim = dur; orac._vozAnim = voz ? { ini: 1.3, dur: voz.duration } : null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && (orac.trilha !== 'nenhuma' || voz)) {
      a.ctx = new AC(); a.ctx.resume?.();
      a.saida = a.ctx.createGain();
      const musica = a.ctx.createGain(); montarTrilha(a.ctx, orac.trilha, dur).connect(musica); musica.connect(a.saida);
      if (voz) {
        const t0 = a.ctx.currentTime + 1.3, fonte = a.ctx.createBufferSource(), vol = a.ctx.createGain(), d = voz.getChannelData(0);
        let pico = 0; for (let i = 0; i < d.length; i += 8) pico = Math.max(pico, Math.abs(d[i]));
        vol.gain.value = Math.min(5, 0.9 / (pico || 1));                  // nivela gravações baixas
        fonte.buffer = voz; fonte.connect(vol); vol.connect(a.saida); fonte.start(t0);
        // a música abaixa enquanto a voz fala e volta no final
        musica.gain.setValueAtTime(1, a.ctx.currentTime); musica.gain.linearRampToValueAtTime(0.28, t0);
        musica.gain.setValueAtTime(0.28, t0 + voz.duration); musica.gain.linearRampToValueAtTime(1, t0 + voz.duration + 1.5);
      }
      a.saida.connect(a.ctx.destination);
    }
    if (gravar) {
      const stream = cv.captureStream(30), pedacos = [], mime = orMime();
      if (a.saida) { const d = a.ctx.createMediaStreamDestination(); a.saida.connect(d); d.stream.getAudioTracks().forEach(t => stream.addTrack(t)); }
      a.rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5e6, audioBitsPerSecond: 160000 });
      a.rec.ondataavailable = e => e.data.size && pedacos.push(e.data);
      a.rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (!a.cancelado) fim(new Blob(pedacos, { type: mime.split(';')[0] })); };
      a.rec.start(500);
    }
    const ini = performance.now();
    const quadro = () => {
      if (orac._anim !== a) return;
      const t = (performance.now() - ini) / 1000;
      if (!cv.isConnected) return orParar();
      drawOracao(cv, Math.min(t, dur)); aCada?.(Math.min(1, t / dur));
      if (t < dur) { a.raf = setTimeout(quadro, 33); return; }   // relógio próprio: continua mesmo se a janela ficar atrás de outra
      orac._anim = null; a.ctx?.close().catch(() => { });
      if (a.rec) a.rec.stop(); else fim(null);
    };
    quadro();
  }).finally(() => { if (cv.isConnected && !orac._anim) drawOracao(cv); });
}

/* ---------- legenda ---------- */
function gerarLegendaOracao() {
  const o = oracaoAtual(), c = divCfg();
  const marca = (c.instagram.trim() || db.params.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const salmo = o.fonte === 'salmo';
  return [salmo ? `🙏 Salmo do dia — ${o.t}` : `🙏 Oração do dia — ${o.t}`, '', (o.completo || o.x) + (o.a ? `\n(${o.a})` : ''), '',
    '✨ Salve para rezar depois e envie para alguém que precisa desta oração hoje.', '📿 Reze com a gente todos os dias.', ...(salmo ? [`(Salmo da liturgia do dia — ${SALMO_NOME}, evangelizo.org)`] : o.rss ? [`(Oração traduzida de ${RSS_NOME})`] : []), '',
    ['#oração', '#oraçãododia', '#fé', '#católico', '#igrejacatólica', '#terço', '#nossasenhora', '#deus', '#amém', '#gratidão', marca && '#' + marca].filter(Boolean).join(' ')].join('\n');
}

/* ---------- tela ---------- */
function viewOracoes() {
  const s = orac, c = orCfg();
  s.data ||= today(); s.estilo ||= c.estilo; s.formato ||= c.formato; s.trilha ||= c.trilha; s.dur ||= c.dur; s.voz ||= c.voz || 'nenhuma';
  if (!oracoesTodas().some(o => o.id === s.id)) { s.id = oracaoDoDia(s.data).id; s._auto = true; }
  const o = oracaoAtual(), hoje = s.data === today(), propria = o.rss || (db.oracoes || []).some(x => x.id === o.id);
  const chips = (k, obj, sw) => `<div class="chips">${Object.entries(obj).map(([v, d]) => `<button type="button" class="chip ${v === s[k] ? 'on' : ''}" data-k="${k}" data-v="${v}">${sw ? `<span class="sw" style="background:${d[1]}"></span>${d[0]}` : (d[2] || d.nome)}</button>`).join('')}</div>`;
  const video = orMime(), mp4 = video?.startsWith('video/mp4');
  const posts = [...(db.oracoesPosts || [])].reverse().slice(0, 10);
  return `<div class="studio" id="oracoes">
    <div class="st-prev"><div class="card">
      <div class="st-canvas"><div class="st-wrap"><canvas id="orCanvas" style="cursor:default" aria-label="Prévia da oração"></canvas></div></div>
      <div class="or-prog" id="orProg" hidden><i></i></div>
      <p class="hint" style="margin:10px 0 12px;text-align:center">${oracaoPostada(s.data) ? `${fdate(s.data)}: oração já postada.` : hoje ? 'A oração de hoje ainda não foi postada.' : `Post para ${fdate(s.data)}.`}</p>
      <div class="st-actions">
        ${noCelular()
          ? `<button class="btn pri" data-o="share">${ic('share')}Postar imagem</button>`
          : `<button class="btn pri" data-o="publicar">${ic('instagram')}Publicar imagem</button>`}
        <button class="btn" data-o="video" ${video ? '' : 'disabled'} title="Gravar o vídeo com a música">${ic('video')}<span>Vídeo com música</span></button>
        <button class="btn" data-o="download" title="Baixar imagem">${ic('download')}<span>Baixar imagem</span></button>
        <button class="btn" data-o="copy" title="Copiar legenda">${ic('copy')}<span>Copiar legenda</span></button>
      </div>
      <div id="pubStatus"></div>
      <div class="ig-box compacto" style="margin-top:12px"></div>
    </div></div>
    <div class="st-ctrl">
      <div class="card"><div class="card-h">${ic('pray')}<h3>1. Oração</h3><button type="button" class="btn sm" data-o="nova">${ic('plus')}Nova</button></div>
        <div class="or-dia"><button type="button" class="btn sm" data-o="ontem" aria-label="Dia anterior">${ic('back')}</button>
          <b>${hoje ? 'Hoje' : new Date(s.data + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' })}, ${dataExtenso(s.data)}</b>
          <button type="button" class="btn sm" data-o="amanha" aria-label="Dia seguinte">${ic('chevron')}</button>
          ${hoje ? '' : `<button type="button" class="btn sm" data-o="hoje">Hoje</button>`}</div>
        <label>Oração deste dia<select name="oracao">${opts(oracoesTodas(), o.id, x => x.rss ? `${x.t} (${x.fonte === 'salmo' ? 'salmo' : 'do site'}, ${fdate(x.data).slice(0, 5)})` : x.t)}</select></label>
        ${o.rss ? `<div class="alert ${o.fonte === 'salmo' ? 'info' : o.revisada ? 'ok' : 'warn'}" style="margin:0 0 12px">${ic(o.fonte === 'salmo' ? 'pray' : o.revisada ? 'check' : 'alert')}<div>${o.fonte === 'salmo' ? `<b>Salmo da liturgia deste dia</b>, do ${SALMO_NOME}. O cartão mostra o começo; a legenda leva o salmo inteiro.` : o.revisada ? 'Tradução revisada por você.' : `<b>Tradução automática do inglês.</b> Leia e ajuste antes de postar.`}
          <div class="bar" style="margin:8px 0 0"><button type="button" class="btn sm" data-o="editar">Revisar texto</button><a class="btn sm" href="${esc(o.link)}" target="_blank" rel="noopener">Ver original</a></div></div></div>` : ''}
        <label>De onde vem a oração de cada dia<select name="fonte">
          <option value="salmo" ${c.fonte === 'salmo' ? 'selected' : ''}>Salmo do dia — ${SALMO_NOME} (em português)</option>
          <option value="rss" ${c.fonte === 'rss' ? 'selected' : ''}>Oração do dia — ${RSS_NOME} (inglês, tradução automática)</option>
          <option value="app" ${c.fonte === 'app' ? 'selected' : ''}>Lista do app (${oracoesRodizio().length} orações em rodízio)</option></select></label>
        ${c.fonte !== 'app' ? `<div class="or-dia" style="margin:-4px 0 0"><span id="orRss" class="hint ${s._rssTone || ''}" style="flex:1;margin:0">${esc(s._rssMsg || 'O app busca a oração nova sozinho quando você abre. Se o site não responder, usa a lista do app.')}</span>
          <button type="button" class="btn sm" data-o="rss">${ic('refresh')}Buscar agora</button></div>` : ''}
        ${propria && !o.rss ? `<button type="button" class="btn sm" data-o="editar">Editar esta oração</button>` : ''}
      </div>
      <div class="card c-modelo"><div class="card-h">${ic('sparkles')}<h3>2. Visual</h3></div>
        ${chips('estilo', OR_ESTILOS, true)}
        ${chips('formato', OR_FORMATOS, false)}
        <label class="chk"><input type="checkbox" name="mostrarData" ${c.mostrarData ? 'checked' : ''}>Mostrar a data no cartão</label>
      </div>
      <div class="card"><div class="card-h">${ic('music')}<h3>3. Música e voz do vídeo</h3><button type="button" class="btn sm" data-o="ouvir">${ic('play')}Ouvir prévia</button></div>
        ${chips('trilha', OR_TRILHAS, false)}
        <div class="sec" style="margin-top:4px">Voz lendo a oração</div>
        ${chips('voz', OR_VOZES, false)}
        ${s.voz === 'minha' ? `<div class="or-dia" style="margin:-4px 0 12px"><span id="orVozMsg" class="hint" style="flex:1;margin:0"></span><button type="button" class="btn sm" data-o="gravarVoz"></button></div>` : ''}
        ${s.voz === 'Maria' || s.voz === 'Daniel' ? `<p class="hint" style="margin:-6px 0 12px">Voz do Windows, gerada neste computador pelo postador. O vídeo se estica sozinho se a leitura passar da duração escolhida.</p>` : ''}
        <label>Duração do vídeo<select name="dur">${OR_DURACOES.map(d => `<option value="${d}" ${d === s.dur ? 'selected' : ''}>${d} segundos</option>`).join('')}</select></label>
        <p class="hint" style="margin:-6px 0 0">A música é criada pelo próprio app (instrumental suave), então pode postar sem risco de bloqueio por direito autoral.
        ${video ? (mp4 ? '' : ' Este navegador grava em .webm, que o Instagram não aceita — use o Chrome ou o Edge atualizados para sair em .mp4.') : ' Este navegador não grava vídeo — use o Chrome ou o Edge.'}</p>
      </div>
      <div class="card"><div class="card-h">${ic('chat')}<h3>4. Legenda</h3><button type="button" class="btn sm" data-o="regen">${ic('refresh')}Gerar de novo</button></div>
        <textarea name="legenda" style="min-height:230px"></textarea>
      </div>
      ${posts.length ? `<div class="card"><div class="card-h">${ic('calendar')}<h3>Últimas orações postadas</h3></div><div class="list">${posts.map(x => `<div class="li" style="cursor:default"><div class="li-main"><div class="li-t">${esc(x.titulo)}</div><div class="li-s">${fdate(x.data)} · ${x.tipo === 'video' ? 'vídeo com música' : 'imagem'}</div></div><span class="tag ${x.status === 'publicado' ? 'ok' : 'warn'}">${x.status === 'publicado' ? 'publicado' : esc(x.status)}</span></div>`).join('')}</div></div>` : ''}
    </div></div>`;
}

function formOracao(o) {
  modal({
    title: o ? 'Editar oração' : 'Nova oração',
    body: `<label>Título<input name="t" value="${esc(o?.t || '')}" placeholder="Ex.: Oração a Santa Rita"></label>
      <label>Texto (uma frase por linha)<textarea name="x" style="min-height:220px">${esc(o?.x || '')}</textarea></label>
      <label>Autor ou referência (opcional)<input name="a" value="${esc(o?.a || '')}" placeholder="Ex.: Salmo 91"></label>
      <p class="hint">Textos mais curtos ficam com a letra maior e mais fáceis de ler no Instagram.</p>`,
    onSave: root => {
      const t = F(root, 't').trim(), x = F(root, 'x').trim();
      if (!t || !x) { toast('Escreva o título e o texto.'); return false; }
      if (o) Object.assign(o, { t, x, a: F(root, 'a').trim() }, o.rss ? { revisada: true } : {});
      else { const nova = { id: uid(), t, x, a: F(root, 'a').trim() }; (db.oracoes ||= []).push(nova); orac.id = nova.id; orac._auto = false; }
      orac.legendaEditada = false;
    },
    onDelete: o && (() => { db.oracoes = (db.oracoes || []).filter(x => x !== o); db.oracoesRss = (db.oracoesRss || []).filter(x => x !== o); orac.id = null; }),
  });
}

function initOracoes() {
  const root = $('#oracoes'); if (!root) return;
  const s = orac, c = orCfg(), cv = $('#orCanvas', root);
  const redraw = () => { if (!s._anim) { drawOracao(cv); fitCanvas(cv); } };
  const setLeg = () => { if (!s.legendaEditada) s.legenda = gerarLegendaOracao(); root.querySelector('[name=legenda]').value = s.legenda; };
  const trocaDia = d => { orParar(); s.data = d; s.id = oracaoDoDia(d).id; s.legendaEditada = false; render(); };
  const prog = p => { const el = $('#orProg'); if (el) { el.hidden = p == null; el.firstElementChild.style.width = (p || 0) * 100 + '%'; } };
  // busca a voz escolhida; devolve false (e explica) se não der para continuar
  const pegarVoz = async b => {
    if (s.voz === 'Maria' || s.voz === 'Daniel') setPub(`${ic('refresh')}<div>Gerando a voz…</div>`);
    b.disabled = true;
    try { const v = await orPrepararVoz(); setPub(''); return v; }
    catch (e) { setPub(`${ic('alert')}<div>Voz: ${esc(e.message)}</div>`, 'warn'); return false; }
    finally { b.disabled = false; }
  };
  const pintarVoz = () => {
    const msg = $('#orVozMsg'), bt = root.querySelector('[data-o=gravarVoz]'); if (!msg || !bt) return;
    const m = s._minhaVoz, grav = s._mic, tem = m && m.id === oracaoAtual().id;
    msg.textContent = grav ? `Gravando… ${Math.floor((Date.now() - grav.ini) / 1000)} s. Leia a oração com calma.` : tem ? `Gravação de ${Math.round(m.buffer.duration)} s pronta. Use “Ouvir prévia” para conferir.` : 'Grave você lendo esta oração; a música fica baixinha ao fundo.';
    bt.innerHTML = grav ? `${ic('stop')}Parar` : `${ic('play')}${tem ? 'Gravar de novo' : 'Gravar minha voz'}`;
  };
  const botaoOuvir = () => { const b = root.querySelector('[data-o=ouvir]'); if (b) b.innerHTML = s._anim ? `${ic('stop')}Parar` : `${ic('play')}Ouvir prévia`; };
  root.addEventListener('input', e => { if (e.target.name === 'legenda') { s.legenda = e.target.value; s.legendaEditada = true; } });
  root.addEventListener('change', e => {
    const t = e.target, n = t.name;
    if (n === 'oracao') { orParar(); s.id = t.value; s._auto = false; s.legendaEditada = false; render(); return; }
    if (n === 'fonte') { orParar(); c.fonte = t.value; s.id = null; s._rssMsg = ''; s.legendaEditada = false; save(); render(); return; }
    if (n === 'dur') { orParar(); botaoOuvir(); s.dur = c.dur = +t.value; }
    if (n === 'mostrarData') { c.mostrarData = t.checked; redraw(); }
    save();
  });
  root.addEventListener('click', async e => {
    const chip = e.target.closest('.chip[data-k]');
    if (chip) {
      const k = chip.dataset.k; orParar(); botaoOuvir(); prog(null);
      if (s._video) { s._video = null; setPub(''); }   // o vídeo gravado era do visual/música anterior
      s[k] = c[k] = chip.dataset.v;
      $$(`.chip[data-k="${k}"]`, root).forEach(b => b.classList.toggle('on', b === chip));
      save();
      if (k === 'voz') { render(); return; }   // mostra ou esconde o gravador
      redraw(); return;
    }
    const b = e.target.closest('[data-o]'); if (!b) return;
    const a = b.dataset.o, o = oracaoAtual();
    if (a === 'ontem') trocaDia(somaDias(s.data, -1));
    if (a === 'amanha') trocaDia(somaDias(s.data, 1));
    if (a === 'hoje') trocaDia(today());
    if (a === 'nova') formOracao();
    if (a === 'editar') formOracao(o);
    if (a === 'rss') orAtualizarRss(true);
    if (a === 'regen') { s.legendaEditada = false; setLeg(); }
    if (a === 'copy') orCopiar();
    if (a === 'ouvir') {
      if (s._anim) { orParar(); prog(null); botaoOuvir(); return; }
      const voz = await pegarVoz(b); if (voz === false) return;
      const p = orAnimar(cv, false, prog, voz); botaoOuvir();
      await p; prog(null); botaoOuvir();
    }
    if (a === 'download') { orParar(); drawOracao(cv); download(`oracao-${s.data}-${slug(o.t)}.jpg`, await postBlob(cv), 'image/jpeg'); orOferecerMarcar('imagem'); }
    if (a === 'share') { orParar(); drawOracao(cv); await orCompartilhar(new File([await postBlob(cv)], `oracao-${s.data}.jpg`, { type: 'image/jpeg' }), 'imagem'); }
    if (a === 'publicar') { orParar(); drawOracao(cv); orPublicar(cv, b); }
    if (a === 'video') {
      if (b.dataset.gravando) { orParar(); return; }
      const voz = await pegarVoz(b); if (voz === false) return;
      b.dataset.gravando = 1; b.innerHTML = `${ic('stop')}<span>Cancelar</span>`;
      const gravacao = orAnimar(cv, true, prog, voz);
      setPub(`${ic('refresh')}<div>Gravando o vídeo (${s._durAnim} s${voz ? ', com a voz' : ''}). Deixe esta tela aberta e visível até terminar.</div>`);
      const blob = await gravacao;
      delete b.dataset.gravando; b.innerHTML = `${ic('video')}<span>Vídeo com música</span>`; prog(null);
      if (!blob) { setPub(''); return; }
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      if (s._video) URL.revokeObjectURL(s._video.url);
      s._video = { blob, ext, nome: `oracao-${s.data}-${slug(o.t)}.${ext}`, url: URL.createObjectURL(blob) };
      // o vídeo fica guardado aqui e cada botão age na hora do clique (o navegador bloqueia download "atrasado")
      setPub(`${ic('check')}<div style="min-width:0"><b>Vídeo pronto</b> (${s._durAnim} s, ${(blob.size / 1048576).toFixed(1).replace('.', ',')} MB). Confira e escolha:
        <video class="or-video" src="${s._video.url}" controls playsinline></video>
        ${ext === 'webm' ? '<div>Atenção: saiu em .webm; o Instagram só aceita .mp4 (use o Chrome ou o Edge atualizados).</div>' : ''}
        <div class="bar" style="margin:8px 0 0">${noCelular()
          ? `<button type="button" class="btn sm pri" data-o="shareVideo">${ic('share')}Postar vídeo</button>`
          : `<button type="button" class="btn sm pri" data-o="pubVideo" ${ext === 'mp4' ? '' : 'disabled'}>${ic('instagram')}Publicar Reel</button>`}
          <button type="button" class="btn sm" data-o="baixarVideo">${ic('download')}Baixar vídeo</button></div></div>`, 'ok');
    }
    if (a === 'baixarVideo' && s._video) {
      const copiou = await orCopiar(true);
      Object.assign(document.createElement('a'), { href: s._video.url, download: s._video.nome }).click();
      toast('Vídeo salvo em Downloads' + (copiou ? ' e legenda copiada.' : '.'));
    }
    if (a === 'shareVideo' && s._video) await orCompartilhar(new File([s._video.blob], s._video.nome, { type: s._video.blob.type }), 'video');
    if (a === 'pubVideo' && s._video) orPublicar(cv, b, s._video);
    if (a === 'gravarVoz') orGravarVoz(pintarVoz);
    if (a === 'marcar') { orRegistrar(b.dataset.tipo, 'publicado'); render(); toast('Oração marcada como postada.'); }
  });
  setLeg(); drawOracao(cv); fitCanvas(cv); refreshIg(); orAtualizarRss(); pintarVoz();
  Promise.all(['700 60px "Playfair Display"', '500 40px "Playfair Display"', 'italic 500 40px "Playfair Display"', '700 30px "Plus Jakarta Sans"'].map(f => document.fonts.load(f)))
    .then(() => { if (cv.isConnected) { s._layKey = ''; redraw(); } }, () => { });
}
window.addEventListener('resize', () => { const cv = $('#orCanvas'); if (cv) fitCanvas(cv); });
window.addEventListener('hashchange', orParar);

/* ---------- saída ---------- */
async function orCopiar(silencioso) {
  try { await navigator.clipboard.writeText(orac.legenda); if (!silencioso) toast('Legenda copiada.'); return true; }
  catch { if (!silencioso) toast('Não foi possível copiar — selecione o texto da legenda e copie.'); return false; }
}
function orRegistrar(tipo, status) {
  const o = oracaoAtual(), reg = { id: uid(), data: orac.data, oracaoId: o.id, titulo: o.t, tipo, estilo: orac.estilo, status };
  (db.oracoesPosts ||= []).push(reg); save();
  return reg;
}
function orOferecerMarcar(tipo) {
  setPub(`${ic('instagram')}<div>Já postou? <button type="button" class="btn sm" data-o="marcar" data-tipo="${tipo}">Marcar como postada</button></div>`);
}
// celular: abre a janela de compartilhar (o app do Instagram recebe o arquivo); devolve true se enviou
async function orCompartilhar(file, tipo) {
  const copiou = await orCopiar(true);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      orRegistrar(tipo, 'publicado'); render();
      toast(copiou ? 'Legenda copiada — é só colar no post.' : 'Enviado.');
      return true;
    } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível compartilhar: ' + e.message); return false; }
  }
  if (tipo === 'imagem') { download(file.name, file, file.type); toast('Imagem baixada' + (copiou ? ' e legenda copiada' : '') + '.'); orOferecerMarcar(tipo); }
  return false;
}
// publica pelo postador: a imagem do cartão ou, com "video", o Reel gravado
async function orPublicar(cv, btn, video) {
  const s = orac, o = oracaoAtual();
  if (!video && s.formato === 'story') { toast('O formato 9:16 é para Reels/Stories: grave o “Vídeo com música” ou escolha Feed 4:5 para publicar a imagem.'); return; }
  const st = await postadorStatus();
  if (!st || st.logado === false) {
    modal({ title: !st ? 'Postador desligado' : 'Entre no Instagram', body: `<div class="ig-box">${igBoxHTML(st)}</div><p class="hint" style="margin-top:14px">Ou use “Baixar imagem” e “Copiar legenda” e publique pelo Instagram.</p>`, onOpen: refreshIg });
    return;
  }
  if (st.ocupado === 'login') { toast('Termine o login na janela do Instagram primeiro.'); return; }
  if (!confirm(`Publicar agora no Instagram${st.usuario ? ' (@' + st.usuario + ')' : ''}?\n\nOração do dia: “${o.t}” — ${video ? `Reel de ${s.dur} s com música` : `${OR_ESTILOS[s.estilo][0]}, ${OR_FORMATOS[s.formato][2]}`}.`)) return;
  btn.disabled = true;
  try {
    const midia = video
      ? { video: await new Promise((ok, err) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => err(new Error('não consegui ler o vídeo')); fr.readAsDataURL(video.blob); }) }
      : { imagem: cv.toDataURL('image/jpeg', 0.92) };
    setPub(`${ic('refresh')}<div>Enviando ${video ? 'o vídeo' : 'a imagem'} para o postador…</div>`);
    const r = await fetch(POSTADOR + '/publicar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...midia, legenda: s.legenda, formato: s.formato, titulo: 'Oração: ' + o.t, oculto: true }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || 'o postador recusou o pedido');
    const reg = orRegistrar(video ? 'video' : 'imagem', 'enviado');
    setPub(`${ic('refresh')}<div>Publicando em segundo plano${video ? ' (vídeo demora alguns minutos para subir)' : ''}. Pode continuar usando o app — o Windows avisa quando terminar.</div>`);
    const fim = Date.now() + (video ? 12 : 5) * 60e3;
    while (Date.now() < fim) {
      await new Promise(ok => setTimeout(ok, 3000));
      let job; try { job = await (await fetch(`${POSTADOR}/job/${j.job}`)).json(); } catch { continue; }
      if (job.status === 'publicado') { reg.status = 'publicado'; save(); setPub(`${ic('check')}<div><b>${video ? 'Reel publicado' : 'Oração publicada'} no Instagram!</b></div>`, 'ok'); toast('Publicado no Instagram!'); return; }
      if (job.status === 'conferir') { reg.status = 'conferir'; save(); setPub(`${ic('alert')}<div>O postador terminou mas não viu a confirmação. Confira no Instagram se o post apareceu.</div>`, 'warn'); return; }
      if (job.status === 'erro') { reg.status = 'erro'; save(); setPub(`${ic('alert')}<div>Não foi possível publicar: ${esc(job.erro || '')}</div>`, 'bad'); return; }
    }
    reg.status = 'conferir'; save();
    setPub(`${ic('alert')}<div>Demorou mais que o esperado. Confira no Instagram se o post apareceu.</div>`, 'warn');
  } catch (err) {
    setPub(`${ic('alert')}<div>Não foi possível publicar: ${esc(err.message)}</div>`, 'bad');
  } finally { btn.disabled = false; }
}
window.addEventListener('hashchange', () => orac._mic?.rec.stop());   // saiu da tela no meio da gravação da voz
