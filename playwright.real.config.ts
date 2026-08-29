import { defineConfig, devices } from '@playwright/test';

const apiUrl = process.env.REAL_E2E_API_URL?.trim() || 'http://127.0.0.1:5100';
const bffUrl = 'http://127.0.0.1:3200';
const frontendUrl = 'http://127.0.0.1:3001';

/**
 * Navegador + front + BFF + API reais. Nenhuma rota é mockada e nenhum artefato visual é salvo:
 * screenshots, traces e vídeos poderiam conter dados do documento privado.
 */
export default defineConfig({
  testDir: './e2e-real',
  // O pathway de transformação pode consumir ~150 s sem GPU; o gate inclui folga para
  // navegação, parse, edição e reparse sem transformar lentidão legítima em falso negativo.
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['line']] : 'list',
  expect: { timeout: 30_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: frontendUrl,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  webServer: [
    {
      command: 'npm --prefix server run dev',
      url: `${bffUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        BFF_HOST: '127.0.0.1',
        BFF_PORT: '3200',
        BFF_PUBLIC_ORIGIN: bffUrl,
        BFF_DEV_AUTH_ENABLED: 'true',
        BFF_ADMIN_USERS: 'layoutparser.e2e',
        BFF_RATE_LIMIT_MAX: '1000',
        BFF_LOG_LEVEL: 'warn',
        LAYOUTPARSER_API_URL: apiUrl,
      },
    },
    {
      command: 'npm run dev:front -- --host 127.0.0.1 --port 3001',
      url: `${frontendUrl}/upload`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_DEV_BFF_PROXY_TARGET: bffUrl,
        VITE_DEV_BFF_USER: 'layoutparser.e2e',
        VITE_DEV_BFF_ROLES: 'e2e',
      },
    },
  ],
});
