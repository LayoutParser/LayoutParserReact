---
name: gates-crlf-divida
description: Por que `npm run lint` e `format:check` NUNCA passam neste repo (CRLF commitado) e como provar que a falha restante é pré-existente e não regressão sua
metadata:
  type: project
---

# Gates: `lint` e `format:check` são vermelhos por dívida, não por você

`.prettierrc` declara `endOfLine: "lf"`, mas **os blobs commitados contêm CRLF** (verificado:
`git show HEAD:<arquivo> | od -c` mostra `\r`). Some-se a isso `core.autocrlf=true`, que
converte na ida e na volta — inclusive um `git stash`/`pop` reconverte arquivos que você
escreveu em LF de volta para CRLF.

**Why:** cada linha CRLF vira um warning `prettier/prettier "Delete ␍"`, e `npm run lint` roda
com `--max-warnings 0`. Logo os dois gates falham **antes de você tocar em qualquer coisa**, e
seguirão falhando até alguém normalizar o repo inteiro (tarefa própria, ~75 arquivos — não
misture com uma feature, o diff fica ilegível).

**How to apply:** não tente deixar esses dois gates verdes, e **não normalize só os arquivos que
você tocou** (vira inconsistência e o stash/checkout desfaz). Em vez disso:

1. Meça o baseline **na mesma base** antes de concluir:
   `git stash push -u` → `npm run lint | grep problems` → `git stash pop`.
   Referência medida em 2026-08-03 sobre `feat/design-tokens-padronizacao-visual` (6c7ee93):
   **5395 warnings / 73 arquivos** no `format:check`. O delta depois das suas mudanças deve ser
   ~proporcional às linhas que você acrescentou (são todas CRLF, como o resto do repo).
2. Prove que **nenhum warning seu é de estilo real**, normalizando cópias e rodando o prettier:
   ```bash
   tr -d '\r' < arquivo > /tmp/copia && npx prettier --check --config .prettierrc /tmp/copia
   ```
   Se sair "All matched files use Prettier code style!", o único problema do seu código é line
   ending — ou seja, dívida do repo, não sua.
3. `npx tsc --noEmit` e `npm run build` **passam limpos** e são os gates que realmente valem
   como sinal de regressão. Trate-os como bloqueantes.

Cuidado com o `--fix` do eslint: ele "conserta" os 5000+ CRLF do repo todo e transforma seu PR
num diff de milhares de linhas.

Ver também [[reference-ambiente-local-dev]].
