import type { MbtiType } from '@/shared/types/mbti';

type AvatarSize = 'lg' | 'md' | 'sm';

type AvatarProps = {
  nickname: string;
  mbti: MbtiType;
  size?: AvatarSize;
  className?: string;
};

export type { AvatarProps, AvatarSize };
