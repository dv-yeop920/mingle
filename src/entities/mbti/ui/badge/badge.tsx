import { cn } from '@/shared/lib/utils';

import { MBTI_TEMPERAMENTS, TEMPERAMENT_STYLES } from '../../model/constants';

import type { MbtiBadgeProps } from './types';

const MbtiBadge = ({ mbti, className }: MbtiBadgeProps) => {
  const temperament = MBTI_TEMPERAMENTS[mbti];
  const styles = TEMPERAMENT_STYLES[temperament];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-[9px] py-[3px]',
        'font-nunito text-label-sm font-black',
        styles.bg,
        styles.fg,
        className,
      )}
    >
      {mbti}
    </span>
  );
};

export { MbtiBadge };
