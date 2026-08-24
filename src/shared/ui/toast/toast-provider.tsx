'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ToastItem } from './toast-item';
import type { ToastContextValue, ToastInput, ToastMessage } from './types';

const DEFAULT_DURATION = 2600;
const TOAST_LIMIT = 3;

const ToastContext = createContext<ToastContextValue | null>(null);

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [timeoutIds] = useState(
    () => new Set<ReturnType<typeof setTimeout>>(),
  );

  useEffect(() => {
    return () => {
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, [timeoutIds]);

  const removeToast = (id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  };

  const showToast = ({
    message,
    variant = 'success',
    duration = DEFAULT_DURATION,
  }: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: ToastMessage = { id, message, variant };

    setToasts((currentToasts) =>
      [...currentToasts, toast].slice(-TOAST_LIMIT),
    );

    const timeoutId = setTimeout(() => {
      removeToast(id);
      timeoutIds.delete(timeoutId);
    }, duration);
    timeoutIds.add(timeoutId);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed top-5 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[358px] -translate-x-1/2 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};

export { ToastProvider, useToast };
