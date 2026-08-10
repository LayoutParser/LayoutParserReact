# Agent Handoff Protocol — LayoutParser React

## Propósito

Evitar acúmulo de contexto ao trocar de agente (`@agent`). Cada troca compacta o agente
anterior num **artefato de handoff (~400 tokens)** em vez de reter a persona inteira.

## Quando aplica

Sempre que: (1) o usuário invoca um novo agente via `@agent-name`; e (2) já havia outro
agente ativo na sessão.

## Protocolo

### Ao sair (agente que entrega)

Gere mentalmente o artefato:

```yaml
handoff:
  from_agent: '{agente_atual}'
  to_agent: '{novo_agente}'
  task_context:
    task: '{tarefa atual}'
    branch: '{branch git}'
    current_step: '{último passo}'
  decisions:
    - '{decisão-chave 1}'
    - '{decisão-chave 2}'
  evidence:
    - '{arquivo:linha, comando ou fonte da verdade sem dado sensível}'
  verdict: '{PASS|FAIL|BLOCK|DRIFT|UNVERIFIED, quando aplicável}'
  files_modified:
    - '{arquivo 1}'
    - '{arquivo 2}'
  blockers:
    - '{bloqueio ativo, se houver}'
  next_action: '{o que o agente que entra deve fazer}'
```

### Ao entrar (agente que recebe)

Recebe: (1) sua **própria persona** completa; (2) o **artefato de handoff**; e **NÃO** a
persona completa do agente anterior.

### Limites de compactação

| Limite                   | Valor                            |
| ------------------------ | -------------------------------- |
| Tamanho máx. do artefato | 500 tokens                       |
| Resumos retidos          | 3 (descarta o mais antigo no 4º) |
| Máx. decisões            | 5                                |
| Máx. arquivos            | 10                               |
| Máx. bloqueios           | 3                                |
| Máx. evidências          | 5                                |

### Sempre preservar

Tarefa atual · branch · decisões arquiteturais · arquivos tocados · evidências/veredito ·
bloqueios · próximo passo. Nunca inclua valor de segredo ou payload real no handoff.

### Nunca carregar adiante

Persona completa do agente anterior · sua lista de comandos · suas tool configs · saudações.

## Exemplo

`@lp-contract-qa` identifica drift → `@lp-front-dev` corrige → `@lp-security` revisa →
`@lp-qa` valida → `@lp-doc` documenta → `@lp-devops` faz push. A cada troca, só o artefato
(~400 tokens) sobrevive; a persona anterior é descartada.
