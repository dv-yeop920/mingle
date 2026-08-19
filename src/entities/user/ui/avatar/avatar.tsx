import { MBTI_TEMPERAMENTS, TEMPERAMENT_STYLES } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import { AVATAR_SIZE_STYLES } from './constants';
import type { AvatarProps } from './types';

const Avatar = ({ nickname, mbti, size = 'md', className }: AvatarProps) => {
  const temperament = MBTI_TEMPERAMENTS[mbti];
  const styles = TEMPERAMENT_STYLES[temperament];
  const initials = nickname.slice(0, 2);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-nunito font-black',
        AVATAR_SIZE_STYLES[size],
        styles.bg,
        styles.fg,
        className,
      )}
    >
      {initials}
    </div>
  );
};

export { Avatar };
