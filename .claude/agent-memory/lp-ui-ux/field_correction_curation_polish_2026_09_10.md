---
name: field-correction-curation-polish-2026-09-10
description: Revisão de UI/UX das Stories #234 (FieldDivergenceModal/XmlTree) e #244 (FieldCorrectionCuration) — o que já estava bom vs. o que foi ajustado.
metadata:
  type: project
---

Revisão pedida pelo `@lp-front-dev` após entrega funcional de #234 e #244 (sem passar por
design/a11y ainda). Lógica/contrato já validados por `@lp-contract-qa`
([[field_correction_report_2026_09_08]]) — não toquei em `services/`, `store/`, `types/`.

**Story #234 (FieldDivergenceModal + gatilho no XmlTree + feedback no XmlTransformationDisplay):
já estava alinhada ao design system.** O dev reaproveitou corretamente `components/shared/Modal`
(focus trap, retorno de foco, `aria-labelledby` já prontos), usou `--color-info`/`--color-info-bg`
para o indicador de "reporte pendente" (distinto do vermelho de linha inválida, como decidido em
[[field_correction_report_2026_09_08]]), o botão "Reportar divergência" usa `opacity` (não
`display:none`) para ficar alcançável via Tab mesmo sem hover, e o feedback de sucesso reaproveita
a classe `xml-transformation-delivery-feedback` já usada em `XmlTransformationDisplay`. Não fiz
mudança nesses arquivos — só confirmei consistência.

**Story #244 (FieldCorrectionCuration) tinha markup só funcional, precisou de polish real:**

- Cores de status hardcoded (`#dcfce7`, `#166534`, `#fee2e2`, `#991b1b`) → trocadas por tokens
  (`--color-success-bg/text`, `--color-danger-bg/text`), seguindo o padrão já usado em
  `WorkspaceAnalysisHistory.css` (referência mais próxima na mesma pasta `workspace/`).
- Aviso "só aceitos alimentam o dataset de treino" era texto corrido no header → virou um card
  `role="note"` com fundo `--color-info-bg`, destacado visualmente.
- Confirmação de decisão (pendência sinalizada pelo dev): ao aceitar/rejeitar, os botões somem e
  dão lugar a uma frase de confirmação (`role="status"`) com cor de fundo success/danger — mais
  forte que só o badge de status mudar de cor. Borda esquerda do card (3px) também muda de cor
  conforme o status, para reforço visual sem depender só de texto.
- Não criei componente novo em `shared/` porque nenhum padrão de "card de decisão aceitar/rejeitar"
  se repete em outro lugar do app ainda — se aparecer um segundo caso, extrair.

Arquivos tocados: `src/components/workspace/FieldCorrectionCuration/FieldCorrectionCuration.tsx`,
`FieldCorrectionCuration.css`. Gates rodados: lint, typecheck, format:check, vitest (testes
existentes de #234 continuam passando); não há teste de componente dedicado para
`FieldCorrectionCuration` ainda (só de store/service) — como só mudei
markup/CSS sem alterar comportamento, não criei um novo.
