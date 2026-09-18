import { z } from 'zod';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const scoreSchema = z.number().int().min(0).max(100);

const categoryWithScoreSchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(40).max(400),
  score: scoreSchema,
});

const categorySchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(40).max(400),
});

const compatibilityResultSchema = z.object({
  chemistryScore: scoreSchema,
  title: z.string().min(1).max(30),
  tagline: z.string().min(1).max(50),
  summary: z.string().min(20).max(250),
  conversationStyle: categoryWithScoreSchema,
  conflictStyle: categoryWithScoreSchema,
  emotionalConnection: categoryWithScoreSchema,
  growthPotential: categoryWithScoreSchema,
  bestMoment: categorySchema,
  cautionPoint: categorySchema,
  recommendedActivities: z.array(z.string().min(1).max(40)).min(2).max(5),
  advice: z.string().min(20).max(200),
});

const analyzeCompatibilityRequestSchema = z.object({
  mbtiA: z.enum(MBTI_TYPES),
  mbtiB: z.enum(MBTI_TYPES),
  nicknameA: z.string().max(8).optional(),
  nicknameB: z.string().max(8).optional(),
});

type CompatibilityResult = z.infer<typeof compatibilityResultSchema>;
type AnalyzeCompatibilityRequest = z.infer<typeof analyzeCompatibilityRequestSchema>;

export {
  analyzeCompatibilityRequestSchema,
  compatibilityResultSchema,
  type AnalyzeCompatibilityRequest,
  type CompatibilityResult,
};
