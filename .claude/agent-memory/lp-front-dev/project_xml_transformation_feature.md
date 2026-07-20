---
name: project-xml-transformation-feature
description: Plano da feature "TXT Posicional vs XML Transformação Final" (toggle de análise) — achados cross-repo do contrato real da API e perguntas abertas pendentes de confirmação.
metadata:
  type: project
---

Pedido do dono do projeto (2026-07-20): adicionar ao front um toggle de análise com dois
botões — "TXT Posicional" (já existe, é `FieldDisplay`+`StructureTree` de sempre) e "XML
Transformação Final" (novo: back-end valida+transforma e devolve o XML pro front renderizar).
Front só apresenta; toda a lógica é da API .NET. Plano de arquitetura entregue em 2026-07-20;
**implementado no mesmo dia** na branch `feat/xml-transformation-toggle` (não commitado —
orquestrador pediu para deixar no working tree para revisão). Arquivos: `src/types/
transformation.ts`, `src/services/api/transformationService.ts`, `src/store/
useTransformationStore.ts`, `src/components/analysis/AnalysisModeTabs.tsx(.css)`,
`src/components/analysis/XmlTransformationDisplay.tsx(.css)`, + edição pontual em
`LayoutParserPage.tsx/.css` (troca do conteúdo de `.l-bottom-right`).

**Achados cross-repo (LayoutParserApi local, em `../LayoutParserApi`, só leitura) que
fundamentam o plano:**
- `Layout.LayoutType`/`LayoutRecord.LayoutType` é `string` livre, sem enum, tanto no front
  quanto no back. Valores literais confirmados em uso real
  (`Services/XmlAnalysis/AutoTransformationGeneratorService.cs:153-161,274-284`):
  `"TextPositional"` e `"XML"`. O nome "TextPositional" bate quase literalmente com "TXT
  Posicional" pedido pelo usuário.
- Esse campo já chega no front hoje via `ParseResponse.layout.layoutType`
  (`ParseController.cs:111` propaga `layoutReordenado.LayoutType`) — front só não usa pra
  decisão ainda (só exibido como texto solto em `MonitoringTab.tsx:191-196`).
- Endpoints `xmlAnalysis`/`transformationExecution` já declarados em `src/types/api.ts:11-12`
  e `src/services/api.ts:37-38` apontam pra RAIZ do controller — incompletos, nenhum dos dois
  controllers expõe rota raiz. Rotas reais (via `LayoutParserApi/Controllers/
  XmlAnalysisController.cs` e `TransformationExecutionController.cs`): candidato mais
  provável para o fluxo do usuário é `POST /api/transformationexecution/execute`
  (`TransformationRequest {InputContent, LayoutName, SourceDocumentType?, TargetDocumentType?,
  Validate?, ExpectedOutput?}` → sucesso `{success, transformedXml, validation?,
  segmentMappings}` / falha `{success:false, errors, warnings}`). `xmlAnalysis` tem 6
  sub-rotas (`analyze`, `validate-file`, `validate-xsd`, `analyze-xsd-error-with-ai`,
  `transform-nfe`, `orientations`), nenhuma raiz.
- `ParseController.cs` (~linha 89) tem branch aparentemente morto: se o arquivo de DADOS
  enviado já é `.xml`, devolve `message: "...Processe no front-end com xmltools.js"` sem
  processar nada — essa lib não existe no front React (`grep -rln "xmltools" src/` vazio).
  Confirmar com o usuário/back-end se esse branch precisa mudar como parte desta feature ou
  se o fluxo XML é uma chamada totalmente separada que nunca passa pelo `/api/parse/upload`.
- Existe `MapperDatabaseController.GetMapperByInputLayoutGuid` no back-end (não exposto no
  contrato do front hoje) que poderia informar "este layout tem transformação XML disponível"
  de forma mais precisa que `layoutType === "XML"` — confirmado como o critério certo, ver
  decisão abaixo.

**Decisão confirmada pelo usuário (2026-07-20) + validada em runtime contra a API real
(`http://172.25.32.42:5000` — não `localhost:5000`, nada roda local neste ambiente; Swagger
está desabilitado, 404 em `/swagger/v1/swagger.json`):**

- Critério do botão "XML Transformação Final" = **existe Mapper cadastrado para o
  `layoutGuid`** (não `layoutType`). Confirmação definitiva e inesperada: busquei os 57
  layouts reais via `GET /api/layoutdatabase/mqseries-nfe` e **os 57 têm `layoutType: "2"`**
  — o mesmo valor, um código numérico em string. Os valores `"TextPositional"`/`"XML"` que eu
  tinha achado no C# (`AutoTransformationGeneratorService.cs`) NUNCA aparecem nos dados reais
  do banco — teriam sido uma armadilha se eu tivesse implementado a Hipótese A do plano
  original. `layoutType` não serve pra decisão nenhuma no estado atual dos dados.
- **Checar disponibilidade de transformação:** `GET /api/mapperdatabase/by-input/{layoutGuid}`
  (guid puro, sem prefixo). Testado com guid real que tem mapper
  (`e339073e-32d1-492e-ae8a-dcf6337b21a1`, layout `LAY_CNHI_TXT_MQSERIES_ENVNFE_4.00_NFe`):
  200 com `{success, id, mapperGuid, name, description, inputLayoutGuid, targetLayoutGuid,
  hasDecryptedContent, lastUpdateDate}`. Testado com guid inexistente: 404 com
  `{error: "Mapeador não encontrado"}` — front trata isso como "não disponível", não como
  erro. **Achado colateral:** `GET /api/mapperdatabase/by-layout/{guid}` (rota "irmã") NÃO
  funciona para esse propósito — retornou `count:0` pro mesmo guid que tem mapper confirmado
  via `by-input`. Evitar essa rota; possível bug do back-end, não é meu escopo consertar.
- **Executar transformação:** `POST /api/transformationexecution/execute`. Achado que mudou o
  tipo TS: corpo `{}` devolve 400 do ASP.NET Core (`ProblemDetails`) exigindo que **todos os 5
  campos string** (`InputContent`, `LayoutName`, `SourceDocumentType`, `TargetDocumentType`,
  `ExpectedOutput`) estejam PRESENTES no JSON — inclusive os que a lógica de negócio trata
  como opcionais com fallback interno (`?? "NFe"`). Omitir a chave = 400 antes de qualquer
  lógica rodar; string vazia é aceita. `TransformationExecutionRequest` no front por isso não
  tem nenhum campo opcional (`?`) — o service sempre envia os 6 (`validate` é bool). Testado
  com `InputContent` inválido pra layout com mapper: 400 com
  `{success:false, errors:["Arquivo MAP não encontrado para layout: ..."], warnings:[]}` —
  confirma o shape do caminho de ERRO. Caminho de SUCESSO não testado em runtime (exigiria um
  documento MQSeries real e válido, que não tinha disponível) — `TransformationExecutionSuccess`
  ainda é baseado em leitura de código C#, não confirmado em runtime; validar quando houver
  um documento de teste real.

**Achado interno (dívida pré-existente, não relacionado à feature em si):**
`src/components/analysis/AnalysisSection.tsx` existe mas é código morto — não importado em
`routes.tsx` nem em nenhum outro componente (`grep -rn "AnalysisSection" src/` só acha o
próprio arquivo). O fluxo real e ativo hoje é o layout em "L" dentro de
`src/components/layout/LayoutParserPage.tsx`. Não confundir os dois ao plugar UI nova.

**Convenções reais do código contrariam a doc escrita (segui o código, não a doc, ao
implementar) — ver [[feedback-convencoes-reais-vs-doc]]:** nenhum dos ~14 componentes do
projeto usa o alias `@/` (100% usam paths relativos `../../`) nem fica em pasta própria
(`Foo.tsx`+`Foo.css` ficam direto dentro da pasta da feature, ex. `components/analysis/`, não
em `components/analysis/Foo/Foo.tsx`). `frontend-standards.md`/`CLAUDE.md` dizem o contrário
("use alias `@/`", "um componente por pasta"). Os 2 componentes novos desta feature
(`AnalysisModeTabs`, `XmlTransformationDisplay`) seguiram o padrão REAL (path relativo, sem
subpasta), não a doc — consistente com a própria instrução da doc de "seguir o código
existente". Vale decidir com o usuário se atualiza a doc ou padroniza o código; nenhuma das
duas coisas foi feita agora (fora do escopo pedido).

**Dívida técnica pré-existente que bloqueia os quality gates, independente desta feature:**
`npm run lint` falha no repo inteiro por CRLF generalizado (committado desde antes; ex.
`git show HEAD:src/App.tsx` já tem `\r` — não é só os 3 arquivos com mudança pré-existente
não commitada que o orquestrador já conhecia). `npm run build`/`npx tsc --noEmit` falham por
12 erros de TS pré-existentes em 6 arquivos não relacionados (`LineProperties.tsx`,
`LayoutCombobox.tsx`, `LayoutSearch.tsx`, `MainLayout.tsx`, `monitoringService.ts`,
`treeBuilder.ts` — confirmado via `git diff --stat` vazio contra HEAD, ninguém tocou nesses
arquivos nesta feature). `node_modules` também não vinha instalado neste ambiente (precisa
`npm install` antes de rodar qualquer gate). Ao validar uma feature nova, rodar lint/tsc
isolado nos arquivos tocados (não o script `npm run lint`/`build` cru) para não confundir
dívida antiga com regressão nova.

**Why:** essa investigação exigiu ler um repo irmão (`LayoutParserApi`, fora deste diretório
de trabalho) — caro de re-derivar do zero. **How to apply:** antes de um próximo
`/wire-endpoint` para `xmlAnalysis`/`transformationExecution`, reler este memo em vez de
re-investigar do zero; mas AINDA validar contra o endpoint real (API no ar, resposta HTTP de
fato) antes de fechar os tipos TS definitivos — código C# lido é evidência forte, não é prova
de contrato em runtime (serialização JSON, nomes de campo exatos, etc. não foram testados).
