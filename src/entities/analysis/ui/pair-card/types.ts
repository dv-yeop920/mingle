import type { MbtiType } from '@/shared/types/mbti';

type PairCardMember = {
  nickname: string;
  mbti: MbtiType;
};

type PairCardProps = {
  memberA: PairCardMember;
  memberB: PairCardMember;
  score: number;
  summary: string;
  onClick?: () => void;
  className?: string;
};

export type { PairCardMember, PairCardProps };
