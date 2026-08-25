import { describe, expect, it } from 'vitest';

import { analyzeRequestSchema } from './schemas';

const createValidRequest = () => ({
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
});

describe('analyzeRequestSchema', () => {
  it('현재 버전의 정규화된 요청을 허용한다', () => {
    expect(analyzeRequestSchema.safeParse(createValidRequest()).success).toBe(
      true,
    );
  });

  it('지원하지 않는 schemaVersion과 group type을 거부한다', () => {
    const invalidRequest = {
      ...createValidRequest(),
      schemaVersion: '2026-01-01',
      group: {
        type: 'work',
        customName: null,
      },
    };

    expect(analyzeRequestSchema.safeParse(invalidRequest).success).toBe(false);
  });

  it('대소문자만 다른 중복 닉네임을 거부한다', () => {
    const invalidRequest = createValidRequest();
    invalidRequest.members[0].nickname = 'Mingle';
    invalidRequest.members[1].nickname = 'mingle';

    expect(analyzeRequestSchema.safeParse(invalidRequest).success).toBe(false);
  });

  it('중복 memberId와 불연속 order를 거부한다', () => {
    const invalidRequest = createValidRequest();
    invalidRequest.members[1].memberId = 'member-1';
    invalidRequest.members[1].order = 2;

    expect(analyzeRequestSchema.safeParse(invalidRequest).success).toBe(false);
  });

  it('본인이 정확히 한 명이 아니면 거부한다', () => {
    const invalidRequest = createValidRequest();
    invalidRequest.members[1].isSelf = true;

    expect(analyzeRequestSchema.safeParse(invalidRequest).success).toBe(false);
  });
});
