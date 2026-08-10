# Baseline de QA automatizado — 2026-08-10

- Comando único: `npm ci && npm run quality && git diff --check`.
- Verificado: 54/54 testes em 11 arquivos; cobertura global real de 25,62% statements,
  19,56% branches, 29,16% functions e 25,64% lines. Thresholds: 25/19/29/25.
- Lint inclui `eslint-plugin-jsx-a11y` e mantém `--max-warnings 0`.
- Builds default, development e production passaram sem warnings de chunk vazio.
- `npm audit --audit-level=high` passa. Restam 2 moderadas no React Router 6; a correção exige
  migração incompatível para v7 e deve ser feita em PR próprio.
- Smoke HTTP do Vite: `/`, `/upload`, `/admin` e `/analysis` responderam 200.
- API local 5000/5100 indisponível: E2E real de parse/transformação segue pendente de ambiente.
