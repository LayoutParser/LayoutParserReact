---
name: parar-em-parede-de-permissao
description: ao investigar infraestrutura sensível (IIS, serviços, config do sistema) e esbarrar numa parede de permissão/elevação, parar e reportar — não procurar outro caminho de interop/credencial pra contornar
metadata:
  type: feedback
---

Quando esbarrar numa parede de permissão/acesso ao investigar infraestrutura da máquina (IIS,
serviços Windows, config do sistema, etc.) a partir do meu contexto de execução atual, **parar
e reportar a parede como achado** — não tentar outra ferramenta/caminho pra conseguir a mesma
informação por fora (ex.: já que `Get-Website`/`Import-Module WebAdministration` falhou por
falta de elevação, não ler `applicationHost.config` direto do disco, não tentar
`Start-Process -Verb RunAs`, não procurar credencial admin guardada em algum lugar).

**Why:** na tarefa anterior (2026-07-20/21) usei `git.exe`/`ssh.exe` via WSL interop pra
contornar a falta de SSH no bash puro, herdando as credenciais reais do usuário — funcionou e
o usuário manteve o resultado quando perguntado, **mas deixou explícito que isso não é
autorização geral pra repetir o padrão**, e pediu pra eu sempre trazer à tona antes de tratar
como concluído. Na tarefa seguinte (servir o front localmente via IIS — infra bem mais
sensível: algo rodando persistente na máquina, não só um push pontual), o próprio pedido já
veio com esse limite explícito antes de eu começar a investigar.

**How to apply:** distinguir dois tipos de ação:
1. **Inspeção read-only no MEU próprio nível de privilégio** (`Get-Service`, `netstat`/
   `Get-NetTCPConnection`, `curl`/`Invoke-WebRequest` num endpoint HTTP, ler arquivo com
   permissão normal) — isso é investigação normal, não é "contornar parede", é só usar as
   ferramentas disponíveis no meu próprio contexto.
2. **Qualquer coisa que exija privilégio que eu não tenho** (IIS config via
   `WebAdministration`, `Get-WindowsOptionalFeature`, qualquer coisa que peça elevação) — ao
   primeiro sinal de "requires elevation"/"Process should have elevated status", **parar ali**.
   Não tentar uma segunda ferramenta pra chegar na mesma informação por outro caminho. Reportar
   a parede exatamente como apareceu (mensagem de erro literal) e deixar a decisão de como
   prosseguir (rodar como admin, pedir pro usuário fazer manualmente, deixar o próprio job do
   runner — que pode ter privilégio maior, ex. `LocalSystem` — fazer em vez de mim) para o
   orquestrador/usuário.

Ver [[project_dev_machine_iis_topology]] (onde apliquei isso ao esbarrar em `Get-Website`) e
[[project_gh_cli_unavailable_wsl]] (o precedente do `git.exe`/`ssh.exe` que gerou esse limite).
