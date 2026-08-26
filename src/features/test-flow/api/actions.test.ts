import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestAnalysis } from './actions';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('requestAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    groupType: 'friends' as const,
    members: [
      { id: '1', nickname: '민지', mbti: 'ENFP' as const, gender: 'female' as const, isSelf: true },
      { id: '2', nickname: '하니', mbti: 'ISTJ' as const, gender: 'female' as const, isSelf: false },
    ],
  };

  const expectedBody = {
    schemaVersion: '2026-08-24',
    group: {
      type: 'friends',
      customName: null,
    },
    members: [
      {
        memberId: '1',
        nickname: '민지',
        mbti: 'ENFP',
        gender: 'female',
        isSelf: true,
        order: 0,
      },
      {
        memberId: '2',
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

  it('성공 시 분석 데이터를 반환한다', async () => {
    const mockData = { chemistryScore: 85, summary: '좋은 케미' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    });

    const result = await requestAnalysis(validInput);

    expect(result).toEqual({ data: mockData });
    expect(mockFetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expectedBody),
      signal: expect.any(AbortSignal),
    }));
  });

  it('API 에러 시 에러 메시지를 반환한다', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: '분석에 실패했습니다' }),
    });

    const result = await requestAnalysis(validInput);

    expect(result).toEqual({ error: '분석에 실패했습니다' });
  });

  it('API 에러 응답이 JSON 파싱 불가하면 기본 에러를 반환한다', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('parse error')),
    });

    const result = await requestAnalysis(validInput);

    expect(result).toEqual({ error: '분석 요청에 실패했습니다' });
  });

  it('company 요청을 올바르게 전송한다', async () => {
    const inputWithCompany = {
      ...validInput,
      groupType: 'company' as const,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { chemistryScore: 90 } }),
    });

    await requestAnalysis(inputWithCompany);

    expect(mockFetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...expectedBody,
        group: {
          ...expectedBody.group,
          type: 'company',
        },
      }),
      signal: expect.any(AbortSignal),
    }));
  });
});
