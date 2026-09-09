import { cn } from '@/shared/lib/utils';

import { SettingsContent } from './settings-content';

type SettingsViewProps = {
  userId: string;
  className?: string;
};

const SettingsView = ({ userId, className }: SettingsViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="px-6 pt-[10px] pb-[20px]">
        <h1 className="text-title1 font-black text-foreground">설정</h1>
      </div>
      <SettingsContent userId={userId} />
    </div>
  );
};

export { SettingsView, type SettingsViewProps };
