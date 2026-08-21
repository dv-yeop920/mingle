'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { TextField } from '@/shared/ui/text-field';

import { GROUP_TYPE_OPTIONS, GroupTypeCard } from '@/entities/group';

import { useTestFlowStore } from '@/features/test-flow/model/store';

import { MemberCountModal } from '../member-count-modal';

import type { GroupTypeSelectorProps } from './types';

const GroupTypeSelector = ({ onNext, className }: GroupTypeSelectorProps) => {
  const { groupType, customName, setGroupType, setCustomName, setMemberCount, initializeMembers } =
    useTestFlowStore();
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);

  const handleCardClick = (type: (typeof GROUP_TYPE_OPTIONS)[number]['type']) => {
    setGroupType(type);
    if (type !== 'custom') {
      setIsCountModalOpen(true);
    }
  };

  const handleCustomNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customName.trim()) {
      setIsCountModalOpen(true);
    }
  };

  const handleCountConfirm = (count: number) => {
    setMemberCount(count);
    initializeMembers(count);
    setIsCountModalOpen(false);
    onNext?.();
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-3">
        {GROUP_TYPE_OPTIONS.map((option) => (
          <GroupTypeCard
            key={option.type}
            icon={option.icon}
            title={option.title}
            description={option.description}
            iconBg={option.iconBg}
            isDashed={option.isDashed}
            isSelected={groupType === option.type}
            onClick={() => handleCardClick(option.type)}
          />
        ))}
      </div>

      {groupType === 'custom' && (
        <TextField
          label="그룹 이름"
          placeholder="그룹 이름을 입력하세요"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={handleCustomNameKeyDown}
        />
      )}

      <MemberCountModal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        onConfirm={handleCountConfirm}
      />
    </div>
  );
};

export { GroupTypeSelector };
