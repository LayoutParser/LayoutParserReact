---
name: project-sap-idoc-hierarchy-validation
description: Validação QA da feature de árvore hierárquica IDoc SAP (branch codex/feat-sap-idoc-hierarchy, commit 8326412)
metadata:
  type: project
---

Feature "IDoc SAP segment hierarchy" validada com PASS em 2026-08-13, branch
`codex/feat-sap-idoc-hierarchy`, commit `8326412`. Regra: layouts com nome terminando em
`_TXT_SAP_ENVNFE_4.00_NFE` (case-insensitive) renderizam árvore própria com `EDI_DC40` como raiz e
segmentos `ZRSDM_NFE_400_*` aninhados (sufixo numérico de 3 dígitos removido do nome exibido).

**Why (2026-08-13, 1ª rodada):** não havia stack API .NET/BFF ativa no ambiente local para
simular upload real; a validação de fluxo dependeu de testes unitários (`treeBuilder.test.ts`,
`StructureTree.test.tsx`) e, principalmente, do e2e `layout-parser.spec.ts` (teste "navega pela
hierarquia SAP IDoc declarada no layout"), que mocka as respostas de rede e cobre o cenário fim a
fim (upload → parse → árvore com expand/collapse) tanto em desktop quanto mobile-chromium.

**Atualização (2026-08-13, 2ª rodada):** com a API .NET real acessível do WSL2 em
`http://<gateway-wsl>:5100` (gateway do WSL, ver [[project_env_node_windows_paths]] e
[[project_wsl_windows_loopback_port_forwarding]]), repeti a validação fim a fim contra dados
reais (par TXT+layout `LAY_MARELLI_TXT_SAP_ENVNFE_4.00_NFe`): BFF real (porta 3101, configurado
via `server/.env` local não versionado) → API .NET real, e também através da cadeia completa
Vite (proxy `/api`, porta 3000) → BFF → API. Resposta HTTP 200 real confirmou `detectedType:
"idoc"`, `initialValue: "EDI_DC40"` no primeiro segmento do layout e os 28 `lineName` esperados
incluindo `ZRSDM_NFE_400_IBSCBS`, `ZRSDM_NFE_400_GIBSCBS`, `ZRSDM_NFE_400_GIBSUF`,
`ZRSDM_NFE_400_GIBSMUN`, `ZRSDM_NFE_400_GCBS`, `ZRSDM_NFE_400_GIBS_TOT`. Não foi possível abrir
navegador gráfico neste ambiente (sem display) para conferir visualmente o expand/collapse da
árvore renderizada — isso permanece coberto apenas pelo e2e Playwright (Chromium real, headless)
com mocks de rede, que passou (12/12, desktop+mobile).

**Nota sobre fixture:** os arquivos de layout XML reais encontrados em
`LayoutParserApi/.claude/tmp/03082026/` e `LayoutParserReact/.claude/temp/TXT_SAP_ENVNFE_4.00_NFe/`
estavam com aspas escapadas (`\"` literal em vez de `"`) — aparentam ter sido salvos a partir de
um dump JSON sem "unescape". A API rejeita com "O arquivo de layout deve ser XML." até corrigir
isso (troca simples de `\"` por `"` nos bytes). Isso é um problema do fixture de teste, não do
código do front/BFF/API — não abrir bug por isso, apenas recriar o arquivo corrigido ao reusar.

**How to apply:** quando não houver API .NET/BFF disponível localmente para validar fluxo real de
upload, considerar suficiente para veredito PASS a combinação de: 1) suíte unitária cobrindo a
lógica pura (ex.: `treeBuilder`), 2) teste de componente cobrindo renderização/interação
(`StructureTree.test.tsx`), e 3) e2e com mocks de rede reproduzindo o cenário completo
(`npx playwright test -g "<nome do cenário>"` e depois `npm run test:e2e` completo para checar
regressão). Quando a API real estiver acessível (ex.: via IP do gateway WSL2), preferir validar
com dados reais via curl multipart direto no BFF e através do proxy do Vite, documentando os
achados estruturais (não visuais) e deixando explícito que a checagem visual em navegador
gráfico não foi possível e por quê.
