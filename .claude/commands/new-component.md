---
description: Scaffold de um componente React seguindo a convenção do projeto (pasta + .tsx + .css).
argument-hint: <feature>/<NomeComponente>  (ex.: analysis/FieldBadge)
---

# /new-component

Crie um novo componente em `src/components/$ARGUMENTS` seguindo **exatamente** as convenções
do projeto. Não invente padrões — espelhe um componente vizinho da mesma feature.

## Passos

1. **Investigue** um componente irmão na mesma pasta `src/components/<feature>/` (Glob/Read)
   para copiar estilo de imports, tipagem de props e estrutura de CSS.
2. Crie a pasta (se nova) e dois arquivos:
   - `NomeComponente.tsx` — componente funcional, props **tipadas** (interface `Props`),
     export nomeado, imports via alias `@/`.
   - `NomeComponente.css` — estilos locais (sem estilos globais novos).
3. Se o componente consome dados: **não** chame `axios` — receba via props ou consuma um
   store Zustand existente. HTTP fica em `services/`.
4. Reuse `components/shared` (Button/Modal/Tabs) quando fizer sentido.
5. Rode `npm run lint && npx tsc --noEmit` e ajuste até ficar verde.

## Restrições
- Não registre rotas nem mexa em `services/` sem ser pedido (isso é missão `wire-endpoint`).
- Persona: `@lp-front-dev` (ou `@lp-ui-ux` se for puramente visual).
