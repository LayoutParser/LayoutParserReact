# Memória — @lp-qa (Quinn)

- [Baseline automatizado](project_quality_baseline_2026_08_10.md) — números e gates da entrega atual.
- [Verificação independente de CRLF](feedback_verificacao_independente_crlf.md) — comparar HEAD e working tree.
- [Node/paths Windows](project_env_node_windows_paths.md) — temporários precisam ser visíveis ao runtime nativo.
- [Validação árvore IDoc SAP](project_sap_idoc_hierarchy_validation.md) — PASS; unit+component+e2e mockado, e depois revalidado com API .NET real (2026-08-13).
- [Google OAuth + reorder árvore + fix IDoc edit](project_google_oauth_and_idoc_edit_fix_2026_08_13.md) — 2 commits, ambos PASS; 1 e2e flake pré-existente identificado e isolado.
- [WSL x loopback Windows](project_wsl_windows_loopback_port_forwarding.md) — curl do WSL não alcança node.exe em 127.0.0.1; usar curl.exe/taskkill.exe.
- [Logout 415 + gate admin Atualizar Layout](project_logout_415_and_refresh_layout_gate_2026_08_13.md) — 2 commits PASS; escrevi testes novos (MainLayout, LayoutParserPage) por falta de cobertura prévia.
- [CSP Modal + FieldDisplay ocorrência](project_csp_modal_and_fielddisplay_occurrence_fix_2026_08_17.md) — PASS via gates+revisão estática; sem browser real disponível na sessão.
- [Polling fallback IA — gap de contrato](project_ia_fallback_polling_contract_gap_2026_08_17.md) — RESOLVIDO: manifesto atualizado; cobertura de `aiFallback.status`/erro em `XmlTransformationDisplay.test.tsx` fechada (2026-08-18).
- [FiscalPackageWizard confirmação aba/cabeçalho/colunas #201](project_fiscal_wizard_sheet_confirmation_2026_09_16.md) — PASS; achado à parte: working tree sujo quebra `MappingStudioPage.test.tsx`, não é do commit revisado.
- [Gates do #197 (histórico de análises fiscais)](project_197_analysis_history_gate_2026_09_21.md) — lint/typecheck/testes/contrato PASS em origin/develop via worktree Windows-visível; sem filtro fiscal nem reabertura na UI.
- [Painel de detalhe de regra sob demanda #267](project_mapping_studio_rule_detail_panel_2026_09_16.md) — PASS; botão "Ver regra" com 3 casos de desabilitado testados, modal preserva quebras de linha do DSL.
- [Revalidação #197 e #201](project_197_and_201_revalidation_2026_09_21.md) — #197 PASS (PRs #289/#291 merged em develop, gaps fechados); #201 PASS parcial (qualidade/conflito de artefato é gap de API, documentado na UI).

Gate canônico: `npm ci`, `npm ci --prefix server`, `npm run quality`, `npm run test:e2e` e
`git diff --check`. Fluxos críticos: upload/cancelamento, parse/erro sem resultado obsoleto,
árvore, transformação e download XML, sessão/admin, desktop/mobile e ausência de payload nos logs.
Para autenticação, cobrir sessão anônima/autenticada, state/nonce/PKCE, open redirect, logout,
remoção de cookie/Authorization antes do upstream e fail-fast das variáveis Entra.
