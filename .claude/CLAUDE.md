# CLAUDE.md — LayoutParser React (Front-end)

Este arquivo configura o comportamento do Claude Code ao trabalhar neste repositório.
Inspirado no harness **AIOX**, alinhado ao harness da **LayoutParserApi**, porém **enxuto e
focado no stack front-end (Vite + React + TypeScript)**.

> **Idioma:** responda ao usuário em **português (PT-BR)**. Documentação de produto é
> **bilíngue (PT/EN)** — ver `@lp-doc`.

---

## 1. O que é este projeto

Front-end **Vite + React 18 + TypeScript** do ecossistema **LayoutParser**. O usuário sobe um
arquivo **TXT** (+ opcionalmente um **layout XML**); a **API .NET** processa e devolve um
**mapeamento do documento** (linhas, campos, posições e validações) que este app renderiza
como **árvore de estrutura**. Este repo é **só apresentação** — nenhuma regra de parsing roda
aqui. É o **front** de um ecossistema de 4 repos (a **API é o hub / fonte da verdade**):

| Repo | Papel |
|------|-------|
| **LayoutParserApi** | API .NET 10. Orquestra parse, cache, IA, transformação. Fonte da verdade. |
| **LayoutParserLib** | Criptografia Sysmiddle (DLL). |
| **LayoutParserDecrypt** | `.exe` de descriptografia. |
| **LayoutParserReact** *(este)* | Front-end Vite + React. |

Contexto completo: [`README.md`](../README.md). Contrato consumido: [`src/types/api.ts`](../src/types/api.ts).

---

## 2. Stack & estrutura (resumo)

- **Vite 5** (porta 3000, proxy `/api`), **React 18.2**, **react-router-dom 6.20**, **Zustand 4.4**, **Axios 1.6**.
- **TS strict** com `noUnusedLocals`/`noUnusedParameters`; alias `@/*` → `src/*`.
- Camadas: `components/` (por feature) · `store/` (Zustand) · `services/` (HTTP, **único lugar** que fala com a API) · `types/` · `utils/`.
- Detalhe: [`.claude/rules/frontend-standards.md`](rules/frontend-standards.md).

---

## 3. Sistema de Agentes (enxuto)

Ative com `@agent-name` ou via `Task` tool. Personas alinhadas ao harness da API.

| Agente | Persona | Escopo principal |
|--------|---------|------------------|
| `@lp-front-dev` | **Remy** | Implementação React/TS: componentes, stores, services, rotas, build. |
| `@lp-ui-ux` | **Nina** | Componentes reutilizáveis, CSS por componente, acessibilidade, fluxo UX. |
| `@lp-qa` | **Quinn** | Quality gates do front (lint, type-check, format), validação de fluxo, testes. |
| `@lp-doc` | **Duda** | Documentação bilíngue (README, comentários, material acadêmico). |
| `@lp-devops` | **Gage** | `git push` (EXCLUSIVO), build/deploy (Vite/IIS/CI), **conexão ao MCP** da API. |

### Regra de autoridade (resumo)
- **Apenas `@lp-devops` faz `git push`** e gerencia MCP/CI/deploy. Demais agentes: `git add/commit` local apenas.
- `@lp-qa` **valida e dá veredito**; a correção volta para `@lp-front-dev` (QA não implementa fix de produção).
- Detalhe: [`.claude/rules/agent-authority.md`](rules/agent-authority.md).

### Handoff entre agentes
Ao trocar de agente, compacte o contexto anterior num artefato (~400 tokens): tarefa atual,
branch, decisões-chave, arquivos tocados, próximo passo. Protocolo:
[`.claude/rules/agent-handoff.md`](rules/agent-handoff.md).

---

## 4. Padrões de Código (React/TS) — resumo

Detalhe completo em [`.claude/rules/frontend-standards.md`](rules/frontend-standards.md).

- **HTTP só na camada `services/`.** Componentes e stores **não** chamam `axios` direto.
- **Tipos primeiro:** todo payload de API tem tipo em `src/types`. Não use `any` novo (há resquícios — não amplie).
- **Estado:** Zustand por domínio; não duplique estado entre stores. Derive, não copie.
- **Componente:** um por pasta com seu `.css` ao lado; nomeie em PascalCase; props tipadas.
- **Imports:** use o alias `@/`; ordene externos antes de locais.
- **Erros de API:** trate via o padrão já presente (`axios.isAxiosError`) e propague mensagem amigável.
- **CorrelationId:** nunca remova o interceptor de `X-Correlation-ID` em [`src/services/api.ts`](../src/services/api.ts).
- **Comentários:** PT-BR, no estilo já presente no código.

---

## 5. Quality Gates (antes de concluir)

```bash
npm run lint            # ESLint, --max-warnings 0
npx tsc --noEmit        # type-check (o build roda tsc && vite build)
npm run build           # deve compilar sem erros
npm run format:check    # Prettier
```

- Não conclua uma tarefa com **lint/type-check/build quebrado**.
- Mudou contrato com a API? Atualize `src/types` + o README (delegue a `@lp-doc`).
- Mexeu em fluxo crítico (upload/parse/árvore)? Valide manualmente no `npm run dev` (não há testes ainda).

---

## 6. Git & Commits

- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Trabalhe em branch (`feat/*`, `fix/*`); **não** comite direto na `main` sem pedido.
- **Push só por `@lp-devops`** e só quando o usuário pedir.

---

## 7. Otimização Claude Code

| Tarefa | Use | Não use |
|--------|-----|---------|
| Buscar conteúdo | `Grep` | `grep`/`rg` no bash |
| Ler arquivos | `Read` | `cat`/`head`/`tail` |
| Editar | `Edit` | `sed`/`awk` |
| Buscar arquivos | `Glob` | `find` |

- Chamadas independentes em **paralelo** num só turno.
- Shell primário: **PowerShell** (Windows); Bash também disponível.
- **better-context (btca):** ao mexer com libs externas (React Router, Zustand, Axios, Vite),
  prefira consultar o **código-fonte real** via btca a confiar em docs desatualizadas.
  Ex.: `btca ask --resource zustand --question "..."`. Ver [`rules/frontend-standards.md`](rules/frontend-standards.md).

---

## 8. MCP — conectar à API

O **MCP Server é da API** (C#, `LayoutParserApi/mcp/LayoutParserMcp/`) e expõe parse/catálogo
como *tools*. Este front **não cria** MCP — apenas **conecta** a ele. Para habilitar: copie
[`.mcp.json.example`](../.mcp.json.example) para `.mcp.json` (na raiz), buildando antes o MCP
da API. **Gestão de MCP é exclusiva do `@lp-devops`**. Regras: [`rules/mcp-usage.md`](rules/mcp-usage.md).

---

*LayoutParser React · Claude Code harness v1 · enxuto, focado em Vite/React/TS*
