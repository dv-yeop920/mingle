import { cn } from '@/shared/lib/utils';

import { HistoryContent } from './history-content';

type HistoryViewProps = {
  className?: string;
};

const HistoryView = ({ className }: HistoryViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <HistoryContent />
    </div>
  );
};

export { HistoryView, type HistoryViewProps };
