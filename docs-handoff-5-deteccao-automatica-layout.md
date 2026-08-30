# Handoff 5 — detecção automática de layout

```yaml
handoff:
  from_agent: '@lp-front-dev / @lp-contract-qa / @lp-security / @lp-qa'
  to_agent: '@lp-devops e mantenedores dos PRs'
  task_context:
    task: 'Anexar somente MQSeries/IDoc, provar layout único ou apresentar top 5 explicável.'
    api_branch: 'codex/feat-layout-auto-detection'
    front_branch: 'codex/feat-layout-auto-detection'
    current_step: 'Implementação e validação local concluídas; promoção pelos PRs para develop.'
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
    - 'Front/BFF: npm run quality aprovado; 249 testes front + 69 BFF na rodada-base.'
    - 'Playwright mockado: 18/18 em desktop e mobile.'
    - 'MQSeries privado: 8/8; ambiguous, top 5, sem parse antes da escolha, 59 linhas/705 campos após override.'
    - 'IDoc privado: unique Marelli, correlation ID preservado, 55 linhas/263 campos.'
    - 'Documento/layout reais continuam ignorados pelo Git e nenhum conteúdo é logado pelo detector.'
  verdict: 'PASS local — contrato, segurança, UX e provas reais atendem à entrega.'
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
  next_action: 'Revisar e promover primeiro o PR da API; após deploy em development, validar e promover o PR do front.'
```
