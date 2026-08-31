# ADR 0002 — Identidade imutável para propriedade do workspace

- Status: Aceita para implementação cross-repo
- Data: 2026-08-31

## Contexto

O BFF possui `provider`, `subject` e `tenantId`, mas a API recebe hoje apenas o nome de exibição.
Nome/e-mail são mutáveis e não podem ser a chave de histórico fiscal.

## Decisão

O BFF encaminhará a identidade externa apenas na conexão confiável. A API manterá uma chave única
`provider + tenant/issuer + subject`, criará um `UserId` interno e vinculará memberships a esse ID.

## Consequências

- mudança de e-mail não perde histórico;
- `subject` não é exposto ao JavaScript;
- API e middleware confiável precisam evoluir juntos;
- testes de spoofing e isolamento são gate P0.
