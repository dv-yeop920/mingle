import type { InsightVariant } from './types';

const INSIGHT_VARIANT_STYLES: Record<InsightVariant, { bg: string; fg: string; eyebrow: string }> = {
  insight: { bg: 'bg-insight-surface', fg: 'text-insight-foreground', eyebrow: 'text-insight' },
  info: { bg: 'bg-info-surface', fg: 'text-info-foreground', eyebrow: 'text-info' },
  positive: { bg: 'bg-positive-surface', fg: 'text-positive', eyebrow: 'text-positive' },
};

export { INSIGHT_VARIANT_STYLES };
