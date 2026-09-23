---
name: project-197-history-contract-update-2026-09-21
description: PBI #197 (histórico de análises fiscais) reaberto com contrato revisado da API (LayoutParserApi#366); Blocked→In Progress; pergunta de visão compartilhada de workspace em aberto
metadata:
  type: project
---

Em 2026-09-21, `@lp-front-dev` reportou que a API (LayoutParserApi) entregou um contrato
revisado para histórico de análises fiscais em **LayoutParserApi#366** (mesclado em
`develop`, ainda não em produção — falta definir pasta de armazenamento no servidor).

O PBI #197 deste repo (`[PBI] Histórico seguro de análises fiscais por workspace`) já
existia e estava `Blocked` desde 2026-09-16 por causa de um endpoint diferente e inexistente
(`GET /api/workspaces/{workspaceId}/projects/{projectId}/analyses`, sem `projectId` real na
API — DRIFT confirmado por contract-qa). O novo contrato **substitui** essa tentativa:

- Opt-in via `workspaceId` opcional em `POST /api/parse/upload` e `/auto` (sem afetar quem
  não usa).
- `analysisId` + `historyRegistered` na resposta quando aplicável; falha/timeout de 5s no
  registro não bloqueia a análise.
- Endpoints: `GET /api/workspaces/{workspaceId}/analyses` (lista), `.../analyses/{analysisId}`
  (detalhe), `.../files/{fileId}` (download), `DELETE .../analyses/{analysisId}` (204).
- Só o dono vê a própria análise (outro membro recebe 404, não 403); retenção de 90 dias;
  catálogo (`/auto`) só guarda `layoutGuid`+nome, sem copiar XML; 503 não bloqueia a análise.

Ação tomada: #197 movido de `Blocked` para `In Progress` no Project #3 (front já começou a
implementar em branch própria, em paralelo ao bloqueio de infra da API). Comentário
detalhado com o contrato, o estado (API pronta em develop/bloqueada em produção por infra) e
a pergunta em aberto foi adicionado em
https://github.com/LayoutParser/LayoutParserReact/issues/197#issuecomment-5761958047.

**Pergunta de produto NÃO decidida, registrada como aberta em #197**: hoje só o dono vê a
própria análise (visão individual). Se o produto quiser visão compartilhada por todo o
workspace, isso exige decisão explícita do dono do produto + mudança de contrato na API
(404 para não-dono é comportamento intencional atual, não bug).

Reavaliação de critérios de aceite de #197 à luz do novo contrato: confirmados analysisId
durável, lista paginada, modo metadata-only do catálogo, exclusão/retenção auditável;
ainda não confirmados: filtros por tipo fiscal e reabertura com proveniência de
layout/versão — validar quando a implementação do front avançar, antes de fechar o PBI.

**Why:** evita duplicar issue para o mesmo PBI e mantém #197 como single source of truth do
histórico de análises fiscais, mesmo com o contrato de API tendo mudado de forma
(endpoint sem `projectId`, sem reabertura garantida ainda).

**How to apply:** ao sincronizar próximos avanços de `@lp-front-dev` neste PBI, atualizar
#197 (não criar novo item); só fechar após validação dos critérios de aceite pendentes e
promoção da API para produção (bloqueio de infra citado acima).
