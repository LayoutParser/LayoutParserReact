---
name: project-mapping-studio-connect-us-adr-wait
description: Story #267 e API#425 aguardando ADR interno da API; contrato proposto precisa ser validado pelo front ANTES da implementação
metadata:
  type: project
---

LayoutParserReact#267 ("Mapping Studio: árvore dupla estilo Connect-Us") permanece `Blocked`
no Project #3, bloqueada por LayoutParserApi#425 (endpoint de árvore completa de layout por
GUID). Em 2026-09-16 a API atualizou o status (não é pedido novo): escopo corrigido — #425 é
leitura de UM mapeador Sysmiddle já identificado (mapperGuid conhecido), devolvendo as duas
árvores completas (hierarquia, atributos, sequências, cardinalidade, nós de regra), no padrão
Connect-Us. Isso é diferente de LayoutParserApi#417 (catálogo/descoberta de mappers por
workspace), que é um gap separado e independente.

A API vai abrir um **ADR interno antes de implementar** (desenho de serviço novo — parser
offline existente reconstrói a árvore com GUID estável por nó, mas falta cardinalidade e
integração com produção; há também um problema de design a resolver: `sourceRefs`/`targetRefs`
não têm formato único entre engines — TCL usa string livre, só Sysmiddle usa GUID real de nó).

**Why:** o pedido nosso foi explícito — quando o contrato proposto chegar (formato do nó,
cardinalidade, regras), precisa ser **validado por nós antes** da API implementar, não depois,
para evitar retrabalho dos dois lados. Isso foi registrado em comentário em API#425.

**How to apply:** quando a API sinalizar que o ADR/contrato está pronto, NÃO tratar como "pode
fechar #267" nem deixar a validação passar batido — abrir revisão de contrato (viabilidade de
UI, paridade com Connect-Us, formato dos nós) antes de autorizar a API a implementar. Até lá,
#267 continua Blocked, sem ação nossa pendente. Ver também
[[project_mapping_studio_connect_us_tree_2026_09_16]] para o histórico original da criação da
Story.

Evidência: comentários em
https://github.com/LayoutParser/LayoutParserReact/issues/267#issuecomment-5698603799 e
https://github.com/LayoutParser/LayoutParserApi/issues/425#issuecomment-5698605766.
