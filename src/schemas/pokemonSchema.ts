import { z } from 'zod';
import { nonEmptyUpdate, positiveId, requiredText } from './common';

const ivStat = z.number().int().min(0).max(15);
export const ivSchema = z.strictObject({
  attack: ivStat,
  defense: ivStat,
  hp: ivStat,
});

export const createPokemonSchema = z.strictObject({
  name: requiredText,
  typeId: positiveId,
  iv: ivSchema.nullable().optional(),
});

export const updatePokemonSchema = createPokemonSchema.partial().refine(nonEmptyUpdate, {
  message: 'Provide at least one field to update',
});

export type CreatePokemon = z.infer<typeof createPokemonSchema>;
