---
name: feedback-agent-credential-boundary
description: Sempre parar e perguntar ao usuário quando um agente contornaria a falta de SSH/RDP/WinRM neste WSL via interop com Windows, em vez de fabricar acesso.
metadata:
  type: feedback
---

Não tentar contornar a ausência de acesso credenciado (SSH/RDP/WinRM) ao host de produção Windows
a partir deste sandbox WSL usando interop (`powershell.exe`, `cmd.exe`, mapeamento de drive, etc.)
sem antes confirmar com o usuário.

**Why:** este ambiente Claude Code roda em WSL isolado do host Windows real de produção; usar
interop para tentar alcançar a máquina de produção sem que o usuário tenha configurado esse acesso
seria contornar uma fronteira de permissão, não apenas uma limitação técnica.

**How to apply:** ao precisar de evidência ao vivo de produção (ex.: `curl` contra
`127.0.0.1:3100` no host de produção, inspecionar IIS/ARR ao vivo) e não houver esse acesso
configurado na sessão, documente exatamente o comando que precisa ser rodado e por quem, em vez de
tentar contornar. Ver [[project-login-loop-setcookie-investigation-2026-09-15]] para um caso real.
