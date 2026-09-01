# Mapping Studio — Slices 6 e 7 (01/09/2026)

## Slice 6

- API #247 fecha bypasses do gate Sysmiddle por array, objeto, tipo inesperado e espaços.
- O front rejeita `MappingExplanation` Sysmiddle com `author|compile|publish=true` e rejeita Draft/
  Release cujo engine não seja exatamente `tcl|xslt`.
- O componente continua sem controles mesmo se o service for adulterado em memória; E2E cobre a
  resposta maliciosa no navegador.

## Slice 7

- API PR #248 publicou `approve`, `publish` e `rollback`, RBAC por papel do workspace e os estados
  `in_review`, `approved`, `published`, `deprecated` e `archived`.
- O front usa o papel de `/api/workspaces/me` apenas para orientar controles; a API permanece
  autoritativa e erros 403/404/422 são exibidos sem bypass.
- `capabilities.publish` não é permissão da identidade. Gates e status contraditórios, troca de
  identidade da release e engine Sysmiddle falham fechado.
- O `GET` completo da release ainda omite metadados novos; as mutações devolvem resposta parcial.
  Não há `If-Match`, leitura de `MappingTransition` nem `allowedTransitions`.
- E2E sintético cobre `test_passed → approved → published → deprecated`. Piloto FIAT real segue
  bloqueado por API #219/#221 e pelo pacote/gabarito homologado.

## Regra durável

Nunca promover automaticamente uma release apenas porque `RequiredGatesPassed=true`; cada ação é
explícita e revalidada pelo RBAC da API. Sysmiddle permanece explicável/executável e não-autoral em
todas as camadas.
