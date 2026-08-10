# Baseline moderno de front e qualidade — 2026-08-10

- Stack compatível atualizada: Vite 7.3.6, Axios 1.19 e React Router 6.30.4. O Vite 7 exige
  Node `^20.19.0 || >=22.12.0`.
- O gate canônico é `npm run quality`: lint (inclui `jsx-a11y`), TypeScript, Vitest com
  cobertura, builds default/dev/prod, Prettier e `npm audit --audit-level=high`.
- Baseline: 54 testes em 11 arquivos; pisos globais reais incluem todo `src/**/*.{ts,tsx}`:
  statements/lines 25%, branches 19%, functions 29%.
- Acessibilidade implementada em combobox, tabs, árvore, modal, cards do admin e campos
  clicáveis; upload usa controle customizado em PT-BR.
- A entrega do XML sempre copia/baixa o valor bruto da API. A indentação é só visual; o
  download usa MIME XML, nome sanitizado e revoga a URL temporária. Há testes para o fluxo.
- `vite.config.ts` ignora `coverage/` no watcher e não gera mais chunk React vazio.
