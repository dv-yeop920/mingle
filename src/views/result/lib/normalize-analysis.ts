import type { MbtiType } from '@/shared/types/mbti';

import type { MemberRole, PairChemistry } from '@/entities/analysis';

type InsightSectionKey =
  | 'groupAtmosphere'
  | 'decisionMaking'
  | 'cautionPoint'
  | 'bestMoment';

type InsightSection = {
  key: InsightSectionKey;
  eyebrow: string;
  variant: 'insight' | 'info' | 'positive';
  title: string;
  description: string;
};

type AtmosphereSource = {
  groupAtmosphere?: unknown;
  decisionMaking?: unknown;
  cautionPoint?: unknown;
  bestMoment?: unknown;
};

type MemberSource = {
  nickname: string;
  mbti: string;
};

type NormalizedMetrics = Record<string, number>;

const INSIGHT_SECTION_META: Pick<
  InsightSection,
  'eyebrow' | 'key' | 'variant'
>[] = [
  {
    key: 'groupAtmosphere',
    eyebrow: '우리 모임 특징',
    variant: 'insight',
  },
  {
    key: 'decisionMaking',
    eyebrow: '의사결정 방식',
    variant: 'info',
  },
  { key: 'cautionPoint', eyebrow: '주의 포인트', variant: 'positive' },
  { key: 'bestMoment', eyebrow: 'BEST MOMENT', variant: 'positive' },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const convertString = (value: unknown) =>
  typeof value === 'string' ? value : '';

const normalizeMetrics = (value: unknown): NormalizedMetrics => {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<NormalizedMetrics>(
    (metrics, [key, score]) => {
      if (
        typeof score !== 'number' ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      ) {
        return metrics;
      }

      metrics[key] = score;
      return metrics;
    },
    {},
  );
};

const convertInsight = (value: unknown, fallbackTitle: string) => {
  if (!isRecord(value)) {
    const description = convertString(value);

    return {
      title: description ? fallbackTitle : '',
      description,
    };
  }

  return {
    title: convertString(value.title),
    description: convertString(value.description),
  };
};

const normalizeAtmosphereSections = (
  source: AtmosphereSource,
): InsightSection[] => {
  const rawAtmosphere = isRecord(source.groupAtmosphere)
    ? source.groupAtmosphere
    : {};
  const isNested = isRecord(rawAtmosphere.groupAtmosphere);

  const values: Record<InsightSectionKey, unknown> = isNested
    ? {
        groupAtmosphere: rawAtmosphere.groupAtmosphere,
        decisionMaking: rawAtmosphere.decisionMaking,
        cautionPoint: rawAtmosphere.cautionPoint,
        bestMoment: rawAtmosphere.bestMoment,
      }
    : 'title' in rawAtmosphere
      ? {
          groupAtmosphere: rawAtmosphere,
          decisionMaking: source.decisionMaking,
          cautionPoint: source.cautionPoint,
          bestMoment: source.bestMoment,
        }
      : {
          groupAtmosphere: rawAtmosphere.description,
          decisionMaking:
            rawAtmosphere.decisionMaking ?? rawAtmosphere.decision_making,
          cautionPoint: rawAtmosphere.conflict,
          bestMoment: rawAtmosphere.bestMoment ?? rawAtmosphere.best_moment,
        };

  return INSIGHT_SECTION_META.map((meta) => ({
    ...meta,
    ...convertInsight(values[meta.key], meta.eyebrow),
  }));
};

const normalizeMemberRoles = (value: unknown): MemberRole[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];

    const nickname = convertString(item.nickname);
    const mbti = convertString(item.mbti) as MbtiType;
    const role = convertString(item.role) || convertString(item.title);
    const description = convertString(item.description);

    if (!nickname || !mbti || !role) return [];

    return [
      {
        memberId: convertString(item.memberId) || String(index),
        nickname,
        mbti,
        role,
        description,
      },
    ];
  });
};

const normalizePairChemistry = (
  value: unknown,
  members: MemberSource[],
): PairChemistry[] => {
  if (!Array.isArray(value)) return [];

  const mbtiMap = new Map(members.map((member) => [member.nickname, member.mbti]));

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const memberANickname =
      convertString(item.memberA) ||
      convertString(item.memberANickname) ||
      convertString(item.member_a);
    const memberBNickname =
      convertString(item.memberB) ||
      convertString(item.memberBNickname) ||
      convertString(item.member_b);
    const memberAMbti =
      convertString(item.memberAMbti) ||
      convertString(item.member_a_mbti) ||
      mbtiMap.get(memberANickname) ||
      '';
    const memberBMbti =
      convertString(item.memberBMbti) ||
      convertString(item.member_b_mbti) ||
      mbtiMap.get(memberBNickname) ||
      '';

    if (!memberANickname || !memberBNickname || !memberAMbti || !memberBMbti) {
      return [];
    }

    const recommendedSituations = Array.isArray(item.recommendedSituations)
      ? item.recommendedSituations.filter(
          (situation): situation is string => typeof situation === 'string',
        ).join(', ')
      : convertString(item.recommendedSituations);

    return [
      {
        memberA: {
          nickname: memberANickname,
          mbti: memberAMbti as MbtiType,
        },
        memberB: {
          nickname: memberBNickname,
          mbti: memberBMbti as MbtiType,
        },
        score: typeof item.score === 'number' ? item.score : 0,
        summary: convertString(item.summary),
        description:
          convertString(item.description) || convertString(item.detail),
        conversationScore:
          typeof item.conversationScore === 'number'
            ? item.conversationScore
            : undefined,
        conflictScore:
          typeof item.conflictScore === 'number'
            ? item.conflictScore
            : undefined,
        recommendedSituations,
      },
    ];
  });
};

export {
  normalizeAtmosphereSections,
  normalizeMemberRoles,
  normalizeMetrics,
  normalizePairChemistry,
};
export type { AtmosphereSource, InsightSection, InsightSectionKey };
