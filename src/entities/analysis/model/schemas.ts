import { z } from 'zod';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const GENDER_TYPES = ['male', 'female', 'other'] as const;
const NICKNAME_REGEX = /^[A-Za-z\u3131-\u314E\u314F-\u3163\uAC00-\uD7A3]+$/;

const memberSchema = z.object({
  memberId: z.string().min(1),
  nickname: z.string().trim().min(1).max(8).regex(NICKNAME_REGEX),
  mbti: z.enum(MBTI_TYPES),
  gender: z.enum(GENDER_TYPES),
  isSelf: z.boolean(),
  order: z.number().int().min(0),
});

const analyzeRequestSchema = z.object({
  schemaVersion: z.literal('2026-08-24'),
  group: z.object({
    type: z.enum(['friends', 'company', 'family']),
    customName: z.null(),
  }),
  members: z.array(memberSchema).min(2).max(15),
  options: z.object({
    locale: z.literal('ko-KR'),
    tone: z.literal('friendly'),
    includeAllPairs: z.literal(true),
  }),
}).superRefine((value, ctx) => {
  const selfCount = value.members.filter((member) => member.isSelf).length;

  if (selfCount !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: '본인은 정확히 1명이어야 합니다',
      path: ['members'],
    });
  }

  const nicknameMap = new Map<string, number[]>();
  const idMap = new Map<string, number[]>();

  value.members.forEach((member, index) => {
    const nickname = member.nickname.trim().toLowerCase();
    const memberId = member.memberId;

    nicknameMap.set(nickname, [...(nicknameMap.get(nickname) ?? []), index]);
    idMap.set(memberId, [...(idMap.get(memberId) ?? []), index]);
  });

  nicknameMap.forEach((indexes) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => {
      ctx.addIssue({
        code: 'custom',
        message: '같은 닉네임은 쓸 수 없어요',
        path: ['members', index, 'nickname'],
      });
    });
  });

  idMap.forEach((indexes) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => {
      ctx.addIssue({
        code: 'custom',
        message: '멤버 식별자가 중복되었습니다',
        path: ['members', index, 'memberId'],
      });
    });
  });

  const orders = value.members.map((member) => member.order).toSorted(
    (orderA, orderB) => orderA - orderB,
  );
  const isOrderContinuous = orders.every((order, index) => order === index);

  if (!isOrderContinuous) {
    ctx.addIssue({
      code: 'custom',
      message: '멤버 순서가 올바르지 않습니다',
      path: ['members'],
    });
  }
});

const scoreSchema = z.number().int().min(0).max(100);

const analysisResultSchema = z.object({
  chemistryScore: scoreSchema,
  tagline: z.string().min(1).max(40),
  metrics: z.object({
    conversation: scoreSchema,
    friendship: scoreSchema,
    teamwork: scoreSchema,
    atmosphere: scoreSchema,
    conflict: scoreSchema,
  }),
  groupAtmosphere: z.object({
    title: z.string().min(1).max(40),
    description: z.string().min(80).max(320),
  }),
  decisionMaking: z.object({
    title: z.string().min(1).max(40),
    description: z.string().min(80).max(320),
  }),
  cautionPoint: z.object({
    title: z.string().min(1).max(40),
    description: z.string().min(60).max(280),
  }),
  bestMoment: z.object({
    title: z.string().min(1).max(40),
    description: z.string().min(80).max(320),
  }),
  memberRoles: z.array(
    z.object({
      memberId: z.string().min(1),
      nickname: z.string().min(1).max(8),
      mbti: z.enum(MBTI_TYPES),
      title: z.string().min(1).max(24),
      description: z.string().min(40).max(220),
    }),
  ),
  pairChemistry: z.array(
    z.object({
      pairId: z.string().min(1),
      memberAId: z.string().min(1),
      memberBId: z.string().min(1),
      memberANickname: z.string().min(1).max(8),
      memberBNickname: z.string().min(1).max(8),
      memberAMbti: z.enum(MBTI_TYPES),
      memberBMbti: z.enum(MBTI_TYPES),
      score: scoreSchema,
      summary: z.string().min(1).max(40),
      description: z.string().min(60).max(320),
      conversationScore: scoreSchema,
      conflictScore: scoreSchema,
      recommendedSituations: z.array(z.string().min(1).max(32)).min(1).max(3),
    }),
  ),
  summary: z.string().min(1).max(120),
});

type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
type AnalysisResult = z.infer<typeof analysisResultSchema>;
type MbtiType = (typeof MBTI_TYPES)[number];

export { analysisResultSchema, analyzeRequestSchema, MBTI_TYPES };
export type { AnalysisResult, AnalyzeRequest, MbtiType };
