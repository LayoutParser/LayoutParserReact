---
name: feedback-convencoes-reais-vs-doc
description: Quando a doc (CLAUDE.md/frontend-standards.md) e o código real divergem em convenção de estilo, seguir o código real e avisar — não "corrigir" o código pra bater com a doc.
metadata:
  type: feedback
---

Ao implementar `feat/xml-transformation-toggle` (2026-07-20), encontrei duas convenções
escritas em `.claude/rules/frontend-standards.md`/`CLAUDE.md` que **nenhum arquivo real do
projeto** segue:

1. "Use o alias `@/`" — `grep -rln "from '@/" src` não encontra nenhum arquivo; os ~14
   componentes existentes usam 100% paths relativos (`../../store/...`).
2. "Componente = pasta + Foo.tsx + Foo.css" — nenhum componente fica em pasta própria; todos
   ficam direto dentro da pasta da feature (`components/analysis/FieldDisplay.tsx` +
   `FieldDisplay.css`, não `components/analysis/FieldDisplay/FieldDisplay.tsx`).

Decidi seguir o padrão REAL (path relativo, sem subpasta) nos componentes novos
(`AnalysisModeTabs`, `XmlTransformationDisplay`), não a doc escrita.

**Why:** a própria `frontend-standards.md` abre dizendo "Padrões — derivados do código
existente — siga o que já está lá, não reinvente". Um arquivo novo seguindo a doc à risca
seria o ÚNICO do projeto inteiro com esse estilo — pior para consistência/manutenção do que
divergir da doc. Não tentei "corrigir" os ~14 arquivos existentes nem a doc — nenhuma das
duas coisas foi pedida, e mudar convenção em massa é decisão do usuário, não algo a fazer de
passagem dentro de uma feature.

**How to apply:** ao criar qualquer arquivo novo (componente, service, store), checar o
padrão REAL de 2-3 arquivos análogos antes de seguir a doc ao pé da letra. Se a doc e o
código divergirem, seguir o código e mencionar a divergência no relatório final (para o
usuário decidir se quer padronizar a doc ou o código) — não decidir por conta própria qual
das duas "corrigir". Ver achado completo em [[project-xml-transformation-feature]].
