'use client';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';

import { GROUP_TYPE_OPTIONS, GroupTypeCard } from '@/entities/group';

import { useTestFlowStore } from '@/features/test-flow/model/store';

import type { GroupTypeSelectorProps } from './types';

const GroupTypeSelector = ({ onNext, className }: GroupTypeSelectorProps) => {
  const { groupType, customName, setGroupType, setCustomName } =
    useTestFlowStore();

  const isDisabled = !groupType || (groupType === 'custom' && !customName.trim());

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-3">
        {GROUP_TYPE_OPTIONS.map((option) => (
          <GroupTypeCard
            key={option.type}
            icon={option.icon}
            title={option.title}
            description={option.description}
            isSelected={groupType === option.type}
            onClick={() => setGroupType(option.type)}
          />
        ))}
      </div>

      {groupType === 'custom' && (
        <TextField
          label="그룹 이름"
          placeholder="그룹 이름을 입력하세요"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
      )}

      <Button variant="primary" disabled={isDisabled} onClick={onNext}>
        다음
      </Button>
    </div>
  );
};

export { GroupTypeSelector };
