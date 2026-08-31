# Plataforma fiscal, workspaces e mappings explicáveis — 31/08/2026

## Decisão

O LayoutParser permanece nichado em documentos fiscais brasileiros: NF-e, CT-e, MDF-e, NFS-e e
NFCom. TXT/MQSeries/IDoc/XML/JSON e TCL/XSLT/Sysmiddle são formatos/motores do domínio, não o
posicionamento do produto.

## Governança criada

- Milestone `P0 — Plataforma Fiscal e Workspaces` nos repositórios React e API.
- Front: Epic #195; PBIs #196–#199; gate cross-repo #200.
- API: identidade/workspaces #225; explicabilidade TCL/XSLT #226; spike Sysmiddle #227; gate de
  isolamento #228.
- Itens adicionados aos Projects #3 e #2; #196 e API #225 estão In Progress.
- API #94 e #103 foram referenciadas como dependências existentes, sem duplicação.

## Arquitetura

Principal OIDC imutável (`provider + tenant/issuer + subject`) resolve `UserId` interno na API;
nome/e-mail não são chave. Histórico fiscal não vai para localStorage. TCL/XSLT/Sysmiddle convergem
para `MappingExplanation`, com níveis authoritative/best_effort/opaque/unsupported.

Documentos: `docs/architecture/fiscal-document-platform.md`,
`docs/product/fiscal-platform-roadmap.md` e
`docs/contracts/fiscal-workspace-and-mapping-explanation-api.md`.
