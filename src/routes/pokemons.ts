import { Router } from 'express';
import type { PrismaClient } from '../../generated/prisma/client';
import { routeId } from '../schemas/common';
import { createPokemonSchema, updatePokemonSchema } from '../schemas/pokemonSchema';

const include = { type: true, iv: true } as const;
type AccountParams = { accountId: string };
type PokemonParams = AccountParams & { pokemonId: string };

export function pokemonRoutes(db: PrismaClient) {
  const router = Router({ mergeParams: true });

  router.get<AccountParams>('/', async (request, response) => {
    const accountId = routeId.parse(request.params.accountId);
    const account = await db.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { pokemons: { include, orderBy: { id: 'asc' } } },
    });
    response.json(account.pokemons);
  });

  router.post<AccountParams>('/', async (request, response) => {
    const accountId = routeId.parse(request.params.accountId);
    const { iv, typeId, name } = createPokemonSchema.parse(request.body);
    const pokemon = await db.pokemon.create({
      data: {
        name,
        account: { connect: { id: accountId } },
        type: { connect: { id: typeId } },
        ...(iv ? { iv: { create: iv } } : {}),
      },
      include,
    });
    response.status(201).location(`/accounts/${accountId}/pokemons/${pokemon.id}`).json(pokemon);
  });

  router.get<PokemonParams>('/:pokemonId', async (request, response) => {
    const accountId = routeId.parse(request.params.accountId);
    const id = routeId.parse(request.params.pokemonId);
    response.json(await db.pokemon.findUniqueOrThrow({ where: { id, accountId }, include }));
  });

  router.patch<PokemonParams>('/:pokemonId', async (request, response) => {
    const accountId = routeId.parse(request.params.accountId);
    const id = routeId.parse(request.params.pokemonId);
    const { iv, typeId, name } = updatePokemonSchema.parse(request.body);
    const pokemon = await db.$transaction(async (tx) => {
      const current = await tx.pokemon.findUniqueOrThrow({ where: { id, accountId } });
      const updated = await tx.pokemon.update({
        where: { id, accountId },
        data: {
          name,
          ...(typeId === undefined ? {} : { type: { connect: { id: typeId } } }),
          ...(iv === undefined ? {} : {
            iv: iv === null ? { disconnect: true } : { upsert: { create: iv, update: iv } },
          }),
        },
        include,
      });
      if (iv === null && current.ivId !== null) {
        await tx.iV.delete({ where: { id: current.ivId } });
      }
      return updated;
    });
    response.json(pokemon);
  });

  router.delete<PokemonParams>('/:pokemonId', async (request, response) => {
    const accountId = routeId.parse(request.params.accountId);
    const id = routeId.parse(request.params.pokemonId);
    await db.$transaction(async (tx) => {
      const pokemon = await tx.pokemon.delete({ where: { id, accountId } });
      if (pokemon.ivId !== null) await tx.iV.delete({ where: { id: pokemon.ivId } });
    });
    response.status(204).end();
  });

  return router;
}
