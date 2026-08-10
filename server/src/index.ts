import 'dotenv/config';

import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function start(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ event: 'server.stopping', signal }, 'Encerrando BFF.');
    await app.close();
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await app.listen({ host: config.host, port: config.port });
  app.log.info(
    {
      event: 'server.started',
      host: config.host,
      port: config.port,
      environment: config.nodeEnv,
    },
    'LayoutParser BFF iniciado.'
  );
}

start().catch(error => {
  const message = error instanceof Error ? error.message : 'Falha desconhecida ao iniciar o BFF.';
  process.stderr.write(`LayoutParser BFF não iniciou: ${message}\n`);
  process.exitCode = 1;
});
