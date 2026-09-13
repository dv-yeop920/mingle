import { z } from 'zod';

const characterMatchResultSchema = z.object({
  characterName: z.string().min(1).max(30),
  matchScore: z.number().int().min(0).max(100),
  matchReason: z.string().min(50).max(400),
  sharedTraits: z.array(z.string().min(1).max(30)).min(2).max(4),
  funLine: z.string().min(10).max(100),
});

const characterMatchRequestSchema = z.object({
  mbti: z.string().min(4).max(4),
  workId: z.string().min(1),
  workName: z.string().min(1),
});

type CharacterMatchResult = z.infer<typeof characterMatchResultSchema>;
type CharacterMatchRequest = z.infer<typeof characterMatchRequestSchema>;

export {
  characterMatchRequestSchema,
  characterMatchResultSchema,
  type CharacterMatchRequest,
  type CharacterMatchResult,
};
