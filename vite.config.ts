import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega os .env do modo atual para configurar o proxy de desenvolvimento.
  // Só as chaves com prefixo VITE_ (padrão do Vite) são lidas aqui.
  const env = loadEnv(mode, process.cwd());

  // O navegador fala apenas com `/api`. Em desenvolvimento, o Vite encaminha ao BFF Node;
  // o BFF é responsável por alcançar a API .NET configurada em `server/.env`.
  const devBffTarget = env.VITE_DEV_BFF_PROXY_TARGET || 'http://127.0.0.1:3100';
  const devUser = env.VITE_DEV_BFF_USER?.trim();
  const devRoles = env.VITE_DEV_BFF_ROLES?.trim();

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 3000,
      watch: {
        // O relatório do gate de cobertura é gerado dentro do repo; ignorá-lo evita milhares
        // de recargas do servidor de desenvolvimento durante `npm run test:coverage`.
        ignored: ['**/coverage/**'],
      },
      proxy: {
        '/auth': {
          target: devBffTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: devBffTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            ...(devUser ? { 'x-dev-user': devUser } : {}),
            ...(devRoles ? { 'x-dev-roles': devRoles } : {}),
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      // Source maps completos ajudam no build de desenvolvimento, mas não devem ser publicados
      // junto com os assets de produção. Se observabilidade externa for adotada, o pipeline pode
      // gerar mapas ocultos e enviá-los de forma privada.
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll('\\', '/');
            if (normalizedId.includes('/node_modules/react-router')) return 'router';
            if (
              normalizedId.includes('/node_modules/zustand/') ||
              normalizedId.includes('/node_modules/axios/')
            ) {
              return 'ui';
            }
          },
        },
      },
      // Copiar web.config para dist durante o build
      copyPublicDir: true,
    },
  };
});
