# Memória — @lp-ui-ux (Nina)

> Fatos duráveis do projeto + aprendizados acumulados. Atualize ao descobrir algo não óbvio.

## Ecossistema (fixo)
- Front de apresentação do LayoutParser. Telas: `/upload`, `/analysis`, `/admin`.

## Design system / convenções visuais
- Base reutilizável em `components/shared`: **Button, Modal, Tabs**. Reuse antes de criar.
- **CSS por componente** (`Foo.css` ao lado do `Foo.tsx`). Evitar estilos globais novos.
- Padrão de erro: **linhas inválidas em vermelho** na análise — manter consistência de cor/significado.
- Estados obrigatórios em telas assíncronas: loading, vazio, erro.

## Fluxo de uso
- upload (TXT + layout) → análise (DocumentSummary, StructureTree, FieldDisplay/Properties) → admin (monitoramento/validações).

## Aprendizados
- (adicione aqui: decisões de UX, padrões de acessibilidade aplicados, etc.)
