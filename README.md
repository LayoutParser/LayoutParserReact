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
6. [Configuração da API](#6-configuração-da-api-base-url--proxy)
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
- tem uma área **Admin** com monitoramento e validação dos layouts cadastrados.

## 2. Ecossistema de projetos

O LayoutParser é dividido em 4 repositórios. **A API é o hub / fonte da verdade.**

| Repo | Papel |
|------|-------|
| **LayoutParserApi** | API ASP.NET Core (.NET 10). Orquestra parse, cache (Redis), IA e transformação. Fonte da verdade. |
| **LayoutParserLib** | Criptografia Sysmiddle (DLL referenciada pela API). |
| **LayoutParserDecrypt** | `.exe` de descriptografia (processo externo chamado pela API). |
| **LayoutParserReact** *(este)* | Front-end Vite + React. |

```
┌──────────────────┐   HTTP (axios)   ┌──────────────────┐   DLL / .exe   ┌────────────────────┐
│ LayoutParserReact │ ───────────────► │  LayoutParserApi  │ ─────────────► │ Lib / Decrypt      │
│  (este repo)      │   X-Correlation  │  (.NET 10, hub)   │                │ (cripto Sysmiddle) │
└──────────────────┘                  └──────────────────┘                └────────────────────┘
                                              │ Redis / SQL / Ollama
                                              ▼
```

## 3. Stack

| Camada | Tecnologia |
|--------|-----------|
| Build/dev | **Vite 5** (`type: module`) |
| UI | **React 18.2** + **react-router-dom 6.20** (`createBrowserRouter`) |
| Linguagem | **TypeScript 5.2** (strict, `noUnusedLocals`/`noUnusedParameters`) |
| Estado | **Zustand 4.4** (5 stores) |
| HTTP | **Axios 1.6** (instância única + interceptor de `X-Correlation-ID`) |
| Qualidade | **ESLint 8** + **Prettier 3** |
| Aliases | `@/*` → `src/*` (vite + tsconfig) |

> Ainda **não há suite de testes** (sem Vitest/RTL). Ver [roadmap](#roadmap-de-documentação--qualidade).

## 4. Como rodar

Pré-requisitos: **Node 18+** e a **API rodando** (default `http://localhost:5000`).

```bash
npm install
npm run dev          # http://localhost:3000  (proxy /api → API)
```

## 5. Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Vite dev server na porta **3000** com proxy `/api`. |
| `npm run build` | `tsc` (type-check) **e** `vite build` → `dist/`. |
| `npm run build:prod` | Build em modo `production`. |
| `npm run preview` | Serve o `dist/` localmente. |
| `npm run lint` | ESLint (`--max-warnings 0`). |
| `npm run format` / `format:check` | Prettier write / check. |

## 6. Configuração da API (base URL & proxy)

A base URL é resolvida em [`src/services/api.ts`](src/services/api.ts):

1. `VITE_API_BASE_URL` (variável de ambiente), se definida; senão
2. por hostname: `172.25.32.42` → `http://172.25.32.42:5000`; `localhost`/`127.0.0.1` →
   `http://localhost:5000`; senão **mesma origem** (`window.location.origin`).

Em desenvolvimento, o Vite faz **proxy** de `/api` para `http://172.25.32.42:5000`
(ver [`vite.config.ts`](vite.config.ts) — ajuste para seu back-end local se necessário).

Todas as chamadas carregam um header **`X-Correlation-ID`** gerado no front
([`src/utils/correlation.ts`](src/utils/correlation.ts)) para rastreio ponta a ponta.

## 7. Arquitetura do front

```
src/
├── main.tsx                 # bootstrap: RouterProvider
├── routes.tsx               # rotas: /upload, /analysis, /admin
├── layouts/MainLayout.tsx   # shell (header/nav + <Outlet/>)
├── components/
│   ├── upload/              # UploadSection, LayoutCombobox, LayoutSearch
│   ├── analysis/            # AnalysisSection, DocumentSummary, FieldDisplay,
│   │                        # FieldProperties, FieldSearch, LineProperties, StructureTree
│   ├── admin/               # AdminPage, MonitoringTab, LayoutValidationTab
│   ├── layout/              # LayoutParserPage (página principal upload+analysis)
│   └── shared/              # Button, Modal, Tabs
├── store/                   # Zustand (ver tabela abaixo)
├── services/
│   ├── api.ts               # axios + parseService + base URL
│   ├── api/layoutService.ts # catálogo de layouts + refresh de cache
│   ├── api/monitoringService.ts # análise/validação de layouts (Admin)
│   └── cache/layoutCache.ts # cache de layouts em localStorage (TTL 1h)
├── types/                   # api.ts, layout.ts, field.ts, structure.ts
└── utils/                   # correlation.ts, treeBuilder.ts (monta a árvore)
```

**Stores Zustand:**

| Store | Responsabilidade |
|-------|------------------|
| `useAppStore` | Estado de upload (progresso/erro) + `parseResult`, `fields`, `txtContent`, `selectedLayout`. |
| `useLayoutStore` | Catálogo de layouts e layout selecionado. |
| `useFieldStore` | Seleção/estado dos campos exibidos. |
| `usePropertiesStore` | Painel de propriedades (linha/campo selecionado). |
| `useSearchStore` | Busca/filtro de campos e layouts. |

**Convenções:** um componente por pasta com seu `.css` ao lado (`Foo.tsx` + `Foo.css`);
imports via alias `@/`; tipos em `src/types`; chamadas HTTP só na camada `services`.

## 8. Contrato com a API (endpoints consumidos)

| Método | Endpoint | Origem no front | Retorno |
|--------|----------|-----------------|---------|
| `POST` | `/api/parse/upload` | `parseService.parseFiles` | `ParseResponse` (campos, `lineValidations`, `documentStructure`, `validationErrors`) |
| `GET` | `/api/layoutdatabase/mqseries-nfe` | `layoutService.searchLayouts` | `LayoutSearchResponse` |
| `POST` | `/api/layoutdatabase/refresh-cache` | `layoutService.refreshCache` | `{ success, message? }` |
| `GET` | `/api/monitoring/layouts-analysis` | `monitoringService.getLayoutsAnalysis` | `MonitoringResponse` |
| `GET` | `/api/monitoring/layout-validations?forceRevalidation` | `monitoringService.getLayoutValidations` | `LayoutValidationsResponse` |

`POST /api/parse/upload` usa **`multipart/form-data`** com os campos: `layoutFile` (File),
`txtFile` (File), e os opcionais `layoutName`, `layoutType`, `layoutConfig` (JSON). Os
contratos completos estão em [`src/types/api.ts`](src/types/api.ts).

## 9. Fluxo do usuário

```
/upload → seleciona/sobe layout + TXT → parseService.parseFiles()
        → ParseResponse → useAppStore
/analysis → DocumentSummary + StructureTree (treeBuilder) + FieldDisplay/Properties
          → linhas com validação inválida são destacadas em vermelho
/admin → MonitoringTab (análise de layouts) + LayoutValidationTab (erros de tamanho de linha)
```

## 10. Deploy

`npm run build` gera `dist/`. Há artefatos para múltiplos hosts (todos com fallback SPA):

- **IIS:** [`public/web.config`](public/web.config) (copiado para `dist/` no build).
- **Apache:** [`.htaccess`](.htaccess).
- **Static hosts (Netlify-like):** [`public/_redirects`](public/_redirects).
- **CI:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — gestão é do `@lp-devops`.

## 11. Harness de IA (Claude Code)

Este repo tem um harness enxuto em [`.claude/`](.claude/) — agentes, regras, comandos e a
conexão com o **MCP Server** da API. Comece por [`.claude/CLAUDE.md`](.claude/CLAUDE.md) e
[`.claude/README.md`](.claude/README.md).

## 12. Contexto acadêmico

Este front é base para um **trabalho de faculdade** (sistema web com back e front separados,
framework de lab e regras de negócio complexas). Veja a análise de aderência ao enunciado em
[`.claude/README.md`](.claude/README.md#aderência-ao-trabalho-da-faculdade).

### Roadmap de documentação & qualidade

- [ ] Suite de testes (Vitest + React Testing Library).
- [ ] Externalizar a base URL de produção (hoje há IP hardcoded em `api.ts`/`vite.config.ts`).
- [ ] `.env.example` documentando `VITE_API_BASE_URL`.
- [ ] Diagrama de componentes da árvore de estrutura.
