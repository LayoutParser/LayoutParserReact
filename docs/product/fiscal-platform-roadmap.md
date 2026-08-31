# Plano de produto — LayoutParser Fiscal Mapping Platform

> Fonte operacional: GitHub Project **LayoutParserReact — Backlog** e Project
> **LayoutParserApi — Backlog**. Este documento registra arquitetura, sequência e critérios; Issues
> registram execução e evidência.

## Rastreamento

- Front Project #3: [LayoutParserReact — Backlog](https://github.com/orgs/LayoutParser/projects/3)
- Front: Epic [#195](https://github.com/LayoutParser/LayoutParserReact/issues/195), PBIs
  [#196](https://github.com/LayoutParser/LayoutParserReact/issues/196)–[#199](https://github.com/LayoutParser/LayoutParserReact/issues/199)
  e gate [#200](https://github.com/LayoutParser/LayoutParserReact/issues/200).
- API Project #2: [LayoutParserApi — Backlog](https://github.com/orgs/LayoutParser/projects/2)
- API: identidade/workspaces [#225](https://github.com/LayoutParser/LayoutParserApi/issues/225),
  explicabilidade TCL/XSLT [#226](https://github.com/LayoutParser/LayoutParserApi/issues/226),
  investigação Sysmiddle [#227](https://github.com/LayoutParser/LayoutParserApi/issues/227) e gate
  de isolamento [#228](https://github.com/LayoutParser/LayoutParserApi/issues/228).
- Trabalho existente reaproveitado: governança de mappers
  [API #94](https://github.com/LayoutParser/LayoutParserApi/issues/94) e geração fiscal
  [API #103](https://github.com/LayoutParser/LayoutParserApi/issues/103).

## Objetivo

Transformar o fluxo atual de upload/análise em uma plataforma fiscal na qual cada usuário possua
workspaces autorizados, histórico de documentos analisados e um catálogo versionado de mappings
TCL, XSL/XSLT e Sysmiddle com explicação visual legível.

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
4. Spike/adapter Sysmiddle com classificação de trechos opacos.
5. Mapping Studio read-only: origem → regra → destino.
6. Visão humana e visão técnica da mesma regra.
7. Navegação bidirecional com `fieldMappings` e `sectionMappings`.

## P1 — Autoria e governança fiscal

### Mapping Studio editável

- criar ligação direta;
- constante, concatenação, condição, lookup e conversão;
- loops/cardinalidade;
- biblioteca de funções permitidas por motor;
- validação instantânea do grafo;
- autosave de Draft com controle otimista de concorrência;
- diff entre versões.

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

### Slice 1 — Identidade confiável

- **Entrega:** BFF encaminha provider/subject/tenant somente ao upstream confiável; API cria
  `UserId` interno.
- **Gate:** dois logins do mesmo principal resolvem o mesmo usuário; nomes alterados não criam
  outro workspace.

### Slice 2 — Workspace vazio, mas real

- **Entrega:** `/api/workspaces/me`, shell `/workspace`, estado loading/vazio/erro e workspace
  pessoal.
- **Gate:** usuário A não lê workspace B, inclusive alterando IDs manualmente.

### Slice 3 — Primeira análise persistida

- **Entrega:** parse bem-sucedido aparece em “Análises recentes” com metadados sanitizados.
- **Gate:** conteúdo do documento não é persistido quando a política é metadata-only.

### Slice 4 — Mapping versionado

- **Entrega:** catalogar um mapping existente, abrir versão e mostrar origem/destino.
- **Gate:** versão publicada não pode ser modificada.

### Slice 5 — XSL/XSLT explicado

- **Entrega:** regras normalizadas e visualização read-only de templates/condições/cópias.
- **Gate:** fixture XSLT conhecida gera grafo determinístico e texto coerente.

### Slice 6 — TCL e Sysmiddle

- **Entrega:** adapters para o mesmo contrato; regra não compreendida é visivelmente opaca.
- **Gate:** o front nunca apresenta inferência best-effort como regra autoritativa.

## Matriz cross-repo

| Capacidade        | React/BFF                       | API                               | QA/Contrato                        |
| ----------------- | ------------------------------- | --------------------------------- | ---------------------------------- |
| Principal estável | sanitiza e encaminha identidade | resolve ExternalIdentity → UserId | spoofing e estabilidade            |
| Workspace         | shell, seletor, estados         | persistência e autorização        | isolamento cross-workspace         |
| Histórico         | lista, filtros, detalhes        | gravação, paginação, retenção     | nenhum payload em logs             |
| Mapping           | Studio e diff                   | catálogo, versão, release         | imutabilidade e concorrência       |
| Explicação        | grafo e inspetor                | adapters TCL/XSLT/Sysmiddle       | fixtures e confiança               |
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
