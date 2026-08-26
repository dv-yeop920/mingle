'use client';

import { useState } from 'react';

import { trackTestStart } from '@/shared/lib/analytics';
import { cn } from '@/shared/lib/utils';

import { GROUP_TYPE_OPTIONS, GroupTypeCard } from '@/entities/group';

import { useTestFlowStore } from '@/features/test-flow/model/store';

import { MemberCountModal } from '../member-count-modal';

import type { GroupTypeSelectorProps } from './types';

const GroupTypeSelector = ({
  selfMemberSeed,
  onNext,
  className,
}: GroupTypeSelectorProps) => {
  const { groupType, setGroupType, setMemberCount, initializeMembers } =
    useTestFlowStore();
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const handleCardClick = (type: (typeof GROUP_TYPE_OPTIONS)[number]['type']) => {
    setGroupType(type);
    setModalKey((k) => k + 1);
    setIsCountModalOpen(true);
  };

  const handleCountConfirm = (count: number) => {
    setMemberCount(count);
    initializeMembers(count, selfMemberSeed);
    setIsCountModalOpen(false);
    if (groupType) trackTestStart(groupType);
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

      <MemberCountModal
        key={modalKey}
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        onConfirm={handleCountConfirm}
      />
    </div>
  );
};

export { GroupTypeSelector };
