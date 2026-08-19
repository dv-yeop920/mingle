'use client';

import { Activity, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/utils';

import type { BottomSheetProps } from './types';

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

const BottomSheet = ({ isOpen, onClose, title, children }: BottomSheetProps) => {
  const isMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  if (!isMounted) return null;

  return createPortal(
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <div className="fixed inset-0 z-50">
        <div
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-[260ms] ease-out',
            isOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
        />
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface shadow-sheet',
            'transition-transform duration-[260ms] ease-out',
            isOpen ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-9 rounded-pill bg-disabled" />
          </div>
          {title && (
            <div className="px-5 pb-3">
              <h3 className="text-section font-black text-foreground">{title}</h3>
            </div>
          )}
          <div className="px-5 pb-8">{children}</div>
        </div>
      </div>
    </Activity>,
    document.body,
  );
};

export { BottomSheet };
