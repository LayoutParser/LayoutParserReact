# ADR 0003 — Explicação de mapping independente do motor

- Status: Aceita para contrato
- Data: 2026-08-31

## Contexto

TCL, XSL/XSLT e Sysmiddle representam regras de formas diferentes. Interpretá-las no navegador
duplicaria domínio, aumentaria risco e produziria explicações inconsistentes.

## Decisão

A LayoutParserApi publicará `MappingExplanation`, um modelo canônico de regras, fontes, destinos,
condições, operações, cardinalidade, suporte e limitações. O React apenas renderiza esse contrato.

## Consequências

- cada motor precisa de um adapter na API;
- o Mapping Studio pode oferecer a mesma UX para motores diferentes;
- trechos proprietários podem degradar para `opaque` sem inventar semântica;
- fixtures de contrato tornam-se requisito para cada adapter.
