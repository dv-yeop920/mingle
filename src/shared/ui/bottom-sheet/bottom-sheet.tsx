'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Activity } from 'react';

import { cn } from '@/shared/lib/utils';

import type { BottomSheetProps } from './types';

type BottomSheetContextValue = BottomSheetProps & {
  showContent: boolean;
  onExitComplete: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

const BottomSheetContent = () => {
  const { isOpen, onClose, title, children, showContent, onExitComplete } =
    useContext(BottomSheetContext)!;

  const isVisible = isOpen && showContent;

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target === e.currentTarget && !isOpen) {
      onExitComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[390px]">
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-[260ms] ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          'absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface shadow-sheet',
          'transition-transform duration-[260ms] ease-out',
          isVisible ? 'translate-y-0' : 'translate-y-full',
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
  );
};

const BottomSheet = (props: BottomSheetProps) => {
  const { isOpen } = props;
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let cancelled = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setShowContent(true);
        });
      });
      return () => {
        cancelled = true;
      };
    }
  }, [isOpen]);

  const handleExitComplete = () => {
    setShowContent(false);
  };

  return (
    <BottomSheetContext.Provider
      value={{ ...props, showContent, onExitComplete: handleExitComplete }}
    >
      <Activity mode={isOpen || showContent ? 'visible' : 'hidden'}>
        <BottomSheetContent />
      </Activity>
    </BottomSheetContext.Provider>
  );
};

export { BottomSheet };
