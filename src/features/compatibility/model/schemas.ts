import { z } from 'zod';

import { compatibilityResultSchema } from '@/entities/compatibility/model/schemas';

const compatibilityResultSessionSchema = z.object({
  schemaVersion: z.literal(1),
  result: compatibilityResultSchema.extend({
    mbtiA: z.string().min(4).max(4),
    mbtiB: z.string().min(4).max(4),
    nicknameA: z.string().optional(),
    nicknameB: z.string().optional(),
  }),
});

type CompatibilityResultSession = z.infer<typeof compatibilityResultSessionSchema>;
type PersistedCompatibilityResult = CompatibilityResultSession['result'];

export {
  compatibilityResultSessionSchema,
  type CompatibilityResultSession,
  type PersistedCompatibilityResult,
};
