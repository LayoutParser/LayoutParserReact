import { describe, expect, it } from 'vitest';
import { diffLines } from './lineDiff';

describe('diffLines', () => {
  it('marca todas as linhas como inalteradas quando o texto é idêntico', () => {
    const ops = diffLines('a\nb\nc', 'a\nb\nc');
    expect(ops.every(op => op.type === 'unchanged')).toBe(true);
    expect(ops).toHaveLength(3);
  });

  it('detecta linha adicionada no meio do texto', () => {
    const ops = diffLines('a\nc', 'a\nb\nc');
    expect(ops.map(op => op.type)).toEqual(['unchanged', 'added', 'unchanged']);
    expect(ops[1].value).toBe('b');
  });

  it('detecta linha removida', () => {
    const ops = diffLines('a\nb\nc', 'a\nc');
    expect(ops.map(op => op.type)).toEqual(['unchanged', 'removed', 'unchanged']);
    expect(ops[1].value).toBe('b');
  });

  it('numera linhas antigas e novas de forma independente', () => {
    const ops = diffLines('x\ny', 'z\ny');
    expect(ops).toEqual([
      { type: 'removed', value: 'x', oldLineNumber: 1, newLineNumber: null },
      { type: 'added', value: 'z', oldLineNumber: null, newLineNumber: 1 },
      { type: 'unchanged', value: 'y', oldLineNumber: 2, newLineNumber: 2 },
    ]);
  });

  it('trata textos vazios sem quebrar', () => {
    expect(diffLines('', '')).toEqual([]);
    const onlyAdded = diffLines('', 'a');
    expect(onlyAdded).toEqual([
      { type: 'added', value: 'a', oldLineNumber: null, newLineNumber: 1 },
    ]);
  });
});
