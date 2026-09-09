import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type IconButtonVariant = 'outlined' | 'ghost';

type IconButtonSize = 'sm' | 'md';

type IconButtonProps = {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export type { IconButtonProps, IconButtonSize, IconButtonVariant };
