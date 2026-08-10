---
name: reference-ambiente-local-dev
description: Onde a API roda de fato na máquina do usuário (porta 5100, não 5000), o que responde e o que costuma estar fora — útil para validar contrato de endpoint sem depender de mock
metadata:
  type: reference
---

# Ambiente local — onde validar contra a API de verdade

Antes de declarar "não tenho backend para validar", **sonde**. Já aconteceu de a API estar no ar
e eu quase fechar a tarefa só com mock.

## Portas

- **API .NET: `http://localhost:5100`** — é onde ela sobe de fato. Os *fallbacks* hardcoded do
  `getApiBaseUrl()` apontam para `:5000`/`172.25.32.42:5000`, que costumam estar **mortos**.
- **Mas a env var vence o fallback** (verificado em 2026-08-09): existem `.env.development`
  (`VITE_API_BASE_URL=http://localhost:5100`), `.env.production` (IP `172.25.32.42:5000`) e
  `.env.example`, e `api.ts` lê `VITE_API_BASE_URL` **antes** de cair no hostname. Ou seja, em
  `npm run dev` o front já acerta o `:5100` sozinho; o `:5000` só aparece se alguém apagar/ignorar
  o `.env.development`.
- Corolário sutil: como o axios usa **baseURL absoluta** vinda da env, o **proxy `/api` do
  `vite.config.ts` nunca é exercitado** — ele continua apontando para `172.25.32.42:5000` e é
  efetivamente inerte. Não perca tempo depurando o proxy achando que ele está no caminho.
- Vite dev server: **`http://localhost:3000`** (configurado no `vite.config`), **não** o 5173
  padrão do Vite.

## Como identificar que é a LayoutParserApi

`GET /` devolve **404 com `Server: Kestrel` e header `X-Correlation-ID`** — o 404 na raiz não
significa "não é ela". Confirme por um endpoint real (`POST /api/parse/upload` sem arquivos
devolve 400 `application/problem+json`).

## O que costuma estar quebrado

`GET /api/layoutdatabase/mqseries-nfe` retorna **HTTP 400 com timeout de pool de conexão SQL**.
Consequência prática: **o catálogo de layouts não carrega**, o `LayoutCombobox` fica vazio e o
botão "Processar Documento" nunca habilita — ou seja, **não dá para exercitar o fluxo de parse
end-to-end pela UI**, mesmo com a API no ar.

Contorno: teste o endpoint direto via `curl` com `-F layoutFile=@... -F txtFile=@...`. Um XML
propositalmente malformado (tag não fechada) força o 422 de erro de parse.

### O catálogo fora **não** impede validar com payload real

`POST /api/parse/upload` recebe o layout como **arquivo**, então o catálogo (e o SQL) ficam
inteiramente fora do caminho. Há um par real de arquivos versionado no repo da **API**:

- layout: `LayoutParserApi/.claude/tmp/26072026/LAY_TXT_MQSERIES_ENVNFE_4.00_NFe.xml`
- TXT: `LayoutParserApi/.claude/tmp/exemplos/input-crlf.txt` (MQSeries, 59 linhas de 600 chars)

Isso devolve um **200 real** (~570 KB). Para forçar o caminho "200 com defeito", corte alguns
caracteres de uma linha do TXT: o back-end passa a devolver `validationErrors` populado
(no teste, 47 erros — e note que eles **não são só de tamanho**: vêm também como "Sequência
inválida", com `expectedLength == actualLength`).

## Truque de validação sem suite de testes

Para lógica pura (helpers em `src/utils/`), dá para testar **o módulo real** sem framework:

```bash
npx esbuild src/utils/<arquivo>.ts --bundle --format=esm --outfile=<tmp>/x.mjs
node <script que importa x.mjs e faz asserções>
```

Testa o código que vai pra produção, não uma cópia. Usado para validar `resolveLayoutGuid`.

### Também dá para renderizar COMPONENTE de verdade (não só helper)

`react-dom/server` + `renderToStaticMarkup` roda os componentes reais em node e permite afirmar
sobre o HTML — inclusive alimentando o store com **payload real capturado da API**. Detalhes que
custaram tempo para descobrir:

- bundle com `esbuild --bundle --platform=node --format=cjs --loader:.css=empty --jsx=automatic`
  (o `empty` neutraliza os `import './Foo.css'`);
- se o script de teste morar fora do repo, use **caminho absoluto** nos imports (inclusive para
  `react`/`react-dom`), senão o esbuild não resolve `node_modules`;
- `services/api.ts` lê `window.location` **no import** — stub `globalThis.window` antes, o que
  exige `await import(...)` dentro de função (import estático é içado);
- adapter custom do axios **não** aplica `validateStatus`: para simular 4xx/5xx é preciso
  rejeitar com um objeto `{ isAxiosError: true, response }`;
- **armadilha do zustand 4.5:** sob SSR ele usa `api.getServerState || api.getInitialState` como
  snapshot, então `useAppStore.setState(...)` feito antes do render é **ignorado** e o componente
  lê o estado inicial (sintoma: renderiza vazio/null sem erro). Contorno: plugin do esbuild que
  substitui `use-sync-external-store/shim/with-selector(.js)` por um stub que usa o `getSnapshot`
  atual. Store e componentes seguem sendo os reais; só o quirk de SSR é neutralizado.

Ver também [[gates-crlf-divida]] e [[convencoes-reais-vs-doc]].
