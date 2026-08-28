# Rastreabilidade TXT ↔ XML / TXT ↔ XML traceability

## Status

Implementado no front para o contrato entregue em `LayoutParserApi/develop` pelas issues #138 e
#141. A integração usa os mappings embutidos em
`POST /api/transformationexecution/execute-candidates`; o endpoint isolado `field-mappings` não é
necessário para a experiência principal porque não devolve o mesmo envelope de candidato/XML e
namespaces.

> **EN:** Implemented against the contract delivered by API issues #138 and #141. The UI uses
> mappings embedded in `execute-candidates`, keeping the candidate, generated XML and namespaces
> in one response.

## Regras de integridade

1. O resultado processado pertence a uma proveniência imutável: nome/tamanho/data do documento e
   GUID/nome/versão do layout.
2. Trocar documento ou layout limpa parse, edição, candidatos e navegação vinculada. Edições
   pendentes exigem confirmação.
3. A identidade física de campo prioriza
   `lineGuid + occurrence + fieldGuid + startPosition + length`; o fallback usa nomes,
   `lineSequence`, ocorrência e coordenadas. O valor nunca participa da identidade.
4. Um target XML é resolvido por XPath com namespace, tipo de nó e ocorrência 1-based. O resolvedor
   aceita wrapper estrutural (por exemplo, `nfeProc`) por correspondência de sufixo de caminho
   completo; não compara somente `localName` e não usa o valor do nó.
5. `sectionMappings` representa linha/seção. Sua `lineOccurrence` não é usada como ocorrência
   física para seleção ou edição.
6. O wire de parse é normalizado antes de entrar no store: `ParsedField.start` vira
   `startPosition`; a largura física vem do `LengthField` do layout, porque `ParsedField.length`
   pode ser zero em campos vazios; o valor original é preservado em `parsedLength` para casar o
   contrato de `fieldMappings`, e GUIDs também são recuperados da definição estrutural.
7. `isAggregatedOccurrence=true` ou `occurrence=0` representa valor lógico concatenado, não uma
   ocorrência física. Essas entradas não aparecem na régua TXT nem podem ser editadas.
8. Sequenciais de seis dígitos podem se repetir. A linha é resolvida pela combinação
   `lineSequence + código de linha (posições 7–9) + ocorrência`, sem busca pelo valor.

## Estados do contrato

| Campo             | `null` ou ausente                                      | `[]`                              | Lista preenchida              |
| ----------------- | ------------------------------------------------------ | --------------------------------- | ----------------------------- |
| `fieldMappings`   | Pathway sem suporte ou composição isolada indisponível | Compatível, sem vínculo resolvido | Navegação campo a campo       |
| `sectionMappings` | Pathway sem suporte                                    | Compatível, sem seção resolvida   | Navegação estrutural de bloco |

A fronteira HTTP normaliza temporariamente enums numéricos ou textuais e propriedades nulas
omitidas pelo serializer atual da API. O modelo interno do front continua usando nomes semânticos
(`Direct`, `BestEffort`, `Text`, etc.); números não são tratados como contrato permanente.

## Acessibilidade e interação

- Clique/toque seleciona e abre o inspetor; editar exige o botão **Editar valor**.
- **Ver no XML** troca de aba, expande somente ancestrais, centraliza e focaliza o target.
- **Ver no TXT** retorna à ocorrência física correta e restaura o foco.
- A árvore XML oferece elementos, atributos e texto como `treeitem`, com roving focus e setas.
- A régua TXT mantém uma única entrada de `Tab`; setas navegam dentro/entre linhas e
  `Ctrl+Home`/`Ctrl+End` alcançam os extremos do documento.
- No mobile, o inspetor reutiliza o modal em formato bottom sheet e cada ocorrência oferece uma
  lista vertical de campos com alvos de 44 px.

## Limitação de validação

`fieldMappings` passou por validação estrutural com fixtures sintéticas. A comparação valor a valor
de pelo menos 20 documentos reais contra o `LowCodeRunner.exe` não foi executada porque esse runner
depende de Windows/x86 e interop nativo. A UI, portanto, usa os rótulos **Declarado no mapeador** e
**Melhor estimativa**, nunca “validado”, e sempre apresenta `limitations[]` quando disponível.

> **EN:** Field mappings have structural fixture coverage but have not yet been compared value by
> value against at least 20 real executions of the Windows-only LowCodeRunner. The UI therefore
> labels confidence as **Declared by mapper** or **Best effort**, never as production-validated.
