---
name: project-segmentmappings-dead-field
description: segmentMappings em TransformationCandidate está sempre vazio no runtime real; não usar como base para navegação vinculada TXT<->XML sem antes reabrir contrato com a API.
metadata:
  type: project
---

Investigação de 2026-08-15 (leitura de código-fonte da API, sem MCP conectado nesta sessão —
`.mcp.json` ausente/vazio no momento) sobre a hipótese de usar
`TransformationCandidate.segmentMappings` (`src/types/transformation.ts:61`,
`Record<string, string>`) como base para uma feature futura de navegação vinculada
bidirecional TXT posicional <-> XML gerado (estilo XMLSpy).

**Achado:** o campo está tipado mas nunca é populado nos dois pathways reais de
`POST /api/transformationexecution/execute-candidates`:

- `sysmiddle` (`LayoutParserApi/Controllers/TransformationExecutionController.cs:330-343`):
  candidato é montado sem atribuir `SegmentMappings` — fica no default vazio.
- `tcl-xsl` (`TransformationExecutionController.cs:482`): usa
  `pipelineResult.SegmentMappings` vindo de `TransformationPipelineService`, mas nenhuma
  linha desse serviço atribui a essa propriedade — fica `new()` (vazio).
- Existe um único código que preenche algo (`MqSeriesToXmlTransformer.TransformToXmlAsync`,
  `Services/XmlAnalysis/MqSeriesToXmlTransformer.cs:56-65`), mas: chave = número de LINHA do
  TXT (granularidade de segmento, não de campo individual), valor =
  `XmlElementPath = "NFe/infNFe"` **hardcoded fixo** para toda linha (não XPath real por
  campo). Além disso essa classe não é chamada por nenhum controller — está órfã do fluxo
  que o front consome.

**Why:** decide se a feature de navegação vinculada pode ser construída em cima do contrato
atual (`transformation.ts`) ou se precisa de trabalho de API antes. Investigação anterior do
`@lp-front-dev` só tinha confirmado "tipado mas não consumido no front"; esta investigação
adiciona "e também nunca populado no lado da API para os pathways reais".

**How to apply:** se `@lp-front-dev`/`@lp-product-manager` trouxerem de volta essa feature,
não implementar contra `segmentMappings` como está — é preciso abrir demanda de contrato
para a equipe da API (granularidade de campo, XPath real, remover o hardcode) antes de
qualquer trabalho de front. Revalidar via MCP/runtime real quando disponível, pois esta
investigação foi só leitura de código-fonte da API local, não teste end-to-end.
