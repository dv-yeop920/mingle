import type { TestMember } from '@/features/test-flow/model/store';

type RequestAnalysisInput = {
  groupType: string;
  customName?: string;
  members: TestMember[];
};

const requestAnalysis = async (input: RequestAnalysisInput) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    return { error: errorData?.error ?? '분석 요청에 실패했습니다' };
  }

  const data = await response.json();
  return { data };
};

export { requestAnalysis };
export type { RequestAnalysisInput };
