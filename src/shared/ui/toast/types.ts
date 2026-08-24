type ToastVariant = 'success' | 'error' | 'info';

type ToastInput = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastMessage = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

export type { ToastContextValue, ToastInput, ToastMessage, ToastVariant };
