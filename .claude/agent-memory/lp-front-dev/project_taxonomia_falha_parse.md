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

## Os três campos novos (nenhum emitido ainda)

| Campo | Onde | Estado em 2026-08-04 |
|---|---|---|
| `failureCause` (`parser_defect`/`document_malformed`/`layout_mismatch`) | corpo do 422/500 | não emitido |
| `documentHealth` (`clean`/`has_defects`) | corpo do 200 | não emitido |
| `fieldName`/`fieldGuid`/`targetXPath` | itens de `validationErrors[]` | não emitidos |

Verificado em runtime contra a API em `:5100`: o 422 real ainda vem
`{success, detectedType, message}` sem `failureCause`; o 200 real não traz `documentHealth`; e os
47 `validationErrors` de um documento defeituoso não têm nenhum dos três campos de identidade.
`targetXPath` é o que deve demorar mais — depende da linhagem campo→XPath, lacuna conhecida.

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
- **Divergência reportada à Aria (não resolvida):** a spec §2.1 diz que o documento com defeito é
  "renderizado normalmente"; o `FieldDisplay` **corta** a exibição na primeira linha defeituosa,
  de propósito (TXT posicional: tamanho errado desalinha tudo depois). Mantido o corte, agora com
  nota explicando. Reverter isso é decisão de produto, não de implementação.

**How to apply:** ao mexer em erro de parse, entre por `assessParseFailure` /
`resolveDocumentHealth` / `describeValidationErrorTarget` em vez de ler `kind` ou
`validationErrors.length` direto no componente. Quando o back-end publicar os campos, o caminho
que muda é só o de fallback — o resto já está ligado.

Ver também [[reference-ambiente-local-dev]] (como forçar um 200 com defeito real) e
[[gates-crlf-divida]].
