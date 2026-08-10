import { describe, expect, it } from 'vitest';
import { isKeyboardActivationKey } from './keyboard';

describe('isKeyboardActivationKey', () => {
  it.each(['Enter', ' '])('aceita a tecla de ativação %s', key => {
    expect(isKeyboardActivationKey(key)).toBe(true);
  });

  it.each(['Escape', 'Spacebar', 'ArrowDown', ''])('rejeita a tecla não acionável %s', key => {
    expect(isKeyboardActivationKey(key)).toBe(false);
  });
});
