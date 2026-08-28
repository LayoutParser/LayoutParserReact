---
name: positional-edit-multi-occurrence-investigation
description: Investigação (sem repro confirmada) de edição posicional concatenando ocorrências de uma mesma linha; mapa de onde olhar com dado real
metadata:
  type: project
---

Usuário reportou (2026-08-23): em `FieldDisplay`/`FieldEditor`, uma linha com múltiplas
ocorrências (ex. LINHA081, 4 ocorrências) aparece corretamente separada ("Ocorrência N") no
modo leitura, mas ao clicar para editar um campo dela, o valor inicial do `<input>` do
`FieldEditor` mostrava o texto de TODAS as ocorrências concatenado sem separador.

Investigação feita (sem acesso ao payload real / TXT do usuário):

- `src/components/analysis/FieldDisplay.tsx`: o modo leitura NUNCA lê `txtContent` bruto para
  montar o texto de cada campo — usa sempre `field.value` (do JSON da API), padded/truncado
  para `field.length`. Isso está confirmado correto e é o motivo de o modo leitura "esconder"
  problemas de `length` mal calculado (trailing padding não aparece visualmente).
- `src/utils/positionalFieldEdit.ts` (`inspectPositionalField`): a edição, ao contrário, faz
  fail-closed slicing direto do `txtContent` bruto usando
  `lineIndex*600 + (startPosition-1)` até `+expectedLength` (`field.length`), e SÓ libera
  edição se esse slice bater exatamente com `field.value` padded. Matematicamente
  `currentValue.length === expectedLength` sempre (é um `.slice()`), então o `<input>` não
  pode mostrar mais caracteres que `field.length` — qualquer garbled/concatenação observada
  não pode vir de overflow no componente em si.
- `src/utils/positionalFieldEdit.ts` (`resolvePositionalLineIndex`): para `lineSequence` de 3
  dígitos (o caso comum, linha identificada por número tipo "081"), resolve o índice físico da
  ocorrência N contando quantos blocos físicos de 600 chars têm esse marcador na posição 6-9 e
  pegando o N-ésimo. Isso pressupõe que cada ocorrência é um BLOCO FÍSICO SEPARADO de 600
  chars. Se, no documento real, as 4 ocorrências dessa linha estiverem TODAS dentro do MESMO
  bloco físico de 600 (ex. grupo repetitivo compactado numa única linha, sem re-emitir
  sequencial+número de linha por ocorrência), essa função fica com `matches.length === 1` e
  falha closed (`-1`) para ocorrência 2+ — o que NÃO bate com "abriu e mostrou concatenado",
  mas é a hipótese mais provável de descasamento estrutural.
- **Hipótese mais provável, não confirmada**: `field.length`/`startPosition` retornados pela
  API para o campo da 1ª ocorrência dessa linha estão inflados (cobrindo até o fim do bloco de
  600, em vez de só o trecho da própria ocorrência) — nesse caso o slice bruto do TXT
  legitimamente inclui o texto real das ocorrências seguintes (que fisicamente estão logo
  depois, sem padding entre elas), enquanto a leitura mostra só `field.value` (curto, correto)
  com padding invisível por trás. Isso seria um problema de CONTRATO/dado vindo da API para
  linhas com grupo repetitivo, não um bug isolado de front. `inspectPositionalField` compara
  `currentValue` contra `parsedValue.padEnd(expectedLength)` — se `parsedValue` (o `field.value`
  da API) também já vier "vazado" com o texto das ocorrências seguintes (não confirmável sem o
  JSON real), a checagem passaria e o buraco ficaria visível só no editor.

**Não implementei fix especulativo** para não mascarar um possível problema real de contrato
da API em uma feature seguranca-crítica (edita o TXT em produção). Próximo passo: pedir ao
usuário (ou capturar via `logService`/network tab) o JSON de `parseResult.fields` para a
LINHA081 desse documento — especificamente `startPosition`/`length`/`occurrence`/`value` de
cada uma das 4 ocorrências — para confirmar qual das duas pontas (front slicing vs. dado da
API) está realmente errada antes de tocar em `positionalFieldEdit.ts`.

Ver também [[project_xml_transformation_toggle]] para o padrão geral de "leitura usa
`field.value`, edição faz fail-closed slicing bruto" já documentado para o resto do fluxo.

## Resolução confirmada — 2026-08-28

O contrato real da API foi confirmado em código. `ParsedField` expõe `start`, `length` do valor
alinhado, `occurrenceCount` e `isAggregatedOccurrence`; a agregação da LINHA081 adiciona uma
entrada lógica com `occurrence=0` no fim da lista. O front convertia `0` em ocorrência 1 com
`|| 1`, por isso a concatenação reaparecia como uma LINHA081 física duplicada no final.

Correção no front:

- `parseFieldNormalization.ts` exclui agregados da lista física e recupera largura declarada do
  `LengthField` para campos vazios (`length` do wire pode ser 0);
- `start`/`calculatedPositions` viram `startPosition`, com GUIDs recuperados do layout;
- `resolvePositionalLineIndex` desambigua sequenciais repetidos usando também o código da linha
  nas posições 7–9;
- edição continua fail-closed e agora mostra “Linha física não identificada”, nunca “Linha 0”.

Cobertura: testes unitários de normalização/agregado/linha ambígua e Playwright desktop+mobile
editando um campo vazio de 588 posições.

Reprodução local com o par real em `.codex/temp/teste` (não versionado) confirmou:
`NroProtocoloAutorizacao` chega como `start=75`, `length=0`, `occurrence=1`,
`lineSequence=000001`; no layout ele é `Sequence=8`, `LengthField=15`. A mesma resposta contém
8 fragmentos físicos de LINHA081 e 2 agregados lógicos. Nenhum valor do documento foi registrado
nesta memória.
