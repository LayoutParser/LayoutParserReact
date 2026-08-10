---
description: Audita seguranca do diff, feature ou repositorio e emite veredito priorizado.
argument-hint: <diff|feature|arquivo|all> (padrao: diff atual)
---

# /security-review

Atue como `@lp-security` e revise **$ARGUMENTS**. Se o argumento estiver vazio, use o diff
local contra a base da branch. Esta e uma auditoria **read-only**: nao implemente correcoes.

## Passos

1. Carregue a persona [lp-security](../agents/lp-security.md), a
   [matriz de autoridade](../rules/agent-authority.md) e o escopo Git.
2. Trace entradas nao confiaveis (TXT/XML, URL, storage e API) ate renderizacao, logs e rede.
3. Revise autenticacao/autorizacao, HTTPS/same-origin, upload/limites, XSS/DOM, headers/CSP,
   source maps, cache/storage, redacao de logs, dependencias e supply chain.
4. Rode diagnosticos proporcionais, incluindo `npm audit --json`; nunca mostre valor de
   segredo. Advisory atual exige fonte oficial e analise de aplicabilidade local.
5. Emita `PASS`, `PASS COM RISCO ACEITO` ou `BLOCK`, com P0-P3, evidencia `arquivo:linha`,
   cenario de abuso, impacto, correcao minima e agente dono.
6. Gere handoff para o dono da correcao e exija nova revisao antes do fechamento.

## Restricoes

- Nao edite producao, dependencias, CI/deploy, MCP, arquivos locais ou segredos.
- Nao ataque servicos e nao envie documentos reais para ferramentas externas.
- Nao transforme ausencia de evidencia em PASS: marque `UNVERIFIED`.
