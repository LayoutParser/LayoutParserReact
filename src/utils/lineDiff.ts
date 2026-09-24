/**
 * Diff de linhas simples baseado em LCS (Longest Common Subsequence).
 *
 * Não há dependência de diff no projeto (`package.json` não lista nenhuma) e o conteúdo
 * comparado (TCL/XSL/XSLT) é texto puro de tamanho moderado, então um LCS O(n*m) é suficiente
 * sem puxar uma lib nova.
 */

export type LineDiffOpType = 'unchanged' | 'added' | 'removed';

export interface LineDiffOp {
  type: LineDiffOpType;
  value: string;
  /** Número da linha (1-based) no lado antigo, quando aplicável. */
  oldLineNumber: number | null;
  /** Número da linha (1-based) no lado novo, quando aplicável. */
  newLineNumber: number | null;
}

/**
 * Calcula o diff linha a linha entre dois textos. Retorna a sequência unificada de operações
 * (`unchanged`/`added`/`removed`) já numerada para permitir renderização lado a lado.
 */
export function diffLines(oldText: string, newText: string): LineDiffOp[] {
  const oldLines = oldText.length === 0 ? [] : oldText.split('\n');
  const newLines = newText.length === 0 ? [] : newText.split('\n');

  const oldLength = oldLines.length;
  const newLength = newLines.length;

  // Tabela de LCS: lengths[i][j] = tamanho da maior subsequência comum entre
  // oldLines[i..] e newLines[j..].
  const lengths: number[][] = Array.from({ length: oldLength + 1 }, () =>
    new Array<number>(newLength + 1).fill(0)
  );

  for (let i = oldLength - 1; i >= 0; i -= 1) {
    for (let j = newLength - 1; j >= 0; j -= 1) {
      lengths[i][j] =
        oldLines[i] === newLines[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const ops: LineDiffOp[] = [];
  let i = 0;
  let j = 0;
  let oldLineNumber = 1;
  let newLineNumber = 1;

  while (i < oldLength && j < newLength) {
    if (oldLines[i] === newLines[j]) {
      ops.push({
        type: 'unchanged',
        value: oldLines[i],
        oldLineNumber,
        newLineNumber,
      });
      i += 1;
      j += 1;
      oldLineNumber += 1;
      newLineNumber += 1;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      ops.push({ type: 'removed', value: oldLines[i], oldLineNumber, newLineNumber: null });
      i += 1;
      oldLineNumber += 1;
    } else {
      ops.push({ type: 'added', value: newLines[j], oldLineNumber: null, newLineNumber });
      j += 1;
      newLineNumber += 1;
    }
  }

  while (i < oldLength) {
    ops.push({ type: 'removed', value: oldLines[i], oldLineNumber, newLineNumber: null });
    i += 1;
    oldLineNumber += 1;
  }

  while (j < newLength) {
    ops.push({ type: 'added', value: newLines[j], oldLineNumber: null, newLineNumber });
    j += 1;
    newLineNumber += 1;
  }

  return ops;
}
