# Harness Claude Code — LayoutParser React

Harness **enxuto** para potencializar o uso de IA neste front-end. Inspirado no **AIOX**
(`aiox-core/.claude`) e alinhado ao harness da **LayoutParserApi** (mesmo estilo de agentes,
autoridade e handoff), porém reduzido ao que faz sentido para um app Vite/React/TS.

## Estrutura

```
.claude/
├── CLAUDE.md                 # guia principal (sempre carregado pelo Claude Code)
├── README.md                 # este arquivo
├── settings.json.example     # template: idioma + permissões + hooks (copie p/ settings.json)
├── agents/                   # 7 agentes sob medida
│   ├── lp-front-dev.md       # Remy  — implementação React/TS
│   ├── lp-ui-ux.md           # Nina  — UI/UX, componentes, acessibilidade
│   ├── lp-qa.md              # Quinn — quality gates, validação, testes
│   ├── lp-security.md        # Iris  — auditoria de segurança read-only
│   ├── lp-contract-qa.md     # Cora  — contrato API/front read-only
│   ├── lp-doc.md             # Duda  — documentação bilíngue + acadêmica
│   └── lp-devops.md          # Gage  — git push, build/deploy, conexão MCP
├── rules/
│   ├── agent-authority.md    # quem pode o quê (push/MCP/CI = @lp-devops)
│   ├── agent-handoff.md      # compactação de contexto ao trocar de agente
│   ├── frontend-standards.md # padrões React/TS/Zustand derivados do código
│   └── mcp-usage.md          # como conectar ao MCP Server da API
├── commands/
│   ├── new-component.md      # /new-component <feature>/<Nome>
│   ├── wire-endpoint.md      # /wire-endpoint <METHOD> <caminho>
│   ├── security-review.md    # /security-review <escopo>
│   └── contract-sync.md      # /contract-sync <endpoint|domínio|all>
├── hooks/
│   ├── git-push-advisory.cjs       # lembrete NÃO-bloqueante de autoridade de push
│   ├── protect-sensitive-paths.cjs # bloqueio determinístico de caminhos perigosos
│   └── fast-feedback.cjs           # Prettier + Vitest relacionado após edição em src
└── agent-memory/<agente>/MEMORY.md   # memória durável por agente
```

As personas equivalentes para Codex ficam em [`.codex/agents`](../.codex/agents), inclusive
`lp-security.toml` e `lp-contract-qa.toml`. Os comandos são os dois workflows canônicos; no
Codex, invoque a persona equivalente e siga o arquivo em `commands/` como runbook.

> Há também um [`.mcp.json.example`](../.mcp.json.example) na **raiz** do repo (conexão ao MCP).

## Como ativar

1. **Settings:** `cp .claude/settings.json.example .claude/settings.json` (idioma PT + allowlist + hook).
2. **MCP (opcional, via `@lp-devops`):** buildar o MCP na API, copiar `.mcp.json.example` →
   `.mcp.json`, ajustar o caminho da DLL. Ver [`rules/mcp-usage.md`](rules/mcp-usage.md).
3. **Usar agentes:** `@lp-front-dev`, `@lp-ui-ux`, `@lp-qa`, `@lp-security`,
   `@lp-contract-qa`, `@lp-doc`, `@lp-devops`.

## Hooks de segurança e feedback rápido

- `protect-sensitive-paths.cjs` bloqueia `Write/Edit` em `.git`, lockfiles e configurações
  locais/credenciais reais. Também barra comandos shell obviamente mutantes contra esses
  alvos. A saída usa código 2, portanto o bloqueio vale mesmo com bypass de permissões.
- `.env.example`, `.env.development` e `.env.production` permanecem editáveis por serem
  configuração pública versionada. Valores `VITE_*` chegam ao browser e **nunca devem conter
  segredo**.
- Lockfiles continuam atualizáveis por `npm`, `pnpm`, `yarn` ou `bun`; somente edição manual
  é bloqueada.
- `fast-feedback.cjs` atua apenas em `src/**/*.{ts,tsx,css}`: formata o arquivo alterado e,
  para TS/TSX, executa Vitest relacionado com timeout curto. Falha gera contexto ao agente,
  mas não substitui `npm run quality`.
- Os hooks são Node puro, resolvem caminhos físicos e não dependem de sintaxe Bash para
  localizar o projeto, mantendo compatibilidade com Windows.

## Fluxo típico

```
@lp-contract-qa (confere contrato) → @lp-front-dev (implementa)
→ @lp-ui-ux (refina UI) → @lp-security (audita) → @lp-qa (valida)
→ @lp-doc (documenta) → @lp-devops (push, quando você pedir)
```

## Princípios herdados do AIOX/Api (adaptados)

- **Autoridade de push é exclusiva** de um agente (`@lp-devops`).
- **Handoff compacto** (~400 tokens) ao trocar de agente.
- **better-context (btca)** para libs externas (fonte real > docs desatualizadas).
- **Verdade > marketing** na documentação; pendências sinalizadas, não escondidas.

---

## Aderência ao trabalho da faculdade

> Enunciado: _"sistema web que use **node como base**, separado em **back e front**, usando
> **qualquer framework** dos passados em lab, com **regras de negócio complexas**; enviar em
> repositório git e apresentar."_

| Critério                        | Status          | Observação                                                                                                           |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Separado em **back e front**    | ✅              | React em `src/`, BFF Node em `server/` e API .NET de domínio em repo distinto.                                       |
| **Framework** de lab            | ✅ (front)      | React — confirme se está na lista de lab.                                                                            |
| **Regras de negócio complexas** | ✅✅            | Parsing posicional, layouts XML, validação de linha/posição, geração XSLT/TCL, cripto Sysmiddle. Sobra complexidade. |
| **Git + apresentação**          | ✅              | Já é um repo git.                                                                                                    |
| **"Node como base"**            | ✅ com ressalva | O front e o BFF são Node; a API de domínio continua em .NET.                                                         |

**Conclusão:** atende com ressalva. O BFF Node/Fastify já existe e separa front/back, mas as
regras mais complexas (parsing, XSLT/TCL, layouts e criptografia) permanecem na API .NET. Na
apresentação, trate o BFF como fronteira de autenticação, autorização, limites e orquestração;
confirme com o professor se a exigência permite regras complexas em um serviço de domínio de
outra stack. Reimplementar o parser em Node apenas para a disciplina criaria duplicação e risco.
