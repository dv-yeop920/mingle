type SaveAnalysisSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => Promise<void> | void;
  isSubmitting?: boolean;
  submitError?: string | null;
  defaultTitle?: string;
};

export type { SaveAnalysisSheetProps };
