import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Invalid request', details: error.issues });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      response.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (error.code === 'P2002' || error.code === 'P2003') {
      response.status(409).json({ error: 'Duplicate or referenced resource' });
      return;
    }
  }

  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body too large' });
    return;
  }

  // Do not log query arguments or request bodies containing account credentials.
  console.error('Request failed:', error instanceof Error ? error.name : 'Unknown error');
  response.status(500).json({ error: 'Internal server error' });
};
