import { Router } from 'express';
import type { PrismaClient } from '../../generated/prisma/client';
import { createAccountSchema, updateAccountSchema } from '../schemas/accountSchema';
import { routeId } from '../schemas/common';

const accountSelect = { id: true, name: true, email: true } as const;

export function accountRoutes(db: PrismaClient) {
  const router = Router();

  router.get('/', async (_request, response) => {
    response.json(await db.account.findMany({ select: accountSelect, orderBy: { id: 'asc' } }));
  });

  router.post('/', async (request, response) => {
    const data = createAccountSchema.parse(request.body);
    const account = await db.account.create({ data, select: accountSelect });
    response.status(201).location(`/accounts/${account.id}`).json(account);
  });

  router.get('/:accountId', async (request, response) => {
    const id = routeId.parse(request.params.accountId);
    response.json(await db.account.findUniqueOrThrow({
      where: { id },
      select: { ...accountSelect, pokemons: { include: { type: true, iv: true }, orderBy: { id: 'asc' } } },
    }));
  });

  router.patch('/:accountId', async (request, response) => {
    const id = routeId.parse(request.params.accountId);
    const data = updateAccountSchema.parse(request.body);
    response.json(await db.account.update({ where: { id }, data, select: accountSelect }));
  });

  router.delete('/:accountId', async (request, response) => {
    const id = routeId.parse(request.params.accountId);
    await db.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({
        where: { id }, select: { pokemons: { select: { ivId: true } } },
      });
      const ivIds = account.pokemons.flatMap(({ ivId }) => ivId === null ? [] : [ivId]);
      await tx.pokemon.deleteMany({ where: { accountId: id } });
      await tx.account.delete({ where: { id } });
      await tx.iV.deleteMany({ where: { id: { in: ivIds } } });
    });
    response.status(204).end();
  });

  return router;
}
