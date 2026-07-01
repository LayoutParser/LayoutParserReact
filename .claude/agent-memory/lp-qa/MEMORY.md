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
- (adicione aqui: regressões recorrentes, flakiness, cenários frágeis.)
