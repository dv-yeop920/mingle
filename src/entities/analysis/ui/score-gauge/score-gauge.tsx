import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/utils';

import { SIZE_STYLES } from './constants';
import type { ScoreGaugeProps } from './types';

const ScoreGauge = ({ score, size = 'lg', className }: ScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const styles = SIZE_STYLES[size];
  const gaugeStyle = {
    '--gauge-progress': `${clamped}%`,
    background:
      'conic-gradient(var(--color-green-200) 0% var(--gauge-progress), var(--color-neutral-100) var(--gauge-progress) 100%)',
  } as CSSProperties;

  return (
    <div
      className={cn(
        'result-gauge-fill flex items-center justify-center rounded-full',
        styles.outer,
        className,
      )}
      style={gaugeStyle}
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
