# Modernização visual e acessível — 2026-08-10

- Design corporativo sem gradientes excessivos, baseado nos tokens de `src/styles/tokens.css`.
- Superfícies, tipografia, espaçamentos, foco, alvos mínimos de 44 px, estados e elevação foram
  padronizados em upload, análise, XML, admin, monitoramento e métricas.
- O layout em L continua sendo o fluxo principal; em telas até 900 px vira uma coluna sem
  overflow horizontal. Validado em 1440×900, 768×900 e 390×844.
- `prefers-reduced-motion`, foco visível, teclado e semântica ARIA fazem parte do baseline.
- O upload não depende mais do texto nativo em inglês: exibe “Selecionar/Trocar arquivo” e um
  status neutro/sucesso em PT-BR.
