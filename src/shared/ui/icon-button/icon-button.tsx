import { cn } from '@/shared/lib/utils';

import { SIZE_STYLES, VARIANT_STYLES } from './constants';
import type { IconButtonProps } from './types';

const IconButton = ({
  variant = 'outlined',
  size = 'sm',
  children,
  className,
  ref,
  ...props
}: IconButtonProps) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      'flex cursor-pointer items-center justify-center rounded-[14px] btn-press',
      SIZE_STYLES[size],
      VARIANT_STYLES[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export { IconButton };
