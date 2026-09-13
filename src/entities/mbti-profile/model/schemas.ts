import { z } from 'zod';

const traitSchema = z.object({
  title: z.string().min(1).max(20),
  description: z.string().min(20).max(200),
});

const mbtiProfileResultSchema = z.object({
  title: z.string().min(1).max(30),
  tagline: z.string().min(1).max(50),
  strengths: z.array(traitSchema).min(2).max(4),
  weaknesses: z.array(traitSchema).min(2).max(3),
  communicationStyle: traitSchema,
  workStyle: traitSchema,
  relationshipPatterns: traitSchema,
  funFact: z.string().min(10).max(100),
});

const analyzeProfileRequestSchema = z.object({
  mbti: z.string().min(4).max(4),
  gender: z.string().optional(),
  nickname: z.string().optional(),
});

type MbtiProfileResult = z.infer<typeof mbtiProfileResultSchema>;
type AnalyzeProfileRequest = z.infer<typeof analyzeProfileRequestSchema>;

export {
  analyzeProfileRequestSchema,
  mbtiProfileResultSchema,
  type AnalyzeProfileRequest,
  type MbtiProfileResult,
};
