import type { ButtonVariant } from './types';

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'h-[58px] rounded-card bg-primary text-primary-foreground font-extrabold text-[16px] shadow-lg',
  secondary:
    'h-[54px] rounded-field bg-surface border-[1.5px] border-disabled text-muted-alt font-extrabold text-[16px]',
  tonal:
    'h-[54px] rounded-field bg-primary-tonal text-primary-deep font-black text-[16px]',
  dashed:
    'h-[58px] rounded-card border-2 border-dashed border-[#CDE0D1] text-[#3F9E63] font-extrabold text-[16px]',
};

export { VARIANT_STYLES };
