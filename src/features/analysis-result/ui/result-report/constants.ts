import type { GroupAtmosphere, MemberRole, Metric, PairChemistry } from '@/entities/analysis';

const MOCK_METRICS: Metric[] = [
  { label: '소통 원활도', value: 82 },
  { label: '갈등 가능성', value: 35, isCaution: true },
  { label: '협업 시너지', value: 74 },
  { label: '정서적 안정감', value: 68 },
];

const MOCK_ROLES: MemberRole[] = [
  { memberId: '1', nickname: '민지', mbti: 'ENFP', role: '분위기 메이커', description: '에너지를 불어넣고 팀 사기를 높이는 역할' },
  { memberId: '2', nickname: '수현', mbti: 'INTJ', role: '전략가', description: '장기적 방향을 설정하고 효율적 방법을 제시' },
  { memberId: '3', nickname: '지훈', mbti: 'ISFJ', role: '조율자', description: '갈등을 중재하고 팀의 화합을 이끌어냄' },
  { memberId: '4', nickname: '하늘', mbti: 'ESTP', role: '실행자', description: '빠른 판단으로 아이디어를 행동에 옮김' },
];

const MOCK_PAIRS: PairChemistry[] = [
  { memberA: { nickname: '민지', mbti: 'ENFP' }, memberB: { nickname: '수현', mbti: 'INTJ' }, score: 88, summary: '서로 보완하는 환상의 조합' },
  { memberA: { nickname: '민지', mbti: 'ENFP' }, memberB: { nickname: '지훈', mbti: 'ISFJ' }, score: 72, summary: '따뜻한 감성으로 연결되는 사이' },
  { memberA: { nickname: '수현', mbti: 'INTJ' }, memberB: { nickname: '하늘', mbti: 'ESTP' }, score: 55, summary: '관점 차이가 있지만 존중하는 관계' },
];

const MOCK_ATMOSPHERES: GroupAtmosphere[] = [
  { title: '자유로운 소통 분위기', description: '이 그룹은 개방적인 대화를 즐기며, 서로의 의견을 자유롭게 나눌 수 있는 환경을 형성합니다.', variant: 'positive' },
  { title: '감정 표현 방식 차이 주의', description: 'F와 T 성향의 차이로 인해 감정 표현에 온도차가 생길 수 있습니다.', variant: 'insight' },
];

const MOCK_CHEMISTRY_SCORE = 75;

export { MOCK_ATMOSPHERES, MOCK_CHEMISTRY_SCORE, MOCK_METRICS, MOCK_PAIRS, MOCK_ROLES };
