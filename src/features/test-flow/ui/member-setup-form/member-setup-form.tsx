'use client';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import { MemberCard } from '@/entities/member';

import { useTestFlowStore } from '@/features/test-flow/model/store';

import type { MemberSetupFormProps } from './types';

const MemberSetupForm = ({ onStartAnalysis, className }: MemberSetupFormProps) => {
  const { members, addMember, removeMember } = useTestFlowStore();

  const handleAdd = () => {
    addMember({
      id: crypto.randomUUID(),
      nickname: '',
      mbti: 'ISTJ',
      gender: 'male',
      isSelf: false,
    });
  };

  const isDisabled = members.length < 2;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-section font-black text-foreground">
          멤버 ({members.length}명)
        </h3>
        <span className="text-caption text-hint">최소 2명</span>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            nickname={member.nickname}
            mbti={member.mbti}
            gender={member.gender}
            isSelf={member.isSelf}
            onMore={() => removeMember(member.id)}
          />
        ))}
      </div>

      <Button variant="dashed" onClick={handleAdd}>
        + 멤버 추가
      </Button>

      <Button
        variant="primary"
        disabled={isDisabled}
        onClick={onStartAnalysis}
      >
        분석 시작
      </Button>
    </div>
  );
};

export { MemberSetupForm };
