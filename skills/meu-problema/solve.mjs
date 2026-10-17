// Resolve a task "reunião → proposta": lê casos/<caso>/ e escreve out/<caso>.json.
// Implementa as regras 1–37 do README.md do workspace. Sem dependências, só node.
// Uso: node .opencode/skills/meu-problema/solve.mjs [caso ...]   (sem argumentos = todos os casos)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------- texto ----------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reCache = new Map();
// Expressão como palavra(s) inteira(s), sem diferenciar maiúsculas; acento conta (regra 4).
function exprRe(expr) {
  let re = reCache.get(expr);
  if (!re) {
    const body = expr.trim().split(/\s+/).map(escapeRe).join('\\s+');
    re = new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'giu');
    reCache.set(expr, re);
  }
  re.lastIndex = 0;
  return re;
}
const casa = (oracao, expr) => exprRe(expr).test(oracao);
const casaAlguma = (oracao, lista) => (lista || []).some((e) => casa(oracao, e));
// Todas as ocorrências de expr na oração, com posição.
function ocorrencias(oracao, expr) {
  const re = exprRe(expr);
  const res = [];
  let m;
  while ((m = re.exec(oracao))) { res.push(m.index); if (m[0].length === 0) re.lastIndex++; }
  return res;
}

const EXTENSO = {
  um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, quinze: 15, dezesseis: 16, vinte: 20,
};
const NUM = `(\\d+|${Object.keys(EXTENSO).sort((a, b) => b.length - a.length).join('|')})`;
const valorNum = (s) => (/^\d+$/.test(s) ? parseInt(s, 10) : EXTENSO[s.toLowerCase()]);

// Lê a transcrição e devolve as orações do Cliente que não são pergunta, em ordem (regras 1–3).
function oracoesCliente(transcricao) {
  const lista = [];
  for (const bruta of transcricao.split(/\r?\n/)) {
    const m = bruta.match(/^\s*\[(\d+)\]\s*([^:(]+?)\s*(?:\([^)]*\))?\s*:\s?(.*)$/);
    if (!m) continue;
    const linha = parseInt(m[1], 10);
    if (m[2].trim().toLowerCase() !== 'cliente') continue;
    const texto = m[3];
    let ini = 0;
    for (let i = 0; i <= texto.length; i++) {
      const c = texto[i];
      if (i === texto.length || ',.;!?'.includes(c)) {
        const t = texto.slice(ini, i);
        if (c !== '?' && t.trim()) lista.push({ linha, texto: t });
        ini = i + 1;
      }
    }
  }
  return lista;
}

// ---------- etapa 1: proposta ----------

const FRASES = [
  ['remocao', ['esquece', 'pode tirar', 'não precisa', 'não precisam', 'não preciso', 'não quero', 'deixa de fora']],
  ['opcional', ['se sobrar', 'se der tempo']],
  ['desejavel', ['seria bom', 'gostaria']],
  ['obrigatorio', ['precisa', 'precisam', 'preciso', 'precisamos', 'tem que ter', 'obrigatório']],
];
const classifica = (t) => (FRASES.find(([, fs]) => casaAlguma(t, fs)) || [null])[0];

function escopoDe(oracoes, catalogo) {
  const estado = {};
  for (const o of oracoes) {
    const cls = classifica(o.texto);
    if (!cls) continue;
    for (const [mod, def] of Object.entries(catalogo)) {
      if (casaAlguma(o.texto, def.sinonimos)) estado[mod] = { prioridade: cls, linha: o.linha };
    }
  }
  const escopo = [];
  const fora = [];
  for (const mod of Object.keys(estado).sort()) {
    if (estado[mod].prioridade === 'remocao') fora.push(mod);
    else escopo.push({ modulo: mod, prioridade: estado[mod].prioridade, linha: estado[mod].linha });
  }
  return { escopo, fora };
}

function prazoDe(oracoes) {
  let prazo = null;
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])${NUM}\\s+(semanas|semana|meses|mês)(?![\\p{L}\\p{N}_])`, 'giu');
  for (const o of oracoes) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(o.texto))) {
      const n = valorNum(m[1]);
      if (n === undefined) continue;
      const u = m[2].toLowerCase();
      prazo = u.startsWith('sem') ? n : n * 4;
    }
  }
  return prazo;
}

const INCERTEZA = ['não sei', 'vou ver', 'não decidimos'];
function pendentesDe(oracoes, checklist) {
  return checklist
    .filter((q) => !oracoes.some((o) => casaAlguma(o.texto, q.palavras) && !casaAlguma(o.texto, INCERTEZA)))
    .map((q) => q.id)
    .sort();
}

// Fecha a lista de módulos com as dependências (regra 14).
function comDependencias(mods, catalogo) {
  const set = new Set();
  const pilha = [...mods];
  while (pilha.length) {
    const m = pilha.pop();
    if (set.has(m) || !catalogo[m]) continue;
    set.add(m);
    for (const r of catalogo[m].requer || []) pilha.push(r);
  }
  return [...set].sort();
}

// Regras 15–19. extraHoras = horas de contingência (regra 30).
function preco(mods, catalogo, tabela, prazo, extraHoras = {}) {
  if (mods.length === 0) return 0;
  const vh = tabela.valor_hora_centavos;
  let base = 0n;
  let horas = 0;
  const soma = (hs) => {
    for (const [papel, h] of Object.entries(hs || {})) {
      base += BigInt(h) * BigInt(vh[papel] ?? 0);
      horas += h;
    }
  };
  for (const m of mods) soma(catalogo[m].horas);
  soma(extraHoras);
  let pctU = 100;
  if (prazo !== null) {
    const faixas = (tabela.urgencia || []).filter((f) => prazo <= f.ate_semanas).sort((a, b) => a.ate_semanas - b.ate_semanas);
    if (faixas.length) pctU = faixas[0].pct;
  }
  const dv = tabela.desconto_volume;
  const pctD = dv && horas >= dv.horas_minimas ? dv.pct : 0;
  const num = base * BigInt(pctU) * BigInt(100 - pctD);
  const R = BigInt(tabela.arredondamento_centavos || 1);
  const den = 10000n * R;
  const k = (num + den - 1n) / den;
  let valor = Number(k * R);
  if (valor < tabela.minimo_centavos) valor = tabela.minimo_centavos;
  return valor;
}

// ---------- etapa 2: cronograma ----------

function cronogramaDe(modsRec, escopo, catalogo, equipe, prazo) {
  const prio = Object.fromEntries(escopo.map((e) => [e.modulo, e.prioridade]));
  const grupo = (m) => (prio[m] === 'obrigatorio' ? 1 : prio[m] === 'desejavel' ? 2 : 0);
  const duracao = (m) => {
    let d = 0;
    for (const [papel, h] of Object.entries(catalogo[m].horas || {})) {
      if (!h) continue;
      const cap = (equipe[papel]?.pessoas ?? 0) * (equipe[papel]?.horas_semana ?? 0);
      if (cap > 0) d = Math.max(d, Math.ceil(h / cap));
    }
    return d;
  };
  const feitos = new Set();
  const faltam = new Set(modsRec);
  const modulos = [];
  let fim = 0;
  while (faltam.size) {
    let prontos = [...faltam].filter((m) => (catalogo[m].requer || []).every((r) => !faltam.has(r)));
    if (!prontos.length) prontos = [...faltam]; // ciclo: não deveria acontecer
    prontos.sort((a, b) => grupo(a) - grupo(b) || (a < b ? -1 : a > b ? 1 : 0));
    const m = prontos[0];
    const inicio = fim + 1;
    fim = inicio + duracao(m) - 1;
    modulos.push({ modulo: m, inicio, fim });
    feitos.add(m);
    faltam.delete(m);
  }
  const total = modulos.length ? modulos[modulos.length - 1].fim : 0;
  return { modulos, total_semanas: total, estoura_prazo: prazo !== null && total > prazo };
}

// ---------- etapa 3: riscos ----------

function riscosDe(oracoes, riscos, modsRec, cronograma, catalogo, tabela, prazo) {
  const ativos = riscos.filter((r) => {
    if (r.modulo && !modsRec.includes(r.modulo)) return false;
    if (r.gatilho === 'estoura_prazo') return cronograma.estoura_prazo;
    if (r.sinais) return oracoes.some((o) => casaAlguma(o.texto, r.sinais));
    return false;
  });
  const extra = {};
  let horas = 0;
  for (const r of ativos) for (const [p, h] of Object.entries(r.horas || {})) { extra[p] = (extra[p] || 0) + h; horas += h; }
  return {
    ids: ativos.map((r) => r.id).sort(),
    horas_contingencia: horas,
    preco_recomendado_centavos: preco(modsRec, catalogo, tabela, prazo, extra),
  };
}

// ---------- etapa 4: pagamento ----------

function pagamentoDe(oracoes, valor, tabela, cronograma) {
  const pg = tabela.pagamento;
  let forma = null; // { tipo, n }
  let entradaPct = null;
  const reParc = new RegExp(`(?<![\\p{L}\\p{N}_])${NUM}\\s+(parcelas|parcela)(?![\\p{L}\\p{N}_])`, 'giu');
  const rePct = /(?<![\p{L}\p{N}_])(\d+)%/gu;
  for (const o of oracoes) {
    const t = o.texto;
    const ev = [];
    for (const i of ocorrencias(t, 'à vista')) ev.push({ i, k: 'forma', v: { tipo: 'a_vista' } });
    reParc.lastIndex = 0;
    let m;
    while ((m = reParc.exec(t))) {
      const n = valorNum(m[1]);
      if (n !== undefined) ev.push({ i: m.index, k: 'forma', v: { tipo: 'parcelado', n } });
    }
    for (const i of ocorrencias(t, 'sem entrada')) ev.push({ i, k: 'entrada', v: 0 });
    if (casa(t, 'entrada')) {
      rePct.lastIndex = 0;
      while ((m = rePct.exec(t))) ev.push({ i: m.index, k: 'entrada', v: parseInt(m[1], 10) });
    }
    ev.sort((a, b) => a.i - b.i);
    for (const e of ev) {
      if (e.k === 'forma') forma = e.v;
      else entradaPct = e.v;
    }
  }
  if (!forma) forma = { tipo: 'parcelado', n: pg.parcelas_padrao };
  if (entradaPct === null) entradaPct = pg.entrada_pct_padrao;

  if (forma.tipo === 'a_vista') {
    const total = Math.floor((valor * (100 - pg.desconto_a_vista_pct)) / 100);
    return { forma: 'a_vista', valor_total_centavos: total, parcelas: valor === 0 ? [] : [{ tipo: 'a_vista', semana: 0, valor_centavos: total }] };
  }
  if (valor === 0) return { forma: 'parcelado', valor_total_centavos: 0, parcelas: [] };
  const parcelas = [];
  const entrada = Math.floor((valor * entradaPct) / 100);
  if (entrada > 0) parcelas.push({ tipo: 'entrada', semana: 0, valor_centavos: entrada });
  const resto = valor - entrada;
  let n = Math.max(1, Math.min(forma.n, pg.max_parcelas));
  if (Math.floor(resto / n) < pg.parcela_minima_centavos) n = Math.max(1, Math.floor(resto / pg.parcela_minima_centavos));
  const cada = Math.floor(resto / n);
  const mods = cronograma.modulos;
  const mm = mods.length;
  for (let i = 1; i <= n; i++) {
    const pos = Math.ceil((mm * i) / n);
    const semana = mm ? mods[pos - 1].fim : 0;
    parcelas.push({ tipo: 'parcela', semana, valor_centavos: i < n ? cada : resto - cada * (n - 1) });
  }
  return { forma: 'parcelado', valor_total_centavos: valor, parcelas };
}

// ---------- caso ----------

export function resolve(dir) {
  const ler = (f) => readFileSync(join(dir, f), 'utf8');
  const lerJson = (f, padrao) => (existsSync(join(dir, f)) ? JSON.parse(ler(f)) : padrao);
  const catalogo = lerJson('catalogo.json', {});
  const tabela = lerJson('tabela.json', {});
  const checklist = lerJson('checklist.json', []);
  const equipe = lerJson('equipe.json', {});
  const riscos = lerJson('riscos.json', []);
  const oracoes = oracoesCliente(existsSync(join(dir, 'transcricao.txt')) ? ler('transcricao.txt') : '');

  const { escopo, fora } = escopoDe(oracoes, catalogo);
  const prazo = prazoDe(oracoes);
  const de = (prios) => escopo.filter((e) => prios.includes(e.prioridade)).map((e) => e.modulo);
  const pacotes = {
    essencial: comDependencias(de(['obrigatorio']), catalogo),
    recomendado: comDependencias(de(['obrigatorio', 'desejavel']), catalogo),
    completo: comDependencias(de(['obrigatorio', 'desejavel', 'opcional']), catalogo),
  };
  const proposta = {
    escopo,
    fora_do_escopo: fora,
    perguntas_pendentes: pendentesDe(oracoes, checklist),
    prazo_semanas: prazo,
    preco_centavos: Object.fromEntries(Object.entries(pacotes).map(([k, mods]) => [k, preco(mods, catalogo, tabela, prazo)])),
  };
  const cronograma = cronogramaDe(pacotes.recomendado, escopo, catalogo, equipe, prazo);
  const r = riscosDe(oracoes, riscos, pacotes.recomendado, cronograma, catalogo, tabela, prazo);
  const pagamento = pagamentoDe(oracoes, r.preco_recomendado_centavos, tabela, cronograma);
  return { proposta, cronograma, riscos: r, pagamento };
}

const casosDir = process.env.CASOS_DIR || 'casos';
const outDir = process.env.OUT_DIR || 'out';
const nomes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(casosDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
mkdirSync(outDir, { recursive: true });
for (const caso of nomes) {
  const res = resolve(join(casosDir, caso));
  writeFileSync(join(outDir, `${caso}.json`), JSON.stringify(res, null, 2) + '\n');
  console.log(`ok: ${outDir}/${caso}.json`);
}
