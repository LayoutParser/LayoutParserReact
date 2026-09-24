---
name: project-fiscal-201-quality-signals-checksrun-2026-09-21
description: API vai entregar qualitySignals (#201/LayoutParserApi#424) com checksRun obrigatório — array vazio em conflicts/etc só significa "ok" se o check constar em checksRun
metadata:
  type: project
---

Em 2026-09-21 a equipe da LayoutParserApi confirmou que #201 (ingestão versionada do pacote
fiscal) está EM IMPLEMENTAÇÃO do lado da API (LayoutParserApi#424, "sinais de qualidade").
Eles vão adotar o formato que propusemos (`qualitySignals` com `missingRequiredColumns`,
`conflicts`, `absentReferences`), mas com uma condição importante: vão incluir um campo
`checksRun` (array com os nomes dos checks realmente executados).

**Regra de contrato:** um array vazio em `conflicts` (ou `missingRequiredColumns`,
`absentReferences`) só pode ser lido como "sem problema" se o check correspondente constar em
`checksRun`. Se o check não rodou, o array vazio não é garantia de nada — é ausência de dado,
não ausência de problema.

Primeira entrega da API só terá checks determinísticos: coluna obrigatória ausente, aba
ignorada, aba sem regras. "Conflito entre abas" (`conflicts`) fica para depois — ou seja,
mesmo quando a API entregar essa primeira versão, `conflicts: []` **não** pode ser tratado como
"não há conflito", só como "esse check ainda não roda".

**Why:** sem essa regra, o front (`@lp-front-dev`) poderia implementar a revisão de pacote em
#201 assumindo silenciosamente que array vazio = tudo certo, criando uma falsa sensação de
segurança para o especialista fiscal exatamente no PBI que existe para evitar isso.

**How to apply:** quando `@lp-front-dev` for consumir o contrato de `qualitySignals` (depois que
a API entregar LayoutParserApi#424), a lógica de exibição/gate no wizard de #201 precisa checar
`checksRun.includes(nomeDoCheck)` antes de tratar o array correspondente como "aprovado" — do
contrário, deve exibir como "não verificado" em vez de "sem problema". Repassar esse requisito
explicitamente no handoff técnico para `@lp-front-dev` quando a Story de consumo for aberta;
não fechar critério de aceite de #201 sem esse tratamento. #201 segue "Blocked" no board
(aguardando entrega da API) — nenhuma mudança de status feita agora. Ver também
[[project_fiscal_199_201_202_204_reeval_2026_09_16]].
