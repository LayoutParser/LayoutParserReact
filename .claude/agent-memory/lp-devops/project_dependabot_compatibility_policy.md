# Política de compatibilidade do Dependabot

- Atualizações minor/patch de React, ESLint e Vite são agrupadas por família para preservar
  peer dependencies coerentes.
- Majors dessas famílias são deliberadamente ignorados pelo Dependabot e entram como migração
  manual com branch própria, changelog revisado e `npm run quality` + E2E.
- ESLint 10 permanece bloqueado enquanto plugins do projeto não declararem suporte conjunto;
  TypeScript 7 permanece bloqueado enquanto `@typescript-eslint` não aceitar essa major.
- Um PR que falha em `npm ci` não deve usar `--force` ou `--legacy-peer-deps`: corrija a matriz de
  versões ou encerre o PR como incompatível.
- Antes de encerrar PRs automáticos, consolide os upgrades compatíveis em um PR validado e deixe
  comentário com o substituto.
