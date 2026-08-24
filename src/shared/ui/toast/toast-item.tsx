import { cn } from '@/shared/lib/utils';

import type { ToastMessage } from './types';

const TOAST_STYLES = {
  success: {
    border: 'border-positive/20',
    bar: 'bg-positive',
    title: '완료',
  },
  error: {
    border: 'border-caution/30',
    bar: 'bg-caution',
    title: '확인 필요',
  },
  info: {
    border: 'border-info/20',
    bar: 'bg-info',
    title: '안내',
  },
} as const;

type ToastItemProps = {
  toast: ToastMessage;
};

const ToastItem = ({ toast }: ToastItemProps) => {
  const styles = TOAST_STYLES[toast.variant];

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'grid grid-cols-[4px_1fr] overflow-hidden rounded-[18px] border bg-surface shadow-md',
        styles.border,
      )}
    >
      <div className={styles.bar} />
      <div className="flex flex-col gap-1 px-4 py-3">
        <span className="text-[12px] font-black text-muted">
          {styles.title}
        </span>
        <span className="text-[14px] font-extrabold text-foreground">
          {toast.message}
        </span>
      </div>
    </div>
  );
};

export { ToastItem, type ToastItemProps };
