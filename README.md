# LayoutParser React — Front-end

> **PT-BR** · Front-end (Vite + React + TypeScript) do ecossistema **LayoutParser**. O
> usuário envia um arquivo **TXT** (e opcionalmente um **layout XML**), a API .NET processa
> e devolve um **mapeamento do documento** (linhas, campos, posições e validações), que este
> app renderiza como uma **árvore de estrutura** navegável.
>
> **EN** · Front-end (Vite + React + TypeScript) of the **LayoutParser** ecosystem. The user
> uploads a **TXT** file (and optionally an **XML layout**); the .NET API parses it and
> returns a **document mapping** (lines, fields, positions and validations) that this app
> renders as a navigable **structure tree**.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Ecossistema](#2-ecossistema-de-projetos)
3. [Stack](#3-stack)
4. [Como rodar](#4-como-rodar)
5. [Scripts](#5-scripts)
6. [Configuração da API](#6-configuração-da-api-base-url-variáveis-de-ambiente--proxy)
7. [Arquitetura do front](#7-arquitetura-do-front)
8. [Contrato com a API](#8-contrato-com-a-api-endpoints-consumidos)
9. [Fluxo do usuário](#9-fluxo-do-usuário)
10. [Deploy](#10-deploy)
11. [Harness de IA (Claude Code)](#11-harness-de-ia-claude-code)
12. [Contexto acadêmico](#12-contexto-acadêmico)

---

## 1. Visão geral

Este repositório é a **camada de apresentação** do LayoutParser. Ele **não** parseia nada
localmente: toda a regra de negócio (parsing posicional, detecção de tipo, validação de
layout, descriptografia, geração de transformação) vive no **back-end .NET**. O front:

- recebe o **TXT** e o **layout** do usuário (upload), ou seleciona um layout do catálogo;
- envia para a API (`POST /api/parse/upload`);
- exibe o **mapeamento** retornado: resumo do documento, campos, propriedades de linha,
  **árvore de estrutura** e **destaque de linhas inválidas (vermelho)**;
- quando existe mapeador, solicita à API os candidatos de transformação, permite alternar
  entre os pathways **Sysmiddle** e **TCL/XSL** e entrega o XML bruto por **cópia ou download**;
- tem uma área **Admin** com quatro abas: processamento, monitoramento, validação de layouts
  e **métricas de IA** (esta última consome endpoints que **ainda não existem no back-end** —
  ver [seção 8](#8-contrato-com-a-api-endpoints-consumidos)).

## 2. Ecossistema de projetos

O LayoutParser é dividido em 4 repositórios. **A API é o hub / fonte da verdade.**

| Repo                           | Papel                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| **LayoutParserApi**            | API ASP.NET Core (.NET 10). Orquestra parse, cache (Redis), IA e transformação. Fonte da verdade. |
| **LayoutParserLib**            | Criptografia Sysmiddle (DLL referenciada pela API).                                               |
| **LayoutParserDecrypt**        | `.exe` de descriptografia (processo externo chamado pela API).                                    |
| **LayoutParserReact** _(este)_ | Front-end Vite + React.                                                                           |

```
┌──────────────────┐   HTTP (axios)   ┌──────────────────┐   DLL / .exe   ┌────────────────────┐
│ LayoutParserReact │ ───────────────► │  LayoutParserApi  │ ─────────────► │ Lib / Decrypt      │
│  (este repo)      │   X-Correlation  │  (.NET 10, hub)   │                │ (cripto Sysmiddle) │
└──────────────────┘                  └──────────────────┘                └────────────────────┘
                                              │ Redis / SQL / Ollama
                                              ▼
```

## 3. Stack

| Camada    | Tecnologia                                                           |
| --------- | -------------------------------------------------------------------- |
| Build/dev | **Vite 7** (`type: module`)                                          |
| UI        | **React 18** + **react-router-dom 6.30** (`createBrowserRouter`)     |
| Linguagem | **TypeScript 5** (strict, `noUnusedLocals`/`noUnusedParameters`)     |
| Estado    | **Zustand 4.4** (8 stores)                                           |
| HTTP      | **Axios 1.19** (instância única + interceptor de `X-Correlation-ID`) |
| Qualidade | **ESLint 8** + **Prettier 3** + **Vitest 4** + **Testing Library**   |
| Aliases   | `@/*` → `src/*` (vite + tsconfig)                                    |

Os gates automatizados cobrem lint, tipos, testes com cobertura, três builds, formatação e
auditoria de dependências altas/críticas. O mesmo comando é executado nos pull requests e
antes dos deploys.

## 4. Como rodar

Pré-requisitos: **Node 20.19+** (ou **22.12+**) e a **API rodando**. Em `npm run dev`, o front chama a URL
definida em [`.env.development`](.env.development) — hoje `http://localhost:5100`
(atenção: divergente do fallback do código; ver [seção 6](#6-configuração-da-api-base-url-variáveis-de-ambiente--proxy)).

```bash
npm ci
npm run dev          # front em http://localhost:3000
```

## 5. Scripts

| Script                               | O que faz                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                        | Vite dev server na porta **3000** (o proxy `/api` existe no config, mas hoje não é o caminho usado — ver [seção 6](#6-configuração-da-api-base-url-variáveis-de-ambiente--proxy)). |
| `npm run build`                      | `tsc` (type-check) **e** `vite build` → `dist/` (modo `production` por padrão).                                                                                                    |
| `npm run build:prod`                 | `vite build --mode production` (sem o `tsc` prévio).                                                                                                                               |
| `npm run preview`                    | Serve o `dist/` localmente.                                                                                                                                                        |
| `npm run lint`                       | ESLint (`--max-warnings 0`).                                                                                                                                                       |
| `npm run typecheck`                  | TypeScript estrito sem gerar arquivos.                                                                                                                                             |
| `npm run test:run` / `test:coverage` | Executa a suite Vitest uma vez, com ou sem relatório de cobertura.                                                                                                                 |
| `npm run audit`                      | Bloqueia vulnerabilidades de severidade alta ou crítica.                                                                                                                           |
| `npm run quality`                    | Gate completo: lint, tipos, testes/cobertura, builds, formatação e auditoria.                                                                                                      |
| `npm run format` / `format:check`    | Prettier write / check.                                                                                                                                                            |

## 6. Configuração da API (base URL, variáveis de ambiente & proxy)

A base URL do axios é resolvida uma única vez em
[`src/services/api.ts`](src/services/api.ts) (`getApiBaseUrl`):

1. **`VITE_API_BASE_URL`**, se definida — **vence sempre**; senão
2. **fallback por hostname:** `172.25.32.42` → `http://172.25.32.42:5000`;
   `localhost`/`127.0.0.1` → `http://localhost:5000`; qualquer outro → **mesma origem**
   (`window.location.origin`).

Este front expõe **uma única variável de ambiente**, tipada em
[`src/vite-env.d.ts`](src/vite-env.d.ts). Os arquivos `.env` versionados no repo (o Vite
carrega por modo; `.env.local` e `.env.*.local` estão no `.gitignore`):

| Arquivo                                | Carregado em                                              | Valor de `VITE_API_BASE_URL` |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| [`.env.example`](.env.example)         | **nunca** — é o modelo para copiar em `.env`/`.env.local` | `http://localhost:5000`      |
| [`.env.development`](.env.development) | `npm run dev` e builds `--mode development`               | `http://localhost:5100`      |
| [`.env.production`](.env.production)   | `npm run build` e `npm run build:prod`                    | `http://172.25.32.42:5000`   |

> **Consequência prática do item 1:** como `.env.development` **define** a variável, no
> `npm run dev` o axios chama a API por **URL absoluta** — ou seja, o **proxy `/api` do Vite
> não é exercitado** nesse caminho. O proxy segue configurado em
> [`vite.config.ts`](vite.config.ts) apontando para `http://172.25.32.42:5000`.

> ⚠️ **Inconsistência conhecida (documentada, não resolvida):** há **três** destinos de API
> circulando no repo — `.env.development` (`localhost:5100`), o fallback de `api.ts`
> (`localhost:5000`) e o proxy do Vite / `.env.production` (`172.25.32.42:5000`). Definir a
> porta canônica de dev e externalizar o IP de produção são pendências em aberto
> (ver [roadmap](#roadmap-de-documentação--qualidade)).

**CORS:** a API .NET (repo separado) precisa liberar a origin deste front — `http://localhost:3000`
no `npm run dev` e `http://localhost:8081` quando o build estático é servido pelo IIS em dev.
Detalhes nos comentários de [`.env.example`](.env.example).

Todas as chamadas carregam o header **`X-Correlation-ID`**, gerado no front
([`src/utils/correlation.ts`](src/utils/correlation.ts)) e injetado por um interceptor do
`apiClient`, para rastreio ponta a ponta.

## 7. Arquitetura do front

```
src/
├── main.tsx                 # bootstrap: RouterProvider
├── routes.tsx               # rotas: / (→ /upload), /upload, /analysis, /admin
├── vite-env.d.ts            # tipagem de import.meta.env (VITE_API_BASE_URL)
├── layouts/MainLayout.tsx   # shell: <Outlet/> + guarda (/analysis sem parse volta p/ /upload)
├── components/
│   ├── upload/              # LayoutCombobox, ParseErrorBanner
│   ├── analysis/            # AnalysisModeTabs, DocumentSummary, StructureTree, FieldDisplay,
│   │                        # FieldSearch, FieldProperties, LineProperties,
│   │                        # XmlTransformationDisplay
│   ├── admin/               # AdminPage (4 abas), MonitoringTab, LayoutValidationTab
│   ├── aiMetrics/           # AiMetricsPanel (aba "Métricas IA" do Admin)
│   ├── layout/              # LayoutParserPage — página em "L" (upload + análise); usada
│   │                        # pelas rotas /upload e /analysis e pela aba Processamento
│   └── shared/              # Button, Modal, Tabs
├── store/                   # Zustand (ver tabela abaixo)
├── services/
│   ├── api.ts               # apiClient (axios) + parseService + base URL + ParseRequestError
│   ├── api/layoutService.ts          # catálogo de layouts + refresh de cache
│   ├── api/transformationService.ts  # disponibilidade de mapper e candidatos de transformação
│   ├── api/xmlAnalysisService.ts     # diagnóstico de falha de validação via IA
│   ├── api/monitoringService.ts      # análise/validação de layouts (Admin)
│   ├── api/aiMetricsService.ts       # métricas de IA (Admin) — back-end ainda não implementou
│   ├── api/logService.ts             # envia logs do front p/ a API (fire-and-forget)
│   └── cache/layoutCache.ts          # cache de layouts em localStorage (TTL 1h)
├── types/                   # api.ts, layout.ts, field.ts, structure.ts,
│                            # transformation.ts, aiMetrics.ts, clientLog.ts
└── utils/                   # correlation.ts, layoutGuid.ts, treeBuilder.ts
```

> **Nota de estado real:** `shared/Button`, `shared/Modal`, `analysis/FieldProperties` e
> `analysis/LineProperties` existem no repo mas **não são importados por nenhum componente
> hoje** — estão listados por honestidade, não como parte do fluxo ativo. `shared/Tabs` é
> usado por `AnalysisModeTabs`.

**Stores Zustand:**

| Store                    | Responsabilidade                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAppStore`            | Upload (progresso, `uploadError` de validação local e `parseError` já classificado) + `parseResult`, `fields`, `txtContent`, `selectedLayout`. |
| `useLayoutStore`         | Catálogo de layouts: lista completa, lista filtrada, índice selecionado e estado de busca.                                                     |
| `useFieldStore`          | Campos e grupos de campos, campo selecionado e destaques.                                                                                      |
| `useStructureStore`      | Árvore de estrutura: nós, expansão/colapso e nó selecionado.                                                                                   |
| `usePropertiesStore`     | Painel de propriedades (campo **ou** linha selecionada).                                                                                       |
| `useSearchStore`         | Busca de campos: resultados e navegação entre ocorrências.                                                                                     |
| `useTransformationStore` | Modo de análise ativo, disponibilidade de mapper, candidatos de transformação e diagnóstico de IA.                                             |
| `useAiMetricsStore`      | Métricas de IA do Admin (resumo + gerações). Enquanto o back-end não implementar os endpoints, estado de erro é o **esperado**.                |

**Convenções:** um componente por pasta com seu `.css` ao lado (`Foo.tsx` + `Foo.css`);
imports via alias `@/`; tipos em `src/types`; chamadas HTTP só na camada `services`.

## 8. Contrato com a API (endpoints consumidos)

| Método | Endpoint                                               | Origem no front                                         | Retorno                                                                                                                         |
| ------ | ------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/parse/upload`                                    | `parseService.parseFiles`                               | `ParseResponse` (campos, `lineValidations`, `documentStructure`, `validationErrors`)                                            |
| `GET`  | `/api/layoutdatabase/mqseries-nfe`                     | `layoutService.searchLayouts`                           | `LayoutSearchResponse`                                                                                                          |
| `POST` | `/api/layoutdatabase/refresh-cache`                    | `layoutService.refreshCache`                            | `{ success, message? }`                                                                                                         |
| `GET`  | `/api/mapperdatabase/by-input/{layoutGuid}`            | `transformationService.checkMapperAvailability`         | Disponibilidade do mapeador                                                                                                     |
| `POST` | `/api/transformationexecution/execute-candidates`      | `transformationService.executeTransformationCandidates` | Candidatos com o XML transformado                                                                                               |
| `POST` | `/api/transformationexecution/execute`                 | `transformationService.executeTransformation`           | Transformação de candidato único — **existe no service, mas nenhum componente o chama hoje**                                    |
| `POST` | `/api/xml-analysis/diagnose-validation-error`          | `xmlAnalysisService.diagnoseValidationError`            | Diagnóstico de falha via IA/Ollama                                                                                              |
| `GET`  | `/api/monitoring/layouts-analysis`                     | `monitoringService.getLayoutsAnalysis`                  | `MonitoringResponse`                                                                                                            |
| `GET`  | `/api/monitoring/layout-validations?forceRevalidation` | `monitoringService.getLayoutValidations`                | `LayoutValidationsResponse`                                                                                                     |
| `POST` | `/api/logs/client`                                     | `logService.info/warn/error`                            | Logs do front. _Fire-and-forget_: falha é engolida para não derrubar o fluxo. **Contrato ainda não confirmado com o back-end.** |
| `GET`  | `/api/ai-metrics/summary`                              | `aiMetricsService.getSummary`                           | `AiMetricsSummary` — **endpoint ainda não implementado no back-end**                                                            |
| `GET`  | `/api/ai-metrics/generations`                          | `aiMetricsService.getGenerations`                       | `AiGenerationsResponse` — **endpoint ainda não implementado no back-end**                                                       |

`POST /api/parse/upload` usa **`multipart/form-data`** com os campos: `layoutFile` (File),
`txtFile` (File), e os opcionais `layoutName`, `layoutType`, `layoutConfig` (JSON). Os
contratos completos estão em [`src/types/api.ts`](src/types/api.ts).

**Conteúdo do layout (`decryptedContent` × `valueContent`):** a interface `Layout`
([`src/types/layout.ts`](src/types/layout.ts)) declara os dois campos porque a API devolve o
**mesmo conteúdo** sob nomes diferentes conforme a resposta do catálogo. O consumo real em
[`src/components/layout/LayoutParserPage.tsx:131`](src/components/layout/LayoutParserPage.tsx)
tenta `decryptedContent` primeiro e **cai em `valueContent`**; se nenhum dos dois vier, o
layout completo é rebuscado na API. Um `layoutGuid` "zerado" no catálogo é tratado à parte por
[`src/utils/layoutGuid.ts`](src/utils/layoutGuid.ts) — o GUID vindo do parse tem prioridade
sobre o do catálogo.

**Falhas de parse** são classificadas em `ParseRequestError` (`parse_error` para HTTP 422,
`server_error` para os demais status, `network_error` quando não houve resposta), preservando
`detectedType` e `X-Correlation-ID` para exibição em `ParseErrorBanner`.

Na transformação multi-candidato, o front envia `inputContent`, `layoutName` e o
`layoutGuid` devolvido pelo parse (com fallback para o catálogo). Também envia strings vazias
nos campos de tipo/saída não aplicáveis, pois o model binding da API os exige. A rota sem hífen
foi validada em runtime contra a API local; `/api/transformation-execution/...` retorna `404`.
O XML exportado é sempre o conteúdo bruto retornado pela API — a indentação existe apenas para
leitura em tela.

## 9. Fluxo do usuário

`/upload` e `/analysis` renderizam **a mesma página** (`LayoutParserPage`, layout em "L"):
upload à esquerda, resultado à direita. `/analysis` é apenas um estado — sem `parseResult`
bem-sucedido, `MainLayout` redireciona de volta para `/upload`.

```
/upload  ─ escolhe layout no catálogo (LayoutCombobox, cache localStorage 1h)
         ─ anexa o TXT → parseService.parseFiles() → ParseResponse → useAppStore
         └ falha? ParseErrorBanner (422 = documento x 5xx = servidor x rede)

mesma página, após o parse:
         ─ DocumentSummary (resumo do documento)
         ─ AnalysisModeTabs
             ├ "TXT Posicional"          → StructureTree (treeBuilder) + FieldDisplay
             │                             linhas inválidas destacadas em vermelho
             └ "XML Transformação Final" → só existe se houver Mapper para o layoutGuid
                                           gerar candidatos → escolher → copiar/baixar XML
                                           falhou a validação? → diagnóstico via IA

/admin   ─ Processamento (a mesma LayoutParserPage)
         ─ Monitoramento (MonitoringTab)
         ─ Validação de Layouts (LayoutValidationTab — erros de tamanho de linha)
         └ Métricas IA (AiMetricsPanel — back-end ainda não implementado)
```

## 10. Deploy

`npm run build` gera `dist/`. Há artefatos para múltiplos hosts (todos com fallback SPA):

- **IIS:** [`public/web.config`](public/web.config) (copiado para `dist/` no build).
- **Apache:** [`.htaccess`](.htaccess).
- **Static hosts (Netlify-like):** [`public/_redirects`](public/_redirects).
- **CI de pull request:** [`.github/workflows/quality.yml`](.github/workflows/quality.yml) — executa todos os gates em runner GitHub hospedado.
- **CI/deploy:** [`.github/workflows/ci-dev.yml`](.github/workflows/ci-dev.yml) e [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — um deploy só começa depois de todos os gates passarem; gestão é do `@lp-devops`.

## 11. Harness de IA (Claude Code)

Este repo tem um harness enxuto em [`.claude/`](.claude/) — agentes, regras, comandos e a
conexão com o **MCP Server** da API. Comece por [`.claude/CLAUDE.md`](.claude/CLAUDE.md) e
[`.claude/README.md`](.claude/README.md).

## 12. Contexto acadêmico

Este front é base para um **trabalho de faculdade** (sistema web com back e front separados,
framework de lab e regras de negócio complexas). Veja a análise de aderência ao enunciado em
[`.claude/README.md`](.claude/README.md#aderência-ao-trabalho-da-faculdade).

### Roadmap de documentação & qualidade

- [x] Suite inicial de testes (Vitest + React Testing Library), cobertura e gate unificado.
- [ ] Migrar React Router 6 para 7; a mudança é incompatível e elimina os dois avisos
      moderados restantes de `npm audit`, por isso deve ser tratada em PR próprio.
- [ ] Externalizar a base URL de produção (hoje há IP hardcoded em `api.ts`/`vite.config.ts`).
- [ ] Unificar o destino da API em dev — hoje `.env.development` (`:5100`), fallback de
      `api.ts` (`:5000`) e proxy do Vite (`172.25.32.42:5000`) discordam entre si
      (ver [seção 6](#6-configuração-da-api-base-url-variáveis-de-ambiente--proxy)).
- [x] `.env.example` documentando `VITE_API_BASE_URL` (e a origin que a API precisa liberar via CORS).
- [ ] Diagrama de componentes da árvore de estrutura.
