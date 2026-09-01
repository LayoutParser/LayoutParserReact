# Plataforma fiscal, workspaces e autoria assistida — 31/08/2026

## Decisão

O LayoutParser permanece nichado em documentos fiscais brasileiros: NF-e, CT-e, MDF-e, NFS-e e
NFCom. A autoria assistida usa amostras + layout + Excel + XSD/gabarito para gerar TCL/XSL/XSLT.
Sysmiddle é estritamente execução/explicação read-only; nunca editar, converter ou publicar.

## Governança criada

- Milestone `P0 — Plataforma Fiscal e Workspaces` nos repositórios React e API.
- Front: Epic #195; base #196–#200; autoria #201–#204; gates Sysmiddle/FIAT #205–#206.
- API: identidade/workspaces #225/#228; explicabilidade #226/#227; autoria principal #103 e
  decomposição #229–#232.
- Itens adicionados aos Projects #3 e #2; #196 e API #225 estão In Progress.
- API #94 e #103 foram referenciadas como dependências existentes, sem duplicação.

## Arquitetura

Principal OIDC imutável (`provider + tenant/issuer + subject`) resolve `UserId` interno na API;
nome/e-mail não são chave. Histórico fiscal não vai para localStorage. Todos os motores convergem
para `MappingExplanation`, mas apenas TCL/XSL/XSLT possuem capability de autoria. A IA gera
`MappingDraftRule`; humano aceita/edita antes de compilar e testar.

Documentos: `docs/architecture/fiscal-document-platform.md`,
`docs/product/fiscal-platform-roadmap.md`,
`docs/product/ai-assisted-fiscal-mapping-studio.md` e
`docs/contracts/fiscal-workspace-and-mapping-explanation-api.md`.

## Atualização — Slices 3 a 5

- API #238/#240/#243 entregaram Draft, explicação, compilação e Test Lab individual.
- Front integrou revisão humana, explicação multi-engine, release e Test Lab na branch
  `codex/feat-mapping-studio-slices-3-5`.
- #199, #202 e #204 avançam para validação parcial; não fechar enquanto faltarem resposta livre
  persistida, inventário/catálogo navegável, suites versionadas, runner TCL e correção das
  capabilities/explicação da release na API #231.
- #205 pode ser validada: a UI não cria controle de autoria/compile para Sysmiddle e os serviços de
  mutação aceitam somente `tcl|xslt`.
