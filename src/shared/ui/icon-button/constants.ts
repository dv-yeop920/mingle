import type { IconButtonSize, IconButtonVariant } from './types';

const SIZE_STYLES: Record<IconButtonSize, string> = {
  sm: 'h-[38px] w-[38px]',
  md: 'h-[44px] w-[44px]',
};

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  outlined: 'border border-border bg-surface',
  ghost: 'bg-white/60',
};

export { SIZE_STYLES, VARIANT_STYLES };
