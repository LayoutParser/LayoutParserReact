// Mitigação de latência de DNS em hosts multi-homed (múltiplas interfaces de rede ativas).
//
// Diagnóstico (produção, host BRNDDAPPBLD01): a resolução padrão do SO Windows para nomes como
// login.microsoftonline.com sofre o comportamento "Smart Multi-Homed Name Resolution" — o SO
// consulta/aguarda respostas de todos os adaptadores de rede conectados (incluindo os sem DNS
// configurado) antes de aceitar a resposta do adaptador correto, gerando ~11-12s de atraso fixo
// em toda resolução. Isso derruba/atrasa o login (MSAL Node usa fetch nativo do Node para falar
// com o Entra e o Google).
//
// IMPORTANTE: `dns.setServers()` do módulo `node:dns` só afeta as funções baseadas em c-ares
// (`dns.resolve()`, `dns.resolve4()` etc.) — NÃO afeta `dns.lookup()`, que usa getaddrinfo do SO
// via libuv. O conector padrão do undici (usado pelo `fetch` nativo do Node) chama
// `net.connect()`/`tls.connect()` sem uma função `lookup` customizada, então internamente cai em
// `dns.lookup()` — ou seja, `dns.setServers()` sozinho NÃO mitiga o problema para `fetch`.
//
// A mitigação real: registrar um `lookup` customizado, baseado em `dns.Resolver` (c-ares, que
// respeita `setServers`) apontando direto para os servidores DNS corretos, e injetá-lo no
// dispatcher global do undici via `setGlobalDispatcher(new Agent({ connect: { lookup } }))`.
//
// ESCOPO: `setGlobalDispatcher()` é GLOBAL AO PROCESSO — não fica restrito às chamadas OIDC.
// Ele substitui o dispatcher padrão usado por TODO `fetch` nativo do Node no processo do BFF,
// incluindo o proxy `/api` → LayoutParserApi (`server/src/app.ts`, registrado via
// `@fastify/http-proxy`), que herda esse mesmo dispatcher global. Ou seja, ao configurar
// `BFF_DNS_SERVERS`, tanto as chamadas ao Entra/Google (MSAL Node) quanto a resolução de nome do
// `LAYOUTPARSER_API_URL` passam a usar exclusivamente os servidores DNS informados aqui — se o
// upstream da API for um hostname resolvível só por outro DNS (fora da lista), o proxy quebra.
// Ver checagem de `LAYOUTPARSER_API_URL` em `server/src/config.ts` (`parseUpstreamUrl`).

import dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Agent, setGlobalDispatcher } from 'undici';

export interface DnsOverrideResult {
  readonly applied: boolean;
  readonly servers: readonly string[];
}

// Cria uma função de lookup compatível com a assinatura esperada por `net.connect`/`tls.connect`
// (e pelo conector do undici), resolvendo via `dns.Resolver` com servidores fixos.
function createFixedServerLookup(servers: readonly string[]): LookupFunction {
  const resolver = new dns.Resolver();
  resolver.setServers([...servers]);

  return function fixedServerLookup(hostname, options, callback) {
    const wantsAll = options.all === true;
    const family = options.family;

    const resolveFamily = (recordFamily: 4 | 6, addresses: readonly string[]): void => {
      if (wantsAll) {
        callback(
          null,
          addresses.map(address => ({ address, family: recordFamily }))
        );
        return;
      }
      callback(null, addresses[0] as string, recordFamily);
    };

    // Sem preferência de família: tenta IPv4 primeiro, cai para IPv6 se não houver registro A.
    if (family === 6) {
      resolver.resolve6(hostname, (error, addresses) => {
        if (error || !addresses || addresses.length === 0) {
          callback(error ?? new Error(`Sem registro AAAA para ${hostname}.`), '');
          return;
        }
        resolveFamily(6, addresses);
      });
      return;
    }

    resolver.resolve4(hostname, (error, addresses) => {
      if (!error && addresses && addresses.length > 0) {
        resolveFamily(4, addresses);
        return;
      }

      resolver.resolve6(hostname, (error6, addresses6) => {
        if (error6 || !addresses6 || addresses6.length === 0) {
          callback(error6 ?? error ?? new Error(`Sem registro A/AAAA para ${hostname}.`), '');
          return;
        }
        resolveFamily(6, addresses6);
      });
    });
  };
}

// Aplica a mitigação globalmente para o processo: todo `fetch` e demais clientes que usem o
// dispatcher padrão do undici passam a resolver nomes via os servidores DNS informados,
// ignorando o comportamento multi-homed lento do SO. Sem `servers`, não faz nada (mantém o
// comportamento padrão do Node) — mudança opt-in, restrita a hosts afetados.
export function applyDnsOverride(servers: readonly string[]): DnsOverrideResult {
  if (servers.length === 0) {
    return { applied: false, servers: [] };
  }

  const lookup = createFixedServerLookup(servers);
  setGlobalDispatcher(new Agent({ connect: { lookup } }));

  return { applied: true, servers };
}
