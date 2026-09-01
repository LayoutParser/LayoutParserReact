# Memória — @lp-front-dev (Remy)

- [Arquitetura web segura](project_secure_web_architecture.md) — React same-origin, BFF Node e API .NET como fonte da verdade.
- [Transformação XML](project_xml_transformation_feature.md) — XML bruto da API, geração manual e download.
- [Taxonomia de falha](project_taxonomia_falha_parse.md) — `failureCause` e saúde documental são contratos aditivos.
- [Análise multi-candidato](project_document_analysis_tab_handoff.md) — candidatos e diagnóstico por IA já integrados.
- [Métricas de IA](project_ai_metrics_panel_gap3.md) — contrato antecipado; reconfirmar no manifesto/OpenAPI.
- [Adoção de shared](project_divida_adocao_shared.md) — não apagar componentes só porque a adoção ainda é parcial.
- [Convenções reais](feedback_convencoes_reais_vs_doc.md) — confirmar no código antes de ampliar padrões.
- [Baseline moderno](project_modern_front_quality_baseline.md) — stack, testes e gates atuais.
- Autenticação vigente: `MainLayout` bloqueia conteúdo até `/api/session`; login navega para
  `/auth/login`, logout é POST em `/auth/logout` e nenhum token Microsoft entra no React.
- [Fluxo OIDC (Entra+Google)](project_oidc_auth_flow.md) — `authError` é genérico entre
  provedores; `errorRedirectLocation` preserva o `returnTo` original (não mais `/upload` fixo).
- [Gap de segredos locais](project_local_env_secrets_gap.md) — `server/.env` some entre sessões
  neste ambiente; confirmar antes de tentar validar OIDC ao vivo.
- [Proveniência e rastreabilidade TXT↔XML](project_provenance_traceability_inspector_2026_08_28.md) —
  P0, identidade física, contrato #138/#141, inspetor responsivo e navegação bidirecional.
- [Árvore XML navegável (PBI #127)](project_xml_navigable_tree_pbi127.md) — histórico da árvore
  standalone; o antigo bloqueio contratual do PBI #128 foi removido em 2026-08-28.
- [Lint de setState em effect](feedback_effect_setstate_lint.md) — `react-hooks/set-state-in-effect`
  é erro aqui; usar padrão "ajustar estado durante o render" em vez de `useEffect`.
- [Edição posicional multi-ocorrência](project_positional_edit_multi_occurrence_investigation.md) —
  contrato confirmado: largura fixa vem do layout, agregados não são linhas físicas e sequência
  repetida é desambiguada pelo código da linha.
- [Candidatos de transformação sem diferenciador](project_transformation_candidate_id_gap.md) —
  `TransformationCandidate` não tem nome de mapper/`layoutOutputTarget`; só `candidateId`.
- [DNS multi-homed no BFF (produção)](project_bff_dns_multihome_lookup_override.md) — `dns.setServers()`
  não afeta `fetch`/undici; usar lookup customizado + `setGlobalDispatcher`. `BFF_DNS_SERVERS`.
- [Regressão .mqseries: largura física](project_mqseries_field_length_regression.md) — front normaliza
  `start` + `LengthField`, preserva campos vazios editáveis e exclui o agregado da LINHA081.
- [Fundação do workspace fiscal](project_fiscal_workspace_foundation_2026_08_31.md) — principal
  imutável BFF→API, tipos/services iniciais, pacote FIAT assistido e fronteira de autoria:
  TCL/XSL/XSLT editáveis, Sysmiddle read-only.
- [Mapping Studio — Slices 3 a 5](project_mapping_studio_slices_3_5_2026_08_31.md) — revisão humana,
  explicação canônica, compilação/Test Lab e gaps contratuais preservados de forma fail-closed.

Regras duráveis: HTTP só em `services/`; tipos em `src/types`; sem `any` novo; preserve
`X-Correlation-ID`; payload TXT/XML não vai para logs/cache; produção nunca usa API absoluta.
