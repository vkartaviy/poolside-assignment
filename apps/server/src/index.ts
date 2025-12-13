/**
 * Server entry point - Fastify REST API.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { setTimeout as delay } from 'node:timers/promises';
import { authRoutes } from './routes/auth.js';
import { listRoutes } from './routes/lists.js';
import { todoRoutes } from './routes/todos.js';
import { eventRoutes } from './routes/events.js';
import { PORT, HOST, DEV, SIMULATED_LATENCY_MS } from './config.js';

async function main(): Promise<void> {
  const app = Fastify({
    logger: DEV
      ? {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        }
      : true,
  });

  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  if (DEV && SIMULATED_LATENCY_MS > 0) {
    app.log.info({ SIMULATED_LATENCY_MS }, `Simulating server latency: ${SIMULATED_LATENCY_MS}ms`);

    app.addHook('preHandler', async (request) => {
      if (request.url === '/health') {
        return;
      }

      await delay(SIMULATED_LATENCY_MS);
    });
  }

  // Register routes
  await app.register(authRoutes);
  await app.register(listRoutes);
  await app.register(todoRoutes);
  await app.register(eventRoutes);

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      app.log.info('Server closed');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Start server
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
