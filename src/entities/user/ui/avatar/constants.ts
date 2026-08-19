import type { AvatarSize } from './types';

const AVATAR_SIZE_STYLES: Record<AvatarSize, string> = {
  lg: 'w-[64px] h-[64px] rounded-[22px] text-[23px]',
  md: 'w-[48px] h-[48px] rounded-[17px] text-[17px]',
  sm: 'w-[44px] h-[44px] rounded-[16px] text-[16px]',
};

export { AVATAR_SIZE_STYLES };
