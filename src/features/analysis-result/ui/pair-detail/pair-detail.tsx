import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import { MOCK_PAIR_DETAIL } from './constants';
import type { PairDetailProps } from './types';

const PairDetail = ({ className }: PairDetailProps) => {
  const {
    memberA,
    memberB,
    score,
    summary,
    description,
    conversationScore,
    conflictScore,
    recommendedSituations,
  } = MOCK_PAIR_DETAIL;
  const stylesA = getTemperamentStyles(memberA.mbti);
  const stylesB = getTemperamentStyles(memberB.mbti);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col items-center gap-5 rounded-[30px] bg-surface px-[22px] py-[26px] shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'flex h-[66px] w-[66px] items-center justify-center rounded-[23px]',
                stylesA.bg,
              )}
            >
              <span className={cn('text-[22px] font-black', stylesA.fg)}>
                {memberA.nickname.slice(0, 2)}
              </span>
            </div>
            <span className={cn('font-nunito text-caption font-black', stylesA.fg)}>
              {memberA.mbti}
            </span>
          </div>

          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#FFE4E8]">
            <span className="text-[19px] text-[#E2637A]">♥</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'flex h-[66px] w-[66px] items-center justify-center rounded-[23px]',
                stylesB.bg,
              )}
            >
              <span className={cn('text-[22px] font-black', stylesB.fg)}>
                {memberB.nickname.slice(0, 2)}
              </span>
            </div>
            <span className={cn('font-nunito text-caption font-black', stylesB.fg)}>
              {memberB.mbti}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-[6px]">
          <span className="font-nunito text-[44px] font-black leading-none text-primary-deep">
            {score}
            <span className="text-[20px]">%</span>
          </span>
          <p className="text-[15.5px] font-extrabold text-muted-alt">
            &ldquo;{summary}&rdquo;
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        <div className="flex flex-col gap-[6px] rounded-[22px] bg-surface p-4 shadow-sm">
          <span className="text-caption font-extrabold text-hint">대화</span>
          <span className="font-nunito text-[24px] font-black text-primary">
            {conversationScore}
          </span>
        </div>
        <div className="flex flex-col gap-[6px] rounded-[22px] bg-surface p-4 shadow-sm">
          <span className="text-caption font-extrabold text-hint">갈등 가능성</span>
          <span className="font-nunito text-[24px] font-black text-caution">
            {conflictScore}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[9px] rounded-[24px] bg-surface p-5 shadow-md">
        <h3 className="text-[15.5px] font-black text-foreground">둘이 있을 때</h3>
        <p className="text-body font-semibold leading-[1.68] text-muted">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-[24px] bg-primary-tonal p-5">
        <span className="text-caption font-black uppercase tracking-wider text-primary-deep">
          추천 상황
        </span>
        <p className="text-[15px] font-extrabold leading-[1.5] text-[#1E4630]">
          {recommendedSituations}
        </p>
      </div>
    </div>
  );
};

export { PairDetail };
