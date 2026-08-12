# Memory Index — @lp-security

Memoria duravel da revisora de seguranca do LayoutParser React.

## Regras de memoria

- Grave apenas decisoes, riscos aceitos com responsavel/prazo e padroes confirmados.
- Nunca grave segredo, token, TXT/XML de usuario ou payload sensivel.
- Revalide advisories e fatos temporais; nao trate versao antiga como verdade permanente.

## Decisoes vigentes

- Browser usa apenas same-origin `/auth` e `/api`; enderecos internos nao entram no bundle.
- Producao usa Entra OIDC Authorization Code + PKCE/state/nonce no BFF; IIS nao autentica usuario.
- Sessao criptografada HttpOnly/Secure/SameSite=Lax guarda identidade minima por ate oito horas.
- Tokens Microsoft, cookie e Authorization do browser nunca sao repassados para a API .NET.
- BFF Node em loopback exige sessao valida em producao e allowlist separada para admin.
- Upload: allowlist de extensoes, 25 MiB no documento, 32 MiB na request e streaming.
- TXT/XML, bodies, tokens e headers sensiveis nao entram em log ou localStorage.
- Auditoria moderada, CodeQL, dependency review, Dependabot e Actions fixadas por SHA.
- Deploy exige IIS HTTPS/Anonymous, Windows Auth desabilitado, ARR/Rewrite e mantem rollback.
