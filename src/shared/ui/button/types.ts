import { type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'dashed';

type ButtonProps = {
  variant?: ButtonVariant;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export type { ButtonProps, ButtonVariant };
