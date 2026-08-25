import { describe, expect, it } from 'vitest';

import { convertAtmosphereForStorage } from './convert-atmosphere-for-storage';

describe('convertAtmosphereForStorage', () => {
  it('OpenAI 분위기 섹션의 제목과 설명을 모두 보존한다', () => {
    const stored = convertAtmosphereForStorage({
      groupAtmosphere: { title: '활기찬 모임', description: '전체 설명' },
      decisionMaking: { title: '함께 결정', description: '결정 설명' },
      cautionPoint: { title: '속도 차이', description: '주의 설명' },
      bestMoment: { title: '여행할 때', description: '강점 설명' },
    });

    expect(stored).toEqual({
      groupAtmosphere: { title: '활기찬 모임', description: '전체 설명' },
      decisionMaking: { title: '함께 결정', description: '결정 설명' },
      cautionPoint: { title: '속도 차이', description: '주의 설명' },
      bestMoment: { title: '여행할 때', description: '강점 설명' },
    });
  });

  it('기존 저장 형식은 그대로 유지한다', () => {
    const stored = convertAtmosphereForStorage({
      groupAtmosphere: {
        description: '기존 제목',
        decisionMaking: '기존 결정 제목',
      },
    });

    expect(stored).toEqual({
      description: '기존 제목',
      decisionMaking: '기존 결정 제목',
    });
  });
});
