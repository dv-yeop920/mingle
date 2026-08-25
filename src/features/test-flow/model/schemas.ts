import { z } from 'zod';

import { analysisResultSchema } from '@/entities/analysis/model/schemas';

const NICKNAME_REGEX = /^[가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ]*$/;
const MBTI_TYPES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
] as const;

const memberDraftSchema = z
  .object({
    schemaVersion: z.literal(1),
    groupType: z.enum(['friends', 'company', 'family']),
    memberCount: z.number().int().min(2).max(15),
    members: z
      .array(
        z.object({
          id: z.string().min(1),
          nickname: z.string().max(8).regex(NICKNAME_REGEX),
          mbti: z.enum(MBTI_TYPES),
          gender: z.enum(['male', 'female', 'other']),
          isSelf: z.boolean(),
        }),
      )
      .min(2)
      .max(15),
  })
  .refine((draft) => draft.memberCount === draft.members.length, {
    message: '멤버 수와 멤버 목록이 일치하지 않습니다',
    path: ['memberCount'],
  })
  .superRefine((draft, context) => {
    const selfCount = draft.members.filter((member) => member.isSelf).length;
    const ids = draft.members.map((member) => member.id);

    if (selfCount !== 1) {
      context.addIssue({
        code: 'custom',
        message: '본인은 정확히 1명이어야 합니다',
        path: ['members'],
      });
    }

    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: '멤버 식별자가 중복되었습니다',
        path: ['members'],
      });
    }
  });

const analysisResultSessionSchema = z.object({
  schemaVersion: z.literal(1),
  result: analysisResultSchema.extend({
    members: z
      .array(
        z.object({
          nickname: z.string().min(1).max(8),
          mbti: z.enum(MBTI_TYPES),
          gender: z.enum(['male', 'female', 'other']),
          is_self: z.boolean(),
        }),
      )
      .min(2)
      .max(15),
    groupType: z.enum(['friends', 'company', 'family']),
    customName: z.string().max(40).nullable(),
  }),
});

const pendingAnalysisSaveSessionSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(1).max(30),
  saveOperationId: z.string().uuid(),
});

const memberNicknameSchema = z
  .string()
  .min(1, '닉네임을 입력해주세요')
  .max(8, '8글자 이하')
  .regex(NICKNAME_REGEX, '한글과 영어만 입력 가능');

type MemberNicknameInput = {
  id: string;
  nickname: string;
};

type MemberDraft = z.infer<typeof memberDraftSchema>;
type AnalysisResultSession = z.infer<typeof analysisResultSessionSchema>;
type PendingAnalysisSaveSession = z.infer<
  typeof pendingAnalysisSaveSessionSchema
>;
type PendingAnalysisSave = Omit<PendingAnalysisSaveSession, 'schemaVersion'>;
type PersistedAnalysisResult = AnalysisResultSession['result'];

const convertMembersToNicknameErrors = (
  members: MemberNicknameInput[],
): Record<string, string | undefined> => {
  const errors = members.reduce<Record<string, string | undefined>>(
    (acc, member) => {
      const parsed = memberNicknameSchema.safeParse(member.nickname);
      if (parsed.success) return acc;

      return {
        ...acc,
        [member.id]: parsed.error.issues[0]?.message,
      };
    },
    {},
  );

  const nicknameMap = members.reduce<Record<string, string[]>>(
    (acc, member) => {
      const key = member.nickname.trim().toLowerCase();
      if (!key) return acc;

      return {
        ...acc,
        [key]: [...(acc[key] ?? []), member.id],
      };
    },
    {},
  );

  return Object.values(nicknameMap).reduce((acc, ids) => {
    if (ids.length < 2) return acc;

    return ids.reduce(
      (next, id) => ({ ...next, [id]: '같은 닉네임은 쓸 수 없어요' }),
      acc,
    );
  }, errors);
};

export {
  analysisResultSessionSchema,
  convertMembersToNicknameErrors,
  memberDraftSchema,
  memberNicknameSchema,
  pendingAnalysisSaveSessionSchema,
};
export type {
  AnalysisResultSession,
  MemberDraft,
  MemberNicknameInput,
  PendingAnalysisSave,
  PendingAnalysisSaveSession,
  PersistedAnalysisResult,
};
