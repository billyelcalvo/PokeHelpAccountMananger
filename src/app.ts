import express from 'express';
import type { PrismaClient } from '../generated/prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { accountRoutes } from './routes/accounts';
import { pokemonRoutes } from './routes/pokemons';
import { typeRoutes } from './routes/types';

export function createApp(db: PrismaClient) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/accounts/:accountId/pokemons', pokemonRoutes(db));
  app.use('/accounts', accountRoutes(db));
  app.use('/types', typeRoutes(db));
  app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
