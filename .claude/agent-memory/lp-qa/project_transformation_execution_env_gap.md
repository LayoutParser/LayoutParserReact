---
name: project-transformation-execution-env-gap
description: No ambiente 172.25.32.42:5000 (em 2026-07-20), nenhum dos 57 layouts tem arquivo MAP gerado — caminho de sucesso de transformationexecution é inalcançável até ops gerar ao menos um
metadata:
  type: project
---

`POST /api/transformationexecution/execute`: testado exaustivamente contra a API real
(`http://172.25.32.42:5000`) em 2026-07-20. Dos 57 layouts cadastrados, 40 têm Mapper
disponível (`GET /api/mapperdatabase/by-input/{guid}` → 200). Testando os 40 com conteúdo
qualquer, **todos** retornam o mesmo erro: `{"success":false,"errors":["Arquivo MAP não
encontrado para layout: <nome>"],"warnings":[]}` (HTTP 400) — inclusive o layout de teste
oficial `LAY_CNHI_TXT_MQSERIES_ENVNFE_4.00_NFe` / `e339073e-32d1-492e-ae8a-dcf6337b21a1`.

**Why:** isso significa que, neste ambiente, o caminho de SUCESSO da transformação (retorno
`{success:true, transformedXml, ...}`) está bloqueado no back-end/infra (arquivo MAP físico não
gerado/deployado para nenhum layout) — não é algo que o front ou um documento de teste bem
formado consiga contornar. O tipo `TransformationExecutionSuccess` (em `src/types/
transformation.ts`) permanece validado só por leitura do controller C#, nunca contra um payload
real, e isso é uma limitação de ambiente, não do código front-end.

**How to apply:** ao validar novamente essa feature no futuro, não perder tempo tentando achar
"o documento certo" para forçar sucesso nesse ambiente — primeiro perguntar/confirmar com
`@lp-devops`/backend se algum layout já tem MAP gerado. Se um dia um layout tiver, essa é a
prioridade nº1 de teste (validar o shape real de `transformedXml`/`segmentMappings`/`validation`
contra o tipo declarado). Esse estado pode mudar a qualquer momento (ops pode gerar MAPs) —
tratar como snapshot de 2026-07-20, reconfirmar antes de assumir que continua bloqueado.
