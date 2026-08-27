'use client';

import { useRouter } from 'next/navigation';

import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';
import type { MbtiType } from '@/shared/types/mbti';

import { MbtiBadge } from '@/entities/mbti';

import { MENU_ITEMS } from './constants';
import type { MyPageViewProps } from './types';

const MyPageView = ({
  nickname,
  mbti,
  stats,
  onSettingsClick,
  onLogout,
  onMenuClick,
  className,
}: MyPageViewProps) => {
  const router = useRouter();
  const displayMbti = (mbti ?? 'ENFP') as MbtiType;
  const styles = getTemperamentStyles(displayMbti);

  const handleMenuClick = (href: string) => {
    if (href === '/mypage/settings') {
      onSettingsClick?.();
    } else if (onMenuClick) {
      onMenuClick(href);
    } else {
      router.push(href);
    }
  };

  return (
    <div className={cn('flex flex-col gap-[18px]', className)}>
      <div className="rounded-[30px] bg-surface p-[24px] shadow-md">
        <div className="flex items-center gap-[15px]">
          <div
            className={cn(
              'flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[22px]',
              styles.bg,
            )}
          >
            <span className={cn('text-[22px] font-black', styles.fg)}>
              {nickname.slice(0, 2)}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-[6px]">
            <span className="text-[19px] font-black text-foreground">{nickname}</span>
            <div className="flex items-center gap-[7px]">
              {mbti && <MbtiBadge mbti={mbti as MbtiType} />}
              <span className="text-[12px] font-bold text-hint">나의 MBTI</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSettingsClick}
            className="cursor-pointer text-[12.5px] font-extrabold text-primary btn-press"
          >
            수정
          </button>
        </div>

        <div className="mt-[20px] grid grid-cols-3 rounded-[20px] bg-background py-[16px]">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center gap-[4px]',
                i === 1 && 'border-l border-r border-border-inner',
              )}
            >
              <span className="font-nunito text-[20px] font-black text-primary-deep">
                {stat.value}
              </span>
              <span className="text-[11.5px] font-bold text-hint">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleMenuClick(item.href)}
            className="flex cursor-pointer items-center gap-[14px] rounded-card bg-surface p-[18px] shadow-sm btn-press"
          >
            <div
              className={cn(
                'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[15px] text-[17px]',
                item.iconBg,
              )}
            >
              {item.icon}
            </div>
            <div className="flex flex-1 flex-col gap-[3px] text-left">
              <span className="text-[15.5px] font-black text-foreground">{item.label}</span>
              <span className="text-[12px] font-semibold text-hint">{item.description}</span>
            </div>
            <span className="text-[17px] font-extrabold text-disabled-icon">›</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="cursor-pointer pt-[14px] text-center text-[13px] font-bold text-disabled-foreground btn-press"
      >
        로그아웃
      </button>
    </div>
  );
};

export { MyPageView };
