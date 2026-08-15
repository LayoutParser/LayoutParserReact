---
name: project-google-oauth-and-idoc-edit-fix-2026-08-13
description: Validação QA de dois commits em codex/feat-sap-idoc-hierarchy — Google OAuth (98602ab) e reorder árvore + fix edição IDoc (103c4ff)
metadata:
  type: project
---

Branch `codex/feat-sap-idoc-hierarchy`, 2026-08-13. Ambos os commits validados com **PASS**.

**Commit 98602ab (Google OAuth)**: coberto por `server/test/app.test.ts` com injeção real de
request no Fastify (não é mock de HTTP externo) — inclui o cenário exato "responde 503 em
/auth/google/login quando o Google não está configurado, sem afetar o Entra" e o fluxo completo
de redirect/state/nonce/PKCE/callback com `GoogleOidcClient` fake. `server/test/oidc.test.ts` e
`config.test.ts` também novos. Considerei essa cobertura suficiente para PASS sem precisar subir
o BFF real, pois o teste já exercita a rota Fastify real end-to-end (roteamento + config +
resposta), só troca a chamada de rede externa ao IdP por um client fake — equivalente ao padrão
já aceito para fluxo mockado em [[project_sap_idoc_hierarchy_validation]].

**Commit 103c4ff (reorder árvore + fix edição IDoc)**: `StructureTree` antes de `FieldDisplay`
confirmado estruturalmente lendo o JSX de `AnalysisModeTabs.tsx` (linhas 71/74). O relaxamento em
`resolvePositionalLineIndex` (`src/utils/positionalFieldEdit.ts`) tem 10 novos testes unitários
cobrindo segmento único/repetido/aninhado/fora dos limites/`totalGroups=0`.

**Gap desta rodada:** BFF real não estava configurado na sessão (`server/.env` não existe —
era local/não versionado da rodada anterior, perdido entre sessões). Não recriei o `.env` para
validar upload real do par IDoc SAP (custo alto vs. benefício, dado que a API .NET real em
`http://<gateway-wsl>:5100` respondeu `Healthy` mas o BFF não subiu). Tratei como suficiente a
combinação unit (`positionalFieldEdit.test.ts`) + e2e `layout-parser.spec.ts:239` ("edita somente
o intervalo da tag e transforma o TXT atualizado", passou desktop+mobile) como equivalente
automatizado — documentado como lacuna, não omitido.

**Achado — e2e flake pré-existente (não é regressão destes commits):** o teste
`layout-parser.spec.ts:288` ("explica a ausência de candidatos Sysmiddle e TCL/XSL sem mensagem
de background") falha de forma consistente e reprodutível **apenas no projeto mobile-chromium**
(timeout esperando `region` "Nenhum candidato foi encontrado"). Confirmei isolando: fiz checkout
temporário do estado de `8326412` (commit anterior a ambos os commits revisados, restaurado
depois com `git checkout HEAD -- .`) e o mesmo teste falhou do mesmo jeito — portanto é flake/bug
pré-existente do ambiente ou do teste, não introduzido por 98602ab nem 103c4ff. Não abrir bug
contra estes dois commits por causa disso; se for reportar, apontar para o teste em si
(`e2e/layout-parser.spec.ts:288`, projeto mobile-chromium).

**How to apply:** ao revisar múltiplos commits juntos, rodar `npm run test:e2e` completo primeiro
e, se algo falhar, isolar com `git checkout <commit-anterior> -- .` + rerun do teste específico
antes de atribuir a falha ao diff em revisão — evita falso FAIL. Lembrar de restaurar com
`git checkout HEAD -- .` (nunca usar `reset --hard`) depois.
