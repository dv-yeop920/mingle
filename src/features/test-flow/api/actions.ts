import type { GroupType } from '@/entities/group';

import type { TestMember } from '../model/store';

type RequestAnalysisInput = {
  groupType: GroupType;
  members: TestMember[];
};

const requestAnalysis = async (input: RequestAnalysisInput) => {
  const body = {
    schemaVersion: '2026-08-24',
    group: {
      type: input.groupType,
      customName: null,
    },
    members: input.members.map((member, order) => ({
      memberId: member.id,
      nickname: member.nickname,
      mbti: member.mbti,
      gender: member.gender,
      isSelf: member.isSelf,
      order,
    })),
    options: {
      locale: 'ko-KR',
      tone: 'friendly',
      includeAllPairs: true,
    },
  } as const;

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    return { error: errorData?.error ?? '분석 요청에 실패했습니다' };
  }

  const result = await response.json();
  return { data: result.data };
};

export { requestAnalysis };
export type { RequestAnalysisInput };
