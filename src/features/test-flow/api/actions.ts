import type { GroupType } from '@/entities/group';

import type { TestMember } from '../model/store';

type RequestAnalysisInput = {
  groupType: GroupType;
  members: TestMember[];
  onProgress?: (progress: number) => void;
};

const ANALYSIS_TIMEOUT_MS = 60_000;

const parseSSEStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onProgress?: (progress: number) => void,
) => {
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      if (!block.trim()) continue;

      let event = '';
      let data = '';

      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) {
          event = line.slice(7);
        } else if (line.startsWith('data: ')) {
          data = line.slice(6);
        }
      }

      if (!event || !data) continue;

      const parsed = JSON.parse(data);

      if (event === 'progress') {
        onProgress?.(parsed.progress);
      } else if (event === 'result') {
        onProgress?.(100);
        return { data: parsed.data };
      } else if (event === 'error') {
        return { error: parsed.error as string };
      }
    }
  }

  return { error: '분석 응답이 불완전합니다' };
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
    signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    return { error: errorData?.error ?? '분석 요청에 실패했습니다' };
  }

  if (!response.body) {
    return { error: '스트리밍 응답을 받지 못했습니다' };
  }

  return parseSSEStream(response.body.getReader(), input.onProgress);
};

export { requestAnalysis };
export type { RequestAnalysisInput };
