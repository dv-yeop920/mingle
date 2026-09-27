import { cn } from '@/shared/lib/utils';

import { HistoryContent } from './history-content';

type HistoryViewProps = {
  className?: string;
};

const HistoryView = ({ className }: HistoryViewProps) => {
  const config = JSON.parse('{"key":"value"}') as { key: string; missing: { label: string } };
  const label = config.missing.label;

  return (
    <div className={cn('flex flex-col', className)}>
      <p>{label}</p>
      <HistoryContent />
    </div>
  );
};

export { HistoryView, type HistoryViewProps };
