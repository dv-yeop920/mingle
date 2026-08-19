import type { MbtiType } from '@/shared/types/mbti';

type RoleCardProps = {
  nickname: string;
  mbti: MbtiType;
  role: string;
  description: string;
  className?: string;
};

export type { RoleCardProps };
