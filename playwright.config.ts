import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  // Há uma única spec que sobe a SPA e executa fluxos pesados em duas viewports. Navegadores
  // simultâneos saturavam o runner Windows e faziam até o carregamento inicial expirar.
  // Serializar a matriz mantém o gate determinístico no mesmo perfil do self-hosted da CI.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev:front -- --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
