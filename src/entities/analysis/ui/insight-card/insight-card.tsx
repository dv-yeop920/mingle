'use client';

import { cn } from '@/shared/lib/utils';

import { INSIGHT_VARIANT_STYLES } from './constants';
import type { InsightCardProps } from './types';

const InsightCard = ({
  variant,
  eyebrow,
  title,
  description,
  onClick,
  className,
}: InsightCardProps) => {
  const styles = INSIGHT_VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        'rounded-card-lg p-5',
        styles.bg,
        onClick && 'cursor-pointer btn-press',
        className,
      )}
      onClick={onClick}
    >
      <p className={cn('text-caption font-black uppercase tracking-wider', styles.eyebrow)}>
        {eyebrow}
      </p>
      <h3 className={cn('mt-2 text-section font-black', styles.fg)}>{title}</h3>
      <p className={cn('mt-1 text-body', styles.fg, 'opacity-80')}>{description}</p>
      {onClick && (
        <div className="mt-3 flex justify-end">
          <span className={cn('text-section', styles.eyebrow)}>›</span>
        </div>
      )}
    </div>
  );
};

export { InsightCard };
