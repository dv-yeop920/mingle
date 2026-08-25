'use client';

import { useState } from 'react';

import type { MbtiType } from '@/shared/types/mbti';
import { Button } from '@/shared/ui/button';

import { MbtiPicker } from '@/entities/mbti';
import type { Gender } from '@/entities/member';

import { convertMembersToNicknameErrors } from '@/features/test-flow/model/schemas';
import { useTestFlowStore } from '@/features/test-flow/model/store';

import { EditableMemberCard } from '../editable-member-card';

import type { MemberSetupFormProps } from './types';

const MemberSetupForm = ({ className }: MemberSetupFormProps) => {
  const { members, addMember, updateMember, removeMember } = useTestFlowStore();
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const nicknameErrors = convertMembersToNicknameErrors(members);

  const handleAdd = () => {
    addMember({
      id: crypto.randomUUID(),
      nickname: '',
      mbti: 'ISTJ',
      gender: 'other',
      isSelf: false,
    });
  };

  const handleNicknameChange = (id: string, value: string) => {
    const filtered = value.replace(/[^가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ]/g, '').slice(0, 8);
    updateMember(id, { nickname: filtered });
  };

  const handleMbtiSelect = (id: string) => {
    setActiveMemberId(id);
  };

  const handleMbtiPick = (mbti: MbtiType) => {
    if (activeMemberId) {
      updateMember(activeMemberId, { mbti });
    }
    setActiveMemberId(null);
  };

  const handleGenderChange = (id: string, gender: Gender) => {
    updateMember(id, { gender });
  };

  const handleDelete = (id: string) => {
    removeMember(id);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between pb-5">
        <h3 className="text-section font-black text-foreground">
          멤버 ({members.length}명)
        </h3>
        <span className="text-caption text-hint">최소 2명</span>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <EditableMemberCard
            key={member.id}
            id={member.id}
            nickname={member.nickname}
            mbti={member.mbti}
            gender={member.gender}
            isSelf={member.isSelf}
            onNicknameChange={handleNicknameChange}
            onMbtiSelect={handleMbtiSelect}
            onGenderChange={handleGenderChange}
            onDelete={handleDelete}
            nicknameError={nicknameErrors[member.id]}
          />
        ))}
      </div>

      <div className="pt-5">
        <Button variant="dashed" onClick={handleAdd}>
          + 멤버 추가
        </Button>
      </div>

      <MbtiPicker
        isOpen={activeMemberId !== null}
        onClose={() => setActiveMemberId(null)}
        onSelect={handleMbtiPick}
      />
    </div>
  );
};

export { MemberSetupForm };
