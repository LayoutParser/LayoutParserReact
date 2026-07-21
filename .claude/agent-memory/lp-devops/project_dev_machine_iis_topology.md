---
name: dev-machine-iis-topology
description: topologia real do IIS/portas nesta máquina de dev (NDD-NOT-10910) — o que já está ocupado, o que o back-end já estabeleceu como convenção de deploy local, e o que confirmei via HTTP sem precisar de acesso admin
metadata:
  type: project
---

Levantamento feito em 2026-07-21 para avaliar "servir o front de verdade nesta máquina a cada
push em `develop`" (pedido explícito do usuário, ver [[project_ci_dev_dual_pipeline]]).

**Máquina:** Windows 11 Enterprise LTSC (client OS, não Server — por isso IIS é feature
opcional, não role). Usuário interativo via WSL interop: `nddigital\elson.lopes`, **não é
admin** (`IsInRole(Administrator)` = `False`). O runner
`actions.runner.LayoutParser.NDD-NOT-10910` roda como **`LocalSystem`** — ou seja, o *job* de
CI tem muito mais privilégio local do que o meu contexto interativo atual. Isso importa:
coisas que eu não consigo inspecionar agora (`Get-Website`/`Import-Module WebAdministration` →
"Process should have elevated status to access IIS configuration data" — parede real,
confirmada, não contornei) podem ainda assim ser perfeitamente executáveis **de dentro de um
step de workflow**, porque ele roda com outro usuário/privilégio.

**IIS já está instalado e rodando** (`W3SVC` = Running) — "Default Web Site" ocupa a porta
**80**, físico em `C:\inetpub\wwwroot`.

**`C:\inetpub\wwwroot\layoutparser\` já existe nesta máquina** (não é só em produção!),
criado pelo `ci-dev.yml` do **LayoutParserApi** (back-end):
- `layoutparser\api\` — publish output do back-end (dotnet publish), mas a API real **não é
  servida por IIS aqui** — é um **serviço Windows nativo** (`sc.exe create`, não NSSM) que
  escuta direto via Kestrel em `http://localhost:5100` (variável `API_URL_DEV`, valor default
  do próprio `ci-dev.yml` do back-end — porta 5100 escolhida especificamente para não colidir
  com o `:5000` do `dotnet run` manual). Confirmei viva: `curl http://localhost:5100/api/document/layouts`
  → HTTP 404 controlado (exatamente o que o smoke test do back-end espera como sucesso).
- `layoutparser\backups\` — usado pelo back-end pra backup de `appsettings.json` a cada
  redeploy.
- Variables do repo `LayoutParserApi` (Settings → Secrets and variables → Actions → Variables,
  **não** Secrets, "path não é segredo"): `DEPLOY_PATH_DEV` = `C:\inetpub\wwwroot\layoutparser`,
  `API_URL_DEV` = `http://localhost:5100`. Secret usado: `DB_PASSWORD_DEV` (só isso é sensível).

**Testei com curl (read-only, sem elevação) o que IIS faz com esses paths — do lado Windows,
não do WSL** (WSL→`localhost` do Windows não roteou pra mim aqui, tive que usar
`Invoke-WebRequest` via `powershell.exe`):
- `http://localhost:80/` → 200 (página padrão do IIS, `iisstart.htm`, 696 bytes — bate exato).
- `http://localhost/layoutparser/` → **403** (não 404!) — confirma que IIS **já serve
  qualquer subpasta de `wwwroot` automaticamente** (Default Web Site cobre toda a árvore
  física), só não tem documento padrão ali.
- `http://localhost/layoutparser/api/` → **500** — o `web.config` que o `dotnet publish` da
  API deixou ali (pra ASP.NET Core Module) quebra quando acessado via IIS, porque a API real
  não é hospedada por IIS (é o serviço Windows na porta 5100). É uma pasta "morta" do ponto de
  vista HTTP — só existe como local de deploy de arquivo, não como app IIS funcional.

**Conclusão prática (evidência, não suposição):** copiar o `dist/` do front pra
`C:\inetpub\wwwroot\layoutparser\front-end\` muito provavelmente já ficaria acessível em
`http://localhost/layoutparser/front-end/` **sem precisar criar site/binding novo** — o
Default Web Site (porta 80) já cobre essa árvore. Diferença chave pro caso do `api/`: o
`web.config` do front (`public/web.config`, já existe no repo) só tem `<rewrite>` (URL
Rewrite, pra SPA), **não** tem `<aspNetCore>` — não deveria disparar o mesmo erro 500.
**Não confirmado** (parede de permissão, não tentei contornar): se o módulo **URL Rewrite**
do IIS está instalado nesta máquina — sem ele, a regra de fallback do React Router não
funciona (rotas fora de `/` dão 404 ao dar refresh/link direto).

**Portas ocupadas nesta máquina** (via `Get-NetTCPConnection`, 2026-07-21): 80, 135, 139, 445,
5040, 5100 (API dev), 5432 (Postgres), 5985/47001 (WinRM), 6379 (Redis), 7070, 8828, 11434
(Ollama), 28075, 30523, 42050, + range efêmero 49664-49961. **Porta 81** (a de produção, ver
`deploy.yml`) está **livre** nesta máquina — só usada no servidor de prod
(`172.25.32.42`/`WINSRV2022-LIB`), não aqui.

Ver [[feedback_parar_em_parede_de_permissao]] para a regra de conduta que segui ao esbarrar na
parede do `Get-Website`.

## Decisão final (2026-07-21) — divergiu da conclusão "prática" acima

O usuário **não** escolheu reaproveitar o Default Web Site. Decisão: **site IIS dedicado**,
porta **`8081`** (confirmei livre com o mesmo método usado pra `:81` — `Get-NetTCPConnection`
+ `Invoke-WebRequest` do lado Windows deu timeout de conexão), raiz **`C:\inetpub\layoutparser-front-dev\`**
(fora de `wwwroot`, deliberadamente — evita a ambiguidade "acessível tanto por `:8081` quanto
sem querer via `:80/algumacoisa`"), com `\front-end` (raiz física do site) e `\backups`
(irmã, não servida) — mesmo padrão de nomes do `deploy.yml` de produção.

**Quem cria o site de fato:** não eu agora (sem privilégio) — um step **idempotente** dentro
do próprio `ci-dev.yml` (`Get-Website` primeiro, só cria com `New-Website` se não existir),
que só vai executar de verdade quando o workflow rodar pelo runner (conta `LocalSystem`, tem
privilégio). Editei `.github/workflows/ci-dev.yml` com 5 steps novos (todos
`if: github.ref == 'refs/heads/develop'`) — **ainda não commitado nem pushado**, working tree
só, aguardando o usuário revisar o diff antes do primeiro push (que vai criar infra nova de
verdade nesta máquina pela primeira vez).

**Variables que precisam existir no repo `LayoutParserReact` antes desse push funcionar**
(GitHub → Settings → Secrets and variables → Actions → Variables, não Secrets — nenhuma é
sensível): `DEPLOY_PATH_DEV_FRONTEND` = `C:\inetpub\layoutparser-front-dev`,
`FRONTEND_DEV_PORT` = `8081`, `API_URL_DEV` = `http://localhost:5100` (mesmo valor do
back-end, pra bater com a porta real onde a API de dev responde — sem isso o build usaria o
fallback por hostname de `src/services/api.ts`, que aponta `localhost` pra `:5000`, porta
errada). Não criei nenhuma dessas Variables — só documentei.

Ver [[project_ci_dev_dual_pipeline]] para a árvore completa do `ci-dev.yml` (validação vs
deploy) e [[feedback_parar_em_parede_de_permissao]] para por que a criação do site não foi
tentada por mim agora.
