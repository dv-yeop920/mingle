import type { MbtiType } from '@/shared/types/mbti';

type ResultSummaryCardProps = {
  groupName: string;
  groupType: string;
  memberCount: number;
  chemistryScore: number;
  date: string;
  representativeMbtis?: MbtiType[];
  onClick?: () => void;
  className?: string;
};

export type { ResultSummaryCardProps };
