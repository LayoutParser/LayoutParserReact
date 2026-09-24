# Memória — @lp-product-manager (Maya)

- [Governança do produto](product-governance.md) — taxonomia, Project, fluxo e baseline retrospectivo.
- [Detecção automática de layout](project_auto_layout_detection_board_2026_08_29.md) — hierarquia
  #177–#185 no Project do front e dependência espelhada na API #213/Project #2.
- [Auditoria e gate de produção](project_front_audit_2026_08_30.md) — front concluído em
  development, #184 transferida para API #216 e promoção controlada por #188/PR #189.
- [Plataforma fiscal, workspaces e autoria assistida](project_fiscal_workspaces_2026_08_31.md) —
  nicho fiscal, Epic #195, base #196–#200, autoria #201–#206 e API #103/#225–#232; Sysmiddle
  estritamente read-only.
- [Triagem de gates fiscais 2026-09-03](project_fiscal_gates_triage_2026_09_03.md) — #197/#203
  em In Review; #200/#205/#188/#206 bloqueados por dependência cross-repo na API.
- [Atualização de gates fiscais 2026-09-04](project_fiscal_gates_update_2026_09_04.md) — #201
  In Review (parcial), #198 Blocked (nada implementado); corrige memória anterior sobre #198.
- [DRIFT de endpoint em #197 2026-09-07](project_fiscal_197_endpoint_drift_2026_09_07.md) — #197
  movida para Blocked/p0: endpoint de histórico de análises não existe na API (contract-qa).
- [Quebra do Epic #203 em 203a-e](project_203_epic_breakdown_2026_09_07.md) — #203 virou Epic
  guarda-chuva; sub-issues #225-#229 criadas, priorizadas e no Project.
- [Sincronização de status 2026-09-07](project_backend_status_sync_2026_09_07.md) — #188 Done
  (PR #189 já mergeado+deployed, premissa do pedido estava desatualizada), #198 Ready, #201
  In Review, #200 Blocked aguardando teste cross-workspace e ADR; fechar #188 ficou bloqueado
  pelo classificador de auto mode.

- [Story de report de divergência de campo](project_field_divergence_report_story_2026_09_08.md) —
  #232 vira PBI, Story #234 criada e bloqueada até contrato cruzado com a API.

- [Gerar documento de exemplo](project_generate_sample_document_2026_09_09.md) — PBI #237 +
  Stories #238-#241, bloqueadas por LayoutParserApi#355/#356 (produção); mock autorizado primeiro.

- [Curadoria de correção de campo](project_field_correction_curation_2026_09_10.md) — #232/#234
  entraram no Project #3, #234 desbloqueada (API#345 em produção), Story #244 (curador,
  Ready) criada para fila pending/review distinta do fluxo do analista.

- [Fechamento do PBI "Gerar documento de exemplo"](project_sample_document_closure_2026_09_15.md) —
  #238/#239/#241/#232/#234/#244 fechados PASS→Done; #237/#240 desbloqueados e fechados
  (#240 obsoleta) após LayoutParserApi#356 ir a produção.
- [Sync 2026-09-15](project_sync_2026_09_15.md) — board confirmado Done para #237-241/#232/#234/
  #244 (deploy production); #236 fechada como duplicata órfã fora do Project.
- [Bug badges IDOC/SAP 2026-09-15](project_idoc_badge_bug_2026_09_15.md) — #251 criada
  (p1/frontend), In Progress no Project, implementação em andamento por @lp-front-dev.
- [Loop de login contas pessoais 2026-09-15](project_login_loop_consumers_tenant_2026_09_15.md) —
  #253 criada (p1/integration/bff), Blocked no Project #3; correção 100% em LayoutParserApi.
- [Sync de entrega fiscal da API 2026-09-15](project_fiscal_api_delivery_sync_2026_09_15.md) —
  #226/#228 Blocked→Ready (editor TCL/XSL/XSLT, diff por ruleId); #198 Ready com evidência
  ampliada (perfil fiscal, diff A×B); #200 inalterado (Blocked); nada fechado.
- [Sync 2026-09-15 pt2](project_sync_2026_09_15_pt2.md) — #251 In Validation (PR #252
  merged+deploy dev, falta promoção main/produção); #228 In Progress (PR #255 contrato
  implementado, falta UI); #198/#226 seguem Ready; #253 Blocked com investigação atualizada
  (allowlist de tenant e provisionamento prévio descartados; suspeita atual é loopback
  BFF→API, não confirmada ao vivo).
- [Sync 2026-09-15 pt3](project_sync_2026_09_15_pt3.md) — #227/#251/#226/#228 confirmados via
  gh e movidos para Done (produção); #198 recebeu comentário de gap (catálogo de descoberta de
  mappings, depende de endpoint novo na API), mantido Ready.
- [Issue cross-repo do login loop na API](project_login_loop_api_issue_2026_09_15.md) —
  LayoutParserApi#408 criada para #253; comentário de evidência em API#368 (#379/#381/#367/
  #380 CLOSED cobrem perfil fiscal, editor manual, diff ruleId, diff A×B).

- [Epic Team/Organização SaaS](project_team_org_saas_epic_2026_09_15.md) — Epic #258 +
  PBIs #259-#262: compartilhamento de mappings intra-time, isolamento entre times preservado,
  API dona do modelo Team novo.
- [Reavaliação #199/#201/#202/#204](project_fiscal_199_201_202_204_reeval_2026_09_16.md) —
  nenhum fechado; gaps: TCL sem runner (#199), confirmação de inventário implementável só no
  front (#201), resposta livre bloqueada por API (#202), suíte versionada inexistente (#204).
- [Issues cross-repo dos gaps #199/#201/#202/#204](project_fiscal_api_gaps_issues_2026_09_16.md) —
  API#421-424 criadas e linkadas; status das issues do front inalterado.

- [Mapping Studio árvore dupla Connect-Us](project_mapping_studio_connect_us_tree_2026_09_16.md) —
  Story #267 criada Blocked, bloqueada por API#425 (endpoint de árvore de layout por GUID);
  não é sub-issue de #233 (escopo mais restrito e já priorizado).
- [#267/#425 aguardando ADR da API](project_mapping_studio_connect_us_adr_wait_2026_09_16.md) —
  API vai fazer ADR antes de implementar; contrato proposto precisa ser validado por nós ANTES
  da implementação, não depois. #267 segue Blocked.
- [Perguntas de contrato #267/API#425](project_mapping_studio_connect_us_contract_questions_2026_09_16.md) —
  API#425 já implementado (PR #427, develop); UNVERIFIED por 2 perguntas específicas
  (GUID de nó = sourceRefs/targetRefs? min/max sempre number?); #267 segue Blocked por isso.
- [Fechamento #267/PR #271 2026-09-16](project_267_pr271_closure_2026_09_16.md) — handoff dizia
  PR #271 aberto/bloqueado; gh confirmou MERGED com deploy production completo; #267→Done.
- [Desbloqueio #267 2026-09-16](project_mapping_studio_connect_us_desbloqueio_2026_09_16.md) —
  API respondeu; #267 movida para Ready com decisão de escopo (layout-tree.rules[] como fonte
  única de correlação, regras DSL sinalizadas não desenhadas); comentário em API#425.
- [target.roots vazio + release esclarecido 2026-09-16](project_layout_tree_target_empty_release_question_2026_09_16.md) —
  API#433 segue aberta (target.roots vazio apesar de rules[] válido, gap não bloqueante); pergunta
  do release TCL/XSL/XSLT ESCLARECIDA (não é bug, pipeline não executado p/ esse mapper, ver
  API#438) e encerrada em comentário no #267.
- [Progresso geração TCL/XSL/XSLT via Ollama 2026-09-16](project_api_ollama_generation_progress_2026_09_16.md) —
  13/19 mapeadores Sysmiddle corrigidos, 1o experimento real OK (10/11 campos), comentado em #199;
  endpoint `GET /api/reference-examples` novo, anotado p/ #198 futuro, sem Story criada ainda.

- [Contrato revisado de histórico de análises fiscais em #197](project_197_history_contract_update_2026_09_21.md) —
  API#366 substitui endpoint quebrado anterior; #197 Blocked→In Progress; pergunta de visão
  compartilhada de workspace registrada em aberto, não decidida.

- [Varredura pullable 2026-09-21](project_pullable_sweep_2026_09_21.md) — nenhum item Ready
  sem bloqueio no board; #288 (task retrospectiva Mapping Studio painel de regra) criada.
- [Resposta da API aos gaps #199/#204/#201/#196 2026-09-21](project_fiscal_gaps_api_response_2026_09_21.md) —
  TCL runner (#421) e suíte versionada (#423) confirmados em produção, #199/#204 → Ready
  (falta só front); #201/#196 inalterados (Blocked/In Validation).
- [Requisito checksRun em qualitySignals (#201)](project_fiscal_201_quality_signals_checksrun_2026_09_21.md) —
  array vazio em conflicts/etc só significa "ok" se o check constar em checksRun; repassar a
  @lp-front-dev quando API entregar #424.

- [Sync entrega API #196/#201 2026-09-22](project_196_201_api_delivery_sync_2026_09_22.md) —
  #196 Done (bug de isolamento corrigido via API#470); #201 Blocked→Ready (API#424/PR#468
  entregue, mas UI do FiscalPackageWizard ainda não consome qualitySignals).

Regras duráveis: GitHub é o registro operacional; Epic → PBI → Story → Task/Gate/Bug; não criar
issue por commit; fechamento exige evidência; conteúdo real de TXT/XML e segredos não entram no
backlog; dependências dos outros repositórios permanecem explícitas e não são “resolvidas” pelo front.
