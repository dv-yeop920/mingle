import { cn } from '@/shared/lib/utils';

import { SIZE_STYLES } from './constants';
import type { ScoreGaugeProps } from './types';

const ScoreGauge = ({ score, size = 'lg', className }: ScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={cn('flex items-center justify-center rounded-full', styles.outer, className)}
      style={{
        background: `conic-gradient(var(--color-green-200) 0% ${clamped}%, var(--color-neutral-100) ${clamped}% 100%)`,
      }}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-surface',
          styles.inner,
        )}
      >
        <span className={cn('font-nunito font-black text-primary-deep', styles.text)}>
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
};

export { ScoreGauge };
