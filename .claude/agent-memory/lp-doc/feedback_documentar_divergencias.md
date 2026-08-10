---
name: documentar-divergencias
description: Ao achar inconsistência de config ou código órfão, documentar o estado real e reportar — nunca "consertar" nem escolher um lado
metadata:
  type: feedback
---

Quando a documentação esbarra numa **inconsistência** (dois valores de config discordando,
componente que existe mas ninguém importa, endpoint que o front chama mas o back-end não
implementou): **documente o estado observado, sinalize explicitamente como pendência, e
reporte no resumo final**. Não altere código de produção nem eleja um dos lados como "o
correto" na prosa.

**Why:** pedido direto do usuário/agente coordenador (2026-08-10, ao alinhar o README com a
limpeza de código morto). O README existia afirmando coisas que o código não fazia — o valor
da doc aqui é ser auditável contra o código, inclusive quando o código está inconsistente.
Escolher um lado na doc esconde a dívida e cria uma terceira "verdade".

**How to apply:**

- Antes de listar componentes numa árvore de pastas, **cheque quem importa cada um**
  (`grep -rl "from '.*/Componente'" src`). Existir no disco ≠ estar no fluxo. Use uma
  "Nota de estado real" logo abaixo da árvore para os órfãos, em vez de omiti-los.
- Endpoint consumido por um service mas sem componente chamando, ou sem implementação no
  back-end: entra na tabela de contrato **com a ressalva em negrito**, não como pronto.
- Divergências de config viram: (a) tabela com o valor real de cada arquivo, (b) blockquote
  "Inconsistência conhecida (documentada, não resolvida)", (c) item de roadmap.
- Feche o turno reportando a inconsistência ao chamador para reconciliação.

Ver também [[readme-estrutura-e-indice]] se existir.
