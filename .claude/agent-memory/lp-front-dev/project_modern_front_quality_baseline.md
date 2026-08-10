# Baseline moderno de front e qualidade — 2026-08-10

- Stack: Vite 8.2, React 19.2, React Router 7.18, Axios 1.19, Zustand 4 e TS strict.
- Runtime: Node `^20.19.0 || >=22.12.0` no front; BFF suporta Node 20+.
- `npm run quality` cobre lint/a11y, tipos, 112 testes/cobertura, builds dev/prod, artefato,
  formatação, auditoria moderada, 70 testes/gates do BFF e contrato.
- Pisos do front: statements/lines 40%, branches 31%, functions 42%.
- Playwright valida desktop e mobile em job próprio; fluxo crítico entrega XML bruto por
  visualização, cópia e download.
- Produção não publica source maps nem origem interna da API.
