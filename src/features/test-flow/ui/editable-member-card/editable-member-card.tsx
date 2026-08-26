'use client';

import { MBTI_TEMPERAMENTS, TEMPERAMENT_STYLES } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';
import { Chip } from '@/shared/ui/chip';
import { TextField } from '@/shared/ui/text-field';

import type { EditableMemberCardProps } from './types';

const GENDER_OPTIONS = [
  { value: 'male', label: '남' },
  { value: 'female', label: '여' },
  { value: 'other', label: '그 외' },
] as const;

const EditableMemberCard = ({
  id,
  nickname,
  mbti,
  gender,
  isSelf,
  onNicknameChange,
  onMbtiSelect,
  onGenderChange,
  onDelete,
  nicknameError,
  className,
}: EditableMemberCardProps) => {
  const temperament = MBTI_TEMPERAMENTS[mbti];
  const styles = TEMPERAMENT_STYLES[temperament];
  const initials = nickname.slice(0, 2) || '?';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card bg-surface px-4 py-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[16px]',
            styles.bg,
            styles.fg,
          )}
        >
          <span className="font-nunito text-[16px] font-black">{initials}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <TextField
              value={nickname}
              onChange={(e) => onNicknameChange(id, e.target.value)}
              placeholder="닉네임"
              maxLength={8}
              error={nicknameError}
              className="flex-1 [&_input]:h-[40px] [&_input]:text-[16px]"
            />
            {isSelf && (
              <span className="shrink-0 rounded-pill bg-primary-tonal px-2 py-[2px] text-[10px] font-black text-diplomat-fg">
                나
              </span>
            )}
          </div>
        </div>

        {!isSelf && (
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="shrink-0 cursor-pointer p-1 text-[18px] text-muted btn-press"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-[56px]">
        <button
          type="button"
          onClick={() => onMbtiSelect(id)}
          className={cn(
            'cursor-pointer rounded-pill px-[9px] py-[3px] font-nunito text-label-sm font-black transition-colors duration-150 btn-press',
            styles.bg,
            styles.fg,
          )}
        >
          {mbti}
        </button>

        {GENDER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            isActive={gender === option.value}
            onClick={() => onGenderChange(id, option.value)}
            className="px-3 py-[3px] text-label-sm"
          />
        ))}
      </div>
    </div>
  );
};

export { EditableMemberCard };
