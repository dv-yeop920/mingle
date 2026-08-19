'use client';

import { cn } from '@/shared/lib/utils';

import { VARIANT_STYLES } from './constants';
import type { ButtonProps } from './types';

const Button = ({ variant = 'primary', disabled, children, className, ref, ...props }: ButtonProps) => {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'w-full cursor-pointer transition-transform duration-[120ms] active:scale-[.97]',
        VARIANT_STYLES[variant],
        disabled && 'bg-disabled text-disabled-foreground shadow-none border-none cursor-not-allowed active:scale-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };
