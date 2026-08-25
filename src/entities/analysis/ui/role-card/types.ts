import type { MbtiType } from '@/shared/types/mbti';

type RoleCardProps = {
  nickname: string;
  mbti: MbtiType;
  role: string;
  description: string;
  onClick?: () => void;
  className?: string;
};

export type { RoleCardProps };
