import type { MbtiType } from '@/shared/types/mbti';

type RoleDetailRole = {
  nickname: string;
  mbti: MbtiType;
  role: string;
  description: string;
};

type RoleDetailProps = {
  role: RoleDetailRole | null;
  className?: string;
};

export type { RoleDetailProps, RoleDetailRole };
