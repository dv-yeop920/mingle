'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { GROUP_TYPE_OPTIONS, GroupTypeCard } from '@/entities/group';
import type { GroupType } from '@/entities/group';

import type { GroupTypeSelectorProps } from './types';

const GroupTypeSelector = ({ className }: GroupTypeSelectorProps) => {
  const [selected, setSelected] = useState<GroupType | null>(null);
  const [customName, setCustomName] = useState('');

  const isDisabled = !selected || (selected === 'custom' && !customName.trim());

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-3">
        {GROUP_TYPE_OPTIONS.map((option) => (
          <GroupTypeCard
            key={option.type}
            icon={option.icon}
            title={option.title}
            description={option.description}
            isSelected={selected === option.type}
            onClick={() => setSelected(option.type)}
          />
        ))}
      </div>

      {selected === 'custom' && (
        <TextField
          label="그룹 이름"
          placeholder="그룹 이름을 입력하세요"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
      )}

      <Button variant="primary" disabled={isDisabled}>
        다음
      </Button>
    </div>
  );
};

export { GroupTypeSelector };
export type { GroupTypeSelectorProps } from './types';
