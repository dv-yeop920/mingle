import { z } from 'zod';

import { analysisResultSchema, situationSchema } from '@/entities/analysis/model/schemas';

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

const memberDraftMembersV2Schema = z
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
  .max(15);

const memberDraftMembersSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      nickname: z.string().max(8).regex(NICKNAME_REGEX),
      mbti: z.enum(MBTI_TYPES),
      gender: z.enum(['male', 'female', 'other']),
      isSelf: z.boolean(),
      role: z.string().max(10).nullable(),
    }),
  )
  .min(2)
  .max(15);

const memberDraftBaseSchema = z.object({
  groupType: z.enum(['friends', 'company', 'family']),
  memberCount: z.number().int().min(2).max(15),
});

const memberDraftV2BaseSchema = memberDraftBaseSchema.extend({
  members: memberDraftMembersV2Schema,
});

const memberDraftV3BaseSchema = memberDraftBaseSchema.extend({
  members: memberDraftMembersSchema,
});

const memberDraftRefinements = <T extends z.infer<typeof memberDraftBaseSchema> & { members: { id: string; isSelf: boolean }[] }>(
  draft: T,
  context: z.RefinementCtx,
) => {
  if (draft.memberCount !== draft.members.length) {
    context.addIssue({
      code: 'custom',
      message: '멤버 수와 멤버 목록이 일치하지 않습니다',
      path: ['memberCount'],
    });
  }

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
};

const memberDraftV1Schema = memberDraftV2BaseSchema
  .extend({ schemaVersion: z.literal(1) })
  .superRefine(memberDraftRefinements)
  .transform((draft) => ({
    ...draft,
    schemaVersion: 3 as const,
    situation: null,
    members: draft.members.map((m) => ({ ...m, role: null })),
  }));

const memberDraftV2Schema = memberDraftV2BaseSchema
  .extend({
    schemaVersion: z.literal(2),
    situation: situationSchema.nullable(),
  })
  .superRefine(memberDraftRefinements)
  .transform((draft) => ({
    ...draft,
    schemaVersion: 3 as const,
    members: draft.members.map((m) => ({ ...m, role: null })),
  }));

const memberDraftV3Schema = memberDraftV3BaseSchema
  .extend({
    schemaVersion: z.literal(3),
    situation: situationSchema.nullable(),
  })
  .superRefine(memberDraftRefinements);

const memberDraftSchema = z.union([memberDraftV3Schema, memberDraftV2Schema, memberDraftV1Schema]);

const analysisResultMembersSchema = z
  .array(
    z.object({
      nickname: z.string().min(1).max(8),
      mbti: z.enum(MBTI_TYPES),
      gender: z.enum(['male', 'female', 'other']),
      is_self: z.boolean(),
      role: z.string().max(10).nullable().optional().default(null),
    }),
  )
  .min(2)
  .max(15);

const analysisResultSessionV1Schema = z.object({
  schemaVersion: z.literal(1),
  result: analysisResultSchema.extend({
    members: analysisResultMembersSchema,
    groupType: z.enum(['friends', 'company', 'family']),
  }),
}).transform((session) => ({
  schemaVersion: 2 as const,
  result: { ...session.result, situation: null },
}));

const analysisResultSessionV2Schema = z.object({
  schemaVersion: z.literal(2),
  result: analysisResultSchema.extend({
    members: analysisResultMembersSchema,
    groupType: z.enum(['friends', 'company', 'family']),
    situation: situationSchema.nullable(),
  }),
});

const analysisResultSessionSchema = z.union([
  analysisResultSessionV2Schema,
  analysisResultSessionV1Schema,
]);

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
