---
name: project-taxonomia-falha-parse
description: Contrato antecipado de failureCause/documentHealth/identidade de campo no parse — implementado no front em feat/taxonomia-falha-parse; back-end ainda não emite nenhum dos campos
metadata:
  type: project
---

# Taxonomia de falha do parse (front implementado contra contrato antecipado)

Spec autoritativa: `LayoutParserApi/docs/architecture/spec-taxonomia-de-falha-do-parse.md`
(escrita pela `@lp-architect` em 2026-08-03). Front implementado em
**`feat/taxonomia-falha-parse`** (commit `02a2ff7`), a partir de `chore/normaliza-crlf`.

**Why:** pergunta do dono do projeto — *"falhou por quê?"*. Se a falha é nossa, não se apresenta
o arquivo; se é do arquivo, aponta-se o erro com precisão. Além da UI, `fieldGuid` no erro é o
que transforma cada documento processado em par rotulado *(campo, correto/incorreto)* para a IA,
em vez de *(intervalo de bytes, errado)* — que não generaliza entre documentos.

## Os campos novos (nenhum emitido pela instância que roda hoje)

| Campo | Onde | Estado em 2026-08-04 |
|---|---|---|
| `failureCause` (`parser_defect`/`document_malformed`/`layout_invalid`) | corpo do 422/500 | não emitido |
| `documentHealth` (`clean`/`has_defects`) | corpo do 200 | não emitido |
| `recordName`/`recordGuid` | itens de `validationErrors[]` | não emitidos |
| `fieldName`/`fieldGuid`/`targetXPath` | itens de `validationErrors[]` | **sempre `null` por decisão** |

Verificado em runtime contra a API em `:5100` — **inclusive depois de o back-end declarar a
implementação concluída: o processo em execução seguia servindo o contrato antigo.** Ou seja,
"back-end pronto" ≠ "API respondendo com os campos"; sonde antes de assumir que dá para validar.

**Os rótulos de 422 se dividem POR ARTEFATO — qual arquivo o usuário deve abrir:**
`document_malformed` = problema no TXT (encoding, arquivo vazio); `layout_invalid` = XML do
layout ilegível. Trocar os textos manda o usuário caçar defeito no arquivo errado, que é pior
que uma mensagem genérica. `layout_mismatch` **não existe** como valor emitido — ficou reservado
para "XML bem-formado que não é um layout". Documento vazio virou 422 `document_malformed`
(antes era 200 com zero campos, que sairia como `documentHealth: clean` — a mentira que a spec
existe para matar).

**Identidade de campo não vai existir tão cedo** (spec §5.1): o validador recebe só texto e um
comprimento esperado, nunca vê o layout, e todos os erros que emite são de enquadramento de
linha. O que dá para resolver é o **registro** (`recordName`/`recordGuid`, casando o `sequence`
do erro com o `LineElement`). Preencher `fieldGuid` com GUID de registro foi recusado de
propósito: dado mal rotulado ensina à IA uma granularidade que não é a real, e quem consumir
depois não teria como saber que o rótulo mente.

## Decisões de front que valem para quem continuar

- **`failureCause` manda, `ParseErrorKind` (422/5xx/rede) é só fallback.** Não são taxonomias
  paralelas: `assessParseFailure` (`utils/parseFailure.ts`) resolve uma coisa só. Se as duas
  discordarem (ex.: `parser_defect` num 422), prevalece a causa — quem viu a exceção foi o
  back-end. Um `failureCause` fora do conjunto fechado é descartado com `console.warn` e cai no
  fallback, em vez de sumir com o banner.
- **A regra de produto virou um booleano:** `blamesDocument`. Quando é falso, a UI não sugere que
  o usuário investigue o arquivo e omite `detectedType`.
- **`documentHealth` é derivado quando ausente**, e se o back-end disser `clean` com
  `validationErrors` preenchido, **a lista vence** — esconder defeito descrito no payload é pior
  que exibir um a mais.
- **O corte da exibição segue a CLASSE do erro, não a existência dele** (decisão da Aria depois
  que reportei a divergência): só `expectedLength != actualLength` dessincroniza o documento
  posicional e justifica cortar; erro de conteúdo (sequência inválida, HEADER fora de posição)
  é anotado e a exibição continua. Vale para `FieldDisplay` **e** `StructureTree` — divergir
  entre os dois deixaria a árvore menor que a lista de linhas. O critério mora em
  `isDesyncingValidationError`; em dúvida sobre erro novo, o conservador é cortar.
- **Reportar divergência em vez de decidir sozinho compensou:** o corte largo demais só ficou
  visível porque eu tinha o dado real (47 erros com `expected == actual`) e escalei. A Aria
  confirmou o princípio (não exibir dado desalinhado) e corrigiu o escopo.

**How to apply:** ao mexer em erro de parse, entre por `assessParseFailure` /
`resolveDocumentHealth` / `describeValidationErrorTarget` / `findFirstDesyncLineIndex` em vez de
ler `kind`, `validationErrors.length` ou `expectedLength` direto no componente. Quando o back-end
publicar os campos, o caminho que muda é só o de fallback — o resto já está ligado.

**Contrato em movimento:** esta spec mudou duas vezes durante uma única sessão de implementação
(rename de rótulo + reclassificação da identidade). Antes de fixar tipo novo vindo dela, reler
as seções citadas em vez de confiar no que já estava escrito aqui.

Ver também [[reference-ambiente-local-dev]] (como forçar um 200 com defeito real) e
[[gates-crlf-divida]].
