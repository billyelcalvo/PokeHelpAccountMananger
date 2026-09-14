import { z } from 'zod';
import { nonEmptyUpdate, positiveId, requiredText } from './common';

export const createAccountSchema = z.strictObject({
  name: requiredText,
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});

export const accountSchema = createAccountSchema.extend({ id: positiveId });
export const updateAccountSchema = createAccountSchema.partial().refine(nonEmptyUpdate, {
  message: 'Provide at least one field to update',
});

export type Account = z.infer<typeof accountSchema>;
export type CreateAccount = z.infer<typeof createAccountSchema>;
