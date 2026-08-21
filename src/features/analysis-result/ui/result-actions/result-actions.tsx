import { cn } from '@/shared/lib/utils';

import type { ResultActionsProps } from './types';

const ResultActions = ({
  onRetest,
  onAddMembers,
  className,
}: ResultActionsProps) => {
  return (
    <div className={cn('grid grid-cols-2 gap-[10px]', className)}>
      <button
        type="button"
        onClick={onRetest}
        className="flex h-[54px] cursor-pointer items-center justify-center rounded-field border-[1.5px] border-disabled bg-surface text-[14px] font-extrabold text-muted-alt btn-press"
      >
        다시 테스트하기
      </button>
      <button
        type="button"
        onClick={onAddMembers}
        className="flex h-[54px] cursor-pointer items-center justify-center rounded-field border-[1.5px] border-disabled bg-surface text-[14px] font-extrabold text-muted-alt btn-press"
      >
        멤버 추가 분석
      </button>
    </div>
  );
};

export { ResultActions };
