# ADR 0004 — Sysmiddle somente leitura e autoria human-in-the-loop

- Status: Aceita
- Data: 2026-08-31
- Escopo: LayoutParserReact, BFF e contratos com LayoutParserApi

## Contexto

O produto precisa explicar transformações existentes em Sysmiddle e, ao mesmo tempo, ajudar o
analista a criar novas regras fiscais a partir de amostras, planilhas e schemas oficiais. Tratar os
três motores como igualmente editáveis criaria expectativa incorreta, risco técnico e risco sobre
artefatos proprietários.

## Decisão

1. Sysmiddle será executável e explicável, mas permanentemente somente leitura.
2. Não serão oferecidas criação, edição, correção, conversão, compilação ou promoção Sysmiddle.
3. Autoria assistida pela IA será exclusiva para TCL e XSL/XSLT.
4. A IA produz regras intermediárias propostas; um usuário autorizado precisa aceitar ou editar a
   proposta antes da geração de código e da validação.
5. Tanto frontend quanto API aplicam capabilities por motor; ocultar botão no frontend não é a
   barreira de segurança.

## Consequências

- O contrato precisa separar `explain` de `author`.
- `engine=sysmiddle` sempre retorna `authoring.enabled=false`.
- O Mapping Studio reutiliza a visualização, mas não os comandos de edição para Sysmiddle.
- A governança e o Test Lab concentram versões mutáveis em TCL/XSL/XSLT.
- A explicação Sysmiddle pode degradar para `opaque`/`unsupported` sem abrir mutação.
