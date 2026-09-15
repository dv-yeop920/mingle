import Link from 'next/link';

import { cn } from '@/shared/lib/utils';

import {
  CardDecoration,
  type AnalysisCardVariant,
} from './analysis-card-decoration';

type AnalysisCardProps = {
  ariaLabel: string;
  description: string;
  href: string;
  title: string;
  variant: AnalysisCardVariant;
};

const CARD_STYLES = {
  group: {
    card: 'bg-primary-hero',
    text: 'text-primary-deep',
    muted: 'text-primary-deep/75',
  },
  compatibility: {
    card: 'bg-compat-bg',
    text: 'text-compat',
    muted: 'text-compat-muted',
  },
  profile: {
    card: 'bg-primary-tonal',
    text: 'text-primary-deep',
    muted: 'text-primary-deep/75',
  },
  character: {
    card: 'bg-insight-surface',
    text: 'text-insight-foreground',
    muted: 'text-insight-foreground/75',
  },
} as const;

const AnalysisCard = ({
  ariaLabel,
  description,
  href,
  title,
  variant,
}: AnalysisCardProps) => {
  const styles = CARD_STYLES[variant];

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        'btn-press flex min-h-[142px] w-full items-center justify-between gap-4 overflow-hidden rounded-hero px-6 py-5 shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-deep focus-visible:ring-inset',
        styles.card,
      )}
    >
      <div className="flex min-w-0 max-w-[210px] flex-col gap-2 text-left">
        <h2
          className={cn('text-[18px] font-black leading-[1.35]', styles.text)}
        >
          {title}
        </h2>
        <p
          className={cn(
            'text-[12.5px] font-bold leading-[1.55] text-pretty',
            styles.muted,
          )}
        >
          {description}
        </p>
      </div>
      <div aria-hidden="true" className="shrink-0">
        <CardDecoration variant={variant} />
      </div>
    </Link>
  );
};

export { AnalysisCard };
