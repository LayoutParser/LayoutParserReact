# Mapping Studio fiscal assistido por IA

> Status: arquitetura de produto aprovada para decomposição cross-repo.
> Escopo de autoria: **TCL e XSL/XSLT**.
> Sysmiddle: **somente execução e explicação**

## 1. Problema que o produto resolve

Para criar uma integração fiscal, o analista normalmente já possui grande parte do conhecimento:

1. uma ou mais amostras do documento de entrada, como TXT posicional, MQSeries, IDoc ou XML;
2. o layout estrutural da origem;
3. uma planilha Excel fornecida pelo cliente com relações, descrições e regras de negócio;
4. o schema XSD oficial da SEFAZ ou do provedor fiscal;
5. opcionalmente um XML esperado, exemplos aprovados ou uma transformação semelhante.

O trabalho caro que resta é transformar esses insumos em regras TCL e XSL/XSLT corretas,
explicáveis, testáveis e publicáveis. O objetivo do LayoutParser é tornar esse processo assistido,
sem retirar do especialista fiscal a decisão final.

## 2. Resultado esperado

```text
Pacote fiscal de entrada
  ├── amostras do documento A
  ├── layout/estrutura da origem
  ├── planilha de especificação
  ├── XSD do documento B
  └── exemplos esperados opcionais
        ↓
Normalização e inventário de campos
        ↓
Propostas da IA em MappingDraft estruturado
        ↓
Revisão humana e resolução de ambiguidades
        ↓
Geração de TCL + XSL/XSLT
        ↓
Execução, validação XSD/fiscal, diff e cobertura
        ↓
Revisão, aprovação e publicação versionada
```

Uma transformação só pode ser considerada pronta quando o conjunto TCL/XSL/XSLT consegue aplicar
as regras aceitas sobre as fixtures e produzir uma saída fiscal válida e rastreável.

## 3. Pacote de especificação fiscal

O `FiscalMappingPackage` deve ser imutável por versão e conter:

| Artefato                      | Obrigatoriedade | Finalidade                                                          |
| ----------------------------- | --------------- | ------------------------------------------------------------------- |
| Amostras de origem            | Obrigatório     | Descobrir ocorrências, formatos e valores reais/sintéticos.         |
| Definição do layout de origem | Obrigatório     | Identificar linhas, campos, posições, tipos e cardinalidade.        |
| Planilha de especificação     | Condicional     | Registrar relação origem/destino e regra informada pelo cliente.    |
| XSD de destino                | Obrigatório     | Construir a árvore-alvo e validar estrutura, tipos e cardinalidade. |
| XML esperado                  | Recomendado     | Executar comparação determinística e explicar divergências.         |
| Contexto fiscal               | Obrigatório     | Documento, versão, operação, jurisdição e ambiente.                 |

Cada upload registra hash, versão, autor, instante, classificação e política de retenção. Alterar um
insumo cria nova revisão do pacote; não modifica silenciosamente a evidência usada por um Draft.

## 4. Representação intermediária

A IA não deve escrever diretamente no catálogo oficial. Ela produz `MappingDraftRule` estruturada:

```json
{
  "id": "rule_emit_cnpj",
  "sourceRefs": ["source:LINHA004.CNPJ"],
  "targetRefs": ["xsd:nfe.infNFe.emit.CNPJ"],
  "operation": "copy",
  "conditions": [],
  "transformations": ["trim"],
  "cardinality": "1:1",
  "evidence": [
    { "kind": "spreadsheet-cell", "reference": "Mapeamento!F42" },
    { "kind": "xsd", "reference": "/NFe/infNFe/emit/CNPJ" }
  ],
  "confidence": "high",
  "status": "proposed",
  "questions": []
}
```

Estados mínimos: `proposed`, `accepted`, `edited`, `rejected`, `needs_input`, `validated` e
`superseded`. A API mantém revisão otimista, autoria e histórico de decisão.

## 5. Experiência do usuário

### Tela de preparação

- cria projeto por cliente/documento/versão;
- envia ou referencia os artefatos;
- mostra qualidade, lacunas e conflitos dos insumos;
- permite classificar colunas da planilha antes da interpretação;
- bloqueia geração quando XSD, origem ou contexto fiscal não estiverem identificados.

### Mapping Studio

```text
Origem                     Regra / copiloto                    Destino XSD
linha, campo, posição  →   condição, função, confiança    →   nó, tipo, cardinalidade
```

- seleção sincronizada entre origem, regra e destino;
- explicação humana e representação técnica;
- filtro de campos não mapeados, obrigatórios e ambíguos;
- ações `Aceitar`, `Editar`, `Rejeitar` e `Perguntar à IA`;
- edição estruturada como caminho padrão;
- editor avançado de TCL/XSL/XSLT somente para perfil autorizado;
- diff entre proposta, revisão humana e código gerado;
- nenhuma ação de autoria quando o motor for Sysmiddle.

### Fiscal Test Lab

- executar fixture individual ou suite;
- validar XML contra o XSD versionado;
- aplicar validações fiscais complementares conhecidas;
- comparar XML canônico com saída esperada;
- mostrar cobertura de campos obrigatórios/opcionais;
- navegar da divergência para regra, evidência e campo de origem;
- impedir publicação com gate obrigatório quebrado.

## 6. Copiloto, não piloto automático

A IA pode:

- propor correspondências semânticas;
- sugerir condição, conversão, lookup, constante, loop ou concatenação;
- apontar campos XSD obrigatórios sem origem;
- explicar regras existentes;
- sugerir testes e dados de borda;
- gerar TCL/XSL/XSLT a partir de regras humanas aceitas.

A IA não pode:

- publicar ou promover uma versão;
- marcar inferência como regra fiscal oficial;
- ocultar ambiguidade;
- alterar Sysmiddle;
- executar código arbitrário no navegador;
- enviar documento fiscal a provedor externo sem política e consentimento explícitos.

Feedback humano é armazenado como decisão auditável do Draft. Seu eventual uso para melhorar
prompts/modelos deve ser configurável por workspace e seguir retenção, anonimização e autorização.

## 7. Fronteira Sysmiddle

O Sysmiddle entra no produto apenas como fonte executável e explicável:

- `MappingExplanation` read-only;
- proveniência com `fieldMappings` e `sectionMappings` quando disponível;
- blocos `opaque` para semântica não suportada;
- comparação visual com a saída gerada;
- ausência completa de comandos create/update/patch/compile/promote.

O frontend deve tratar `engine=sysmiddle` como capability sem `authoring`. A API também precisa
rejeitar qualquer tentativa de mutação, independentemente do comportamento da interface.

## 8. Contratos cross-repo necessários

1. CRUD versionado de `FiscalMappingPackage` e seus artefatos.
2. Inventário normalizado de campos da origem, planilha e XSD.
3. `MappingDraft` e `MappingDraftRule` com revisão otimista.
4. job assíncrono de sugestão da IA com perguntas/limitações.
5. compilação TCL/XSL/XSLT a partir de revisão aceita.
6. explicação normalizada do código gerado.
7. Test Lab com execução, validação XSD, diff, cobertura e provenance.
8. workflow de revisão/aprovação/promoção com artefato imutável.
9. capabilities por motor, com Sysmiddle permanentemente read-only.

## 9. Critério de sucesso do primeiro caso FIAT

- pacote versionado com amostra MQSeries/IDoc, layout, planilha e XSD NF-e 4.00;
- inventário de origem e destino reproduzível;
- IA propõe regras com evidência e perguntas, sem preencher lacunas silenciosamente;
- analista consegue revisar todas as regras e campos obrigatórios;
- TCL/XSL/XSLT gerados são visualizáveis e explicáveis;
- execução produz XML válido no XSD e comparável ao gabarito;
- cada divergência aponta para regra e campo de origem;
- suíte de regressão impede promoção de versão inválida;
- nenhum artefato Sysmiddle é alterado durante o fluxo.

## 10. Métricas

- tempo do pacote recebido ao primeiro Draft executável;
- percentual de regras aceitas, editadas e rejeitadas;
- campos obrigatórios sem mapping;
- cobertura de provenance da saída;
- validações/regressões quebradas antes de publicação;
- percentual de sugestões que exigem esclarecimento humano;
- tempo entre uma pergunta da IA e sua resolução;
- zero mutação Sysmiddle e zero publicação sem aprovação humana.
