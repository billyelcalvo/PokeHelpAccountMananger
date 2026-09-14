import { z } from 'zod';

export const positiveId = z.number().int().positive().max(2147483647);
export const requiredText = z.string().trim().min(1).max(255);
export const routeId = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(positiveId);
export const nonEmptyUpdate = (value: object) => Object.keys(value).length > 0;
