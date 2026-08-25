import type { MbtiType } from '@/shared/types/mbti';

type Metric = {
  label: string;
  value: number;
  isCaution?: boolean;
};

type MemberRole = {
  memberId: string;
  nickname: string;
  mbti: MbtiType;
  role: string;
  description: string;
};

type PairChemistry = {
  memberA: { nickname: string; mbti: MbtiType };
  memberB: { nickname: string; mbti: MbtiType };
  score: number;
  summary: string;
  description?: string;
  conversationScore?: number;
  conflictScore?: number;
  recommendedSituations?: string;
};

type GroupAtmosphere = {
  title: string;
  description: string;
  variant: 'insight' | 'info' | 'positive';
};

type Analysis = {
  id: string;
  title: string;
  userId: string;
  groupId: string;
  chemistryScore: number;
  tagline: string;
  metrics: Metric[];
  groupAtmosphere: GroupAtmosphere[];
  memberRoles: MemberRole[];
  pairChemistry: PairChemistry[];
  summary: string;
  createdAt: string;
};

export type { Analysis, GroupAtmosphere, MemberRole, Metric, PairChemistry };
