import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Suíte opt-in para o par real de MQSeries. Os artefatos ficam em `.codex/temp/teste`, fora do
 * Git, e a configuração normal do Vitest continua incluindo somente os testes sob `src`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/real-fixture/**/*.test.ts'],
    hookTimeout: 180_000,
    testTimeout: 180_000,
    restoreMocks: true,
    clearMocks: true,
  },
});
