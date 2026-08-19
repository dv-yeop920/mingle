'use client';

import { TEMPERAMENT_STYLES } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';
import type { MbtiType, Temperament } from '@/shared/types/mbti';
import { BottomSheet } from '@/shared/ui/bottom-sheet';

import { MBTI_GROUPS } from './constants';
import type { MbtiPickerProps } from './types';

const MbtiPicker = ({ isOpen, onClose, onSelect, className }: MbtiPickerProps) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="MBTI 선택">
      <div className={cn('flex flex-col gap-4', className)}>
        {MBTI_GROUPS.map((group) => {
          const styles = TEMPERAMENT_STYLES[group.temperament as Temperament];
          return (
            <div key={group.temperament} className="flex flex-col gap-2">
              <span className={cn('text-caption font-bold', styles.fg)}>
                {group.label}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {group.types.map((mbti: MbtiType) => (
                  <button
                    key={mbti}
                    type="button"
                    onClick={() => onSelect?.(mbti)}
                    className={cn(
                      'cursor-pointer rounded-field py-3 text-center font-nunito text-label font-black transition-colors duration-150',
                      styles.bg,
                      styles.fg,
                    )}
                  >
                    {mbti}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
};

export { MbtiPicker };
export type { MbtiPickerProps } from './types';
