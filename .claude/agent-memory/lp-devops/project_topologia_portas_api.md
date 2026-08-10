---
name: topologia-portas-api
description: Quais portas da LayoutParserApi valem em cada cenário (5000/5100/5214) e por que 172.25.32.42 nunca pode ser alvo de config de desenvolvimento
metadata:
  type: project
---

As três portas da API não são um erro de configuração — cada uma vale num cenário. Verificado
em 2026-08-10 lendo a fonte da verdade no repo `LayoutParserApi`:

| Porta | Quando vale | Fonte |
|-------|-------------|-------|
| **5000** | `dotnet run` do dev **e** produção | `appsettings.json` → `Kestrel:Endpoints:Http:Url = http://0.0.0.0:5000`, lido em `Program.cs` (~linha 433). **Vence o launchSettings.** |
| **5100** | Instância de dev publicada nesta máquina (serviço Windows `LayoutParserApi`) | `ci-dev.yml` da API aplica override `Kestrel__Endpoints__Http__Url`; o comentário lá diz que é "para não colidir com o `dotnet run` do dev (5000)" |
| **5214** | Praticamente morto | `Properties/launchSettings.json`; perde para o appsettings |

Confirmação cruzada: `appsettings.Development.json` da API libera CORS exatamente para
`http://localhost:3000` e `http://localhost:8081` — as duas origins deste front em dev.

**`172.25.32.42` é a máquina de PRODUÇÃO (WINSRV2022-LIB), não a de dev.** A máquina de dev é
`NDD-NOT-10910`, a local. Confirmei em 2026-08-10 que a API de produção está no ar
(`GET http://172.25.32.42:5000/api/parse/upload` → HTTP 405, ou seja, rota existe e exige POST).

**Why:** até 2026-08-10 o proxy `/api` do `vite.config.ts` apontava para `172.25.32.42:5000` —
isto é, o servidor de dev do Vite tinha produção como alvo. Nunca causou incidente por
acidente: `.env.development` define `VITE_API_BASE_URL`, o axios usa URL absoluta e o proxy
jamais era exercitado. Bastaria alguém comentar aquela linha (ou usar caminho relativo) para
uploads de teste começarem a bater na API de produção.

**How to apply:** qualquer configuração de desenvolvimento (proxy do Vite, `.env.development`,
`.env.example`, defaults em código) aponta para `localhost` — nunca para `172.25.32.42`. O
proxy hoje tem default `http://localhost:5100` e é sobrescrevível por `VITE_DEV_API_PROXY_TARGET`
(use `:5000` se estiver rodando a API na mão). O IP de produção só pode aparecer em
`.env.production` e no fallback de produção de `src/services/api.ts`. Ver
[[project_dev_machine_iis_topology]].

**Gotcha de build:** `import.meta.env.DEV` é `false` em **qualquer** `vite build`, inclusive
`--mode development` — `DEV` deriva do `NODE_ENV`, que o `vite build` fixa em `production`
independentemente do `--mode`. Só `npm run dev` (serve) tem `DEV === true`. Consequência
prática: código atrás de `if (import.meta.env.DEV)` não existe em nenhum artefato buildado. Se
algum dia for preciso um comportamento ligado ao *modo* (e não ao serve/build), a condição
correta é `import.meta.env.MODE !== 'production'`.
