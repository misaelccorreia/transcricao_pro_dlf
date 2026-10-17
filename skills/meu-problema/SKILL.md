---
name: meu-problema
description: Reunião de descoberta → proposta (proposta, cronograma, riscos, pagamento). Um script determinístico implementa as regras 1–37 do README.md e escreve out/<caso>.json.
---

# Agente 86 · reunião → proposta (P: reuniao-proposta)

As 37 regras do `README.md` do workspace são todas mecânicas. Elas já estão implementadas em `solve.mjs`, nesta
pasta. **Não calcule nada à mão**: rode o script.

## Passo a passo

1. Rode na raiz do workspace:

   ```bash
   node .opencode/skills/meu-problema/solve.mjs
   ```

   Ele lê todas as pastas de `casos/` e escreve um `out/<caso>.json` por caso. Para um caso só:
   `node .opencode/skills/meu-problema/solve.mjs exemplo-2`.
2. Rode `node .opencode/skills/checar-saida/check.mjs` (formato e coerência).
3. Se existir `tests/public`, rode `npx vitest run tests/public`.
4. Tudo passou → pare. Não edite os arquivos de `out/` à mão.

## Se algo falhar

- **Nunca edite `.opencode/`, `tests/`, `casos/`, `README.md` nem `package*.json`.** Um arquivo alterado
  fora de `out/` zera a nota.
- Para corrigir o script, copie-o para `/tmp` e edite a cópia:

  ```bash
  cp .opencode/skills/meu-problema/solve.mjs /tmp/solve.mjs
  node /tmp/solve.mjs
  ```

  A cópia continua lendo `casos/` e escrevendo `out/` a partir da pasta atual.
- Compare o erro do teste com a regra do `README.md` que cobre aquele campo e corrija só essa parte.
  No máximo 3 ciclos.

## O que o script garante (para conferir no README se precisar)

- Só falas `Cliente`. Oração = trecho entre `, . ; ! ?`. Oração terminada em `?` é ignorada em todas as etapas.
- Casamento por palavra inteira, sem diferenciar maiúsculas, com acento (`app` ≠ `apps`, `não` ≠ `nao`).
- Frase-chave na ordem remoção → opcional → desejável → obrigatório. A última oração classificada vence.
- Prazo: número (algarismo ou por extenso) colado em semana/semanas/mês/meses (mês = 4). Vale o último.
- Preço com dependências (`requer`, transitivo), urgência (menor faixa com prazo ≤ `ate_semanas`), desconto
  de volume (horas ≥ mínimo), arredondamento para cima e mínimo. Pacote vazio = 0.
- Cronograma do recomendado: um módulo por vez; grupo 0 (só dependência) → 1 (obrigatório) → 2 (desejável),
  depois ordem alfabética; duração = maior `ceil(horas ÷ (pessoas × horas_semana))`.
- Riscos: sinal numa oração do cliente (ou gatilho `estoura_prazo`); risco com `modulo` só conta se o módulo
  estiver no recomendado; a contingência reprecifica o recomendado.
- Pagamento: última forma (`à vista` / `N parcelas`) e última entrada (`sem entrada` / `N%` numa oração com
  `entrada`); limite de parcelas, parcela mínima, centavos na última parcela, vencimento no `fim` do módulo
  `⌈m × i ÷ n⌉`.
