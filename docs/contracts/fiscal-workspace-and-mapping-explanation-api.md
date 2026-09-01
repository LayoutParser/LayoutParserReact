# Contrato cross-repo — Workspace fiscal e explicabilidade de mappings

> Consumidor: LayoutParserReact/BFF
> Provedor: LayoutParserApi
> Estado: **Slices 1–5 entregues em `develop` da API; integração do Slice 5 em validação no front**

`GET /api/workspaces/me` foi entregue pela LayoutParserApi no PR
[#234](https://github.com/LayoutParser/LayoutParserApi/pull/234) e deixou de ser `proposed` em
`contracts/api-endpoints.json`. Endpoints ainda não implementados continuam marcados como
`availability: proposed`; somente o handoff da API pode remover esse estado e ativar sua UI. Os PRs
[#238](https://github.com/LayoutParser/LayoutParserApi/pull/238) e
[#240](https://github.com/LayoutParser/LayoutParserApi/pull/240) liberaram, respectivamente,
`MappingDraft` e `MappingExplanation`. O PR
[#243](https://github.com/LayoutParser/LayoutParserApi/pull/243) entregou compilação e Test Lab.

## 1. Identidade confiável BFF → API

O BFF remove esses headers de toda requisição recebida e os reinsere a partir da sessão OIDC:

| Header                             | Valor                                                |
| ---------------------------------- | ---------------------------------------------------- |
| `x-layoutparser-identity-provider` | `entra`, `google` ou `development` apenas localmente |
| `x-layoutparser-identity-subject`  | `sub` imutável do provedor                           |
| `x-layoutparser-identity-tenant`   | `tid`/issuer quando disponível                       |
| `x-iis-user`                       | nome de exibição legado; não usar como chave         |
| `x-iis-roles`                      | roles legadas; RBAC do workspace pertence à API      |

A API só confia nesses headers na mesma fronteira de rede já protegida pelo
`TrustedIdentityMiddleware`. O `subject` não deve voltar ao navegador nem aparecer em logs.

### Resultado interno esperado

```text
unique(provider, tenant_or_issuer, subject) → ExternalIdentity → UserId
```

Mudança de nome/e-mail atualiza o perfil, sem criar usuário ou workspace novo.

## 2. Workspaces

### `GET /api/workspaces/me`

```json
{
  "activeWorkspaceId": "01J...",
  "workspaces": [
    {
      "workspaceId": "01J...",
      "name": "Meu workspace fiscal",
      "kind": "personal",
      "role": "owner",
      "createdAt": "2026-08-31T12:00:00Z"
    }
  ]
}
```

Cria o workspace pessoal de forma idempotente quando o usuário ainda não possui membership.

Respostas observáveis: `401` quando não há identidade confiável e `503` em falha do serviço. O
front valida que `activeWorkspaceId` pertence à lista devolvida, não persiste essa seleção e nunca
aceita um workspace arbitrário informado pelo navegador.

### `GET /api/workspaces/{workspaceId}`

Retorna somente se o usuário tiver membership. Nunca distinguir “não existe” de “existe, mas é de
outro usuário” por mensagens detalhadas.

Esse endpoint também foi entregue pelo PR #234 e usa `404` uniforme para recurso ausente, ausência
de membership ou identidade indisponível. A idempotência concorrente foi coberta pela suíte da API;
a validação em SQL Server real com múltiplas instâncias ainda é uma ressalva operacional conhecida.

## 3. Projetos fiscais

### `POST /api/workspaces/{workspaceId}/projects`

```json
{
  "name": "Conversões NF-e 4.00",
  "description": "Projeto de homologação",
  "defaultFiscalDocumentType": "nfe"
}
```

Tipos iniciais: `nfe`, `cte`, `mdfe`, `nfse`, `nfcom`.

## 4. Histórico de análises

### `POST /api/workspaces/{workspaceId}/projects/{projectId}/analyses`

A criação deve ser idempotente por `Idempotency-Key` e pode ser integrada ao parse atual após o
contrato estabilizar.

```json
{
  "source": {
    "fileName": "documento-redigido.mqseries",
    "contentHash": "sha256:...",
    "sizeBytes": 1234,
    "format": "mqseries"
  },
  "fiscalProfile": {
    "documentType": "nfe",
    "schemaVersion": "4.00",
    "operation": "authorization"
  },
  "layoutGuid": "00000000-0000-0000-0000-000000000000",
  "correlationId": "00000000-0000-0000-0000-000000000000",
  "retentionMode": "metadata_only"
}
```

`retentionMode`: `none`, `metadata_only`, `artifacts_until`. O conteúdo não deve ser assumido como
persistido apenas porque houve uma análise.

### `GET /api/workspaces/{workspaceId}/projects/{projectId}/analyses`

Paginação por cursor e filtros por `documentType`, `status`, `from`, `to` e `layoutGuid`.

## 5. Catálogo de mappings

### Recursos

- `MappingDefinition`: identidade lógica durável;
- `MappingVersion`: snapshot imutável quando publicado;
- `MappingRelease`: promoção de uma versão a um ambiente;
- `MappingTestCase`: entrada/saída esperada sanitizada ou protegida;
- `MappingExplanation`: representação normalizada para a UI.

### Capabilities de motor

O contrato de explicação é reutilizável por todos os motores, mas não concede capacidade de
autoria. Toda versão deve declarar capabilities explicitamente:

```json
{
  "engine": "sysmiddle",
  "capabilities": {
    "execute": true,
    "explain": true,
    "author": false,
    "compile": false,
    "publish": false
  }
}
```

Para `sysmiddle`, `author`, `compile` e `publish` são sempre `false`. A API rejeita mutações mesmo
se um cliente adulterado tentar chamá-las. TCL e XSL/XSLT podem habilitar essas capacidades conforme
papel, estado do Draft e disponibilidade do adapter.

### Pacote fiscal e Draft assistido

O primeiro incremento de pacote foi entregue no PR
[#236](https://github.com/LayoutParser/LayoutParserApi/pull/236), com escopo deliberadamente menor
que o PBI completo do front:

- disponível: criação multipart da revisão 1 e consulta de metadados do pacote;
- pendente: inventário normalizado de campos/XSD/planilha, conflitos e ausências;
- pendente: criação explícita de nova revisão e download controlado de artefato;
- pendente: contrato navegável de projetos para o usuário escolher um projeto sem informar GUID;
- validação manual do Windows Defender no host real ainda não executada.

Contrato entregue:

| Método e rota                                                              | Estado   | Finalidade                                                |
| -------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| `POST /api/workspaces/{workspaceId}/projects/{projectId}/mapping-packages` | Entregue | Cria pacote e revisão 1 por upload multipart idempotente. |
| `GET /api/workspaces/{workspaceId}/mapping-packages/{packageId}`           | Entregue | Retorna pacote, revisão atual e metadados dos artefatos.  |

Os nomes dos campos multipart são parte do contrato: `sample`, `layout`, `spec`, `xsd`,
`expectedXml` e `fiscalContext`. A extensão permitida é, respectivamente, `.txt`, `.xml`, `.xlsx`,
`.xsd`, `.xml` e `.json`; o limite atual é 50 MiB por artefato e dez artefatos por request.
`Idempotency-Key` deve ser gerado pelo front para uma tentativa lógica e reaproveitado apenas em
retry dessa mesma tentativa.

O Slice 3 entregou as rotas de Draft e revisão humana:

| Método e rota                                                                       | Finalidade                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `POST /api/workspaces/{workspaceId}/mapping-packages/{packageId}/drafts`            | Criar Draft TCL/XSLT sobre `revisionId` exato.                   |
| `GET /api/workspaces/{workspaceId}/mapping-drafts/{draftId}`                        | Consultar Draft e regras atuais.                                 |
| `POST /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/suggestions`           | Iniciar job idempotente de sugestões.                            |
| `GET /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/suggestions/{jobId}`    | Observar `queued/running/completed/failed/canceled`.             |
| `DELETE /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/suggestions/{jobId}` | Solicitar cancelamento cooperativo.                              |
| `PATCH /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/rules/{ruleId}`       | Decidir com `If-Match`; `412` devolve a regra concorrente atual. |

O Slice 5 foi entregue pelo PR [API #243](https://github.com/LayoutParser/LayoutParserApi/pull/243).
O front possui consumidor tipado para as rotas abaixo:

| Método e rota                                                                     | Finalidade                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `POST /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/compile`             | Iniciar compilação determinística do snapshot aceito.  |
| `GET /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/compile/{jobId}`      | Observar job e obter `releaseId`.                      |
| `GET /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/releases/{releaseId}` | Ler artefatos, diagnósticos, hash, gates e provenance. |
| `POST /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/test-runs`           | Executar fixture XML individual sobre uma release.     |
| `GET /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/test-runs/{jobId}`    | Observar o resultado dos gates obrigatórios.           |

Criação de pacote usa multipart com metadados JSON e artefatos classificados. A API inspeciona
conteúdo e extensão, calcula hash, aplica limite e antivírus/política equivalente e nunca confia no
MIME informado pelo navegador.

Resposta atual de um Draft:

```json
{
  "draftId": "00000000-0000-0000-0000-000000000001",
  "workspaceId": "00000000-0000-0000-0000-000000000002",
  "packageId": "00000000-0000-0000-0000-000000000003",
  "revisionId": "00000000-0000-0000-0000-000000000004",
  "engine": "tcl",
  "createdAt": "2026-08-31T19:00:00Z",
  "rules": [
    {
      "ruleId": "00000000-0000-0000-0000-000000000005",
      "draftId": "00000000-0000-0000-0000-000000000001",
      "status": "proposed",
      "sourceRefs": ["layout://LINHA004/CNPJ"],
      "targetRefs": ["xsd:///NFe/infNFe/emit/CNPJ"],
      "operation": "copy",
      "conditions": "[]",
      "transformations": "[\"trim\"]",
      "cardinality": "1:1",
      "confidence": "high",
      "evidence": [{ "kind": "xsd", "reference": "/NFe/infNFe/emit/CNPJ" }],
      "questions": [],
      "createdAt": "2026-08-31T19:01:00Z",
      "eTag": "AAAAAAAAAAE="
    }
  ]
}
```

O front cita o ETag (`If-Match: "AAAAAAAAAAE="`). Sem header a API retorna `428`; divergência
retorna `412` e inclui `current`, que substitui a visão local antes de novo merge humano. Regras sem
evidência suficiente ficam `needs_input`; Sysmiddle é recusado no controller de Draft.

**Gap confirmado:** `UpdateRuleRequest.answer` faz `needs_input → proposed`, mas o texto não é
encaminhado ao store nem registrado na decisão. Até a API corrigir, a UI oferece correção
estruturada e não finge persistir uma resposta livre.

### `GET /api/workspaces/{workspaceId}/mappings/{mappingId}/versions/{version}/explanation`

```json
{
  "mappingId": "00000000-0000-0000-0000-000000000001",
  "version": "draft",
  "engine": "xslt",
  "capabilities": {
    "execute": true,
    "explain": true,
    "author": true,
    "compile": false,
    "publish": false
  },
  "sourceSchema": null,
  "targetSchema": null,
  "rules": [
    {
      "ruleId": "rule-emit-cnpj",
      "sourceRefs": ["layout://LINHA004/CNPJ"],
      "targetRefs": ["xsd:///NFe/infNFe/emit/CNPJ"],
      "condition": null,
      "operations": ["copy"],
      "cardinality": "1:1",
      "evidence": [{ "kind": "xsd", "reference": "/NFe/infNFe/emit/CNPJ" }],
      "humanDescription": "Remove espaços e copia o CNPJ do emitente para o XML da NF-e.",
      "technicalDetail": "[\"trim\"]",
      "supportLevel": "authoritative"
    }
  ],
  "description": null,
  "opaqueRuleCount": 0,
  "limitations": []
}
```

Versões atuais são categóricas: Draft TCL/XSLT usa `version=draft`; Sysmiddle usa
`version=current`. Mesmo após o merge do Slice 5, XSLT compilado ainda não alimenta este endpoint e
os adapters TCL/XSLT continuam com `compile=false`. Esses gaps permanecem rastreados na issue API
#231; o front permanece fail-closed e não deduz capabilities a partir da existência de uma rota.

### Vocabulário mínimo

`engine`: `tcl`, `xslt`, `sysmiddle`.

`supportLevel`: `authoritative`, `best_effort`, `opaque`, `unsupported`.

O front não reconstitui regra ausente e não converte `best_effort` em `authoritative`.

## 6. Adapters da API

### XSL/XSLT

Extrair templates, selects, conditions, loops, variáveis e chamadas conhecidas. Extension objects e
custom code entram como `opaque` quando não houver adapter seguro.

### TCL

Usar o parser/AST real. Preservar IDs/referências da regra para diff e navegação.

### Sysmiddle

Ler apenas metadados declarativos licenciados para uso pela aplicação. Reaproveitar
`fieldMappings`, `sectionMappings` e a tabela permitida de funções. Não devolver código
decompilado, segredo, caminho interno ou expressão que viole licença. Não oferecer endpoint de
mutação; qualquer tentativa genérica com `engine=sysmiddle` retorna erro categórico e auditável.

## 7. Concorrência, segurança e auditoria

- `ETag`/`If-Match` para atualizar Draft;
- versões Published são imutáveis;
- toda consulta filtra por membership antes de buscar artefato;
- download usa autorização e expiração curta;
- logs registram IDs, não conteúdo;
- criação, aprovação, promoção e exclusão geram audit event;
- respostas incluem `X-Correlation-ID`;
- paginação e limites são obrigatórios.

## 8. Critérios de aceite cross-repo

1. Mesmo principal com nome alterado resolve o mesmo `UserId`.
2. Usuário A não lê nem enumera recursos do usuário B.
3. Workspace pessoal é criado uma única vez sob concorrência.
4. Histórico respeita `retentionMode`.
5. Explicação XSLT é determinística para fixture conhecida.
6. Regra Sysmiddle não compreendida aparece `opaque`, nunca “direta”.
7. Payloads reais e identidade externa não aparecem em log ou erro.
8. Sugestão IA sem evidência suficiente exige intervenção humana.
9. Somente regras aceitas entram na geração TCL/XSL/XSLT.
10. Todas as tentativas de autoria Sysmiddle são negadas pela API e pelo front.
