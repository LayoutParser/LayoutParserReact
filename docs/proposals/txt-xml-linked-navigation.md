# Plano — Navegação vinculada bidirecional TXT ↔ XML (estilo XMLSpy)

## 1. Estado atual (o que já existe)

**Exibição do XML hoje** — `src/components/analysis/XmlTransformationDisplay.tsx`:

- Dispara `POST /api/transformationexecution/execute-candidates` via `transformationService.executeTransformationCandidates` (`src/services/api/transformationService.ts`).
- Renderiza o XML transformado num `<textarea readOnly>` (linha ~427), só formatado por `formatXmlForDisplay` — é texto puro, sem parsing em nós/DOM, sem seleção estrutural, sem qualquer link para o TXT.
- Ações disponíveis: copiar, baixar, trocar candidato (sysmiddle vs tcl-xsl), diagnosticar erro com IA. Nada de destaque cruzado.

**Exibição do TXT hoje** — `src/components/analysis/FieldDisplay.tsx` + `StructureTree.tsx`:

- Já existe uma **infra de seleção/destaque de campo já pronta e reaproveitável**:
  - `useFieldStore.highlightField(fieldId)` seta um `Set<string>` de campos destacados (`src/store/useFieldStore.ts`).
  - `fieldId` é `"{lineName}_{fieldName}"` (ver `FieldDisplay.tsx:47` e `getFieldById` no store).
  - `StructureTree.tsx` já faz `highlightField(fieldId)` + `scrollIntoView({ behavior: 'smooth', block: 'center' })` num `setTimeout` cancelável (linhas ~161–174 e ~208–219) — é exatamente o padrão de "clicar em algo e navegar/destacar o campo correspondente" que a feature nova precisaria só invertida (de XML → TXT).
  - `FieldDisplay.tsx.handleFieldClick` seleciona o campo e abre o editor posicional.
- Ou seja: **o lado TXT já resolve "campo → destaque/scroll" internamente.** Falta o lado XML (que hoje nem é parseado em nós) e falta a ponte entre os dois.

**Contrato atual da API (o que já carrega, mesmo que parcial):**

- `TransformationCandidate.segmentMappings: Record<string, string>` (`src/types/transformation.ts:61`) — **existe no contrato, está tipado, mas está 100% não utilizado no front** (grep confirma zero uso fora do tipo e de um teste que só passa `{}`). O comentário do arquivo não documenta a chave/valor desse `Record` — shape não descrito, nunca validado contra uma resposta real recheada (o comentário do topo do arquivo diz que o contrato foi "validado contra um ambiente de integração", mas não há evidência de que `segmentMappings` alguma vez veio populado).
  - **Atualização (confirmado por `@lp-contract-qa` em investigação read-only via MCP, veredito DRIFT):** `segmentMappings` está **sempre vazio** em runtime real, tanto no pathway `sysmiddle` quanto no `tcl-xsl` — os únicos dois que `execute-candidates` de fato usa. Existe código na API (`MqSeriesToXmlTransformer`) que já preenche algo parecido, mas com granularidade de **linha inteira** (não campo) e destino XML **fixo/hardcoded**, desconectado do endpoint atual. Evidência completa em `.claude/agent-memory/lp-contract-qa/project_segmentmappings_dead_field.md`.
- `DocumentValidationError.targetXPath?: string | null` (`src/types/api.ts:253`) — existe, mas é um campo de **erro de validação**, não de mapeamento de sucesso; é preenchido (quando preenchido) só no contexto de um erro reportado, com o comentário explícito de que os campos de identidade de campo "virão SEMPRE `null` até existir validação escopada a campo" (`api.ts:245-250`).
- Nenhum tipo hoje representa "para o documento X, o campo Y do TXT virou o nó Z do XML" de forma genérica e sempre presente.

**Conclusão do estado atual:** a UI trata o XML gerado como um blob opaco porque o contrato também o trata assim. `segmentMappings` já foi investigado e confirmado sempre vazio — não é uma peça esquecida de consumir, é um campo que a API nem preenche hoje no fluxo real.

## 2. O que falta vir da API/contrato

Isso **não é tarefa só do front**. Como `segmentMappings` já foi descartado por evidência real (DRIFT), a única via é formalizar pedido de contrato novo à equipe da API .NET / Mapper Sysmiddle.

Proposta de shape novo, aditivo e opcional (seguindo o padrão já usado em `failureCause`/`targetXPath` no repo — aditivo, nunca quebra consumidores existentes):

```ts
// Em TransformationCandidate, ao lado de segmentMappings:
fieldMappings?: FieldToXmlMapping[] | null;

interface FieldToXmlMapping {
  // Identidade do campo de origem no TXT — reaproveitar o MESMO formato de fieldId
  // já usado no front (`{lineName}_{fieldName}`) ou, melhor, o fieldGuid estável
  // que já existe no domínio (ver Field.fieldGuid em src/types/field.ts).
  txtFieldGuid: string | null;
  txtLineName: string;
  txtFieldName: string;
  txtStartPosition: number | null;
  txtLength: number | null;

  // Identidade do nó de destino no XML gerado.
  xmlPath: string; // XPath completo, ex: "/enviNFe/NFe/infNFe/@Id"
  xmlNodeOccurrence: number | null; // desambigua grupos repetidos (ver riscos, seção 5)

  // Confiança/origem do mapeamento, para não fingir certeza que a API não tem.
  mappingSource: 'sysmiddle-mapper' | 'inferred' | null;
}
```

Pontos que preciso que a API confirme antes de qualquer implementação no front:

- Isso vem por candidato (`TransformationCandidatesResponse.candidates[].fieldMappings`) ou é fixo por layout/mapper (poderia vir do catálogo de layout em vez de por execução)?
- É seguro assumir 1 XPath por campo, ou às vezes 1 campo alimenta N nós (ex. um campo TXT que vira parte de um valor concatenado, ou um valor que popula tanto um atributo quanto um elemento)?
- Grupos repetidos (NFe tem `det` por item, hierarquias tipo SAP IDoc vistas nos testes desta sessão) — o path é por índice de ocorrência (`/NFe/det[3]/prod/cProd`) ou só o path genérico sem posição (`/NFe/det/prod/cProd`), que aí seria ambíguo entre várias linhas do TXT do mesmo tipo?

Essa parte do plano é uma **pergunta a ser levada à API .NET / equipe do Mapper Sysmiddle**, não uma decisão do front. Não dá pra inferir isso com regex/heurística no XML — é frágil (namespaces, atributos vs elementos, grupos repetidos) e o CLAUDE.md deste repo proíbe o front assumir regra de domínio que pertence à API.

## 3. Abordagem de UI assumindo que o dado exista

Reaproveitar infraestrutura existente em vez de criar do zero:

- **Lado XML**: `XmlTransformationDisplay.tsx` precisa parar de renderizar o XML como `<textarea>` plano e passar a renderizar como árvore/DOM navegável — reaproveitando o padrão visual e de interação já usado por `StructureTree.tsx` (expand/collapse, destaque, scroll). Não precisa de parser de XML customizado do zero: usar `DOMParser` nativo do browser (já disponível, zero dependência nova) para montar uma árvore de nós a partir do XML string, e renderizar essa árvore com o mesmo componente visual (ou uma variante) do `StructureTree`.
- **Store novo ou extensão do `useTransformationStore`**: guardar `activeXmlMapping: FieldToXmlMapping[]` (derivado do candidato ativo) e `highlightedXmlNodeId: string | null` / reaproveitar o padrão de `Set<string>` do `useFieldStore` para o lado XML também, por simetria.
- **TXT → XML**: em `FieldDisplay.tsx`/`StructureTree.tsx`, no `handleFieldClick` existente (linha 53 do `FieldDisplay.tsx`), além do que já faz (seleciona campo, abre editor), também: procurar no `activeXmlMapping` a entrada cujo `txtFieldGuid`/`txtLineName+txtFieldName` bate com o campo clicado, e se achar, disparar um `highlightXmlNode(xmlPath)` na aba XML + scroll (mesmo padrão smooth/`setTimeout` cancelável já usado em `StructureTree.tsx:168-174`).
- **XML → TXT**: no componente de árvore XML novo, ao clicar num nó, procurar a entrada reversa do mapeamento e chamar `highlightField(fieldId)` do `useFieldStore` já existente — reaproveita 100% o destaque/scroll que `StructureTree` já usa hoje.
- **Cross-tab**: hoje TXT e XML provavelmente vivem em abas diferentes (`AnalysisModeTabs.tsx`). Precisa decidir se o clique troca de aba automaticamente ou se as duas ficam lado a lado numa visão split — decisão de UX, delegar a `@lp-ui-ux` quando a feature for viabilizada.
- **Estado "sem mapeamento para este campo"**: como o mapeamento pode ser parcial, a UI precisa de um estado neutro claro (campo sem correspondência não deveria parecer "quebrado", só "não mapeado").

## 4. Abordagem incremental — o que dá pra fazer HOJE vs. depois do contrato novo

**Sem contrato novo (com o que já existe):**

1. Trocar a exibição do XML de `<textarea>` para árvore navegável (via `DOMParser`) — isso já é uma melhoria de UX standalone, útil mesmo sem o link bidirecional (grupos repetidos, namespaces e atributos ficam mais legíveis que hoje). Pode ser entregue como PBI isolado, sem esperar a API.
2. Preparar a store/estado (`highlightedXmlNodeId`, hooks de destaque simétricos aos do `useFieldStore`) — infraestrutura que não depende do contrato ainda existir.

**Só depois do contrato novo:**

3. Ligar de fato o clique cruzado TXT ↔ XML usando os dados reais de mapeamento.
4. Tratar os casos de ambiguidade (grupos repetidos, campo→múltiplos nós) — só dá pra fazer isso direito depois de saber o shape real que a API entrega.

Recomendo abrir isso como um Epic com pelo menos 2 PBIs: "Árvore XML navegável (standalone)" (não bloqueado) e "Vínculo bidirecional TXT↔XML" (bloqueado até contrato novo), para não travar todo o trabalho esperando a API.

## 5. Riscos / complexidade

- **Namespaces XML**: NFe usa namespace default (`xmlns="http://www.portalfiscal.inf.br/nfe"`); `DOMParser` + XPath simples precisam considerar isso ou vão falhar silenciosamente ao tentar casar path com nó. `document.evaluate` com XPath exige um `NamespaceResolver` corretamente configurado.
- **Atributos vs elementos**: o exemplo de referência (`@Id`) já é atributo, não elemento — a árvore de exibição precisa diferenciar visualmente e o path (`xmlPath`) precisa ter uma convenção clara e documentada para atributo (`@nome`) vs elemento (`nome`).
- **Grupos repetidos / cardinalidade**: elementos como `det` (itens da NFe) ou hierarquias tipo SAP IDoc não têm correspondência 1:1 simples — um path genérico sem índice de ocorrência é ambíguo quando há N ocorrências da mesma linha no TXT. O `xmlNodeOccurrence` proposto na seção 2 tenta cobrir isso, mas precisa ser confirmado que a API consegue de fato emitir esse índice de forma consistente.
- **Campos que não mapeiam 1:1**: campo TXT pode ser concatenado/transformado antes de virar valor XML (ex. formatação de data, concatenação de dois campos num só valor) — nesses casos a correspondência é "aproximada" ou "múltiplos campos → um nó", e a UI precisa deixar isso explícito em vez de fingir precisão que não existe.
- **Performance**: parsear e re-renderizar uma árvore XML grande a cada clique de destaque pode pesar se não for memoizado — reaproveitar o padrão de `useMemo` já usado em `XmlTransformationDisplay.tsx` (`formattedXml`, `transformationDiagnostics`) para a árvore parseada.
- **Contrato instável entre candidato tcl-xsl vs sysmiddle**: o comentário em `transformation.ts:46-51` já avisa que os dois pathways têm shapes de resposta diferentes; é bem possível que `fieldMappings` só faça sentido para um dos dois pathways — não assumir que a feature funciona igual nos dois sem confirmar.

## 6. Critérios de aceite mínimos (para os PBIs)

**PBI 1 — Árvore XML navegável (standalone, não bloqueado):**

- O XML gerado é exibido como árvore expansível/colapsável em vez de `<textarea>` plano.
- Atributos e elementos são visualmente diferenciados.
- Performance aceitável para documentos NFe reais (com múltiplos itens `det`), sem travar a UI.
- Não quebra nenhuma ação existente (copiar, baixar, trocar candidato, diagnosticar erro).

**PBI 2 — Vínculo bidirecional TXT↔XML (bloqueado):**

- Clicar num campo do TXT destaca e rola até o nó XML correspondente, quando existir mapeamento.
- Clicar num nó do XML destaca e rola até o campo TXT correspondente, quando existir mapeamento.
- Campo/nó sem mapeamento correspondente tem estado visual neutro (não parece erro).
- Funciona corretamente com grupos repetidos (não destaca o nó errado entre múltiplas ocorrências).
- **Não pode iniciar implementação até a API confirmar/expor `fieldMappings` ou equivalente.**

## 7. Próximo passo recomendado

1. Formalizar o pedido de contrato novo (`fieldMappings`) para a equipe da API .NET / Mapper Sysmiddle, com base na seção 2 deste documento.
2. Com a resposta, abrir/refinar o PBI 2 com o shape real confirmado.
3. PBI 1 pode ser refinado e iniciado a qualquer momento, independente do contrato.

---

_Investigação original de código: `src/components/analysis/XmlTransformationDisplay.tsx`, `src/components/analysis/FieldDisplay.tsx`, `src/components/analysis/StructureTree.tsx`, `src/store/useFieldStore.ts`, `src/types/transformation.ts`, `src/types/api.ts`, `src/types/field.ts`, `src/services/api/transformationService.ts`. Verificação de contrato real: `@lp-contract-qa`, veredito DRIFT, evidência em `.claude/agent-memory/lp-contract-qa/project_segmentmappings_dead_field.md`._
