import type { MbtiType } from '@/shared/types/mbti';

type MbtiPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mbti: MbtiType) => void;
  className?: string;
};

export type { MbtiPickerProps };
