# Handoff 5 — detecção automática de layout

```yaml
handoff:
  from_agent: '@lp-front-dev / @lp-contract-qa / @lp-security / @lp-qa'
  to_agent: '@lp-devops e mantenedores da extensao MCP'
  task_context:
    task: 'Anexar somente MQSeries/IDoc, provar layout único ou apresentar top 5 explicável.'
    api_branch: 'develop — merge 565d8f5 via LayoutParserApi #222'
    front_branch: 'develop — merge 54b3f39 via LayoutParserReact #186'
    current_step: 'Implementação, validação e deployments de desenvolvimento concluídos.'
  decisions:
    - 'Unique exige exatamente um candidato compatível e catálogo completo.'
    - 'Catálogo truncado/inválido falha fechado como not_found e bloqueia override.'
    - 'Ambiguous devolve até cinco candidatos; nenhum é pré-selecionado.'
    - 'MatchScore é índice estrutural, nunca probabilidade ou autorização de escolha.'
    - 'Override só aceita GUID presente no ranking recalculado da requisição.'
    - 'XML descriptografado permanece na API; front guarda apenas identidade/proveniência pública.'
    - 'Revalidação após edição repete /api/parse/auto com o GUID explicitamente escolhido.'
  evidence:
    - 'API: build Release aprovado e SecurityCodeScan sem nova origem em /parse/auto.'
    - 'API: 432/432 testes completos e 12/12 testes AutomaticLayoutDetection.'
    - 'Front/BFF: npm run quality aprovado; 250 testes front + 69 BFF.'
    - 'Playwright mockado: 18/18 em desktop e mobile.'
    - 'MQSeries privado: 8/8; ambiguous, top 5, sem parse antes da escolha, 59 linhas/705 campos após override.'
    - 'IDoc privado: unique Marelli, correlation ID preservado, 55 linhas/263 campos.'
    - 'Documento/layout reais continuam ignorados pelo Git e nenhum conteúdo é logado pelo detector.'
    - 'API develop: CI, deploy do serviço e smoke test aprovados no run 33323830107.'
    - 'Front develop: CodeQL e CI/deploy aprovados nos runs 33324011888 e 33324011996.'
    - 'Gate E2E real MQSeries do ambiente: aprovado em 2,1 minutos antes da publicação no IIS.'
    - 'Project: front #179–#183/#185 e API #213–#215 concluídos; pais permanecem abertos só pelo MCP.'
  verdict: 'PASS em development — contrato, segurança, UX, provas reais e deploys atendem à entrega.'
  files_key:
    api:
      - 'Models/Parsing/AutomaticLayoutDetectionModels.cs'
      - 'Services/Parsing/Implementations/AutomaticLayoutDetectionService.cs'
      - 'Controllers/ParseController.cs'
    front:
      - 'src/components/layout/LayoutParserPage.tsx'
      - 'src/components/upload/AutoLayoutDetectionPanel.tsx'
      - 'src/components/analysis/DocumentEditActions/DocumentEditActions.tsx'
      - 'server/src/limits.ts'
      - 'tests/real-fixture/mqseries-layout-detection.test.ts'
  remaining_outside_scope:
    - 'Tool MCP tipada detect_layout: LayoutParserApi #216 / LayoutParserReact #184.'
    - 'Ampliação contínua do corpus homologado para novos layouts/documentos.'
  next_action: 'Implementar a tool MCP detect_layout em #216/#184; promover develop para produção apenas em ciclo próprio.'
```
