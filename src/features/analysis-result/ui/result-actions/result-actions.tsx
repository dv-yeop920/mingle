import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import type { ResultActionsProps } from './types';

const ResultActions = ({
  onRetest,
  onAddMembers,
  className,
}: ResultActionsProps) => {
  return (
    <div className={cn('grid grid-cols-2 gap-[10px]', className)}>
      <Button variant="secondary" onClick={onRetest}>
        다시 테스트하기
      </Button>
      <Button variant="secondary" onClick={onAddMembers} disabled={!onAddMembers}>
        멤버 추가 분석
      </Button>
    </div>
  );
};

export { ResultActions };
