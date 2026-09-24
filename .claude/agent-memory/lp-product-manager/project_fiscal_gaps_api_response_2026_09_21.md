---
name: project-fiscal-gaps-api-response-2026-09-21
description: API respondeu gaps #199/#204/#201/#196 de 2026-09-16 — TCL runner e suíte versionada confirmados em produção, #199/#204 movidos para Ready
metadata:
  type: project
---

Em 2026-09-21 a equipe da LayoutParserApi respondeu aos 4 gaps registrados em
[[project_fiscal_199_201_202_204_reeval_2026_09_16]] e nas issues cross-repo
(ver [[project_fiscal_api_gaps_issues_2026_09_16]], API#421-424):

- **#199** — runner determinístico de TCL (API#421) confirmado em **produção**. "TCL" é um
  dialeto declarativo gerado das regras estruturadas, não a linguagem Tcl — por isso é
  determinístico. Movida de "In Validation" para **Ready**: o gap de API está resolvido, falta
  só `@lp-front-dev` remover o aviso estático da UI ("TCL não pode ser validado
  deterministicamente"). API perguntou onde expor `capabilities.tcl.deterministicTest` — parecer
  de produto enviado (ver corpo do handoff/comentário na issue): deve vir em
  `GET .../explanation` junto ao `EngineCapabilities` já existente, não em endpoint novo.
  `needs_input` (API#422) está em reverificação por `@lp-contract-qa` — não tratar como
  fechado ainda.
- **#204** — suíte versionada (API#423) confirmada igual ao esperado, também em produção.
  Movida para **Ready**: falta consumo no front e revalidação de mobile por QA/UX.
- **#201** — sinais de qualidade (API#424) **em implementação**, não pronto ainda. Requisito
  novo de contrato (`checksRun`) documentado em
  [[project_fiscal_201_quality_signals_checksrun_2026_09_21]]. #201 segue **Blocked**, sem
  mudança de status.
- **#196** — API está verificando com testes automatizados próprios (idempotência de primeiro
  login concorrente, isolamento cross-workspace). Vão devolver evidência depois. #196 segue
  **In Validation**, sem mudança de status — nada a fazer do nosso lado agora.

**Why:** contrato que parecia desatualizado (avaliação de 2026-09-16) na verdade já tinha 2 dos
4 gaps resolvidos em produção; a reavaliação anterior não pegou isso porque foi feita antes da
resposta da equipe da API.

**How to apply:** ao trabalhar em #199/#204, lembrar que a tarefa restante é só front
(remoção de aviso estático / consumo de suíte versionada), não mais dependência de API. Não
fechar #201/#196 até evidência explícita da API (checksRun implementado / testes de
concorrência e isolamento entregues).
