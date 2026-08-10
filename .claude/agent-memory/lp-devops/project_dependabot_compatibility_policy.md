# Política de compatibilidade do Dependabot

- Atualizações minor/patch de React, ESLint e Vite são agrupadas por família para preservar
  peer dependencies coerentes.
- Majors dessas famílias são deliberadamente ignorados pelo Dependabot e entram como migração
  manual com branch própria, changelog revisado e `npm run quality` + E2E.
- ESLint 10 permanece bloqueado enquanto plugins do projeto não declararem suporte conjunto;
  TypeScript 7 permanece bloqueado enquanto `@typescript-eslint` não aceitar essa major.
- `@types/node` não muda de major automaticamente: os tipos devem acompanhar a versão mínima
  do runtime homologado nos workflows e no deploy, sem expor APIs inexistentes em produção.
- Depois de merges paralelos do Dependabot, valide novamente o `npm ci` na `main`: PRs verdes
  isoladamente não garantem que o manifesto e o lockfile acumulados continuem coerentes.
- Um PR que falha em `npm ci` não deve usar `--force` ou `--legacy-peer-deps`: corrija a matriz de
  versões ou encerre o PR como incompatível.
- Antes de encerrar PRs automáticos, consolide os upgrades compatíveis em um PR validado e deixe
  comentário com o substituto.
