# Detecção automática de layout para MQSeries e IDoc

> **Status:** implementação concluída em branch coordenada de API/front; aguardando promoção.
>
> **Data da análise:** 2026-08-29.
>
> **Validação:** 12 testes específicos da API, 432 testes completos da API, testes do front/BFF,
> Playwright desktop/mobile, fixture MQSeries real de 35.400 bytes (59 linhas, 705 campos) e IDoc
> real (55 linhas, 263 campos).
>
> **Escopo inicial:** anexar somente o documento e identificar o layout de entrada para NFe 4.00
> nas famílias MQSeries e SAP IDoc.

## Rastreabilidade de produto

- Project do front: [LayoutParserReact — Backlog #3](https://github.com/orgs/LayoutParser/projects/3);
- Epic: [LayoutParserReact #177](https://github.com/LayoutParser/LayoutParserReact/issues/177);
- PBI: [LayoutParserReact #178](https://github.com/LayoutParser/LayoutParserReact/issues/178);
- dependência/espelho no front:
  [LayoutParserReact #179](https://github.com/LayoutParser/LayoutParserReact/issues/179);
- entrega da API: [LayoutParserApi #213](https://github.com/LayoutParser/LayoutParserApi/issues/213),
  incluída no [Project da API #2](https://github.com/orgs/LayoutParser/projects/2);
- investigação, gate e MCP da API:
  [#214](https://github.com/LayoutParser/LayoutParserApi/issues/214),
  [#215](https://github.com/LayoutParser/LayoutParserApi/issues/215) e
  [#216](https://github.com/LayoutParser/LayoutParserApi/issues/216), como sub-issues de #213;
- consumo, UX e gate: LayoutParserReact
  [#181](https://github.com/LayoutParser/LayoutParserReact/issues/181),
  [#182](https://github.com/LayoutParser/LayoutParserReact/issues/182) e
  [#183](https://github.com/LayoutParser/LayoutParserReact/issues/183);
- evolução do MCP: [LayoutParserReact #184](https://github.com/LayoutParser/LayoutParserReact/issues/184);
- marco coordenado: [front #3](https://github.com/LayoutParser/LayoutParserReact/milestone/3) e
  [API #1](https://github.com/LayoutParser/LayoutParserApi/milestone/1).

## 1. Conclusão executiva

É viável remover a seleção manual para os documentos em que a API consiga **provar uma única
correspondência**. Não é possível prometer identificação universal de 100% quando dois layouts
aceitam exatamente as mesmas evidências presentes no arquivo: nesse caso, o arquivo não contém
informação suficiente para distingui-los.

A garantia correta para o produto é:

- **100% de precisão no subconjunto auto-selecionado**: nenhum layout é escolhido automaticamente
  sem prova exclusiva;
- **cobertura progressiva**: casos sem prova ficam como `ambiguous` ou `not_found`, sem chute;
- **até cinco alternativas explicáveis em `ambiguous`**: a API ordena os candidatos compatíveis
  por equivalência estrutural e o usuário faz a escolha explícita;
- **seleção manual como fallback**, não como etapa obrigatória do fluxo normal.

O motor deve ser determinístico. IA/ML pode ordenar sugestões em casos ambíguos, mas nunca
transformar uma estimativa em seleção autoritativa.

## 2. Estado implementado e confirmado em código

### Front-end

O fluxo principal agora começa apenas com o documento e chama `POST /api/parse/auto`:

- `src/components/layout/LayoutParserPage.tsx` orquestra detecção, escolha e proveniência;
- `src/components/upload/AutoLayoutDetectionPanel.tsx` apresenta os três estados e o top 5;
- `src/services/api.ts` envia `documentFile` e o `layoutGuidOverride` explícito;
- `src/components/analysis/DocumentEditActions/DocumentEditActions.tsx` revalida o TXT editado
  sem trazer o XML interno ao navegador.

O botão **Processar Documento** exige somente o arquivo. O catálogo/manual e `/api/parse/upload`
permanecem como fallback avançado.

### API

`LayoutDetector.DetectType` continua reconhecendo a **família física**, enquanto
`AutomaticLayoutDetectionService` resolve o layout dentro dessa família:

- MQSeries: `HEADER`, sequências numéricas e heurística de 600 caracteres;
- IDoc: primeiro registro começando por `EDI_`/`ZRSDM_` ou uma heurística textual;
- XML e `unknown` completam os estados atuais.

O probe usa fingerprints versionadas do catálogo, cobertura integral de registros, largura e ordem
física autoritativa para IDoc. Para MQSeries, a ordem da árvore é informativa porque não representa
necessariamente o stream físico. Além disso:

- `POST /api/parse/auto` recebe somente `documentFile` e mantém o XML descriptografado na API;
- extensão e `layoutName` selecionado podem sobrescrever o tipo detectado;
- o parser devolve sucesso para permitir visualização mesmo com linhas não identificadas;
- ocorrências mínimas/máximas e linhas não identificadas são registradas em log, mas não tornam o
  candidato incompatível.

O resultado nunca depende apenas de `success=true`: um catálogo incompleto/truncado desabilita a
seleção autoritativa e devolve `not_found` com limitações explícitas.

## 3. Experimento com o catálogo e amostras reais

O estudo consultou o catálogo local da API em execução, sem persistir ou publicar conteúdo dos
documentos. Foram encontrados **57 layouts**; o recorte NFe 4.00 contém nove variantes relevantes:

| Família  | Layouts avaliados | Característica física                                                              |
| -------- | ----------------: | ---------------------------------------------------------------------------------- |
| MQSeries |                 5 | `WithBreakLines=false`, stream em registros de 600 caracteres pelo fallback legado |
| SAP IDoc |                 4 | `WithBreakLines=true`, um segmento por linha                                       |

Os nove layouts têm `LimitOfCaracters=0`, então dependem do fallback de 600 caracteres. Antes de
usar tamanho como prova autoritativa, esse metadado precisa ser migrado/validado no catálogo.

### Colisões estruturais encontradas

- Marelli MQSeries e Comau MQSeries possuem **100% do mesmo conjunto de identificadores de
  registros** (`InitialValue`). Os limites dos campos diferem, mas uma divisão posicional diferente
  não prova incompatibilidade sem regras semânticas ou constantes observáveis.
- CNHI versus Marelli/Comau MQSeries compartilham aproximadamente **91,4%** dos identificadores.
- Marelli SAP versus SAP genérico compartilham aproximadamente **93%** dos segmentos.
- Comau SAP versus PSCA SAP compartilham aproximadamente **95,4%** dos segmentos.

Não houve colisão do hash completo das definições posicionais no recorte. Isso só prova que os
layouts cadastrados são diferentes; não prova que um documento concreto consegue revelar essa
diferença.

### Cobertura dos registros das duas amostras

| Amostra                        | Resultado observável                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MQSeries, 59 registros físicos | Os cinco layouts MQSeries reconheceram todos os 59 registros. O arquivo, pelos critérios usados hoje pelo parser, é **ambíguo**.                                        |
| SAP IDoc, 55 segmentos         | Apenas Marelli reconheceu todos os 55 segmentos; SAP genérico deixou 1 sem correspondência e Comau/PSCA deixaram 15. Há evidência para seleção **única** nessa amostra. |

`MinimalOccurrence` não funcionou como gate: layouts válidos declaram mínimo 1 para muitos registros
ausentes nas amostras. Essa dívida de metadado já é tolerada pelo parser atual e precisa ser
resolvida antes de cardinalidade virar prova dura.

## 4. O que conta como prova

### Evidência dura

Pode excluir um candidato quando a regra estiver versionada e confiável:

1. família física incompatível (`WithBreakLines`/formato);
2. largura explícita do layout incompatível com todos os registros;
3. identificador de registro/segmento desconhecido;
4. ordem ou relação pai-filho impossível;
5. cardinalidade confiável violada;
6. constante discriminadora explícita ausente ou diferente;
7. regra semântica determinística inválida, como enumeração, checksum ou identificador de parceiro,
   quando essa regra fizer parte do perfil de detecção do layout.

### Evidência apenas sugestiva

Não pode autorizar seleção automática sozinha:

- extensão ou nome do arquivo;
- nome do layout contendo cliente, `MQSERIES` ou `SAP`;
- quantidade de campos;
- layout com maior quantidade de linhas reconhecidas, quando mais de um reconhece tudo;
- similaridade por IA/ML;
- CNPJ, emissor ou receptor inferido sem regra cadastrada e versionada.

## 5. Arquitetura proposta

```text
Arquivo único
    │
    ▼
BFF: autenticação, limite e correlationId
    │
    ▼
API: detectar família e formato físico
    │
    ▼
Índice de fingerprints do catálogo
    │  pré-filtra por largura, quebra de linha e marcadores
    ▼
Matcher estrito, sem efeitos colaterais
    │
    ├── 1 candidato provado ──► unique ──► parse com o layout interno da API
    ├── 2+ compatíveis ───────► ambiguous ──► top 5 explicável; usuário escolhe
    └── 0 compatíveis ────────► not_found ──► diagnóstico + seleção manual
```

### Componentes sugeridos na API

- `LayoutFingerprintBuilder`: normaliza o XML do layout em uma assinatura versionada;
- `LayoutFingerprintCache`: índice pré-calculado por versão/hash do catálogo;
- `LayoutMatchingService`: avalia todos os gates duros e produz evidências/conflitos;
- `LayoutDetectionProfile`: regras discriminadoras explícitas por layout, separadas de nomes;
- `StrictLayoutProbe`: modo de validação sem aprendizado, transformação ou gravação de amostra;
- gate de colisão no cadastro/refresh: sinaliza layouts indistinguíveis e exige um discriminador ou
  aceita que permaneçam ambíguos.

O endpoint automático deve buscar o layout internamente por `layoutGuid`. Além de simplificar o
front, isso evita enviar o XML descriptografado do layout ao navegador para depois devolvê-lo à
API.

## 6. Contrato HTTP implementado

`POST /api/parse/auto`, multipart com `documentFile` e `layoutGuidOverride` opcional.

Ambiguidade é resultado normal de domínio, não erro de infraestrutura. O endpoint pode responder
`200` nos três estados; arquivo inválido continua `422` e falha interna continua `500`.

```json
{
  "success": true,
  "correlationId": "...",
  "detection": {
    "status": "unique",
    "detectedType": "idoc",
    "algorithmVersion": "layout-probe-v1",
    "catalogVersion": "sha256:...",
    "selectedLayout": {
      "layoutGuid": "...",
      "name": "LAY_..."
    },
    "candidates": [
      {
        "rank": 1,
        "layoutGuid": "...",
        "name": "LAY_...",
        "matchScore": 100,
        "isTied": false,
        "evidence": ["records_matched:55/55", "marker_order:consistent"],
        "conflicts": [],
        "limitations": []
      }
    ]
  },
  "parseResult": {}
}
```

Semântica obrigatória:

- `unique`: exatamente um candidato permanece após todos os gates duros; `parseResult` preenchido;
- `ambiguous`: dois ou mais candidatos continuam compatíveis; devolver no máximo cinco, ordenados
  por equivalência, sem `selectedLayout` implícito;
- `not_found`: nenhum candidato compatível; expor motivos sanitizados;
- catálogo incompleto: `not_found`, sem override aceito, mesmo que um candidato conhecido pareça
  compatível;
- `layoutGuidOverride`: escolha explícita do usuário, auditável e nunca confundida com detecção;
- `evidence`/`conflicts`/`limitations`: códigos técnicos estáveis, traduzidos pelo front sem
  conteúdo bruto do documento.

### Ranking dos cinco candidatos

O ranking só acontece **depois** dos gates duros. Um layout incompatível não volta ao conjunto por
ter score alto. Entre os candidatos que permanecerem compatíveis, a API calcula uma equivalência
determinística e versionada usando cobertura de marcadores/segmentos, largura, ordem/hierarquia,
cardinalidade confiável e discriminadores registrados.

- retornar `min(5, quantidadeDeCandidatosCompatíveis)`;
- `matchScore` é um índice de equivalência entre `0` e `100`, não uma probabilidade estatística;
- cada item contém `rank`, `matchScore`, evidências positivas, diferenças e a versão do algoritmo;
- empates têm ordem estável para a UI, mas continuam empatados semanticamente;
- mesmo que o primeiro tenha score muito superior, dois candidatos compatíveis mantêm o estado
  `ambiguous`; somente prova exclusiva produz `unique`;
- a escolha do usuário é enviada como `layoutGuidOverride` e registrada como `ranked_override`.

Pesos e regras pertencem à API. O front apenas apresenta o ranking e não recalcula score, não
remove candidatos e não escolhe o primeiro silenciosamente.

Depois que o contrato estabilizar, o MCP da API deve ganhar uma tool tipada `detect_layout`. Até lá,
`api_post` pode exercitar o endpoint sem duplicar regra de domínio no MCP.

### Estado do MCP em 2026-08-29

O MCP da API foi compilado e inicializado localmente com protocolo `2025-06-18`. As tools
disponíveis são `parse_document`, `api_get`, `api_post` e `list_endpoints`. `api_get` confirmou
`/health` saudável e `/health/ready` degradado somente pela configuração local do Ollama. O
endpoint `POST /api/parse/auto` agora existe na branch coordenada e pode ser exercitado por
`api_post`; a tool tipada `detect_layout` permanece evolução separada. O MCP é uma interface para
o domínio da API; comunicação entre agentes continua sendo feita por handoff/subagentes, não pelo
protocolo MCP.

## 7. UX proposta

1. A tela começa com **Anexar documento**; o combobox deixa de ser obrigatório.
2. Após o arquivo, mostrar `Analisando estrutura…` em região `aria-live`.
3. Em `unique`, mostrar chip **Layout identificado** com nome, evidências resumidas e ação
   **Trocar manualmente**.
4. Em `ambiguous`, mostrar até cinco cartões ordenados com nome, índice de equivalência,
   evidências e diferenças conhecidas; nunca pré-selecionar silenciosamente.
5. O clique em **Usar este layout** exige confirmação clara e produz override manual auditável.
6. Em `not_found`, mostrar diagnóstico e revelar o catálogo manual completo.
7. O modo manual continua disponível em **Opções avançadas**, inclusive para suporte e regressão.

## 8. Segurança, desempenho e observabilidade

- manter limites de tamanho/tipo, rate limiting, autenticação e `X-Correlation-ID` no BFF;
- não registrar conteúdo do documento, campos fiscais, e-mail ou XML descriptografado;
- limitar tempo e quantidade de candidatos; não executar 57 parses completos em série;
- pré-calcular fingerprints no refresh do catálogo e invalidar por hash/versão;
- normalizar o documento uma vez por requisição e reutilizar a divisão de registros por largura;
- falhar fechado quando o catálogo atingir o teto ou algum layout não puder ser avaliado;
- o probe não pode disparar aprendizado, transformação, cache de XML final ou outros efeitos;
- auditar `detected`, `ambiguous`, `manual_override` e `not_found` apenas com IDs técnicos;
- proteger contra zip bomb, encoding patológico e entradas que maximizem backtracking.

## 9. Estratégia de testes e aceite

### Corpus

- pelo menos 20 documentos redigidos ou sintéticos representativos por layout;
- exemplos positivos, negativos e quase duplicados;
- matriz cruzada: cada documento é avaliado contra todos os layouts da mesma família;
- mutações de marcador, largura, ordem, cardinalidade e discriminadores;
- nenhum payload real é versionado sem sanitização e autorização.

### Métricas/gates

- **0 falsos auto-selecionados** no corpus aprovado;
- precisão das auto-seleções = **100%**;
- ambiguidades conhecidas permanecem `ambiguous`;
- o top 5 é estável, explicável, contém somente candidatos compatíveis e nunca auto-seleciona o
  primeiro colocado;
- tempo p95 acordado para detecção + parse;
- E2E desktop/mobile: arquivo → identificação → parse, ambiguidade e fallback manual;
- correlationId preservado do navegador à API/MCP;
- relatório de colisões executado sempre que o catálogo mudar.

## 10. Entregas coordenadas

1. **API (#213/#214):** contrato `unique`/`ambiguous`/`not_found`, ranking top 5, cache
   versionado, override revalidado e auditoria por correlation ID — implementado.
2. **Front (#181/#182):** fluxo arquivo-primeiro, estados acessíveis, fallback manual e
   revalidação do TXT editado sem XML no navegador — implementado.
3. **Gates (#183/#215):** 432 testes da API, 12 específicos, quality do front/BFF, Playwright
   desktop/mobile, fixture MQSeries top 5 → escolha → parse e IDoc real unique → parse —
   implementados; ampliação do corpus continua evolução permanente.
4. **MCP (#216/#184):** tool dedicada `detect_layout` após promoção do endpoint — pendente.
5. **P2:** enriquecer perfis discriminadores e expandir para outras famílias/documentos.

## 11. Resumo em inglês / English summary

Automatic selection is feasible only when the API can prove a single compatible layout. The
product guarantee should be **100% precision for auto-selected documents**, not universal coverage.
Observed MQSeries samples can match several near-duplicate layouts and must remain ambiguous;
the observed SAP IDoc sample had a unique segment signature. A deterministic, side-effect-free
matching service should return `unique`, `ambiguous`, or `not_found`, preserve manual override,
cache versioned fingerprints, and never let an ML score authorize an automatic selection.
