# Plano de produto — LayoutParser Fiscal Mapping Platform

> Fonte operacional: GitHub Project **LayoutParserReact — Backlog** e Project
> **LayoutParserApi — Backlog**. Este documento registra arquitetura, sequência e critérios; Issues
> registram execução e evidência.

## Rastreamento

- Front Project #3: [LayoutParserReact — Backlog](https://github.com/orgs/LayoutParser/projects/3)
- Front: Epic [#195](https://github.com/LayoutParser/LayoutParserReact/issues/195), PBIs
  [#196](https://github.com/LayoutParser/LayoutParserReact/issues/196)–[#199](https://github.com/LayoutParser/LayoutParserReact/issues/199)
  e gate [#200](https://github.com/LayoutParser/LayoutParserReact/issues/200). Autoria fiscal:
  pacote [#201](https://github.com/LayoutParser/LayoutParserReact/issues/201), revisão IA
  [#202](https://github.com/LayoutParser/LayoutParserReact/issues/202), editor TCL/XSLT
  [#203](https://github.com/LayoutParser/LayoutParserReact/issues/203), Test Lab
  [#204](https://github.com/LayoutParser/LayoutParserReact/issues/204), gate Sysmiddle read-only
  [#205](https://github.com/LayoutParser/LayoutParserReact/issues/205) e piloto FIAT
  [#206](https://github.com/LayoutParser/LayoutParserReact/issues/206).
- API Project #2: [LayoutParserApi — Backlog](https://github.com/orgs/LayoutParser/projects/2)
- API: identidade/workspaces [#225](https://github.com/LayoutParser/LayoutParserApi/issues/225),
  explicabilidade TCL/XSLT [#226](https://github.com/LayoutParser/LayoutParserApi/issues/226),
  investigação Sysmiddle [#227](https://github.com/LayoutParser/LayoutParserApi/issues/227) e gate
  de isolamento [#228](https://github.com/LayoutParser/LayoutParserApi/issues/228).
- API autoria IA: feature principal
  [#103](https://github.com/LayoutParser/LayoutParserApi/issues/103), pacote fiscal
  [#229](https://github.com/LayoutParser/LayoutParserApi/issues/229), MappingDraft
  [#230](https://github.com/LayoutParser/LayoutParserApi/issues/230), compilação/Test Lab
  [#231](https://github.com/LayoutParser/LayoutParserApi/issues/231) e gate de mutação Sysmiddle
  [#232](https://github.com/LayoutParser/LayoutParserApi/issues/232).
- Trabalho existente reaproveitado: governança de mappers
  [API #94](https://github.com/LayoutParser/LayoutParserApi/issues/94) e geração fiscal
  [API #103](https://github.com/LayoutParser/LayoutParserApi/issues/103).

## Objetivo

Transformar o fluxo atual de upload/análise em uma plataforma fiscal na qual cada usuário possua
workspaces autorizados, histórico de documentos analisados e um catálogo versionado. O produto
explica TCL, XSL/XSLT e Sysmiddle, mas autoria assistida, edição e publicação são exclusivas de TCL
e XSL/XSLT.

## Métricas de produto

- tempo entre upload e identificação do layout;
- percentual de análises com proveniência campo a campo;
- cobertura de campos obrigatórios do schema fiscal no mapping;
- percentual de regras explicadas sem bloco opaco;
- regressões detectadas antes da promoção do mapping;
- tempo para diagnosticar uma divergência fiscal;
- taxa de sucesso de transformação por tipo/versão fiscal;
- zero acesso cross-workspace nos testes de autorização.

## P0 — Fundação vendável

### Epic A — Identidade e workspaces fiscais

1. Principal imutável OIDC propagado BFF → API.
2. `User`, `ExternalIdentity`, `FiscalWorkspace` e `WorkspaceMembership` persistidos pela API.
3. Workspace pessoal inicial criado de forma idempotente.
4. Seletor de workspace e shell autenticado no front.
5. RBAC por workspace com Owner, FiscalAdmin, Mapper, Reviewer, Operator e Viewer.
6. Testes negativos de isolamento entre dois usuários e dois workspaces.

### Epic B — Histórico de análises

1. Criar `DocumentAnalysis` ao aceitar um parse.
2. Associar layout escolhido, versão fiscal, hashes, correlation ID e estado.
3. Política explícita de retenção; conteúdo bruto opcional.
4. Lista paginada/filtros por projeto, tipo fiscal, status e período.
5. Reabrir uma análise sem misturar artefatos ou proveniência de outra versão.
6. Excluir/expirar artefatos conforme política, preservando auditoria permitida.

### Epic C — Catálogo e ciclo de vida de mappings

1. `MappingDefinition` e `MappingVersion` independentes do motor.
2. Estados Draft, InReview, Approved, Published, Deprecated e Archived.
3. Versões publicadas imutáveis e rollback por promoção de versão anterior.
4. Origem/destino fiscal tipados por documento, operação, versão e jurisdição.
5. Casos de teste com entrada sintética/redigida e saída esperada.

### Epic D — Explicabilidade de regras

1. Contrato canônico `MappingExplanation` na API.
2. Adapter XSL/XSLT.
3. Adapter TCL.
4. Adapter read-only de Sysmiddle com classificação de trechos opacos.
5. Mapping Studio read-only: origem → regra → destino.
6. Visão humana e visão técnica da mesma regra.
7. Navegação bidirecional com `fieldMappings` e `sectionMappings`.

## P1 — Autoria e governança fiscal

### Mapping Studio editável — somente TCL/XSL/XSLT

- criar ligação direta;
- constante, concatenação, condição, lookup e conversão;
- loops/cardinalidade;
- biblioteca de funções permitidas por motor;
- validação instantânea do grafo;
- autosave de Draft com controle otimista de concorrência;
- diff entre versões.

O fluxo começa em um `FiscalMappingPackage`: amostras, layout de origem, especificação Excel, XSD
oficial e gabarito opcional. A IA produz regras intermediárias com evidência e confiança; o usuário
revisa essas regras antes da geração do TCL/XSL/XSLT.

Sysmiddle permanece no Studio somente para leitura e explicação. Não existe ação de edição,
geração, compilação ou promoção para esse motor.

### Fiscal Test Lab

- conjunto de fixtures por documento e versão;
- schema/XSD e regras fiscais complementares;
- comparação canônica de XML;
- cobertura de destinos obrigatórios e não mapeados;
- regressão em lote antes de aprovação;
- evidência de qual regra produziu cada divergência.

### Promoção

```text
Draft → In Review → Approved → Development → Validation → Production
```

Cada transição registra ator, instante, versão, checks e justificativa. Produção nunca executa um
Draft mutável.

## P2 — Escala e oferta comercial

- deployment dedicado ou compartilhado por cliente;
- SSO/SCIM empresarial e gestão delegada;
- quotas e medição de uso;
- filas/workers por motor;
- object storage e retenção por plano;
- conectores de entrada/saída;
- templates fiscais reutilizáveis;
- SLA, DR e painéis operacionais;
- licenciamento e billing apenas após telemetria de uso confiável.

## Sequência de implementação vertical

### Slice 1 — Identidade confiável e workspace real

- **Entrega:** BFF encaminha provider/subject/tenant somente ao upstream confiável; API cria
  `UserId` interno e expõe `/api/workspaces/me`; o front entrega shell `/workspace`, seletor e
  estados loading/erro/sucesso.
- **Status:** API [#234](https://github.com/LayoutParser/LayoutParserApi/pull/234) entregue; integração
  do front entregue pelos PRs #208/#209 e validada no environment `development`.
- **Gate:** dois logins do mesmo principal resolvem o mesmo usuário; nomes alterados não criam
  outro workspace e usuário A não lê workspace B.

### Slice 2 — Primeiro pacote fiscal versionado

- **Entrega:** upload multipart idempotente e consulta de metadados de `FiscalMappingPackage`.
- **Status:** API [#236](https://github.com/LayoutParser/LayoutParserApi/pull/236) entregou criação da
  revisão 1 e consulta. O PBI front #201 permanece parcial até existirem inventário normalizado,
  navegação de projetos e criação de nova revisão.
- **Gate:** MIME real, XXE, zip bomb, isolamento e retry idempotente; o front não guarda conteúdo
  fiscal em `localStorage` e não inventa projeto ou inventário ausente.

### Slice 3 — MappingDraft human-in-the-loop

- **Entrega:** API [#238](https://github.com/LayoutParser/LayoutParserApi/pull/238) criou Draft,
  regras, job assíncrono de sugestão e decisões com ETag/`If-Match`; o front possui service tipado,
  fila de revisão e resolução fail-safe de conflito `412`.
- **Ressalva:** `answer` é aceito no request, mas o texto ainda não chega ao store da API; a UI não
  oferece uma falsa resposta livre e mantém a correção estruturada disponível.
- **Gate:** Sysmiddle não entra no fluxo de autoria; aceitar/editar/rejeitar nunca sobrescreve outra
  sessão silenciosamente.

### Slice 4 — MappingExplanation canônico

- **Entrega:** API [#240](https://github.com/LayoutParser/LayoutParserApi/pull/240) entregou DTO e
  adapters TCL, XSLT e Sysmiddle; o front valida o payload em runtime e apresenta capabilities,
  schemas, regras, evidências, nível de suporte e limitações.
- **Ressalva:** XSLT real continua `unsupported` até existir artefato compilado no Slice 5; TCL
  explica o Draft; Sysmiddle usa a versão `current` e permanece estritamente somente leitura.
- **Gate:** a UI não infere capability ausente, não reconstitui regra e não renderiza autoria para
  Sysmiddle, inclusive em deep link.

### Slice 5 — Compilação e Fiscal Test Lab

- **Entrega:** API [#243](https://github.com/LayoutParser/LayoutParserApi/pull/243) gera TCL/XSLT
  somente das regras aceitas/editadas, expõe release imutável do snapshot e executa fixture XSLT
  individual com XSD best-effort, diff canônico, cobertura, provenance e correlation ID. O front
  possui compilação assíncrona, visualização/download de artefato e painel dos gates.
- **Ressalvas:** TCL ainda não possui runner determinístico; suites versionadas não foram entregues;
  os adapters da explicação continuam declarando `compile=false` e o XSLT compilado ainda não é
  explicado pela rota canônica. A issue API
  [#231](https://github.com/LayoutParser/LayoutParserApi/issues/231) permanece aberta.
- **Gate:** o front não habilita compilação contra capability falsa, não guarda fixtures no
  `localStorage` e nunca expõe mutação Sysmiddle.

### Slice 6 — Histórico e catálogo navegável

- **Entrega esperada:** listar projetos, pacotes, análises e mappings sem exigir GUID manual;
  políticas de retenção e versionamento continuam autoritativas na API.
- **Gate:** conteúdo fiscal não é persistido no navegador e versão publicada é imutável.

### Slice 7 — Primeiro pacote fiscal FIAT

- **Entrega:** amostra MQSeries/IDoc + layout + planilha + XSD NF-e 4.00 alimentam um MappingDraft;
  usuário revisa propostas e gera TCL/XSL/XSLT.
- **Gate:** saída válida no XSD, provenance navegável, regressão aprovada e zero mutação Sysmiddle.

## Matriz cross-repo

| Capacidade        | React/BFF                       | API                               | QA/Contrato                        |
| ----------------- | ------------------------------- | --------------------------------- | ---------------------------------- |
| Principal estável | sanitiza e encaminha identidade | resolve ExternalIdentity → UserId | spoofing e estabilidade            |
| Workspace         | shell, seletor, estados         | persistência e autorização        | isolamento cross-workspace         |
| Histórico         | lista, filtros, detalhes        | gravação, paginação, retenção     | nenhum payload em logs             |
| Mapping           | Studio e diff                   | catálogo, versão, release         | imutabilidade e concorrência       |
| Explicação        | grafo e inspetor                | adapters TCL/XSLT/Sysmiddle       | fixtures e confiança               |
| Autoria IA        | revisão/edição TCL e XSL/XSLT   | Draft, sugestão, geração e testes | aceite humano e regressão          |
| Sysmiddle         | visualização read-only          | explicação e execução apenas      | tentativa de mutação sempre negada |
| Fiscal            | UX por tipo/versão              | validação autoritativa            | matriz NF-e/CT-e/MDF-e/NFS-e/NFCom |

## Definition of Done do P0

- contratos versionados e documentados;
- autorização por recurso testada negativamente;
- nenhuma propriedade baseada em e-mail/nome;
- nenhum documento fiscal em localStorage/logs/issues;
- lint, tipos, testes, build, audit, contrato e E2E verdes;
- UX desktop/mobile e teclado validada;
- política de retenção visível ao usuário;
- handoff cross-repo aceito explicitamente;
- deployment em development antes de promover para produção.

## Riscos

| Risco                                     | Mitigação                                            |
| ----------------------------------------- | ---------------------------------------------------- |
| Usar nome/e-mail como dono                | ExternalIdentity imutável + UserId interno.          |
| Misturar semântica dos motores no front   | contrato canônico gerado pela API.                   |
| Prometer explicação completa do Sysmiddle | níveis authoritative/best-effort/opaque/unsupported. |
| Reter documento fiscal sem política       | metadata-only por padrão e retenção configurável.    |
| NFS-e tratada como padrão único           | jurisdição/provedor/versão na identidade do schema.  |
| Mapping publicado mutável                 | versões imutáveis e promoção auditada.               |
