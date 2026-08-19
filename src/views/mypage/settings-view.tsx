'use client';

import { cn } from '@/shared/lib/utils';

import { SettingsForm } from '@/features/profile';

import type { SettingsViewProps } from './types';

const SettingsView = ({ className }: SettingsViewProps) => {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <h1 className="text-title1 font-black text-foreground">설정</h1>
      <SettingsForm />
    </div>
  );
};

export { SettingsView, type SettingsViewProps };