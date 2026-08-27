import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockStream } = vi.hoisted(() => ({
  mockStream: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    responses = {
      stream: mockStream,
    };
  },
}));

import { POST } from './route';

const VALID_BODY = {
  schemaVersion: '2026-08-24',
  group: {
    type: 'friends',
    customName: null,
  },
  members: [
    {
      memberId: 'member-1',
      nickname: '민지',
      mbti: 'ENFP',
      gender: 'female',
      isSelf: true,
      order: 0,
    },
    {
      memberId: 'member-2',
      nickname: '하니',
      mbti: 'ISTJ',
      gender: 'female',
      isSelf: false,
      order: 1,
    },
  ],
  options: {
    locale: 'ko-KR',
    tone: 'friendly',
    includeAllPairs: true,
  },
};

const VALID_RESULT = {
  chemistryScore: 82,
  tagline: '다름이 힘이 되는 조합',
  metrics: {
    conversation: 80,
    friendship: 84,
    teamwork: 78,
    atmosphere: 85,
    conflict: 76,
  },
  groupAtmosphere: {
    title: '활기와 안정의 균형',
    description: '서로 다른 에너지가 분위기를 균형 있게 만듭니다.',
  },
  decisionMaking: {
    title: '아이디어 뒤 현실 점검',
    description: '새로운 의견을 낸 뒤 실행 가능한 방향으로 정리합니다.',
  },
  cautionPoint: {
    title: '속도 차이를 확인해요',
    description: '결정 전에 서로 필요한 생각 시간을 확인하면 좋습니다.',
  },
  bestMoment: {
    title: '계획을 실행할 때',
    description: '아이디어와 실행력이 함께 필요한 순간에 강합니다.',
  },
  memberRoles: [
    {
      memberId: 'member-1',
      nickname: '민지',
      mbti: 'ENFP',
      title: '아이디어 메이커',
      description: '새로운 가능성을 열어 분위기를 움직입니다.',
    },
    {
      memberId: 'member-2',
      nickname: '하니',
      mbti: 'ISTJ',
      title: '현실 조율자',
      description: '실행 가능한 순서와 기준을 잡아줍니다.',
    },
  ],
  pairChemistry: [
    {
      pairId: 'member-1:member-2',
      memberAId: 'member-1',
      memberBId: 'member-2',
      memberANickname: '민지',
      memberBNickname: '하니',
      memberAMbti: 'ENFP',
      memberBMbti: 'ISTJ',
      score: 81,
      summary: '상상력과 현실감의 만남',
      description: '서로 다른 관점이 빈틈을 채워주는 조합입니다.',
      conversationScore: 79,
      conflictScore: 75,
      recommendedSituations: ['여행 계획', '프로젝트 실행'],
    },
  ],
  summary: '다른 속도를 존중할수록 강해지는 조합',
};

const createRequest = (body: unknown) =>
  new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

type DeltaHandler = (event: { delta: string }) => void;

const createMockStreamObject = (
  outputParsed: unknown,
  textChunks: string[] = ['chunk1', 'chunk2'],
) => {
  const handlers = new Map<string, DeltaHandler>();

  return {
    on: (event: string, handler: DeltaHandler) => {
      handlers.set(event, handler);
    },
    finalResponse: () => {
      const deltaHandler = handlers.get('response.output_text.delta');
      if (deltaHandler) {
        for (const chunk of textChunks) {
          deltaHandler({ delta: chunk });
        }
      }
      return Promise.resolve({ output_parsed: outputParsed });
    },
    abort: vi.fn(),
  };
};

const parseSSEResponse = async (response: Response) => {
  const text = await response.text();
  const events: { event: string; data: unknown }[] = [];

  for (const block of text.split('\n\n')) {
    if (!block.trim()) continue;
    let event = '';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7);
      else if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (event && data) {
      events.push({ event, data: JSON.parse(data) });
    }
  }

  return events;
};

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 요청의 분석 결과를 SSE로 스트리밍한다', async () => {
    mockStream.mockReturnValue(
      createMockStreamObject(VALID_RESULT),
    );

    const response = await POST(createRequest(VALID_BODY));
    const events = await parseSSEResponse(response);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    const progressEvents = events.filter((e) => e.event === 'progress');
    expect(progressEvents.length).toBeGreaterThanOrEqual(1);
    expect((progressEvents[0].data as { progress: number }).progress).toBe(2);

    const resultEvent = events.find((e) => e.event === 'result');
    expect(resultEvent).toBeDefined();
    expect((resultEvent!.data as { data: { chemistryScore: number } }).data.chemistryScore).toBe(82);
    expect((resultEvent!.data as { data: { groupType: string } }).data.groupType).toBe('friends');

    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.6-luna',
        store: false,
        prompt_cache_key: 'mingle-analysis-v2',
        text: expect.objectContaining({ verbosity: 'high' }),
      }),
    );
  });

  it('유효하지 않은 요청을 OpenAI 호출 전에 거부한다', async () => {
    const response = await POST(createRequest({ group: { type: 'friends' } }));

    expect(response.status).toBe(400);
    expect(mockStream).not.toHaveBeenCalled();
  });

  it('멤버 또는 pair가 누락된 결과를 error 이벤트로 전송한다', async () => {
    mockStream.mockReturnValue(
      createMockStreamObject({
        ...VALID_RESULT,
        pairChemistry: [],
      }),
    );

    const response = await POST(createRequest(VALID_BODY));
    const events = await parseSSEResponse(response);

    const errorEvent = events.find((e) => e.event === 'error');
    expect(errorEvent).toBeDefined();
    expect((errorEvent!.data as { error: string }).error).toContain('다시 시도해주세요');
  });

  it('OpenAI quota 오류를 error 이벤트로 전송한다', async () => {
    const mockObj = createMockStreamObject(null);
    mockObj.finalResponse = () =>
      Promise.reject({ code: 'insufficient_quota', status: 429 });
    mockStream.mockReturnValue(mockObj);

    const response = await POST(createRequest(VALID_BODY));
    const events = await parseSSEResponse(response);

    const errorEvent = events.find((e) => e.event === 'error');
    expect(errorEvent).toBeDefined();
    expect((errorEvent!.data as { error: string }).error).toBe(
      'AI 분석 사용량 한도를 초과했습니다',
    );
  });

  it('일시적인 rate limit 오류를 quota와 구분한다', async () => {
    const mockObj = createMockStreamObject(null);
    mockObj.finalResponse = () =>
      Promise.reject({ code: 'rate_limit_exceeded', status: 429 });
    mockStream.mockReturnValue(mockObj);

    const response = await POST(createRequest(VALID_BODY));
    const events = await parseSSEResponse(response);

    const errorEvent = events.find((e) => e.event === 'error');
    expect(errorEvent).toBeDefined();
    expect((errorEvent!.data as { error: string }).error).toBe(
      '분석 요청이 몰리고 있어요. 잠시 후 다시 시도해주세요',
    );
  });

  it('output_parsed가 null이면 error 이벤트를 전송한다', async () => {
    mockStream.mockReturnValue(createMockStreamObject(null));

    const response = await POST(createRequest(VALID_BODY));
    const events = await parseSSEResponse(response);

    const errorEvent = events.find((e) => e.event === 'error');
    expect(errorEvent).toBeDefined();
  });
});
