import { type InputHTMLAttributes, type Ref } from 'react';

type TextFieldProps = {
  label?: string;
  error?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

export type { TextFieldProps };
