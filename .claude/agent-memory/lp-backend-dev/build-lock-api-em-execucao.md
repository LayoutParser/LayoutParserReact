---
name: build-lock-api-em-execucao
description: dotnet build/test na LayoutParserApi falha com MSB3027 quando a API dev está rodando; contornar com -p:BaseOutputPath em vez de matar o processo do usuário
metadata:
  type: project
---

Quando a instância de desenvolvimento da API está rodando na máquina do usuário, ela mantém
`bin/Debug/net10.0/LayoutParserApi.dll` **travado**, e `dotnet build` / `dotnet test` falham com
`MSB3027` / `MSB3021` ("The file is locked by: .NET Host"). A **compilação em si passa** — só o
passo de cópia para `bin/` falha, então é fácil confundir isso com erro de código.

**Why:** o processo travado é o ambiente de trabalho do usuário (ele está usando a API para testar
o front-end). Matá-lo para destravar o build é intrusivo e não foi pedido.

**How to apply:** redirecione a saída em vez de matar o processo —
`dotnet test tests/LayoutParserApi.Tests/LayoutParserApi.Tests.csproj -p:BaseOutputPath=<dir-do-scratchpad>/`
(a propriedade é global e vale para a API e para o projeto de testes). Antes de reportar "build
quebrado", confira se os únicos erros são MSB3026/3027/3021 — nesse caso o build está verde.
Para conferir warnings novos, compare por arquivo tocado, não pelo total: os 10 retries de cópia
entram como warnings e inflam a contagem (545 reais viraram 555 numa medição).
