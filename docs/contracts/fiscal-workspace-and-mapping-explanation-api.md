# Contrato proposto — Workspace fiscal e explicabilidade de mappings

> Consumidor: LayoutParserReact/BFF
> Provedor: LayoutParserApi
> Estado: **proposta cross-repo; endpoints ainda não disponíveis**

Os endpoints ficam marcados como `availability: proposed` em `contracts/api-endpoints.json`. Esse
estado permite tipar a fronteira sem exigir a rota no OpenAPI de runtime. O handoff da API deve
remover `proposed`; somente então as telas dependentes podem ser ativadas e o check OpenAPI passa a
exigir os endpoints.

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

### `GET /api/workspaces/{workspaceId}`

Retorna somente se o usuário tiver membership. Nunca distinguir “não existe” de “existe, mas é de
outro usuário” por mensagens detalhadas.

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

As rotas abaixo são propostas e devem ser refinadas no OpenAPI da API antes da implementação da UI:

| Método e rota                                                                 | Finalidade                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `POST /api/workspaces/{workspaceId}/projects/{projectId}/mapping-packages`    | Criar revisão com amostras, layout, Excel, XSD e gabarito opcional. |
| `GET /api/workspaces/{workspaceId}/mapping-packages/{packageId}`              | Consultar inventário, hashes, qualidade e lacunas dos insumos.      |
| `POST /api/workspaces/{workspaceId}/mapping-packages/{packageId}/drafts`      | Criar `MappingDraft` sobre uma revisão imutável do pacote.          |
| `POST /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/suggestions`     | Iniciar job de sugestões da IA.                                     |
| `PATCH /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/rules/{ruleId}` | Aceitar, editar ou rejeitar regra com `If-Match`.                   |
| `POST /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/compile`         | Gerar TCL/XSL/XSLT apenas a partir da revisão aceita.               |
| `POST /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/test-runs`       | Executar, validar XSD/fiscal, comparar e medir cobertura.           |

Criação de pacote usa multipart com metadados JSON e artefatos classificados. A API inspeciona
conteúdo e extensão, calcula hash, aplica limite e antivírus/política equivalente e nunca confia no
MIME informado pelo navegador.

Resposta mínima de uma sugestão:

```json
{
  "jobId": "01J...",
  "status": "completed",
  "packageRevision": 2,
  "draftRevision": 5,
  "rules": [
    {
      "ruleId": "rule_emit_cnpj",
      "status": "proposed",
      "sourceRefs": ["layout://LINHA004/CNPJ"],
      "targetRefs": ["xsd:///NFe/infNFe/emit/CNPJ"],
      "operation": "copy",
      "transformations": ["trim"],
      "confidence": "high",
      "evidence": [
        { "kind": "spreadsheet-cell", "reference": "Mapeamento!F42" },
        { "kind": "xsd", "reference": "/NFe/infNFe/emit/CNPJ" }
      ],
      "questions": []
    }
  ]
}
```

Regras sem evidência suficiente ficam `needs_input`; a API não cria correspondência silenciosa. A
compilação é assíncrona, idempotente e devolve artefatos versionados, diagnósticos e correlation ID.
`engine=sysmiddle` deve ser recusado por todas as rotas de Draft, compile e publish.

### `GET /api/workspaces/{workspaceId}/mappings/{mappingId}/versions/{version}/explanation`

```json
{
  "mappingId": "01J...",
  "version": 3,
  "engine": "xslt",
  "supportLevel": "authoritative",
  "sourceSchema": {
    "schemaId": "01J...",
    "format": "fixed_width",
    "fiscalDocumentType": "nfe",
    "version": "4.00"
  },
  "targetSchema": {
    "schemaId": "01J...",
    "format": "xml",
    "fiscalDocumentType": "nfe",
    "version": "4.00"
  },
  "rules": [
    {
      "ruleId": "rule-emit-cnpj",
      "order": 10,
      "kind": "transform",
      "label": "CNPJ do emitente",
      "humanDescription": "Remove espaços e copia o CNPJ do emitente para o XML da NF-e.",
      "sources": [
        {
          "ref": "layout://LINHA004/CNPJ",
          "label": "LINHA004.CNPJ"
        }
      ],
      "targets": [
        {
          "ref": "xpath:///nfe:NFe/nfe:infNFe/nfe:emit/nfe:CNPJ",
          "label": "emit/CNPJ"
        }
      ],
      "condition": null,
      "operations": [
        {
          "name": "trim",
          "arguments": []
        }
      ],
      "supportLevel": "authoritative",
      "limitations": []
    }
  ],
  "opaqueRuleCount": 0,
  "limitations": []
}
```

### Vocabulário mínimo

`engine`: `tcl`, `xsl`, `xslt`, `sysmiddle`.

`kind`: `copy`, `constant`, `transform`, `condition`, `loop`, `lookup`, `aggregate`, `script`,
`unknown`.

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
