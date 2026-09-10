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

Regras duráveis: GitHub é o registro operacional; Epic → PBI → Story → Task/Gate/Bug; não criar
issue por commit; fechamento exige evidência; conteúdo real de TXT/XML e segredos não entram no
backlog; dependências dos outros repositórios permanecem explícitas e não são “resolvidas” pelo front.
