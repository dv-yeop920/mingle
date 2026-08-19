'use client';

import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import { MemberCard } from '@/entities/member';

import { MOCK_NEW_MEMBER, MOCK_SELF } from './constants';
import type { MockMember } from './constants';
import type { MemberSetupFormProps } from './types';

const MemberSetupForm = ({ className }: MemberSetupFormProps) => {
  const [members, setMembers] = useState<MockMember[]>([MOCK_SELF]);

  const handleAdd = () => {
    setMembers((prev) => [
      ...prev,
      { ...MOCK_NEW_MEMBER, id: String(prev.length + 1) },
    ]);
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
            onMore={() => {}}
          />
        ))}
      </div>

      <Button variant="dashed" onClick={handleAdd}>
        + 멤버 추가
      </Button>

      <Button variant="primary" disabled={isDisabled}>
        분석 시작
      </Button>
    </div>
  );
};

export { MemberSetupForm, type MemberSetupFormProps };