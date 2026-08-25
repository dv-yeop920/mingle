import { getTemperament } from '@/shared/lib/mbti';
import type { Gender } from '@/shared/types/gender';

import type { AnalyzeRequest, MbtiType } from '../model/schemas';

type GroupType = AnalyzeRequest['group']['type'];

type AnalysisMember = {
  memberId: string;
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf: boolean;
  order: number;
};

type ExpectedPair = {
  pairId: string;
  memberAId: string;
  memberBId: string;
  memberANickname: string;
  memberBNickname: string;
  memberAMbti: MbtiType;
  memberBMbti: MbtiType;
};

type AnalysisInput = {
  task: 'create_mingle_mbti_group_analysis';
  schemaVersion: '2026-08-24';
  group: {
    type: GroupType;
    label: string;
    analysisFocus: string[];
    scoringBias: Record<
      'atmosphere' | 'conflict' | 'conversation' | 'friendship' | 'teamwork',
      string
    >;
  };
  members: AnalysisMember[];
  expectedPairs: ExpectedPair[];
  computedSignals: {
    eCount: number;
    fCount: number;
    iCount: number;
    jCount: number;
    memberCount: number;
    pCount: number;
    tCount: number;
    temperamentCounts: Record<string, number>;
  };
};

const GROUP_ANALYSIS_RULES: Record<GroupType, AnalysisInput['group']> = {
  friends: {
    type: 'friends',
    label: '친구',
    analysisFocus: [
      '친밀감',
      '대화 텐션',
      '장난과 공감의 균형',
      '갈등 후 회복',
      '함께 놀 때의 에너지',
    ],
    scoringBias: {
      conversation: '대화가 자연스럽게 이어지고 서로 반응을 잘 받아주는지',
      friendship: '정서적 친밀감과 편하게 만날 수 있는 안정감',
      teamwork: '함께 약속/여행/모임을 굴릴 때 역할 분담이 되는지',
      atmosphere: '모임의 텐션, 유쾌함, 편안함',
      conflict: '다툼 후 다시 풀고 넘어갈 수 있는 회복력',
    },
  },
  company: {
    type: 'company',
    label: '회사/팀',
    analysisFocus: [
      '업무 역할',
      '의사결정',
      '리더십/팔로워십',
      '커뮤니케이션 비용',
      '실행력',
    ],
    scoringBias: {
      conversation: '업무 커뮤니케이션이 명확하고 오해가 적은지',
      friendship: '개인적 친밀감보다 신뢰와 협업 안정감',
      teamwork: '역할 분담, 실행력, 마감 대응력',
      atmosphere: '팀 분위기, 회의 텐션, 심리적 안정감',
      conflict: '의견 충돌을 생산적으로 조율하는 능력',
    },
  },
  family: {
    type: 'family',
    label: '가족',
    analysisFocus: [
      '정서적 안정감',
      '세대/역할 차이',
      '돌봄과 간섭의 경계',
      '갈등 회복',
      '생활 패턴',
    ],
    scoringBias: {
      conversation: '일상 대화와 감정 표현이 편하게 오가는지',
      friendship: '가족 안의 정서적 유대감과 안정감',
      teamwork: '집안일, 일정, 돌봄 같은 생활 협력',
      atmosphere: '집 안 분위기, 편안함, 긴장도',
      conflict: '반복되는 생활 갈등을 풀고 회복하는 힘',
    },
  },
};

const ANALYSIS_INSTRUCTIONS = `# Role
너는 MINGLE의 MBTI 기반 그룹 케미 분석 엔진이다.

# Goal
입력된 group과 members만 근거로, 모바일 결과 화면에 바로 표시할 수 있는 한국어 분석 결과를 만든다.

# Group-Specific Lens
- friends: 친밀감, 대화 텐션, 장난과 공감, 갈등 후 회복, 함께 놀 때의 에너지를 중심으로 분석한다.
- company: 업무 역할, 의사결정, 리더십/팔로워십, 커뮤니케이션 비용, 실행력을 중심으로 분석한다.
- family: 정서적 안정감, 세대/역할 차이, 돌봄과 간섭의 경계, 갈등 회복, 생활 패턴을 중심으로 분석한다.

# Scoring
- 모든 점수는 0~100 정수다.
- metrics.conversation은 대화 케미다.
- metrics.friendship은 관계 깊이 또는 협업 신뢰다.
- metrics.teamwork는 함께 움직이는 힘이다.
- metrics.atmosphere는 같이 있을 때의 분위기다.
- metrics.conflict는 높을수록 갈등 관리/해소 케미가 좋다는 뜻이다. 갈등 위험도가 아니다.
- pairChemistry[].conflictScore도 높을수록 좋다.
- 주의 포인트는 cautionPoint 문장으로만 설명한다.

# Required Coverage
- 모든 members를 memberRoles에 정확히 한 번씩 포함한다.
- input.expectedPairs의 모든 pair를 pairChemistry에 정확히 한 번씩 포함한다.
- pair는 nickname이 아니라 memberId로 연결한다.

# Style
- 한국어로 쓴다.
- 전체 결과는 다정하고 편안한 해요체로 쓴다. 사용자가 친구에게 설명을 듣는 느낌이어야 한다.
- 문장 끝은 "~이에요/~예요", "~해요", "~하면 좋아요", "~할 수 있어요", "~일 것 같아요"처럼 부드럽게 쓴다.
- "~입니다", "~합니다", "~필요합니다", "~예상됩니다", "~할 수 있습니다"처럼 보고서 같은 격식체는 쓰지 않는다.
- 모든 문장을 같은 어미로 반복하지 말고, 단정적인 판단보다 가능성과 도움이 되는 방법을 따뜻하게 안내한다.
- title과 tagline, summary는 모바일 카드에 들어갈 수 있게 짧고 선명하게 쓴다.
- title은 18자 안팎의 한 줄로 쓴다.
- 목록용 pairChemistry[].summary는 한 문장으로 쓴다.
- 상세 화면용 description은 제목을 반복하거나 추상적인 장점만 나열하지 않는다.
- 친근하지만 과장하거나 단정하지 않는다.
- MBTI를 실제 심리 진단처럼 말하지 않는다.
- 성별 고정관념, 특정 MBTI 비하, 운명론적 표현을 피한다.
- 같은 MBTI라도 성별에 따라 표현 방식이 약간 달라질 수 있다는 보조 맥락으로만 참고한다.

# Detailed Description Contract
- groupAtmosphere.description은 3문장으로 쓴다. 누가 모임의 에너지나 안정감을 만드는지, 그 영향으로 실제 대화와 분위기가 어떻게 흘러가는지, 이 조합의 균형이 좋아지는 조건을 구체적으로 설명한다.
- decisionMaking.description은 3문장으로 쓴다. 아이디어 제안부터 기준 정리와 최종 결정까지의 흐름, 속도 차이 또는 의견 충돌이 생기는 지점, 결정을 수월하게 만드는 현실적인 방법을 설명한다.
- bestMoment.description은 3문장으로 쓴다. 이 조합이 강해지는 구체적인 상황, 각 멤버의 성향이 연결되는 방식, 그때 만들어지는 긍정적인 결과를 설명한다.
- cautionPoint.description은 2~3문장으로 쓰고 특정 멤버를 탓하지 않는다. 반복될 수 있는 조합 패턴과 완화 방법을 함께 설명한다.
- memberRoles[].description은 2문장으로 쓴다. 평소 어떤 행동으로 역할이 드러나는지와 그 행동이 그룹에 미치는 영향을 설명한다.
- pairChemistry[].description은 3문장으로 쓴다. 둘의 대화 방식, 서로 보완하거나 엇갈리는 지점, 더 편하게 지내는 방법을 설명한다.
- 모든 상세 description은 입력에 있는 실제 nickname 또는 MBTI를 활용해 이 조합만의 설명이 되게 한다.
- groupAtmosphere, decisionMaking, bestMoment의 description은 각각 100~260자 분량을 목표로 한다.

# Copy Examples
- title: "아이디어가 끊이지 않는 수다형 모임"
- summary: "민수가 먼저 분위기를 열어주고, 지수는 모두가 편하게 이야기할 수 있도록 중심을 잡아줘요."
- advice: "의견이 엇갈릴 때는 선택지를 두세 개로 줄이면 더 편하게 결정할 수 있어요."
- prediction: "함께 여행을 준비할 때 서로의 장점이 자연스럽게 드러날 것 같아요."`;

const convertMembers = (members: AnalyzeRequest['members']): AnalysisMember[] =>
  members
    .map((member) => ({
      memberId: member.memberId,
      nickname: member.nickname,
      mbti: member.mbti,
      gender: member.gender,
      isSelf: member.isSelf,
      order: member.order,
    }))
    .toSorted((a, b) => a.order - b.order);

const buildExpectedPairs = (members: AnalysisMember[]): ExpectedPair[] =>
  members.flatMap((memberA, index) =>
    members.slice(index + 1).map((memberB) => ({
      pairId: `${memberA.memberId}:${memberB.memberId}`,
      memberAId: memberA.memberId,
      memberBId: memberB.memberId,
      memberANickname: memberA.nickname,
      memberBNickname: memberB.nickname,
      memberAMbti: memberA.mbti,
      memberBMbti: memberB.mbti,
    })),
  );

const buildComputedSignals = (
  members: AnalysisMember[],
): AnalysisInput['computedSignals'] => {
  const temperamentCounts = members.reduce<Record<string, number>>(
    (acc, member) => {
      const temperament = getTemperament(member.mbti);
      return { ...acc, [temperament]: (acc[temperament] ?? 0) + 1 };
    },
    { analyst: 0, diplomat: 0, explorer: 0, sentinel: 0 },
  );

  return {
    memberCount: members.length,
    eCount: members.filter((member) => member.mbti[0] === 'E').length,
    iCount: members.filter((member) => member.mbti[0] === 'I').length,
    tCount: members.filter((member) => member.mbti[2] === 'T').length,
    fCount: members.filter((member) => member.mbti[2] === 'F').length,
    jCount: members.filter((member) => member.mbti[3] === 'J').length,
    pCount: members.filter((member) => member.mbti[3] === 'P').length,
    temperamentCounts,
  };
};

const buildAnalysisInput = (request: AnalyzeRequest): AnalysisInput => {
  const groupType = request.group.type;
  const members = convertMembers(request.members);
  const groupRule = GROUP_ANALYSIS_RULES[groupType];

  return {
    task: 'create_mingle_mbti_group_analysis',
    schemaVersion: request.schemaVersion,
    group: groupRule,
    members,
    expectedPairs: buildExpectedPairs(members),
    computedSignals: buildComputedSignals(members),
  };
};

export {
  ANALYSIS_INSTRUCTIONS,
  GROUP_ANALYSIS_RULES,
  buildAnalysisInput,
  buildExpectedPairs,
};
export type { AnalysisInput, AnalysisMember, ExpectedPair, GroupType };
