---
name: project-bff-dns-multihome-lookup-override
description: BFF em host Windows multi-homed sofria ~11s de latência de DNS no login; corrigido via custom lookup no dispatcher global do undici, não dns.setServers().
metadata:
  type: project
---

Login em um host Windows com várias interfaces de rede ativas ficava lento ou falhava (usuário
só logava na 2ª/3ª tentativa). Causa raiz confirmada ao vivo no host: a resolução DNS _padrão do
SO_ (sem servidor explícito) para `login.microsoftonline.com` levava
~11-12s de forma determinística, por causa do "Smart Multi-Homed Name Resolution" do Windows —
ele aguarda resposta de todas as interfaces conectadas (várias sem DNS configurado) antes de
aceitar a resposta do adaptador correto. Resolver com um servidor DNS interno explícito era
rápido (dezenas de ms). Isso batia com os eventos reais
`auth.entra.acquire_token_failed` no log do BFF, `durationMs` ~10.6s.

**Decisão técnica implementada** (`server/src/dnsOverride.ts`, chamado em `server/src/index.ts`
logo após `loadConfig()`, antes de `buildApp`):

- `dns.setServers()` do `node:dns` **NÃO resolve o problema**. Ele só afeta as funções baseadas
  em c-ares (`dns.resolve()`, `dns.resolve4()` etc.), não `dns.lookup()` — e o conector padrão do
  undici (`server/node_modules/undici/lib/core/connect.js`, `buildConnector`) chama
  `net.connect()`/`tls.connect()` sem um `lookup` customizado, o que internamente usa
  `dns.lookup()` (getaddrinfo do SO). Como o `fetch` nativo do Node é undici por baixo, e o MSAL
  Node (`@azure/msal-node`, usado em `server/src/oidc.ts`) usa esse `fetch` global, `setServers()`
  sozinho não teria efeito nenhum na latência real.
- A mitigação funcional é registrar uma função `lookup` customizada (baseada em `dns.Resolver`
  com `setServers()` fixando os IPs corretos, que usa c-ares e por isso respeita os servidores) e
  injetá-la no dispatcher global do undici via `setGlobalDispatcher(new Agent({ connect: {
lookup } }))`. Isso cobre tanto o `fetch` global quanto qualquer cliente HTTP que use o
  dispatcher padrão.
- Configurável via nova env var opcional `BFF_DNS_SERVERS` (CSV de IPs, validada com
  `net.isIP` em `server/src/config.ts`). Sem a variável, comportamento padrão do Node é mantido —
  não hardcoda infra de produção no código-fonte, e não afeta outros hosts/ambientes.

**Why:** hardcodar endereços de DNS internos direto no código versionado afetaria todo mundo
(dev, outros hosts), além de expor detalhes operacionais num repositório público. A env var isola
o efeito ao host confirmadamente afetado.

**How to apply:** se aparecer de novo lentidão/flakiness em chamadas de saída do BFF (MSAL, futuro
client HTTP), primeiro suspeitar de DNS multi-homed antes de mexer em timeout do MSAL. Configurar
`BFF_DNS_SERVERS=<DNS_INTERNO_PRIMARIO>,<DNS_INTERNO_SECUNDARIO>` no ambiente do host afetado.
Os endereços reais pertencem à configuração privada do ambiente e não devem ser versionados.
Ver `server/src/dnsOverride.ts` para a implementação e o porquê de não usar `dns.setServers()`
puro.

Validação local: `npm run typecheck` limpo em `server/`. Smoke test isolado confirmou que
`applyDnsOverride(['1.1.1.1','8.8.8.8'])` seguido de `fetch('https://example.com')` funciona
(200 OK) via o lookup customizado. Não foi possível reproduzir o cenário multi-homed real (que só
ocorre no host Windows de produção com múltiplas interfaces) neste ambiente de dev.

Implementação e testes foram incorporados em `develop` e promovidos para `main` pelos PRs de DNS
multi-homed. O comportamento é coberto por `server/test/dnsOverride.test.ts`; a propagação da
configuração opcional ao deploy está em `scripts/Deploy-Iis.ps1`.
