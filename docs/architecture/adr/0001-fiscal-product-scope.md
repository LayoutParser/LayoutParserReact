# ADR 0001 — Escopo fiscal brasileiro como nicho do produto

- Status: Aceita
- Data: 2026-08-31

## Contexto

O núcleo atual resolve documentos posicionais e transformações ligadas principalmente à NF-e. Uma
generalização para qualquer dado A → B colocaria o produto em competição direta com plataformas
amplas e diluiria suas regras mais valiosas.

## Decisão

O LayoutParser será uma plataforma de mapeamento e transformação de documentos fiscais brasileiros:
NF-e, CT-e, MDF-e, NFS-e e NFCom. Formatos e motores são adapters desse domínio.

## Consequências

- tipos, UX, catálogo, validação e métricas passam a carregar contexto fiscal;
- novas capacidades precisam provar valor para integração fiscal;
- NFS-e inclui jurisdição/provedor/versão;
- adapters genéricos podem existir, mas não definem o posicionamento do produto.
