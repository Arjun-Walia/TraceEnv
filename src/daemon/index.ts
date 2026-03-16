import { startServer } from './server';
import { DAEMON_PORT } from '../config';

async function main(): Promise<void> {
  const port = parseInt(process.env.TRACEENV_PORT ?? String(DAEMON_PORT), 10);

  process.title = 'traceenv-daemon';

  const server = await startServer(port);

  const shutdown = (): void => {
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Notify parent process (used during `daemon start` readiness check)
  if (process.send) {
    process.send({ type: 'ready' });
  }
}

main().catch((err) => {
  console.error('[traceenv] Failed to start daemon:', err);
  process.exit(1);
});
