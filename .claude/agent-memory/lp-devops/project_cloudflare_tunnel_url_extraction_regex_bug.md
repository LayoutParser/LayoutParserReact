---
name: project_cloudflare_tunnel_url_extraction_regex_bug
description: Bug de produção em Register-CloudflareTunnel.ps1 — regex capturava api.trycloudflare.com (endpoint interno) em vez da URL pública real do túnel; corrigido em 2026-08-22.
metadata:
  type: project
---

Em 2026-08-22, após a task `Cloudflared-QuickTunnel` finalmente registrar e conectar com
sucesso no host de produção (ver [[project_cloudflare_tunnel_task_never_registered_2026_08_22]]
para o fix de IPv6 que resolveu o travamento anterior), o script imprimiu como resultado
`URL pública do túnel: https://api.trycloudflare.com` — que está errado. Esse host é o
endpoint da API do Cloudflare usado internamente pelo `cloudflared` para requisitar o túnel
(aparece em `Post "https://api.trycloudflare.com/tunnel"`), não a URL pública do túnel (que
tem formato `https://palavras-aleatorias.trycloudflare.com`).

**Causa raiz:** o regex original `'https://[a-z0-9-]+\.trycloudflare\.com'` também confere com
"api". Como `logs/cloudflared-tunnel.log` é append-only entre reinícios/execuções, execuções
anteriores (as tentativas falhas de antes do fix de IPv6) deixaram no log a linha de erro
contendo `https://api.trycloudflare.com`. O script usava `Select-Object -First 1` no arquivo
inteiro, então pegou esse match antigo/errado em vez da URL real, que estava mais adiante
(gerada pela execução bem-sucedida atual).

**Correção aplicada** em `scripts/Register-CloudflareTunnel.ps1` (bloco final, era linha
~122-136): (1) restringe a busca às linhas a partir do índice do **último** marcador
`--- launcher iniciando cloudflared ---` no log, ignorando execuções/reinícios anteriores
acumulados no arquivo; (2) filtra explicitamente fora o valor exato
`https://api.trycloudflare.com`; (3) usa `Select-Object -Last 1` dentro do trecho relevante
em vez de `-First 1` no arquivo inteiro.

**Por que:** log append-only + regex genérico demais + pegar o primeiro match do arquivo
inteiro é uma combinação que sempre vai preferir ruído histórico a estado atual. Qualquer
outro script que faça parsing de log cumulativo neste projeto (ex.: BFF) deve preferir
"mais recente após o último marcador de boot" a "primeiro match do arquivo".

**Como aplicar:** ao revisar/editar scripts que extraem informação de logs append-only,
sempre considerar se o valor procurado pode ter aparecido em execuções anteriores (falhas ou
não) antes da execução atual, e ancorar a busca num marcador de início de execução em vez de
depender só de `-First`/`-Last` sobre o arquivo inteiro.
