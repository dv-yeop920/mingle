import { getTemperamentStyles } from '@/shared/lib/mbti';
import { cn } from '@/shared/lib/utils';

import { ScoreGauge, WarningCard } from '@/entities/analysis';
import { MbtiBadge } from '@/entities/mbti';

import { MOCK_PAIR_DETAIL } from './constants';
import type { PairDetailProps } from './types';

const PairDetail = ({ className }: PairDetailProps) => {
  const { memberA, memberB, score, strengths, cautions, tip } = MOCK_PAIR_DETAIL;
  const stylesA = getTemperamentStyles(memberA.mbti);
  const stylesB = getTemperamentStyles(memberB.mbti);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex h-[52px] w-[52px] items-center justify-center rounded-[18px]',
                stylesA.bg,
              )}
            >
              <span className={cn('font-nunito text-[18px] font-black', stylesA.fg)}>
                {memberA.nickname.slice(0, 2)}
              </span>
            </div>
            <MbtiBadge mbti={memberA.mbti} />
          </div>

          <span className="text-title2 font-black text-hint">×</span>

          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex h-[52px] w-[52px] items-center justify-center rounded-[18px]',
                stylesB.bg,
              )}
            >
              <span className={cn('font-nunito text-[18px] font-black', stylesB.fg)}>
                {memberB.nickname.slice(0, 2)}
              </span>
            </div>
            <MbtiBadge mbti={memberB.mbti} />
          </div>
        </div>

        <ScoreGauge score={score} size="sm" />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">잘 맞는 점</h3>
        <ul className="flex flex-col gap-2">
          {strengths.map((item) => (
            <li key={item} className="flex items-start gap-2 text-body text-muted">
              <span className="mt-[2px] text-positive">+</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-black text-foreground">주의할 점</h3>
        <ul className="flex flex-col gap-2">
          {cautions.map((item) => (
            <li key={item} className="flex items-start gap-2 text-body text-muted">
              <span className="mt-[2px] text-caution">!</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <WarningCard title="케미 팁" description={tip} />
    </div>
  );
};

export { PairDetail };
export type { PairDetailProps } from './types';
