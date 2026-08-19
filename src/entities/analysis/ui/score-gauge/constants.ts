import type { ScoreGaugeSize } from './types';

const SIZE_STYLES: Record<ScoreGaugeSize, { outer: string; inner: string; text: string }> = {
  lg: { outer: 'w-[186px] h-[186px]', inner: 'w-[140px] h-[140px]', text: 'text-display' },
  sm: { outer: 'w-[120px] h-[120px]', inner: 'w-[90px] h-[90px]', text: 'text-title1' },
};

export { SIZE_STYLES };
