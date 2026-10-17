# Transcrição de reunião → proposta que o cliente assina

Uma agência de software saiu de uma reunião de descoberta com o cliente. Você lê a transcrição e monta a
proposta inteira, em quatro etapas, uma alimentando a outra:

1. **`proposta`** — o escopo que o cliente confirmou, o que ele tirou, as perguntas que ficaram sem resposta, o
   prazo e o preço de três pacotes (regras 1–19).
2. **`cronograma`** — com a equipe da agência, em que semana cada módulo do pacote recomendado começa e termina,
   e se isso estoura o prazo (regras 20–25).
3. **`riscos`** — os sinais de risco nas falas do cliente e as horas de contingência que eles somam ao preço do
   pacote recomendado (regras 26–31).
4. **`pagamento`** — as condições de pagamento que o cliente pediu, em parcelas com valor e semana de
   vencimento (regras 32–37).

Um erro numa etapa passa para as seguintes, como no trabalho real.

## Entrada: `casos/<caso>/`

| Arquivo | Conteúdo |
|---|---|
| `transcricao.txt` | uma fala por linha: `[NNN] Cliente (Nome): texto` ou `[NNN] Agência (Nome): texto`. `NNN` é o número da linha (ex.: `[007]` = linha 7) |
| `catalogo.json` | `{ "<modulo>": { "horas": { "<papel>": n }, "sinonimos": ["...", ...], "requer": ["<modulo>", ...] } }` — `requer` pode não existir (= nenhum) |
| `tabela.json` | `{ "valor_hora_centavos": { "<papel>": n }, "urgencia": [{ "ate_semanas", "pct" }], "desconto_volume": { "horas_minimas", "pct" }, "arredondamento_centavos", "minimo_centavos", "pagamento": { "desconto_a_vista_pct", "entrada_pct_padrao", "parcelas_padrao", "max_parcelas", "parcela_minima_centavos" } }` |
| `checklist.json` | `[{ "id", "pergunta", "palavras": ["...", ...] }]` — perguntas que toda reunião de descoberta deveria responder |
| `equipe.json` | `{ "<papel>": { "pessoas": n, "horas_semana": n } }` — a equipe que vai fazer o projeto |
| `riscos.json` | `[{ "id", "sinais": ["...", ...], "gatilho", "modulo", "horas": { "<papel>": n } }]` — cada risco tem `sinais` **ou** `gatilho`; `modulo` pode não existir |

## Etapa 1 — `proposta`

### Como ler a transcrição

1. **Só falas do Cliente contam.** Qualquer pessoa marcada `Cliente` vale (pode haver mais de uma). Falas da
   `Agência` são ignoradas para tudo, em todas as etapas, mesmo quando sugerem módulo, prazo, preço, risco ou forma de
   pagamento.
2. **Oração** = pedaço do texto da fala entre os sinais `,` `.` `;` `!` `?` (o início e o fim do texto também
   delimitam). Cada oração é analisada sozinha.
3. **Pergunta não decide nada:** oração terminada em `?` é ignorada para tudo, em todas as etapas.
4. **Casar uma expressão** (sinônimo, frase-chave, palavra do checklist, sinal de risco ou termo de pagamento) =
   ela aparece na oração como **palavra(s) inteira(s)**, ignorando maiúsculas/minúsculas. Acento conta (`não` ≠ `nao`). Ex.: `app` casa com
   "o app", mas **não** com "apps"; `site institucional` casa com "o Site Institucional".
5. Uma oração **menciona** um módulo quando casa com algum dos `sinonimos` dele no `catalogo.json`
   (o id do módulo, como `app_mobile`, não é sinônimo).

### Escopo

6. **Frases-chave.** Uma oração do cliente recebe **uma** classificação, testada nesta ordem (a primeira que
   casar vence):
   1. `remocao`: `esquece`, `pode tirar`, `não precisa`, `não precisam`, `não preciso`, `não quero`, `deixa de fora`
   2. `opcional`: `se sobrar`, `se der tempo`
   3. `desejavel`: `seria bom`, `gostaria`
   4. `obrigatorio`: `precisa`, `precisam`, `preciso`, `precisamos`, `tem que ter`, `obrigatório`

   Ex.: "não precisa de app" é `remocao` (mesmo contendo `precisa`); "gostaria de relatórios se der tempo" é
   `opcional`. Oração sem nenhuma frase-chave não muda nada, mesmo mencionando módulo.
7. A classificação vale para **todos** os módulos mencionados naquela oração.
8. **A última palavra é do cliente:** percorra as orações em ordem (linha a linha, da esquerda para a direita).
   Cada oração classificada sobrescreve o estado dos módulos que menciona. O estado final de cada módulo decide:
   - `obrigatorio` / `desejavel` / `opcional` → entra em `escopo`, com essa `prioridade` e a `linha` da
     oração que definiu esse estado final (a última);
   - `remocao` → entra em `fora_do_escopo` (inclusive módulo que nunca tinha sido pedido);
   - módulo nunca classificado pelo cliente → não aparece em nenhuma das duas listas.

### Prazo

9. **Prazo** = vem de orações do cliente com um **número seguido imediatamente** da unidade `semana`,
   `semanas`, `mês` ou `meses`. O número pode ser em algarismos (`12`) ou por extenso: `um`/`uma`=1,
   `dois`/`duas`=2, `três`=3, `quatro`=4, `cinco`=5, `seis`=6, `sete`=7, `oito`=8, `nove`=9, `dez`=10,
   `onze`=11, `doze`=12, `treze`=13, `quatorze`=14, `quinze`=15, `dezesseis`=16, `vinte`=20.
   `mês`/`meses` valem **4 semanas** cada (ex.: "dois meses" = 8). Sem número logo antes ("semana que vem",
   "por mês") não é prazo.
10. Vale a **última** ocorrência na transcrição. Se nenhuma oração do cliente tiver prazo, `prazo_semanas` = `null`.

### Perguntas pendentes

11. Uma pergunta do `checklist.json` está **respondida** quando alguma oração do cliente (que não seja
    pergunta) casa com uma das `palavras` dela **e** não contém `não sei`, `vou ver` nem `não decidimos`.
    Basta uma oração válida; uma incerteza em outra oração não desfaz a resposta.
12. `perguntas_pendentes` = ids das perguntas não respondidas.

### Preço

13. **Pacotes:** `essencial` = módulos `obrigatorio`; `recomendado` = `obrigatorio` + `desejavel`;
    `completo` = `obrigatorio` + `desejavel` + `opcional`.
14. **Dependências:** se um módulo do pacote tem `requer`, os módulos exigidos entram no preço desse pacote
    (e os que eles exigirem, e assim por diante), **mesmo que estejam em `fora_do_escopo` ou nunca tenham sido
    citados**. Cada módulo conta uma vez só. Isso afeta só o preço, não as listas `escopo`/`fora_do_escopo`.
15. **Base** do pacote = soma, em todos os módulos do pacote, de `horas[papel] × valor_hora_centavos[papel]`.
    **Horas** do pacote = soma de todas as horas de todos os papéis desses módulos.
16. **Urgência:** com `prazo_semanas` não nulo, escolha a faixa de `urgencia` de **menor** `ate_semanas` tal que
    `prazo_semanas ≤ ate_semanas` (limite **inclusivo**); `pct_urgencia` = o `pct` dela. Nenhuma faixa serve, ou
    prazo `null` → `pct_urgencia` = 100.
17. **Desconto de volume:** se as horas do pacote forem **maiores ou iguais** a `desconto_volume.horas_minimas`,
    `pct_desconto` = `desconto_volume.pct`; senão 0.
18. **Valor** = `base × pct_urgencia / 100 × (100 − pct_desconto) / 100`, **sem arredondar no meio**. Depois
    arredonde **para cima** até o próximo múltiplo de `arredondamento_centavos` (um valor que já é múltiplo
    fica igual).
19. **Mínimo:** se o valor arredondado ficar abaixo de `minimo_centavos`, o preço é `minimo_centavos`.
    Pacote **sem nenhum módulo** custa `0` (o mínimo não se aplica).

## Etapa 2 — `cronograma`

20. O cronograma é do pacote **`recomendado`**, com as dependências da regra 14 (os mesmos módulos que entram no
    preço dele). Pacote recomendado vazio → `modulos` = `[]` e `total_semanas` = 0.
21. **Capacidade** semanal de um papel = `pessoas × horas_semana` do `equipe.json`.
22. **Duração** de um módulo, em semanas inteiras = para cada papel com horas no módulo,
    `horas[papel] ÷ capacidade[papel]` arredondado **para cima**; vale o **maior** desses números. Ex.: dev 60 h
    com capacidade 40 → 2; design 16 h com capacidade 20 → 1; duração = 2.
23. A equipe faz **um módulo por vez**, do começo ao fim. O primeiro começa na semana 1 e cada um começa na semana
    seguinte ao fim do anterior: `inicio` = fim do anterior + 1, `fim` = `inicio` + duração − 1.
24. **Ordem.** Um módulo só pode começar depois que todos os módulos do `requer` dele terminaram. A cada passo,
    entre os módulos que faltam e já podem começar, escolha pelo **grupo**, menor primeiro:
    - grupo 0: módulo que está no pacote sem ser `obrigatorio` nem `desejavel` no `escopo` (entrou só por
      dependência: é `opcional`, está em `fora_do_escopo` ou nunca foi citado);
    - grupo 1: `obrigatorio`;
    - grupo 2: `desejavel`.

    Empate no grupo → ordem alfabética do id. Um módulo do grupo 0 que ainda não pode começar espera a vez dele.
25. `total_semanas` = `fim` do último módulo. `estoura_prazo` = `true` só quando `prazo_semanas` não é `null` **e**
    `total_semanas > prazo_semanas` (terminar exatamente no prazo não estoura). Prazo `null` → `false`.

## Etapa 3 — `riscos`

26. Um risco com `sinais` está **ativo** quando alguma oração do cliente que não é pergunta (regras 1–4) casa
    com algum dos `sinais` dele. Basta uma vez, em qualquer linha; aqui não existe "última palavra" e
    `não sei`/`vou ver` não mudam nada.
27. Um risco com `"gatilho": "estoura_prazo"` está ativo quando `cronograma.estoura_prazo` é `true`.
28. Um risco com `modulo` só fica ativo se esse módulo estiver no pacote recomendado (com dependências, regra 14).
    Sem o módulo, o sinal não conta.
29. `ids` = ids dos riscos ativos, em ordem alfabética. `horas_contingencia` = soma de todas as horas, de todos os
    papéis, dos riscos ativos.
30. **Preço com contingência:** refaça as regras 15–19 para o pacote recomendado somando as horas dos riscos
    ativos como se fossem horas de mais um módulo: a base ganha `horas[papel] × valor_hora_centavos[papel]` e as
    horas do pacote ganham essas horas (o que pode alcançar o desconto de volume). `pct_urgencia`,
    arredondamento e mínimo são os mesmos da etapa 1.
31. `preco_recomendado_centavos` = esse preço. Pacote recomendado vazio continua custando 0.

## Etapa 4 — `pagamento`

32. O valor a pagar é `riscos.preco_recomendado_centavos`.
33. **O que o cliente pediu.** Percorra as orações do cliente que não são pergunta, em ordem (regras 1–4), e
    dentro de cada oração as expressões da esquerda para a direita. Há dois itens, cada um com suas expressões:
    - **forma**: `à vista` → `a_vista`; um número (algarismos ou por extenso, a tabela da regra 9) seguido
      **imediatamente** de `parcela` ou `parcelas` → `parcelado`, com esse número de parcelas;
    - **entrada**: `sem entrada` → 0%; numa oração que casa com `entrada`, um número em algarismos colado no `%`
      (ex.: `20%`) → esse número em %.

    Para cada item vale a **última** expressão encontrada nessa leitura (inclusive quando a mesma oração tem mais
    de uma). A forma `parcelado` sempre vem com o número de parcelas da expressão que a definiu. Sem nenhuma
    expressão na transcrição, valem os padrões: forma `parcelado`, `entrada_pct_padrao` e `parcelas_padrao`; com
    forma `parcelado` mas sem expressão de entrada, vale `entrada_pct_padrao`. Falas da agência não contam, mesmo
    propondo forma, entrada ou desconto.
34. **À vista:** `valor_total_centavos` = valor × (100 − `desconto_a_vista_pct`) ÷ 100, arredondado para baixo
    até o centavo. O desconto é sempre o da tabela, mesmo que o cliente peça outro. Uma única linha
    `{ "tipo": "a_vista", "semana": 0, ... }`.
35. **Parcelado:** `valor_total_centavos` = valor. `entrada` = valor × pct ÷ 100, arredondado para baixo (entrada
    0 não aparece na lista). `resto` = valor − entrada. Número de parcelas `n` = o pedido, limitado a
    `max_parcelas`; se então `resto ÷ n` (arredondado para baixo) ficar **abaixo** de `parcela_minima_centavos`,
    `n` = `resto ÷ parcela_minima_centavos` arredondado para baixo (no mínimo 1). As parcelas 1..n−1 valem
    `resto ÷ n` arredondado para baixo; a **última** fica com o que sobra (`resto` − a soma das outras).
36. **Vencimento.** Entrada e à vista vencem na semana 0 (assinatura). A parcela `i` (de 1 a `n`) vence na semana
    `fim` do módulo que está na posição `⌈m × i ÷ n⌉` do cronograma (`m` = número de módulos, posição 1 = o
    primeiro a ser feito). Ex.: `m` = 5 e `n` = 2 → posições 3 e 5. Duas parcelas podem vencer na mesma semana.
37. Valor 0 → `parcelas` = `[]`.

## Saída: `out/<caso>.json`

Um objeto com uma chave por etapa (os números abaixo são só ilustrativos):

```json
{
  "proposta": {
    "escopo": [{ "modulo": "login", "prioridade": "obrigatorio", "linha": 5 }],
    "fora_do_escopo": ["app_mobile"],
    "perguntas_pendentes": ["hospedagem"],
    "prazo_semanas": 8,
    "preco_centavos": { "essencial": 1500000, "recomendado": 1500000, "completo": 1500000 }
  },
  "cronograma": {
    "modulos": [{ "modulo": "login", "inicio": 1, "fim": 1 }],
    "total_semanas": 1,
    "estoura_prazo": false
  },
  "riscos": { "ids": ["migracao_dados"], "horas_contingencia": 16, "preco_recomendado_centavos": 1700000 },
  "pagamento": {
    "forma": "parcelado",
    "valor_total_centavos": 1700000,
    "parcelas": [
      { "tipo": "entrada", "semana": 0, "valor_centavos": 510000 },
      { "tipo": "parcela", "semana": 1, "valor_centavos": 1190000 }
    ]
  }
}
```

- `proposta.escopo`: um objeto por módulo, ordenado por `modulo` (ordem alfabética do id). `prioridade` ∈
  `obrigatorio` | `desejavel` | `opcional`. `linha` é inteiro (`[032]` → `32`).
- `proposta.fora_do_escopo`, `proposta.perguntas_pendentes` e `riscos.ids`: arrays de ids em ordem alfabética
  (podem ser vazios `[]`).
- `proposta.prazo_semanas`: inteiro ou `null`. Preços e valores: inteiros em centavos.
- `cronograma.modulos`: na ordem em que são feitos (a da regra 24).
- `pagamento.forma` ∈ `a_vista` | `parcelado`. `pagamento.parcelas`: a entrada (se houver) primeiro e depois as
  parcelas de 1 a `n`; `tipo` ∈ `a_vista` | `entrada` | `parcela`.
