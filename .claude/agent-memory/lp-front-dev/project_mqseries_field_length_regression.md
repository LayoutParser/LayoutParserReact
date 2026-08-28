---
name: mqseries-field-length-regression
description: Regressão reportada (2026-08-26) em .mqseries - InformacoesParaEDI renderizado com Len:500 em vez de 81; causa raiz é dado da API, não front
metadata:
  type: project
---

Usuário reportou (2026-08-26) que, para a mesma linha lógica (LINHA081, sequencial 000037,
arquivo `.mqseries`), o campo `InformacoesParaEDI` às vezes renderiza com `Pos: 10-509 / Len:
500 / Valor: (vazio)` (errado — consome o espaço do `Filler` seguinte) e outras vezes com `Pos:
10-90 / Len: 81 / Valor: "Solicitante: ..."` (correto).

Investigação em [`src/components/analysis/FieldDisplay.tsx`](../../../src/components/analysis/FieldDisplay.tsx):

- O front **nunca calcula `field.length`**. `fieldLength = field.length || 1` (linha ~670) e o
  título do botão (`Len: ${field.length || 'N/A'}`, linha ~882) usam o valor **exatamente como
  veio de `field` (API/store)**. Confirmado via grep: nenhum lugar em `src/store`, `src/utils`
  ou `src/services` atribui/recalcula `.length` de `Field` — só `startPosition` é sobrescrito
  (bloco `calculatedPositions`, linhas 461-489), e mesmo assim `startPosition` bate (10) nos
  dois casos relatados, então esse bloco não é a causa.
- `field.value` vazio → front preenche com espaços (`' '.repeat(fieldLength)`, linhas 674-699)
  só para exibição; não é o front que "perde" o valor real — se `field.value` já chegou vazio
  da API/store para esse `field.length`, o texto real nunca esteve disponível para renderizar.
- Conclusão: a variação de 81 → 500 para o mesmo campo lógico em ocorrências diferentes indica
  que a API está retornando, em pelo menos um caso, o **tamanho declarado/máximo do layout**
  (500) em vez do **tamanho calculado da ocorrência** (81) para esse campo de tamanho variável
  — típico de campo dependente de indicador/tamanho dinâmico em layout `.mqseries`. Isso é
  causa raiz de **contrato/dado da API**, não do front.

Não implementei fix especulativo no front (mascararia o problema real). Próximo passo:
reportar ao usuário para acionar a equipe da API com o `correlationId` do parse e, se possível,
o JSON bruto de `parseResult.fields` para essa linha/ocorrência (não colar TXT/XML real em
issue pública, ver `rules/product-management.md`).

Ver também [[project_positional_edit_multi_occurrence_investigation]] — mesmo padrão: suspeita
de `length`/`startPosition` inflados vindos da API para grupos/campos de tamanho variável em
layouts posicionais, ainda sem JSON real para confirmação definitiva byte a byte.
