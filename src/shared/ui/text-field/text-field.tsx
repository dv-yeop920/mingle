import { cn } from '@/shared/lib/utils';

import type { TextFieldProps } from './types';

const TextField = ({ label, error, className, ref, id, ...props }: TextFieldProps) => {
  const inputId = id ?? label?.replace(/\s+/g, '-').toLowerCase();

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
        className={cn(
          'h-[56px] rounded-field bg-surface px-4 text-[15px] font-bold text-foreground',
          'border border-border outline-none',
          'transition-all duration-200',
          'placeholder:text-hint',
          'focus:border-border-focus focus:shadow-sm',
          error && 'border-caution',
        )}
        {...props}
      />
      {error && (
        <p className="text-caption font-bold text-caution-foreground">{error}</p>
      )}
    </div>
  );
};

export { TextField };
