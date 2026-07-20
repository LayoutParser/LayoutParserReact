---
name: project-env-node-windows-paths
description: node/npx/npm nesta máquina resolvem para binários nativos do Windows — paths absolutos fora de /mnt/c não funcionam como argumento
metadata:
  type: project
---

Neste ambiente (WSL2 sobre Windows), `node`, `npm` e `npx` usados pelos scripts do projeto
resolvem para os binários **nativos do Windows** em `/mnt/c/Program Files/nodejs/` (não há
`node` Linux no PATH — `which node` falha). Confirmado ao rodar `npx eslint`/`npx prettier`/
`node.exe` diretamente durante a validação de `feat/xml-transformation-toggle` (2026-07-20).

**Why:** isso quebra a convenção de usar o diretório de scratchpad (`/tmp/claude-*/.../
scratchpad`) como local de arquivos temporários — um path absoluto ali (fora de `/mnt/c/...`)
não existe do ponto de vista do processo Windows, e o erro retornado ("No files matching the
pattern were found" ou `Cannot find module 'C:\tmp\...'`) não deixa óbvio que é um problema de
tradução de path, não de conteúdo do arquivo.

**How to apply:** para testar um trecho de código isoladamente com `node`/`npx eslint`/
`npx prettier --check` contra um arquivo temporário, colocar o arquivo **dentro da árvore do
repo** (ex.: `./.qa-tmp-nome.ext` na raiz, ou usar caminho relativo ao cwd do Bash tool, que já
é a raiz do repo) e apagar o arquivo logo depois de usar (`rm` + confirmar via `git status
--short` que não sobrou nada). Não usar path absoluto do scratchpad como argumento para essas
ferramentas — só para armazenar coisas que você mesmo vai `Read`/`cat` depois (ex.: JSON baixado
via curl, scripts que serão copiados antes de rodar).
