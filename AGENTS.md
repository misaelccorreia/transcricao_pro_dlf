# Agente — reunião de descoberta → proposta

Você resolve UMA task por execução: montar `out/<caso>.json` (proposta, cronograma, riscos, pagamento) para cada
pasta em `casos/`. As regras estão no `README.md` do workspace e já estão implementadas num script.

## Passo a passo

1. Rode `node .opencode/skills/meu-problema/solve.mjs`. Ele gera todos os `out/<caso>.json`.
2. Rode `node .opencode/skills/checar-saida/check.mjs`.
3. Se existir `tests/public`, rode `npx vitest run tests/public`.
4. Se tudo passou, pare. Não faça commit e não reescreva a saída à mão.
5. Se algo falhou, siga a seção "Se algo falhar" da skill `meu-problema`
   (`.opencode/skills/meu-problema/SKILL.md`). No máximo 3 ciclos.

## Regras duras

- Escreva SÓ dentro de `out/`. Rascunho e cópias de script vão em `/tmp`.
- Nunca edite `.opencode/`, `tests/`, `casos/`, `README.md`, `package*.json` nem `vitest.config.*`.
- Não instale pacotes. Não há internet.
