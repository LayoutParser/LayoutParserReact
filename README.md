# LayoutParser Web

Aplicação web do ecossistema **LayoutParser** para enviar documentos posicionais, visualizar o
mapeamento produzido pela API e solicitar a transformação final para XML. Este repositório reúne
um front-end React e um gateway Node.js; as regras de parsing e transformação continuam na API
.NET, que é a fonte da verdade do domínio.

> **English summary:** LayoutParser Web combines a Vite/React front-end with a secure
> Node.js/Fastify gateway. Users upload positional text documents, inspect the mapping produced
> by the .NET API, generate transformation candidates and download the resulting XML. Browser
> traffic uses same-origin `/api`; domain parsing and transformation rules remain in the .NET
> backend.

## Conteúdo

- [O que o sistema faz](#o-que-o-sistema-faz)
- [Arquitetura e ecossistema](#arquitetura-e-ecossistema)
- [Tecnologias](#tecnologias)
- [Segurança](#segurança)
- [Desenvolvimento local](#desenvolvimento-local)
- [Configuração do gateway](#configuração-do-gateway)
- [Produção com IIS](#produção-com-iis)
- [Qualidade, testes e contrato](#qualidade-testes-e-contrato)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Harness de IA, agentes e MCP](#harness-de-ia-agentes-e-mcp)
- [Avaliação para o trabalho acadêmico](#avaliação-para-o-trabalho-acadêmico)

## O que o sistema faz

O fluxo principal é:

1. O usuário escolhe um layout do catálogo ou fornece o conteúdo de layout aceito pelo fluxo.
2. Seleciona um documento `.txt`, `.mq_series` ou `.idoc` de até **25 MiB**.
3. O front envia o formulário para `POST /api/parse/upload`, com progresso e opção de cancelar.
4. A API .NET identifica e processa a estrutura do documento.
5. O front apresenta campos, posições, linhas, validações e a árvore estrutural retornada.
6. Quando há mapeador disponível, o usuário solicita candidatos de transformação, incluindo os
   caminhos Sysmiddle e TCL/XSL disponibilizados pelo back-end.
7. O XML retornado pode ser visualizado, copiado ou baixado como arquivo `.xml`.

O navegador não executa parsing posicional nem transformação XSLT. O front valida apenas o
arquivo para dar feedback imediato; a validação autoritativa e as regras de negócio pertencem
ao gateway e à API.

A rota `/admin` consulta a sessão do gateway e exige autorização administrativa. A proteção no
React melhora a experiência, mas não substitui a autorização aplicada no servidor.

## Arquitetura e ecossistema

```text
Navegador
  │ HTTPS, mesma origem: /api
  ▼
IIS — arquivos estáticos do React + autenticação integrada + URL Rewrite/ARR
  │ trusted header, somente pela fronteira confiável
  ▼
Gateway Node.js/Fastify — server/ — loopback
  │ autenticação, autorização, limites, rate limit, correlação e proxy
  ▼
LayoutParserApi — ASP.NET Core/.NET — hub e fonte da verdade
  ├── LayoutParserLib — criptografia Sysmiddle
  ├── LayoutParserDecrypt — descriptografia externa
  └── serviços de cache, persistência, IA e transformação
```

O ecossistema é dividido em quatro projetos:

| Projeto                 | Responsabilidade                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| **LayoutParserReact**   | Este repositório: interface React e gateway Node/Fastify.                       |
| **LayoutParserApi**     | API .NET que orquestra parsing, validação, catálogo, cache, IA e transformação. |
| **LayoutParserLib**     | Biblioteca usada na integração com criptografia Sysmiddle.                      |
| **LayoutParserDecrypt** | Processo auxiliar de descriptografia.                                           |

O gateway é um **BFF** (Backend for Frontend): ele não duplica o parser da API. Sua função é
criar uma fronteira web segura e estável entre o navegador e os serviços internos.

## Tecnologias

| Camada              | Tecnologia atual                                                                   |
| ------------------- | ---------------------------------------------------------------------------------- |
| Front-end           | React 19, React Router 7, Zustand 5 e Axios                                        |
| Build               | Vite 8 e TypeScript em modo estrito                                                |
| Gateway             | Node.js 24 LTS, Fastify 5 e TypeScript                                             |
| Testes do front     | Vitest, Testing Library, MSW e cobertura V8                                        |
| Testes de navegador | Playwright, com Chromium desktop e perfil móvel                                    |
| Segurança           | Helmet, rate limit, CSP/IIS, auditoria npm e validação de artefatos                |
| CI                  | GitHub Actions com actions fixadas por SHA, CodeQL, Dependabot e dependency review |

As versões efetivamente instaladas e seus intervalos estão em [`package.json`](package.json) e
[`server/package.json`](server/package.json).

## Segurança

As principais proteções existentes nesta branch são:

- **Mesma origem:** por padrão, o Axios usa caminhos relativos. O navegador acessa `/api` sem
  conhecer host ou porta internos e sem depender de CORS em produção.
- **Upload em camadas:** o front rejeita arquivo vazio, extensão não permitida, nome excessivo
  e documento acima de 25 MiB. O gateway limita o documento a 25 MiB e a requisição multipart
  completa a 32 MiB; a API deve manter sua própria validação autoritativa.
- **Autenticação integrada:** em produção, o gateway aceita identidade somente por trusted
  header vindo de um endereço de proxy explicitamente permitido. Não há usuário, senha, token
  ou administrador padrão.
- **Autorização administrativa:** usuários e/ou grupos precisam estar nas allowlists do
  gateway para acessar os caminhos administrativos protegidos.
- **Restrição de rede:** o gateway usa loopback por padrão e recusa bind externo em produção.
- **Abuso e rastreabilidade:** rate limit por identidade/IP e `X-Correlation-ID` ponta a ponta.
- **Privacidade de logs:** payloads, headers sensíveis e conteúdo TXT/XML são omitidos ou
  redigidos; erros enviados ao cliente não expõem detalhes internos.
- **Headers defensivos:** Helmet no gateway e CSP, HSTS, `nosniff`, política de referência,
  permissões e isolamento de origem no IIS.
- **Build de produção:** source maps não são publicados e há uma checagem contra endereços
  internos gravados no bundle.

O limite do front é configurável entre 1 e 100 MiB para experiências locais, mas aumentar
`VITE_MAX_UPLOAD_MB` não aumenta os limites autoritativos do gateway ou da API.

## Desenvolvimento local

### Pré-requisitos

- Node.js **24.15+** (linha LTS 24.x);
- npm compatível com os lockfiles;
- `LayoutParserApi` disponível em ambiente local;
- Chromium do Playwright, apenas para executar os testes E2E.

### 1. Instalar as dependências

O front e o gateway são projetos Node separados e possuem lockfiles próprios:

```powershell
npm ci
npm ci --prefix server
```

### 2. Configurar o gateway

```powershell
Copy-Item server/.env.example server/.env
```

No arquivo local `server/.env`, ajuste `LAYOUTPARSER_API_URL` para a origem da API .NET. O
arquivo é ignorado pelo Git e não deve conter segredos versionados.

### 3. Fazer o Vite encaminhar `/api` ao gateway

O arquivo versionado [`.env.development`](.env.development) já configura o gateway e uma
identidade fictícia de demonstração. Para sobrescrever localmente, crie `.env.local`:

```dotenv
VITE_API_BASE_URL=
VITE_DEV_BFF_PROXY_TARGET=http://127.0.0.1:3100
VITE_DEV_BFF_USER=layoutparser.local
VITE_DEV_BFF_ROLES=LayoutParserAdmins
VITE_MAX_UPLOAD_MB=25
```

Manter `VITE_API_BASE_URL` vazio ativa o fluxo recomendado de mesma origem:

```text
React :3000 -> proxy /api do Vite -> gateway :3100 -> API .NET
```

Uma URL absoluta em `VITE_API_BASE_URL` existe somente como override de diagnóstico e pula o
gateway. Evite esse modo nos fluxos que precisam validar autenticação e segurança do BFF.

### 4. Iniciar os processos

```powershell
npm run dev
```

O comando inicia Vite e BFF juntos. Para depuração em terminais separados, use
`npm run dev:front` e `npm run dev:bff`.

Abra `http://localhost:3000`. A saúde local do gateway pode ser consultada em
`http://127.0.0.1:3100/health`.

O proxy do Vite injeta somente em desenvolvimento a identidade fictícia declarada no `.env`.
Ela não é uma credencial, não é aceita em produção e existe para tornar o fluxo acadêmico local
reproduzível. O BFF continua recusando requests anônimos e proíbe esse mecanismo quando
`NODE_ENV=production`. Consulte [`server/README.md`](server/README.md) para o modelo completo.

As variáveis do front estão documentadas em [`.env.example`](.env.example); as do gateway, em
[`server/.env.example`](server/.env.example).

## Configuração do gateway

As variáveis mais importantes são:

| Variável                              | Finalidade                                | Padrão de desenvolvimento |
| ------------------------------------- | ----------------------------------------- | ------------------------- |
| `BFF_HOST` / `BFF_PORT`               | Bind local do Fastify                     | `127.0.0.1` / `3100`      |
| `LAYOUTPARSER_API_URL`                | Origem da API .NET                        | loopback local            |
| `BFF_REQUEST_LIMIT_MIB`               | Limite da requisição multipart completa   | `32`                      |
| `BFF_DOCUMENT_LIMIT_MIB`              | Limite cumulativo do campo `txtFile`      | `25`                      |
| `BFF_RATE_LIMIT_MAX`                  | Máximo por janela                         | `120`                     |
| `BFF_TRUSTED_PROXY_IPS`               | Proxies autorizados a declarar identidade | obrigatório em produção   |
| `BFF_TRUSTED_USER_HEADER`             | Header de usuário inserido pelo IIS       | obrigatório em produção   |
| `BFF_TRUSTED_ROLES_HEADER`            | Header opcional de grupos/funções         | configurável              |
| `BFF_ADMIN_USERS` / `BFF_ADMIN_ROLES` | Allowlists administrativas                | ao menos uma em produção  |
| `BFF_DEV_AUTH_ENABLED`                | Habilita identidade simulada local        | proibido em produção      |

Rotas próprias do gateway:

| Método e rota      | Finalidade                                                                 |
| ------------------ | -------------------------------------------------------------------------- |
| `GET /health`      | Liveness local, sem revelar nem consultar o upstream.                      |
| `GET /api/session` | Sessão normalizada para o front: autenticação, usuário, roles e `isAdmin`. |
| `/api/*`           | Proxy transparente para a API .NET, após os controles do gateway.          |

Os caminhos administrativos protegidos e todos os detalhes de fail-fast estão em
[`server/README.md`](server/README.md).

## Produção com IIS

O desenho de produção esperado é:

1. Publicar o conteúdo de `dist/` em um site **HTTPS** no IIS.
2. Instalar e habilitar URL Rewrite e ARR com proxy.
3. Executar o gateway compilado como processo/serviço Node separado, escutando somente em
   loopback.
4. Fazer o IIS encaminhar `/api/*` ao gateway.
5. Habilitar a autenticação integrada adequada ao ambiente.
6. Remover qualquer header de identidade recebido do navegador e inserir um novo valor a partir
   da identidade já validada pelo IIS.
7. Configurar no gateway o mesmo nome de header usado pelo IIS, os IPs confiáveis e a allowlist
   administrativa.
8. Manter a API .NET inacessível diretamente pelo navegador e protegida também em profundidade.

O arquivo [`public/web.config`](public/web.config) é copiado para o build e já contém
autenticação Windows, regra same-origin, limite total de 32 MiB e headers
defensivos. A regra sobrescreve `X-IIS-User` com `{AUTH_USER}`; o BFF aceita esse header somente
do proxy configurado. A administração pode ser controlada pela allowlist de usuários ou por uma
regra equivalente de roles.

```powershell
npm ci
npm ci --prefix server
npm run quality
```

O workflow [`deploy.yml`](.github/workflows/deploy.yml) executa os gates, cria uma release
versionada, publica o React, instala as dependências de produção do BFF, registra/reinicia seu
processo em uma Scheduled Task do Windows, faz smoke tests e mantém rollback para a release
anterior. O script [Deploy-Iis.ps1](scripts/Deploy-Iis.ps1) exige HTTPS e falha se URL Rewrite,
ARR, allowlists ou variáveis obrigatórias estiverem ausentes. Configure `PUBLIC_HOST` em produção
e `PUBLIC_HOST_DEV` em desenvolvimento com o hostname DNS coberto pelo certificado, sem protocolo
ou porta; esse valor também é usado no smoke test HTTPS. Os environments `development` e
`production` devem exigir aprovação e isolar seus secrets/runners.

No runner de desenvolvimento, o workflow instala o ARR 3 quando ele estiver ausente usando o
instalador x64 oficial da Microsoft, com assinatura Authenticode e SHA-256 fixado verificados por
[`Install-IisArr.ps1`](scripts/Install-IisArr.ps1). Ele também migra o site de HTTP para HTTPS de
forma idempotente com [`Initialize-IisDevHttps.ps1`](scripts/Initialize-IisDevHttps.ps1), usando um
certificado válido para `PUBLIC_HOST_DEV` já instalado em `Cert:\LocalMachine\My`. O runner de
produção continua exigindo ARR, site e binding HTTPS pré-provisionados para impedir alterações
automáticas na infraestrutura produtiva.

Quando o certificado de desenvolvimento é autoassinado, o bootstrap adiciona somente sua parte
pública à raiz confiável da máquina após validar hostname, período de validade e chave privada. O
workflow também força e verifica o checkout em LF sem alterar permanentemente a configuração Git
do runner. A exceção de `safe.directory` usada nessa verificação é limitada ao workspace exato do
job e não é persistida na conta do serviço.

As etapas que manipulam o provider `IIS:\` usam o Windows PowerShell nativo (`powershell.exe`).
Isso evita a sessão de compatibilidade do PowerShell 7, que importa os cmdlets de
`WebAdministration`, mas não disponibiliza o drive `IIS:\` ao processo chamador.

O executável Node usado pelo BFF é armazenado em `runtime/` com um nome derivado de seu SHA-256.
Assim, uma atualização do Node cria um runtime imutável em vez de tentar sobrescrever o executável
que ainda está aberto pelo BFF da release anterior.

Nunca publique o front com `VITE_API_BASE_URL` apontando para uma origem interna. O build de
produção foi desenhado para deixar essa variável vazia e usar `/api` na mesma origem HTTPS.

## Qualidade, testes e contrato

### Front-end

| Comando                  | Verificação                                             |
| ------------------------ | ------------------------------------------------------- |
| `npm run lint`           | ESLint, acessibilidade estática e zero warnings.        |
| `npm run typecheck`      | TypeScript estrito sem emitir arquivos.                 |
| `npm run test:run`       | Testes unitários e de integração do front.              |
| `npm run test:coverage`  | Vitest com cobertura V8.                                |
| `npm run build`          | Type-check e build Vite.                                |
| `npm run build:dev`      | Build no modo development.                              |
| `npm run build:prod`     | Build no modo production.                               |
| `npm run format:check`   | Prettier nos arquivos do front.                         |
| `npm run test:e2e`       | Fluxo Playwright em desktop e mobile.                   |
| `npm run contract:check` | Contrato local e OpenAPI opcional.                      |
| `npm run audit`          | Auditoria npm, bloqueando severidade moderada ou maior. |
| `npm run quality`        | Gate agregado do front, BFF, artefatos e contrato.      |

### Gateway Node

```powershell
npm run quality --prefix server
```

O gate próprio executa tipos, testes com cobertura, build e auditoria. A suíte cobre configuração
fail-fast, sessão, trusted headers, allowlist administrativa, proxy, correlação, rate limit,
limites de payload e privacidade dos logs.

### E2E com Playwright

```powershell
npx playwright install chromium
npm run typecheck:e2e
npm run test:e2e
```

A suíte em [`e2e/`](e2e/) valida o fluxo TXT → transformação → download XML e a restrição da
área administrativa em perfis desktop e móvel. As APIs são mockadas no navegador para tornar o
teste determinístico; isso não substitui um teste de integração contra o gateway e a API reais.

### Contrato da API

```powershell
npm run contract:check
```

O script cruza os endpoints usados pelos services com
[`contracts/api-endpoints.json`](contracts/api-endpoints.json). Opcionalmente,
`LAYOUTPARSER_OPENAPI_URL` permite comparar o manifesto com um OpenAPI acessível:

```powershell
$env:LAYOUTPARSER_OPENAPI_URL = 'https://api-de-teste.exemplo/openapi.json'
node scripts/check-api-contract.mjs
```

Para conferir o artefato final:

```powershell
npm run build:prod
npm run artifacts:validate
```

Essa checagem reprova source maps e referências internas indevidas no bundle e confirma os
fragmentos de segurança esperados no `web.config`.

Playwright roda em job próprio do workflow de qualidade. Os demais gates fazem parte de
`npm run quality`, inclusive o BFF e a auditoria de ambos os lockfiles.

Os workflows de qualidade e segurança estão em [`.github/workflows/`](.github/workflows/).
O Dependabot agrupa atualizações compatíveis de React, ESLint e Vite, enquanto upgrades major
dessas famílias ficam bloqueados para migração manual conjunta. Isso evita PRs isolados com
peer dependencies incompatíveis sem enfraquecer as atualizações minor, patch ou de segurança.

## Estrutura do repositório

```text
LayoutParserReact/
├── src/
│   ├── components/       # upload, análise, XML, admin, autenticação e componentes compartilhados
│   ├── layouts/          # shell e navegação
│   ├── services/         # única camada que chama /api
│   ├── store/            # estado Zustand por domínio
│   ├── types/            # contratos TypeScript
│   └── utils/            # correlação, validações, árvore, cache e sanitização
├── server/               # BFF Node.js/Fastify independente
├── e2e/                  # cenários Playwright
├── contracts/            # manifesto versionado de endpoints
├── scripts/              # validações de contrato e artefatos
├── public/               # arquivos públicos e configuração IIS
├── .claude/              # harness Claude Code: agentes, comandos, regras, hooks e memória
├── .codex/               # definições de agentes do Codex
└── .github/               # CI, segurança, ownership e atualização de dependências
```

Chamadas HTTP devem permanecer em `src/services`; payloads da API devem possuir tipos em
[`src/types/`](src/types/). O contrato principal do parse está em
[`src/types/api.ts`](src/types/api.ts).

## Harness de IA, agentes e MCP

O repositório possui um harness inspirado no AIOX, adaptado ao front e ao gateway:

| Agente            | Papel                                               |
| ----------------- | --------------------------------------------------- |
| `@lp-front-dev`   | React, TypeScript, stores, services e rotas.        |
| `@lp-ui-ux`       | UX, componentes, CSS e acessibilidade.              |
| `@lp-qa`          | Gates, testes, cobertura e validação de fluxo.      |
| `@lp-security`    | Revisão read-only de segurança e supply chain.      |
| `@lp-contract-qa` | Revisão read-only do contrato front ↔ API.          |
| `@lp-doc`         | Documentação PT-BR com resumo EN quando necessário. |
| `@lp-devops`      | CI, deploy, push e integração MCP.                  |

As regras operacionais estão em [`AGENTS.md`](AGENTS.md), e a visão do harness Claude em
[`.claude/README.md`](.claude/README.md). O harness inclui comandos de revisão de segurança e
sincronização de contrato, hooks de feedback rápido/proteção de caminhos sensíveis e memória por
agente.

O MCP **não é implementado neste front**. O servidor MCP pertence ao `LayoutParserApi`, pois a
API é o hub e a fonte da verdade. Este repositório fornece apenas
[`.mcp.json.example`](.mcp.json.example) para conectar o ambiente de IA ao MCP da API; copie para
`.mcp.json`, ajuste o caminho local da DLL e não versione a configuração resultante. A autoridade
e as regras estão em [`.claude/rules/mcp-usage.md`](.claude/rules/mcp-usage.md).

## Avaliação para o trabalho acadêmico

Requisito informado:

> Desenvolver um sistema web com Node como base, front e back separados, usando um framework
> trabalhado em laboratório, com regras complexas de negócio, código em Git e apresentação para
> a turma.

### Veredito: atende com ressalva

| Critério                       | Estado atual                                                                    | Como demonstrar                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Sistema web                    | **Atende**                                                                      | Fluxo completo no navegador, do upload ao XML.                                                                  |
| Node como base                 | **Atende**                                                                      | O repositório tem toolchain Node e um backend Node/Fastify executável em `server/`.                             |
| Front e back separados         | **Atende**                                                                      | React em `src/`; BFF Node em `server/`; API de domínio em projeto .NET separado.                                |
| Framework de front             | **Atende**, se React/Vite estiver entre os frameworks permitidos no laboratório | Mostrar componentes, rotas, estado e services.                                                                  |
| Regras complexas               | **Atende no sistema**, mas principalmente na API .NET                           | Parsing posicional, layout, validações e transformação são regras reais, porém não estão implementadas em Node. |
| Repositório Git e apresentação | **Atende quando publicado/apresentado**                                         | Usar histórico, CI e demonstração ponta a ponta.                                                                |

A ressalva é importante: o gateway Node contém controles relevantes — autenticação, autorização,
limites multipart por streaming, rate limit e proxy seguro —, mas eles são predominantemente
regras de infraestrutura. As regras complexas de **domínio** continuam concentradas no projeto
.NET.

Na apresentação, descreva o projeto como uma arquitetura web poliglota:

1. **React** resolve interface, navegação, acessibilidade e estado.
2. **Node/Fastify** cumpre o papel de backend web/BFF e fronteira de segurança.
3. **.NET** concentra o domínio especializado de parsing e transformação.
4. O usuário percorre as três camadas em uma demonstração única: upload, mapeamento, geração e
   download do XML.

Se a interpretação do professor for “as regras complexas precisam estar implementadas
especificamente no backend Node”, o projeto ainda não atende integralmente esse ponto. Para
eliminar a ambiguidade, seria necessário implementar no gateway Node ao menos uma regra de
domínio substancial e testável — por exemplo, uma política versionada de pré-validação e seleção
de estratégia de transformação — sem duplicar nem contradizer a API que continua sendo a fonte
da verdade.

---

**LayoutParser Web** · Front React + gateway Node/Fastify + domínio .NET
