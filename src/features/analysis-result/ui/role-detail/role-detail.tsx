import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import type { RoleDetailProps } from './types';

const RoleDetail = ({ role, className }: RoleDetailProps) => {
  if (!role) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <p className="text-body text-muted">역할 데이터를 찾을 수 없습니다</p>
      </div>
    );
  }

  const styles = getTemperamentStyles(role.mbti);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-4 rounded-[30px] bg-surface px-5 py-6 shadow-md">
        <div
          className={cn(
            'flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[23px]',
            styles.bg,
          )}
        >
          <span className={cn('font-nunito text-[22px] font-black', styles.fg)}>
            {role.nickname.slice(0, 2)}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-[6px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-section font-black text-foreground">
              {role.nickname}
            </span>
            <span
              className={cn(
                'rounded-pill px-[9px] py-[3px] font-nunito text-label-sm font-black',
                styles.bg,
                styles.fg,
              )}
            >
              {role.mbti}
            </span>
          </div>
          <h2 className="text-title2 text-pretty font-black tracking-title text-foreground">
            {role.role}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-[9px] rounded-[24px] bg-surface p-5 shadow-md">
        <h3 className="text-[15.5px] font-black text-foreground">
          우리 안에서 보여주는 모습
        </h3>
        <p className="whitespace-pre-line break-words text-pretty text-body font-semibold leading-[1.68] text-muted">
          {role.description}
        </p>
      </div>
    </div>
  );
};

export { RoleDetail };
