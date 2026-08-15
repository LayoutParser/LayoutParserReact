# Memória — @lp-qa (Quinn)

- [Baseline automatizado](project_quality_baseline_2026_08_10.md) — números e gates da entrega atual.
- [Verificação independente de CRLF](feedback_verificacao_independente_crlf.md) — comparar HEAD e working tree.
- [Node/paths Windows](project_env_node_windows_paths.md) — temporários precisam ser visíveis ao runtime nativo.
- [Validação árvore IDoc SAP](project_sap_idoc_hierarchy_validation.md) — PASS; unit+component+e2e mockado, e depois revalidado com API .NET real (2026-08-13).
- [Google OAuth + reorder árvore + fix IDoc edit](project_google_oauth_and_idoc_edit_fix_2026_08_13.md) — 2 commits, ambos PASS; 1 e2e flake pré-existente identificado e isolado.
- [WSL x loopback Windows](project_wsl_windows_loopback_port_forwarding.md) — curl do WSL não alcança node.exe em 127.0.0.1; usar curl.exe/taskkill.exe.
- [Logout 415 + gate admin Atualizar Layout](project_logout_415_and_refresh_layout_gate_2026_08_13.md) — 2 commits PASS; escrevi testes novos (MainLayout, LayoutParserPage) por falta de cobertura prévia.

Gate canônico: `npm ci`, `npm ci --prefix server`, `npm run quality`, `npm run test:e2e` e
`git diff --check`. Fluxos críticos: upload/cancelamento, parse/erro sem resultado obsoleto,
árvore, transformação e download XML, sessão/admin, desktop/mobile e ausência de payload nos logs.
Para autenticação, cobrir sessão anônima/autenticada, state/nonce/PKCE, open redirect, logout,
remoção de cookie/Authorization antes do upstream e fail-fast das variáveis Entra.
