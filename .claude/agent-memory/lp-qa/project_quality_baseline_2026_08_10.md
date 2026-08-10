# Baseline de QA automatizado — 2026-08-10

- Front: 112 testes em 20 arquivos.
- Cobertura front: 40,98% statements, 32,14% branches, 42,60% functions e 41,29% lines.
- Pisos globais: 40% statements/lines, 31% branches e 42% functions.
- BFF: 70 testes; 92,35% statements, 85,42% branches, 95,31% functions e 92,17% lines.
- Playwright: 4 cenários aprovados (TXT → XML/download e admin negado, desktop + mobile).
- `npm audit --audit-level=moderate`: zero vulnerabilidades nos dois lockfiles.
- Builds dev/prod, artifact validation sem source maps/endereço interno e contrato local passam.
- Gate agregado: `npm run quality`; E2E permanece em job próprio da CI.
