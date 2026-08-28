# Pedido à equipe da API .NET — mapeamento campo TXT ↔ tag XML no Mapper Sysmiddle

> **Status em 2026-08-28:** contrato entregue pela API e consumido pelo front. Consulte
> [`../features/txt-xml-traceability.md`](../features/txt-xml-traceability.md) para a especificação
> implementada. Este documento permanece como registro do pedido original.

## 1. Contexto

O PBI #128 do Epic #126 ("Vínculo bidirecional TXT↔XML") está **bloqueado**. A feature
precisa, para cada campo do TXT que o usuário está navegando na árvore de estrutura, saber
qual nó/atributo do XML gerado corresponde a ele (e vice-versa) — para destacar e rolar até o
elemento correspondente ao clicar, no mesmo padrão que `StructureTree.tsx` já usa hoje para
destacar campos dentro do próprio TXT (ver `src/store/useFieldStore.ts`).

O plano de UI para essa feature já está desenhado em
[`docs/proposals/txt-xml-linked-navigation.md`](./txt-xml-linked-navigation.md) (seção 3),
mas está parado na seção 2 desse documento: falta um contrato de API que exponha esse
mapeamento.

`@lp-contract-qa` já investigou o campo que pareceria ser o candidato natural para isso —
`TransformationCandidate.segmentMappings: Record<string, string>` — e confirmou, por
inspeção read-only via MCP, veredito **DRIFT**: esse campo está sempre vazio em runtime real,
tanto no pathway `sysmiddle` quanto no `tcl-xsl` (os dois únicos que
`POST /api/transformationexecution/execute-candidates` usa hoje). Existe lógica na API
(`MqSeriesToXmlTransformer`) que preenche algo parecido, mas com granularidade de **linha
inteira** (não campo) e destino XML fixo/hardcoded — desconectada do endpoint atual.
Evidência completa: `.claude/agent-memory/lp-contract-qa/project_segmentmappings_dead_field.md`
(neste repo, LayoutParserReact).

## 2. A pista concreta

O usuário indicou que a lógica de mapeamento campo→tag pode já existir, só que não como
resposta HTTP — como **configuração interna do Mapper Sysmiddle**, no XML de definição
(`MapperVO`) que o Mapper usa para transformar TXT em XML. Ele apontou dois campos dentro de
cada `Rule`:

- `MapperVO/Rules/Rule/TargetElementGuid` — identificaria o elemento/atributo de **destino**
  no XML gerado.
- `MapperVO/Rules/Rule/ContentValue` — identificaria de onde vem o valor de **entrada** (o
  campo do TXT).

### O que consegui confirmar por inspeção direta

Tive acesso a uma amostra real (não sintética) desse XML de configuração, em
`LayoutParserApi/.claude/tmp/New folder/Resultados.csv` (repositório irmão, fora do escopo
deste front — mencionado aqui só como evidência de que a estrutura abaixo é real, não
suposição). Inspecionei o conteúdo e confirmo:

- Cada `MapperVO` tem `MapperGuid`, `Name`, `InputLayoutGuid`, `TargetLayoutGuid` e uma lista
  `Rules/Rule`. No exemplo inspecionado, `Name = MAP_MQSERIES_SEND_ENV_TXT_XML_NFE` (mapper de
  NFe), com 25 `Rule` na lista.
- Cada `Rule` tem bem mais campos do que só os dois citados pelo usuário:
  `ElementGuid`, `Description`, `Sequence`, `ParentElement`, `Name`, `IsRequired`,
  `ContentValue`, `TargetElementGuid`, `DataTypeGuid`, `IsStaticValue`, `StaticValue`,
  `IsPositionalGroupRepetition`, `IsSequential`, `MinimalOccurrence`, `MaximumOccurrence`,
  `IsPrePosRule`, `AcceptEmpty`, `IsCaseSensitiveValue`, `IsContainsAttribute`,
  `IsToValidateFieldLesserLength`, `IsToValidateLengthCharacters`, `LimitOfCaracters`,
  `RemoveWhiteSpaceType`, `AlignmentType`, `InitialValue`, `StartValue`, `IncrementValue`,
  `LengthField`, `IsUseCData`, `NotRealizeParser`, `CreateOnlyChildren`, entre outros, além de
  `Elements` (parece indicar sub-regras/grupo aninhado, não confirmei o shape completo).
- **`TargetElementGuid` NÃO é um XPath legível** — é um GUID interno prefixado por tipo de
  elemento do layout de destino: vi os prefixos `ATT_*` (atributo), `TAG_*` (tag/elemento),
  `GRT_*` e `SEQ_*` (parecem grupo/sequência) nos 48 valores distintos da amostra. Ou seja,
  para virar um XPath usável no front (`/enviNFe/NFe/infNFe/@Id`, como já cogitado na seção 2
  de `txt-xml-linked-navigation.md`), esse GUID precisaria ser **resolvido contra o layout de
  destino** (`TargetLayoutGuid`) — presumo que exista um catálogo/schema desse layout na API
  que sabe traduzir `TAG_xxx` → caminho real, mas não confirmei isso pelo lado do front.
- **`ContentValue` NÃO é "o nome do campo TXT de origem"** — é um **script** numa DSL própria
  do Mapper, com variáveis, condicionais, funções (`GetLength`, `ConcatString`,
  `CalculateVerifierDigit`, `DateTimeNow`, `Substring`, `IsNullOrEmpty`, etc.) e referências a
  campos de entrada e saída dentro do próprio corpo do script, no padrão `I.<Linha>/<Campo>`
  para entrada (ex. `I.LINHA000/ChaveAcesso`, `I.LINHA001/CodigoDaUFDoEmitente001`) e
  `T.<caminho>` para atribuição de saída (ex.
  `T.enviNFe/NFe/infNFe/Id = ConcatString('NFe', $.buildChaveAcesso)`) — inclusive um único
  `Rule` pode ler **múltiplos** campos de entrada, aplicar transformação/concatenação, e
  escrever em mais de um destino dentro do mesmo script condicional. No exemplo inspecionado
  (`Regra_chaveDeAcesso`), a lógica calcula um dígito verificador e monta a chave de acesso a
  partir de até três campos de entrada diferentes, dependendo do tamanho do valor.

Isso muda a expectativa: não é um mapeamento simples 1 campo → 1 tag armazenado em dois
atributos planos. É uma regra executável, e o "campo de origem" real pode estar em qualquer
lugar dentro do texto do script (`I.LINHA.../Campo`), não só no valor de `ContentValue` como
um todo.

### O que eu NÃO consegui confirmar (peço à equipe da API)

- Não tive acesso às DLLs da Sysmiddle (nem tentei abri-las — são binários .NET, análise fora
  do meu alcance como agente do front). O usuário indicou que a lógica de como esse
  `MapperVO` é carregado e executado em runtime reside nelas. Preciso que a equipe da API
  **decompile/inspecione essas DLLs via código-fonte próprio** para confirmar:
  - Como o `TargetElementGuid` (`TAG_`/`ATT_`/`GRT_`/`SEQ_`) é resolvido para um caminho real
    do XML de saída em runtime — existe uma tabela/catálogo acessível programaticamente?
  - Se, ao processar `I.LINHA000/ChaveAcesso` dentro do `ContentValue`, o motor do Mapper
    resolve isso para o mesmo `fieldGuid`/identidade de campo que a API já expõe hoje no
    contrato de layout do TXT (`Field.fieldGuid`, `src/types/field.ts` no front) — ou se é uma
    referência textual solta, sem GUID estável.
  - Se esse `MapperVO` (ou uma versão parseada/executada dele) já está carregado em memória
    durante a chamada de `execute-candidates` no pathway `sysmiddle` — o que abriria caminho
    para a API emitir o mapeamento como efeito colateral da própria execução, em vez de
    precisar reprocessar o XML de configuração à parte.
- Não tive acesso a nenhum outro `MapperVO` além do exemplo de NFe (`MAP_MQSERIES_SEND_ENV_TXT_XML_NFE`,
  25 regras). Não sei se a estrutura acima (script em `ContentValue`, GUID tipado em
  `TargetElementGuid`) é constante entre todos os mappers do catálogo ou se varia por layout.

## 3. Pedido específico

1. **Confirmar/detalhar a estrutura real do `MapperVO`** usada em produção — os campos que
   listei acima batem com o schema real? Existe documentação interna ou é preciso ler o
   código-fonte da Sysmiddle?
2. **Analisar as DLLs da Sysmiddle** para entender:
   - Como `TargetElementGuid` é resolvido para um caminho de XML utilizável (XPath ou
     equivalente) em runtime.
   - Como o motor de execução do `ContentValue` (a DSL de script) resolve referências
     `I.<Linha>/<Campo>` para os campos de entrada reais — e se dá para extrair essa
     referência de forma confiável sem reimplementar o interpretador da DSL.
   - Se esse processamento já acontece durante `execute-candidates` (pathway `sysmiddle`) e,
     se sim, se o resultado (par origem→destino resolvido) pode ser capturado e devolvido no
     contrato HTTP.
3. **Avaliar viabilidade de expor isso como novo campo aditivo** no contrato de
   `execute-candidates`, retomando a proposta `fieldMappings` esboçada em
   [`docs/proposals/txt-xml-linked-navigation.md`](./txt-xml-linked-navigation.md) (seção 2) —
   ajustando o shape conforme o que for confirmado nos itens acima (por exemplo, pode ser
   necessário 1 `Rule` → N `FieldToXmlMapping`, já que uma regra pode combinar múltiplos
   campos de entrada).

## 4. Perguntas em aberto (adaptadas do documento anterior, agora à luz do `MapperVO`)

- **Granularidade real:** um `Rule` do Mapper corresponde a um campo de saída (visto no
  exemplo: `ParentElement` parece indicar o campo/grupo de destino), mas o `ContentValue` pode
  referenciar vários campos de entrada dentro do script. O contrato novo deveria expor
  "1 regra → todos os campos de entrada que ela lê" (N:1) em vez de assumir 1:1?
- **`TargetElementGuid` é resolvível de forma estável?** É um GUID fixo por definição de
  layout de destino (ou seja, dá pra montar um catálogo `GUID → XPath` uma vez e reusar), ou
  pode mudar entre execuções/versões do mapper?
- **Grupos repetidos:** `IsPositionalGroupRepetition`, `MinimalOccurrence`,
  `MaximumOccurrence` já aparecem nos campos do `Rule` — sugere que o próprio Mapper já lida
  com cardinalidade. Isso é suficiente para a API emitir o índice de ocorrência
  (`xmlNodeOccurrence`, já cogitado no documento anterior) junto com o mapeamento, ou fica a
  cargo do front inferir isso do XML de saída?
- **Regras com valor estático:** vi `IsStaticValue`/`StaticValue` entre os campos do `Rule` —
  para essas regras não há campo de entrada do TXT (o valor é fixo). O contrato precisa deixar
  isso explícito (`txtFieldGuid: null`) para a UI não tentar destacar um campo que não existe?
- **Cobertura:** o `MapperVO` inspecionado é específico do pathway `sysmiddle` (nome
  `MAP_MQSERIES_SEND_ENV_TXT_XML_NFE`). O pathway `tcl-xsl` usa a mesma estrutura de mapper ou
  é totalmente diferente (XSLT puro, sem `MapperVO`)? Se for diferente, o campo novo pode
  precisar ser opcional/nulo nesse pathway.

## 5. O que este documento NÃO afirma

Esta é uma pista a ser **confirmada e detalhada pela equipe da API**, não uma solução pronta.
Em particular: não afirmo que `TargetElementGuid` seja diretamente utilizável como XPath (ao
contrário — a evidência sugere que precisa de resolução adicional), e não afirmo que
`ContentValue` identifica um único campo de origem (a evidência mostra que é uma DSL de script
que pode ler múltiplos campos com lógica condicional). O objetivo é evitar que o front
reinvente heurística frágil sobre isso — a decisão de como (e se) expor esse mapeamento
continua sendo da API/Mapper.

---

_Investigação: amostra real de `MapperVO` inspecionada em
`LayoutParserApi/.claude/tmp/New folder/Resultados.csv` (repositório irmão, fora deste front).
Nenhuma DLL da Sysmiddle foi aberta/analisada — fora do alcance de um agente do front-end.
Contexto de contrato: `.claude/agent-memory/lp-contract-qa/project_segmentmappings_dead_field.md`.
Plano de UI dependente: [`docs/proposals/txt-xml-linked-navigation.md`](./txt-xml-linked-navigation.md)._
