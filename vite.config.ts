import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega os .env do modo atual para configurar o proxy de desenvolvimento.
  // Só as chaves com prefixo VITE_ (padrão do Vite) são lidas aqui.
  const env = loadEnv(mode, process.cwd());

  // Destino do proxy `/api` do servidor de dev.
  //
  // ATENÇÃO: este alvo precisa ser SEMPRE um ambiente de desenvolvimento. Até 2026-08-10 ele
  // apontava para `http://172.25.32.42:5000`, que é a API de PRODUÇÃO (WINSRV2022-LIB) — um
  // `npm run dev` que caísse no proxy enviaria uploads de teste para produção. O único motivo
  // de isso nunca ter acontecido é que `.env.development` define `VITE_API_BASE_URL`, fazendo o
  // axios usar URL absoluta e nunca exercitar o proxy.
  //
  // Default `http://localhost:5100`: é a instância de dev desta máquina (serviço Windows
  // `LayoutParserApi`, publicada pelo `ci-dev.yml` da API com override
  // `Kestrel__Endpoints__Http__Url` na 5100 justamente para não colidir com o `dotnet run`
  // do desenvolvedor, que escuta 5000 por causa do `Kestrel` fixado no appsettings.json).
  // Rodando a API na mão via `dotnet run`? Use VITE_DEV_API_PROXY_TARGET=http://localhost:5000.
  const devApiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:5100';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['zustand', 'axios'],
          },
        },
      },
      // Copiar web.config para dist durante o build
      copyPublicDir: true,
    },
  };
});
