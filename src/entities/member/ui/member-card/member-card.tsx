import { MBTI_TEMPERAMENTS, TEMPERAMENT_STYLES } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import type { MemberCardProps } from './types';

const GENDER_LABEL = {
  male: '남',
  female: '여',
  other: '그 외',
} as const;

const MemberCard = ({
  nickname,
  mbti,
  gender,
  isSelf = false,
  onMore,
  className,
}: MemberCardProps) => {
  const temperament = MBTI_TEMPERAMENTS[mbti];
  const styles = TEMPERAMENT_STYLES[temperament];
  const initials = nickname.slice(0, 2);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card bg-surface px-4 py-3',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[16px]',
          styles.bg,
          styles.fg,
        )}
      >
        <span className="font-nunito text-[16px] font-black">{initials}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-body font-bold text-foreground">{nickname}</span>
          {isSelf && (
            <span className="rounded-pill bg-primary-tonal px-2 py-[2px] text-[10px] font-black text-diplomat-fg">
              나
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-pill px-[9px] py-[3px] font-nunito text-label-sm font-black',
              styles.bg,
              styles.fg,
            )}
          >
            {mbti}
          </span>
          <span className="text-caption text-muted">{GENDER_LABEL[gender]}</span>
        </div>
      </div>

      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="ml-auto cursor-pointer p-1 text-[18px] text-muted"
        >
          ⋮
        </button>
      )}
    </div>
  );
};

export { MemberCard };
