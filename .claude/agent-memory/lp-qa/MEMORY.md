# Memória — @lp-qa (Quinn)

- [Baseline automatizado](project_quality_baseline_2026_08_10.md) — números e gates da entrega atual.
- [Verificação independente de CRLF](feedback_verificacao_independente_crlf.md) — comparar HEAD e working tree.
- [Node/paths Windows](project_env_node_windows_paths.md) — temporários precisam ser visíveis ao runtime nativo.

Gate canônico: `npm ci`, `npm ci --prefix server`, `npm run quality`, `npm run test:e2e` e
`git diff --check`. Fluxos críticos: upload/cancelamento, parse/erro sem resultado obsoleto,
árvore, transformação e download XML, sessão/admin, desktop/mobile e ausência de payload nos logs.
