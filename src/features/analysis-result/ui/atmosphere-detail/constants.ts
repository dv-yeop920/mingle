import type { InsightVariant } from '@/entities/analysis';

type MockAtmosphereItem = {
  variant: InsightVariant;
  eyebrow: string;
  title: string;
  description: string;
};

const MOCK_ATMOSPHERE_DETAILS: MockAtmosphereItem[] = [
  {
    variant: 'positive',
    eyebrow: '강점',
    title: '자유로운 소통 분위기',
    description:
      '이 그룹은 개방적인 대화를 즐기며, 서로의 의견을 자유롭게 나눌 수 있는 환경을 형성합니다. ENFP와 ESTP 멤버가 대화를 이끌고, ISFJ 멤버가 경청하며 분위기를 안정시킵니다.',
  },
  {
    variant: 'info',
    eyebrow: '특징',
    title: '다양한 관점의 충돌과 융합',
    description:
      'NT형과 SF형이 함께하면서 논리적 접근과 감성적 접근이 균형을 이룹니다. 처음에는 의견 충돌이 있을 수 있지만, 시간이 지나면 서로의 관점을 보완하게 됩니다.',
  },
  {
    variant: 'insight',
    eyebrow: '주의',
    title: '감정 표현 방식 차이 주의',
    description:
      'F와 T 성향의 차이로 인해 감정 표현에 온도차가 생길 수 있습니다. T형 멤버는 솔직한 피드백을, F형 멤버는 공감을 우선시하므로 서로의 스타일을 이해하는 것이 중요합니다.',
  },
];

export { MOCK_ATMOSPHERE_DETAILS };
