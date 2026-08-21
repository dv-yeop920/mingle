'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { NAV_ITEMS } from './constants';
import type { BottomNavProps } from './types';

const renderIcon = (href: string, isActive: boolean) => {
  const bg = isActive ? 'bg-[#3FB273]' : 'bg-[#C3D2C7]';
  const border = isActive ? 'border-[#3FB273]' : 'border-[#C3D2C7]';

  switch (href) {
    case '/':
      return <div className={cn('h-6 w-6 rounded-[9px]', bg)} />;
    case '/history':
      return (
        <div className={cn('h-6 w-6 rounded-full border-[3px]', border)} />
      );
    case '/mypage':
      return <div className={cn('h-6 w-6 rounded-full', bg)} />;
    default:
      return null;
  }
};

const BottomNav = ({ className }: BottomNavProps) => {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-1/2 z-10 grid w-full max-w-[390px] -translate-x-1/2 grid-cols-3 border-t border-[#EEF4EE] bg-white px-[24px] pb-[28px] pt-[12px]',
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-[6px]"
          >
            {renderIcon(item.href, isActive)}
            <span
              className={cn(
                'text-[11px]',
                isActive
                  ? 'font-[900] text-[#3FB273]'
                  : 'font-[800] text-[#AFBDB3]',
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export { BottomNav };
