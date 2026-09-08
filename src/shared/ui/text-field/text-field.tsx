'use client';

import { useId, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

import type { TextFieldProps } from './types';

const TextField = ({
  label,
  error,
  className,
  ref,
  id,
  value: externalValue,
  onChange,
  onCompositionStart: onCompositionStartProp,
  onCompositionEnd: onCompositionEndProp,
  ...props
}: TextFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedBy =
    [props['aria-describedby'], error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  const isControlled = externalValue !== undefined;
  const composingRef = useRef(false);
  const [composingValue, setComposingValue] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isControlled && composingRef.current) {
      setComposingValue(e.target.value);
      return;
    }
    onChange?.(e);
  };

  const handleCompositionStart = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composingRef.current = true;
    setComposingValue((e.target as HTMLInputElement).value);
    onCompositionStartProp?.(e);
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composingRef.current = false;
    setComposingValue(null);
    onCompositionEndProp?.(e);
    if (isControlled && onChange) {
      onChange({
        target: e.target,
        currentTarget: e.currentTarget,
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const inputValue = isControlled
    ? composingValue !== null
      ? composingValue
      : externalValue
    : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-body font-bold text-foreground"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...props}
        value={inputValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
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
