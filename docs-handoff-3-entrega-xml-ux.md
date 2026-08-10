# Handoff 3 — entrega do XML e revisão visual

```yaml
handoff:
  from_agent: '@lp-front-dev (Remy) + @lp-ui-ux (Nina)'
  to_agent: '@lp-qa (Quinn)'
  task_context:
    task: 'Entregar o XML transformado e melhorar a apresentação do front'
    branch: 'chore/normaliza-crlf'
    current_step: 'Implementação e gates locais concluídos; falta E2E com dados reais'
  decisions:
    - 'execute-candidates usa /api/transformationexecution sem hífen; validado em runtime: rota com hífen retorna 404'
    - 'Enviar parseResult.layout.layoutGuid primeiro, com fallback para o GUID não-zero do catálogo'
    - 'Campos sourceDocumentType, targetDocumentType e expectedOutput usam string vazia; null falha no model binding'
    - 'Copiar e baixar preservam o XML bruto da API; a indentação é somente visual'
    - 'UX prioriza gerar → selecionar candidato → copiar/baixar, responsividade e foco visível'
  files_modified:
    - 'src/components/analysis/XmlTransformationDisplay.tsx'
    - 'src/components/analysis/XmlTransformationDisplay.css'
    - 'src/components/layout/LayoutParserPage.tsx'
    - 'src/components/layout/LayoutParserPage.css'
    - 'src/services/api/transformationService.ts'
    - 'src/services/api.ts'
    - 'src/types/transformation.ts'
    - 'src/store/useTransformationStore.ts'
    - 'CSS de tabs, árvore, campos, resumo, busca e combobox'
    - 'README.md'
  blockers:
    - 'Catálogo local excedeu timeout; mapper/runner reais não foram exercitados ponta a ponta'
    - 'npm run lint continua vermelho por 30 warnings preexistentes; arquivos funcionais novos não acrescentam warnings'
    - 'Não existe suite Vitest/RTL'
  next_action: 'Executar upload real com mapper, gerar os dois pathways quando disponíveis e validar conteúdo/cópia/download do XML.'
```
