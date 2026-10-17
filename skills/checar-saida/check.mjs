// Valida out/*.json: um arquivo por caso em casos/, JSON válido, formato e coerência da task reunião → proposta.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const erros = [];
const casos = existsSync('casos') ? readdirSync('casos', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
if (!existsSync('out')) erros.push('a pasta out/ não existe');

const inteiro = (v) => Number.isInteger(v);
const ordenado = (a) => a.every((x, i) => i === 0 || a[i - 1] < x);
const chaves = (o, ks) => o && typeof o === 'object' && ks.every((k) => k in o) && Object.keys(o).length === ks.length;

function checa(caso, r) {
  const e = (msg) => erros.push(`${caso}: ${msg}`);
  if (!chaves(r, ['proposta', 'cronograma', 'riscos', 'pagamento'])) return e('chaves de topo devem ser proposta, cronograma, riscos, pagamento');
  const p = r.proposta;
  if (!chaves(p, ['escopo', 'fora_do_escopo', 'perguntas_pendentes', 'prazo_semanas', 'preco_centavos'])) e('proposta com chaves erradas');
  if (!Array.isArray(p.escopo) || !p.escopo.every((x) => chaves(x, ['modulo', 'prioridade', 'linha']) && ['obrigatorio', 'desejavel', 'opcional'].includes(x.prioridade) && inteiro(x.linha))) e('proposta.escopo inválido');
  else if (!ordenado(p.escopo.map((x) => x.modulo))) e('proposta.escopo fora de ordem alfabética');
  for (const k of ['fora_do_escopo', 'perguntas_pendentes']) if (!Array.isArray(p[k]) || !ordenado(p[k])) e(`proposta.${k} deve ser array ordenado`);
  if (!(p.prazo_semanas === null || inteiro(p.prazo_semanas))) e('proposta.prazo_semanas deve ser inteiro ou null');
  if (!chaves(p.preco_centavos, ['essencial', 'recomendado', 'completo']) || !Object.values(p.preco_centavos).every(inteiro)) e('proposta.preco_centavos inválido');
  const c = r.cronograma;
  if (!chaves(c, ['modulos', 'total_semanas', 'estoura_prazo']) || !Array.isArray(c.modulos) || typeof c.estoura_prazo !== 'boolean') e('cronograma inválido');
  const q = r.riscos;
  if (!chaves(q, ['ids', 'horas_contingencia', 'preco_recomendado_centavos']) || !ordenado(q.ids || []) || !inteiro(q.preco_recomendado_centavos)) e('riscos inválido');
  const g = r.pagamento;
  if (!chaves(g, ['forma', 'valor_total_centavos', 'parcelas']) || !['a_vista', 'parcelado'].includes(g.forma) || !Array.isArray(g.parcelas)) return e('pagamento inválido');
  const soma = g.parcelas.reduce((s, x) => s + x.valor_centavos, 0);
  if (g.parcelas.length && soma !== g.valor_total_centavos) e(`pagamento: soma das parcelas (${soma}) ≠ valor_total_centavos (${g.valor_total_centavos})`);
  if (g.forma === 'parcelado' && g.valor_total_centavos !== q.preco_recomendado_centavos) e('pagamento parcelado deve valer riscos.preco_recomendado_centavos');
}

for (const caso of casos) {
  const arquivo = `out/${caso}.json`;
  if (!existsSync(arquivo)) { erros.push(`falta ${arquivo}`); continue; }
  let r;
  try { r = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (err) { erros.push(`${arquivo} não é JSON válido: ${err.message}`); continue; }
  checa(caso, r);
}
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log(`ok: ${casos.length} caso(s) com saída válida`);
