import { Router } from 'express';
import type { PrismaClient } from '../../generated/prisma/client';
import { routeId } from '../schemas/common';
import { createTypeSchema, updateTypeSchema } from '../schemas/typeSchema';

export function typeRoutes(db: PrismaClient) {
  const router = Router();

  router.get('/', async (_request, response) => {
    response.json(await db.pokemonType.findMany({ orderBy: { id: 'asc' } }));
  });

  router.post('/', async (request, response) => {
    const data = createTypeSchema.parse(request.body);
    const type = await db.pokemonType.create({ data });
    response.status(201).location(`/types/${type.id}`).json(type);
  });

  router.get('/:typeId', async (request, response) => {
    const id = routeId.parse(request.params.typeId);
    response.json(await db.pokemonType.findUniqueOrThrow({ where: { id } }));
  });

  router.patch('/:typeId', async (request, response) => {
    const id = routeId.parse(request.params.typeId);
    const data = updateTypeSchema.parse(request.body);
    response.json(await db.pokemonType.update({ where: { id }, data }));
  });

  router.delete('/:typeId', async (request, response) => {
    const id = routeId.parse(request.params.typeId);
    await db.pokemonType.delete({ where: { id } });
    response.status(204).end();
  });

  return router;
}
