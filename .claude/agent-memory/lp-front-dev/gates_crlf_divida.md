---
name: gates-crlf-divida
description: A dívida de CRLF que fazia `lint`/`format:check` sempre falharem foi RESOLVIDA em 2026-08-03; o que sobrou é um piso de 30 warnings de tipagem, e a regra passou a ser delta zero
metadata:
  type: project
---

# Gates: a dívida de CRLF acabou; sobrou um piso de 30 warnings

**Situação anterior (até 2026-08-03):** os blobs commitados tinham CRLF e `core.autocrlf=true`,
então cada linha virava um warning `prettier/prettier "Delete ␍"` — 5395 warnings em 73 arquivos.
Com `--max-warnings 0`, `npm run lint` e `npm run format:check` falhavam antes de qualquer
alteração, e não valiam como sinal de regressão.

**Resolvido pela `@lp-architect` (Aria)** nos commits `a2a8e32` (normalização para LF +
`.gitattributes`) e `3d9ed0c` (Prettier no código-fonte), na branch `chore/normaliza-crlf`.
`core.autocrlf` agora é `false` e o `.gitattributes` impõe LF. **Não mexer nisso.**

## Estado atual dos gates (medido em 2026-08-04)

| Gate                   | Status                                                     |
| ---------------------- | ---------------------------------------------------------- |
| `npx tsc --noEmit`     | passa limpo                                                |
| `npm run build`        | passa limpo                                                |
| `npm run format:check` | **passa limpo** (era vermelho)                             |
| `npm run lint`         | **30 warnings, 0 erros** — falha só por `--max-warnings 0` |

Os 30 são **29 `no-explicit-any` + 1 `react-hooks/exhaustive-deps`**, todos pré-existentes e
deliberadamente mantidos (dívida de tipagem; mexer neles é mudança de tipo com risco e merece
commit próprio).

**Why:** com o ruído de CRLF fora do caminho, o lint voltou a ser sinal. Um warning novo agora é
visível — antes ficava escondido no meio de milhares.

**How to apply:** a regra passou a ser **delta zero**: seu trabalho não pode acrescentar nenhum
warning ao piso de 30. Confira com `npm run lint | tail -3` e compare o total; se subiu, o
warning é seu. Cuidado com dois casos que já morderam:

- `prettier/prettier` — rode `npx prettier --write` **só nos arquivos que você tocou**
  (`--write` global reformata o repo e polui o diff).
- `no-misleading-character-class` — vira **erro**, não warning. Emoji com variation selector
  (`⚠️` = U+26A0 + U+FE0F) dentro de `[...]` dispara; use grupo `(?:⚠️)?` em vez de classe.

Ver também [[reference-ambiente-local-dev]].
