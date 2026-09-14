import { z } from 'zod';
import { nonEmptyUpdate, requiredText } from './common';

export const createTypeSchema = z.strictObject({
  type: requiredText,
  icon: z.url().nullable().optional(),
});

export const updateTypeSchema = createTypeSchema.partial().refine(nonEmptyUpdate, {
  message: 'Provide at least one field to update',
});

export type CreateType = z.infer<typeof createTypeSchema>;
