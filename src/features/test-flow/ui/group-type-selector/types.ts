import type { SelfMemberSeed } from '@/features/test-flow/model/store';

type GroupTypeSelectorProps = {
  selfMemberSeed?: SelfMemberSeed | null;
  onNext?: () => void;
  className?: string;
};

export type { GroupTypeSelectorProps };
