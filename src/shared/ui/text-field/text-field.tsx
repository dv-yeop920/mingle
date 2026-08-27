import { useId } from 'react';

import { cn } from '@/shared/lib/utils';

import type { TextFieldProps } from './types';

const TextField = ({
  label,
  error,
  className,
  ref,
  id,
  ...props
}: TextFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedBy = [props['aria-describedby'], error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={inputId} className="text-body font-bold text-foreground">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : props['aria-invalid']}
        className={cn(
          'h-[56px] w-full rounded-field bg-surface px-4 text-[16px] font-bold text-foreground',
          'border border-border outline-none',
          'transition-[border-color,box-shadow] duration-200',
          'placeholder:text-hint',
          'focus:border-border-focus focus:shadow-sm',
          error && 'border-caution',
        )}
      />
      {error && (
        <p
          id={errorId}
          className="text-caption font-bold text-caution-foreground"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export { TextField };
