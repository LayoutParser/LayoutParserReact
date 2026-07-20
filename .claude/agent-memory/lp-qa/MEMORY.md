# Memória — @lp-qa (Quinn)

> Fatos duráveis do projeto + aprendizados acumulados. Atualize ao descobrir algo não óbvio.

## Quality gates
```bash
npm run lint            # --max-warnings 0
npx tsc --noEmit
npm run format:check
npm run build           # tsc && vite build
```

## Validação manual (não há suite ainda)
- Upload TXT+layout → `ParseResponse` chega → árvore renderiza.
- Linhas com tamanho inválido em vermelho; `validationErrors` refletidos.
- Admin (monitoramento/validação) carrega sem erro de console.
- Conferir console do navegador e estados de erro/vazio.

## Pontos de maior risco (priorizar testes futuros)
- `utils/treeBuilder.ts` (montagem da árvore), camada `services/`, validações de linha.

## Aprendizados
- [Verificação independente de CRLF](feedback_verificacao_independente_crlf.md) — nunca aceitar "é pré-existente" sem comparar HEAD vs working tree arquivo a arquivo.
- [node/npx resolvem para binário Windows](project_env_node_windows_paths.md) — path absoluto de `/tmp` não funciona como argumento; usar path dentro do repo e apagar depois.
- [Gap de ambiente em transformationexecution](project_transformation_execution_env_gap.md) — nenhum dos 57 layouts tem MAP gerado em 172.25.32.42:5000 (2026-07-20); caminho de sucesso inalcançável até ops gerar um.
