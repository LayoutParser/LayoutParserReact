---
description: Padrões de código e convenções do front-end LayoutParser React (Vite/React/TS/Zustand).
---

# Frontend Standards — LayoutParser React

Padrões **derivados do código existente** — siga o que já está lá, não reinvente.

## Stack & tooling

- **Vite 5** (`type: module`), **React 18.2**, **react-router-dom 6.20** (`createBrowserRouter`),
  **Zustand 4.4**, **Axios 1.6**. **TS 5.2 strict** (`noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`).
- Alias **`@/`** → `src/` (configurado em `vite.config.ts` e `tsconfig.json`). Use-o.

## Estrutura

```
components/<feature>/Foo.tsx + Foo.css   # um componente por pasta, CSS ao lado
store/use*Store.ts                       # Zustand, um store por domínio
services/                                # ÚNICA camada que fala HTTP com a API
types/                                   # contratos (api.ts, layout.ts, field.ts, structure.ts)
utils/                                   # correlation.ts, treeBuilder.ts
```

## Regras

1. **HTTP só em `services/`.** Componentes e stores nunca importam `axios`. Reuse a instância
   `apiClient` de [`src/services/api.ts`](../../src/services/api.ts) — ela já injeta `X-Correlation-ID`.
2. **Tipos primeiro.** Todo payload tem tipo em `src/types`. **Não introduza `any` novo**
   (há resquícios herdados — não amplie; reduza quando puder).
3. **Estado:** Zustand por domínio; **derive**, não duplique estado entre stores. `reset()` deve voltar ao `initialState`.
4. **Componentes:** PascalCase; props tipadas; estados de loading/vazio/erro explícitos.
   Reuse `components/shared` (Button, Modal, Tabs) antes de criar markup novo.
5. **Erros de API:** padrão `axios.isAxiosError(error)` → mensagem amigável (ver `parseService`).
6. **Comentários:** PT-BR, objetivos, só onde o porquê não é óbvio.
7. **Imports:** externos antes de locais; use `@/` em vez de `../../..`.

## Quality gates (sempre antes de concluir)

```bash
npm run lint            # --max-warnings 0
npx tsc --noEmit
npm run format:check
npm run build           # tsc && vite build
```

## better-context (btca)

Antes de assumir API de lib externa (React Router, Zustand, Axios, Vite), **consulte a fonte
real** via btca em vez de docs possivelmente desatualizadas:

```bash
btca ask --resource zustand --question "como tipar o create() com middleware?"
btca ask --resource react-router --question "data router: como tratar errorElement?"
```

## Pendências conhecidas (não esconder)

- IP de produção **hardcoded** em `api.ts` e `vite.config.ts` (`172.25.32.42:5000`) — externalizar via `VITE_API_BASE_URL`.
- **Sem suite de testes** — proposta: Vitest + React Testing Library.
- `any` residual em alguns pontos de `services`/tipos.
