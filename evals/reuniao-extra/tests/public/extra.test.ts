import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Gabarito calculado à mão a partir das regras do README (não gerado pelo solve.mjs).
const out = (caso: string) => JSON.parse(readFileSync(`out/${caso}.json`, 'utf8'));

describe('caso extra', () => {
  // L7 "Pix seria bom, boleto não precisa" retira pagamento; L9 o traz de volta como obrigatório.
  // L12 "seria bom se sobrar tempo": opcional é testado antes de desejável.
  // L11 "gostaria de integrar com o sistema antigo" não cita módulo; L14 "Gostei" não inclui o blog.
  // L17 "o chat pode tirar" manda para fora um módulo nunca pedido.
  // L21 "servidor próprio a gente não tem" responde hospedagem mesmo com "não decidimos" na oração anterior.
  // L29 "a gente vê depois" não é incerteza da lista; L23 "vou ver" é.
  // Prazo: "três meses" (12) substituído por "dez semanas" (10). Faixa de 10 é inclusiva: 120%.
  // Pacotes: pagamento → carrinho → loja → login. 262 h < 270: sem desconto.
  // Base 3.260.000 × 1,2 = 3.912.000 → 3.915.000. Completo + estoque: 322 h ≥ 270, 4.040.000 × 1,2 × 0,92 → 4.465.000.
  it('exemplo-6 · proposta', () => {
    expect(out('exemplo-6').proposta).toEqual({
      escopo: [
        { modulo: 'carrinho', prioridade: 'obrigatorio', linha: 5 },
        { modulo: 'estoque', prioridade: 'opcional', linha: 12 },
        { modulo: 'loja', prioridade: 'obrigatorio', linha: 3 },
        { modulo: 'pagamento', prioridade: 'obrigatorio', linha: 9 },
      ],
      fora_do_escopo: ['app_mobile', 'chat'],
      perguntas_pendentes: ['orcamento'],
      prazo_semanas: 10,
      preco_centavos: { essencial: 3915000, recomendado: 3915000, completo: 4465000 },
    });
  });

  // Capacidade: dev 45, design 12, qa 10. login 1; loja max(2, 3, 2) = 3; carrinho max(1, 2) = 2; pagamento 2.
  it('exemplo-6 · cronograma', () => {
    expect(out('exemplo-6').cronograma).toEqual({
      modulos: [
        { modulo: 'login', inicio: 1, fim: 1 },
        { modulo: 'loja', inicio: 2, fim: 4 },
        { modulo: 'carrinho', inicio: 5, fim: 6 },
        { modulo: 'pagamento', inicio: 7, fim: 8 },
      ],
      total_semanas: 8,
      estoura_prazo: false,
    });
  });

  // "planilha" (L11) ativa migração. CPF está numa pergunta (L27). Estoque e chat não estão no recomendado.
  // 278 h ≥ 270 ganha o desconto: 3.460.000 × 1,2 × 0,92 = 3.819.840 → 3.820.000 (mais barato que sem risco).
  it('exemplo-6 · riscos', () => {
    expect(out('exemplo-6').riscos).toEqual({
      ids: ['migracao_dados'],
      horas_contingencia: 16,
      preco_recomendado_centavos: 3820000,
    });
  });

  // L31 à vista, depois L32 "6 parcelas com entrada de 10%" vence. 40% e 2 parcelas são da agência.
  // Entrada 382.000; resto 3.438.000; n = min(6, 5) = 5; 687.600 < 1.500.000 → n = 2.
  // m = 4: parcela 1 na posição 2 (loja, semana 4), parcela 2 na posição 4 (pagamento, semana 8).
  it('exemplo-6 · pagamento', () => {
    expect(out('exemplo-6').pagamento).toEqual({
      forma: 'parcelado',
      valor_total_centavos: 3820000,
      parcelas: [
        { tipo: 'entrada', semana: 0, valor_centavos: 382000 },
        { tipo: 'parcela', semana: 4, valor_centavos: 1719000 },
        { tipo: 'parcela', semana: 8, valor_centavos: 1719000 },
      ],
    });
  });
});
