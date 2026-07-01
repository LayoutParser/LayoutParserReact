# Harness Claude Code — LayoutParser React

Harness **enxuto** para potencializar o uso de IA neste front-end. Inspirado no **AIOX**
(`aiox-core/.claude`) e alinhado ao harness da **LayoutParserApi** (mesmo estilo de agentes,
autoridade e handoff), porém reduzido ao que faz sentido para um app Vite/React/TS.

## Estrutura

```
.claude/
├── CLAUDE.md                 # guia principal (sempre carregado pelo Claude Code)
├── README.md                 # este arquivo
├── settings.json.example     # template: language + permissions + hook (copie p/ settings.json)
├── agents/                   # 5 agentes sob medida
│   ├── lp-front-dev.md       # Remy  — implementação React/TS
│   ├── lp-ui-ux.md           # Nina  — UI/UX, componentes, acessibilidade
│   ├── lp-qa.md              # Quinn — quality gates, validação, testes
│   ├── lp-doc.md             # Duda  — documentação bilíngue + acadêmica
│   └── lp-devops.md          # Gage  — git push, build/deploy, conexão MCP
├── rules/
│   ├── agent-authority.md    # quem pode o quê (push/MCP/CI = @lp-devops)
│   ├── agent-handoff.md      # compactação de contexto ao trocar de agente
│   ├── frontend-standards.md # padrões React/TS/Zustand derivados do código
│   └── mcp-usage.md          # como conectar ao MCP Server da API
├── commands/
│   ├── new-component.md      # /new-component <feature>/<Nome>
│   └── wire-endpoint.md      # /wire-endpoint <METHOD> <caminho>
├── hooks/
│   └── git-push-advisory.cjs # lembrete NÃO-bloqueante de autoridade de push
└── agent-memory/<agente>/MEMORY.md   # memória durável por agente
```

> Há também um [`.mcp.json.example`](../.mcp.json.example) na **raiz** do repo (conexão ao MCP).

## Como ativar

1. **Settings:** `cp .claude/settings.json.example .claude/settings.json` (idioma PT + allowlist + hook).
2. **MCP (opcional, via `@lp-devops`):** buildar o MCP na API, copiar `.mcp.json.example` →
   `.mcp.json`, ajustar o caminho da DLL. Ver [`rules/mcp-usage.md`](rules/mcp-usage.md).
3. **Usar agentes:** `@lp-front-dev`, `@lp-ui-ux`, `@lp-qa`, `@lp-doc`, `@lp-devops`.

## Fluxo típico

```
@lp-front-dev (implementa) → @lp-ui-ux (refina UI) → @lp-qa (valida)
→ @lp-doc (documenta) → @lp-devops (push, quando você pedir)
```

## Princípios herdados do AIOX/Api (adaptados)
- **Autoridade de push é exclusiva** de um agente (`@lp-devops`).
- **Handoff compacto** (~400 tokens) ao trocar de agente.
- **better-context (btca)** para libs externas (fonte real > docs desatualizadas).
- **Verdade > marketing** na documentação; pendências sinalizadas, não escondidas.

---

## Aderência ao trabalho da faculdade

> Enunciado: *"sistema web que use **node como base**, separado em **back e front**, usando
> **qualquer framework** dos passados em lab, com **regras de negócio complexas**; enviar em
> repositório git e apresentar."*

| Critério | Status | Observação |
|----------|--------|------------|
| Separado em **back e front** | ✅ | React (front) + API .NET (back), repos distintos. |
| **Framework** de lab | ✅ (front) | React — confirme se está na lista de lab. |
| **Regras de negócio complexas** | ✅✅ | Parsing posicional, layouts XML, validação de linha/posição, geração XSLT/TCL, cripto Sysmiddle. Sobra complexidade. |
| **Git + apresentação** | ✅ | Já é um repo git. |
| **"Node como base"** | ⚠️ **Atenção** | O **front é Node** (Vite/React/TS) ✅. Mas o **back é .NET (C#), não Node** ❌. |

**Conclusão:** atendido **em parte**. O ponto crítico é *"node como base"*. Há 3 caminhos:

1. **Confirmar o escopo com o professor** — se "node como base" se refere ao projeto/front
   (que é Node) e um back em outra stack é aceito, então **está atendido**. *(Mais barato — pergunte primeiro.)*
2. **Back Node como BFF** — criar um back **Node** (Express/Fastify/NestJS) que faz proxy/
   orquestra a API .NET; mover/duplicar parte das regras de negócio para o Node satisfaz
   "node base + back e front + regras complexas". *(Esforço médio — trabalho de outro chat.)*
3. **Back Node completo** — reimplementar a lógica de parsing em Node. *(Esforço alto; a lógica madura está em .NET.)*

Recomendação: **opção 1** (confirmar) e, se exigirem Node no back, **opção 2** (BFF Node) —
reaproveita 100% deste front e a maior parte da API existente.
