import {z} from 'zod';

export const accountSchema = z.object({
    id : z.number().int(),
    name : z.string(),
    email : z.email(),
    password:  z.string()
});

export const createAccountSchema = accountSchema.omit({
    id : true
});

export type Account = z.infer<typeof accountSchema>;
export type CreateAccount = z.infer<typeof createAccountSchema>;