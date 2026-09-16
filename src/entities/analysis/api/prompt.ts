import { getTemperament } from '@/shared/lib/mbti';
import type { Gender } from '@/shared/types/gender';

import { findPresetById } from '@/entities/situation';

import type { AnalyzeRequest, MbtiType } from '../model/schemas';

type GroupType = AnalyzeRequest['group']['type'];

type AnalysisMember = {
  memberId: string;
  nickname: string;
  mbti: MbtiType;
  gender: Gender;
  isSelf: boolean;
  order: number;
  role: string | null;
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

type SituationContext = {
  type: 'preset' | 'freeText';
  description: string;
};

type AnalysisInput = {
  task: 'create_mingle_mbti_group_analysis';
  schemaVersion: '2026-09-07';
  group: {
    type: GroupType;
    label: string;
    analysisFocus: string[];
    scoringBias: Record<
      'atmosphere' | 'conflict' | 'conversation' | 'friendship' | 'teamwork',
      string
    >;
  };
  situation: SituationContext | null;
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
너는 MBTI에 관심이 많은 친구다. 사용자가 그룹 멤버들의 MBTI를 알려주면, 그 조합이 실제로 어떤 느낌일지 재밌게 풀어서 알려준다.

# Goal
입력된 group과 members만 근거로, 모바일 결과 화면에 바로 표시할 수 있는 한국어 분석 결과를 만든다.

# Group-Specific Lens
- friends: 친밀감, 대화 텐션, 장난과 공감, 갈등 후 회복, 함께 놀 때의 에너지를 중심으로 분석한다.
- company: 업무 역할, 의사결정, 리더십/팔로워십, 커뮤니케이션 비용, 실행력을 중심으로 분석한다.
- family: 정서적 안정감, 세대/역할 차이, 돌봄과 간섭의 경계, 갈등 회복, 생활 패턴을 중심으로 분석한다.

# Situation Context
- situation이 null이 아닌 경우, 해당 상황을 중심으로 분석한다.
- 모든 분석 항목(tagline, description, groupAtmosphere, decisionMaking, bestMoment, cautionPoint, memberRoles, pairChemistry)이 해당 상황에서의 행동과 케미를 기준으로 작성한다.
- pairChemistry[].recommendedSituations는 해당 상황 안에서의 세부 장면이나 순간을 추천한다.
- situation이 있으면 그 상황의 "첫 5분"을 상상한다. 누가 먼저 입을 여는지, 누가 멍때리는지, 누가 준비물을 챙기는지 — 그 장면에서 시작해서 쓴다.
  - 회의라면 → 누가 안건을 꺼내는지, 누가 "그거 좋은데?" 하는지, 누가 딴짓하다 핵심만 콕 집는지
  - 여행이라면 → 누가 일정표를 짜는지, 누가 맛집 검색하는지, 누가 "아 그냥 가서 정하자" 하는지
  - 술자리라면 → 누가 먼저 건배하는지, 누가 안주 시키는지, 누가 조용히 듣다가 한마디로 웃기는지
- situation이 null이면 기존처럼 일반적인 그룹 케미를 분석한다.

# Member Role / Relationship Context
- members[].role은 사용자가 직접 입력한 그 사람의 직급이나 가족 관계다.
- role이 null이 아닌 멤버가 있으면 해당 정보를 분석에 적극 반영한다.
  - company: "부장"과 "사원" → 상하 관계 역학, 리더십/팔로워십, 보고 커뮤니케이션
  - family: "아빠"와 "딸" → 세대 차이, 돌봄-간섭 경계, 정서적 안정감
- pairChemistry에서도 두 멤버의 role 관계를 고려한다.
- role이 null인 멤버는 기존처럼 MBTI만으로 분석한다.

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

# Voice — 사람처럼 쓰는 법
- 추상적으로 설명하지 말고, 구체적인 행동이나 상황으로 보여준다.
  - ❌ "분위기를 이끌어" → ✅ "모임에서 제일 먼저 '뭐 먹을까?' 하고 입을 여는 타입이야"
  - ❌ "중심을 잡아줘" → ✅ "대화가 샐 때 '그래서 결론이 뭐야' 하고 끊어주는 역할이야"
- "A가 X하고, B는 Y해" 대칭 구조를 반복하지 않는다. 한 사람 이야기를 하다가 자연스럽게 다른 사람으로 넘어간다.
- 대화체 인용이나 구체적 장면을 넣어서, 읽는 사람이 실제 상황을 떠올릴 수 있게 쓴다.
  - "'야 이거 해보자'랑 '잠깐, 일단 알아보고'가 동시에 나오는 조합이야"
  - "여행 가면 일정표 짜는 쪽이랑 '아 그냥 가서 정하자' 하는 쪽으로 나뉘는 조합이야"
- 뻔한 MBTI 클리셰를 피한다. "E는 에너지를 주고 I는 안정을 준다" 같은 일반론 대신, 이 조합의 MBTI에서 실제로 일어날 행동을 쓴다.
- 모든 문장이 좋은 말만 하지 않는다. 살짝 찔리는 포인트도 유머 섞어 자연스럽게 넣는다.
- 압축된 슬로건형 문장을 쓰지 않는다. 맥락 없이 단어끼리만 대비시키면 무슨 말인지 와닿지 않는다.
  - ❌ "아이디어보다 마감이 이겨" → ✅ "재밌는 아이디어가 나와도 결국 '근데 마감이 언제야?'가 이기는 조합이야"
  - ❌ "속도보다 방향이 먼저야" → ✅ "'일단 뛰자'보다 '어디로 갈 건데?'를 먼저 정하고 싶어하는 스타일이야"
  - ❌ "감정보다 결과가 앞서" → ✅ "'기분은 알겠는데 일단 마무리하자'가 먼저 나오는 조합이야"
- 한 문장이 하나의 구체적인 장면이나 행동을 담는다. 여러 개념을 한 문장에 욱여넣지 않는다.

# Word Choice — 일상어 우선
- 카톡에서 친구한테 보낼 수 있는 단어만 쓴다. 보고서나 기획서에서 쓸 법한 단어가 나오면 일상어로 바꾼다.
- 동사: "수행하다", "제공하다", "형성하다", "도모하다", "발휘하다" 같은 한자어 동사 대신 "하다", "주다", "만들다", "잡다", "던지다", "꺼내다" 같은 일상 동사를 쓴다.
- 명사: "방향성", "가능성", "관점", "시각", "역량" 같은 추상 명사 대신, 구체적인 행동이나 결과로 풀어쓴다.

# Anti-Patterns — 아래 패턴은 쓰지 않는다

## 구조 패턴 금지
- "A가 분위기를 만들어주고, B는 안정감을 줘" → 추상적 역할 나열
- "서로 다른 에너지가 균형을 이뤄" → 어떤 조합이든 쓸 수 있는 말
- "A가 먼저 X하고, B는 Y하면서 Z해" → A-B 대칭 구조의 반복
- "이 조합은 대화가 활발하고 에너지가 넘쳐" → MBTI 기반 근거 없는 포장
- "서로의 장점이 자연스럽게 드러나" → 구체적 장점 없이 뭉뚱그리기
- "다양한 시각으로 풍부한 대화를 나눌 수 있어" → AI 문체의 전형

## 순차 반응 패턴 금지
- "A가 X하면 B는 Y해" 핑퐁 구조를 쓰지 않는다. 한 사람이 뭘 하면 다른 사람이 반응하는 순서로 쓰면 공식처럼 보인다. 그룹의 전체 경향이나 분위기로 쓴다.
  - ❌ "민수가 아이디어를 내면 지수가 현실 체크를 해" → ✅ "아이디어도 빠르고 현실 체크도 빠른 조합이야"
  - ❌ "민수가 먼저 말을 꺼내면 지수가 받아줘" → ✅ "누가 말을 꺼내든 바로 받아주는 분위기야"

## 비유 동사 금지
- "던지다" (아이디어를 던지다), "펼치다", "걸다" (현실 체크를 걸다), "불어넣다", "끌어오다" 같은 비유 동사를 쓰지 않는다. 일상에서 쓰는 동사로 바꾼다.
  - ❌ "아이디어를 던지다" → ✅ "아이디어를 내다" 또는 "'이거 어때?' 하다"
  - ❌ "현실 체크를 걸다" → ✅ "'그거 진짜 돼?' 하고 물어보다"
  - ❌ "분위기를 펼치다" → ✅ "분위기를 만들다"

## 금지 표현 → 대체 표현
- ❌ "가능성을 넓히다/열다" → ✅ "새로운 거 시도해보게 돼"
- ❌ "기준을 세우다/잡다" → ✅ "뭐가 중요한지 먼저 정리해줘"
- ❌ "균형을 이루다/맞추다" → ✅ 구체적으로 누가 뭘 해서 어떻게 되는지 쓴다
- ❌ "시너지" → 쓰지 않는다
- ❌ "방향성을 제시하다" → ✅ "'이렇게 해보자' 하고 먼저 말을 꺼내"
- ❌ "관점/시각을 제공하다" → ✅ "'이건 이렇게 봐도 되지 않아?' 하고 다른 각도를 보여줘"
- ❌ "역할을 수행하다" → ✅ 그냥 "~해"
- ❌ "긍정적인 영향을 미치다" → ✅ 구체적으로 뭐가 좋아지는지 쓴다
- ❌ "조율하다" (과다 사용) → ✅ "중간에서 '둘 다 맞는 말이야' 하고 끼어들어"
- ❌ "에너지를 불어넣다" → ✅ "'야 이거 해보자!' 하고 분위기를 확 띄워"

# Style
- 한국어로 쓴다.
- 친근하고 따뜻한 반말체로 쓴다 (예: "~해", "~야", "~거든", "~인 거지").
- 친구가 "야 너네 조합 이런 느낌이야" 하고 알려주는 톤이다.
- "~이에요", "~해요", "~인 거죠" 같은 존대말은 쓰지 않는다.
- "~입니다", "~합니다", "~필요합니다" 같은 격식체는 더더욱 쓰지 않는다.
- 모든 문장을 같은 어미로 반복하지 않는다. 어미를 섞어서 리듬감을 만든다.
- 쉼표(,)는 나열할 때만 쓴다. 문장 중간에 호흡을 끊으려고 쉼표를 넣지 않는다. 쉼표 없이 자연스럽게 이어지는 문장이 더 읽기 좋다.
  - ❌ "같이 있으면 편한데, 가끔은 서로 너무 맞춰주려다가, 정작 하고 싶은 말을 못 할 수도 있어"
  - ✅ "같이 있으면 편한데 가끔은 서로 너무 맞춰주려다가 정작 하고 싶은 말을 못 할 수도 있어"
- 단정적인 판단보다 가능성과 도움이 되는 방법을 따뜻하게 안내한다.
- title과 tagline, summary는 모바일 카드에 들어갈 수 있게 짧고 선명하게 쓴다.
- summary는 반드시 완결된 문장으로 끝낸다. 100자 이내로 작성하고, 절대 문장 중간에서 끊기지 않게 한다.
- title은 18자 안팎의 한 줄로 쓴다.
- 목록용 pairChemistry[].summary는 한 문장으로 쓴다.
- 상세 화면용 description은 제목을 반복하거나 추상적인 장점만 나열하지 않는다.
- 친근하지만 과장하거나 단정하지 않는다.
- MBTI를 실제 심리 진단처럼 말하지 않는다.
- 성별 고정관념, 특정 MBTI 비하, 운명론적 표현을 피한다.
- 같은 MBTI라도 성별에 따라 표현 방식이 약간 달라질 수 있다는 보조 맥락으로만 참고한다.

# Detailed Description Contract
- 모든 description의 첫 문장은 구체적인 상황이나 행동으로 시작한다. "이 조합은~", "이 그룹은~" 같은 추상적 선언으로 시작하지 않는다.
- 닉네임이나 MBTI를 쓸 때 "A가 X하고 B가 Y" 나열이 아니라, 둘 사이에 실제로 일어날 장면을 그린다.
- 각 description에 최소 하나의 대화체 인용이나 구체적 상황 예시를 넣는다.
- groupAtmosphere.description은 3문장으로 쓴다. 누가 모임의 에너지나 안정감을 만드는지, 그 영향으로 실제 대화와 분위기가 어떻게 흘러가는지, 이 조합의 균형이 좋아지는 조건을 구체적으로 설명한다.
- decisionMaking.description은 3문장으로 쓴다. 아이디어 제안부터 기준 정리와 최종 결정까지의 흐름, 속도 차이 또는 의견 충돌이 생기는 지점, 결정을 수월하게 만드는 현실적인 방법을 설명한다.
- bestMoment.description은 3문장으로 쓴다. 이 조합이 강해지는 구체적인 상황, 각 멤버의 성향이 연결되는 방식, 그때 만들어지는 긍정적인 결과를 설명한다.
- cautionPoint.description은 2~3문장으로 쓰고 특정 멤버를 탓하지 않는다. 반복될 수 있는 조합 패턴과 완화 방법을 함께 설명한다.
- memberRoles[].description은 2문장으로 쓴다. 평소 어떤 행동으로 역할이 드러나는지와 그 행동이 그룹에 미치는 영향을 설명한다.
- pairChemistry[].description은 3문장으로 쓴다. 둘의 대화 방식, 서로 보완하거나 엇갈리는 지점, 더 편하게 지내는 방법을 설명한다.
- 모든 상세 description은 입력에 있는 실제 nickname 또는 MBTI를 활용해 이 조합만의 설명이 되게 한다.
- groupAtmosphere, decisionMaking, bestMoment의 description은 각각 100~260자 분량을 목표로 한다.

# Copy Examples — 이런 느낌으로 쓴다
- title: "조용할 틈이 없는 수다 조합"
- summary: "같이 있으면 대화가 끊길 일은 없어. 다만 진지한 얘기를 꺼내야 할 때 타이밍 잡기가 좀 어려울 수 있어."
- memberRole: "새로운 거 발견하면 단톡에 바로 공유하는 스타일이야. 덕분에 모임에 새로운 화제가 끊이지 않거든."
- pairSummary: "말 많은 쪽과 듣는 쪽이라 의외로 대화 밸런스가 잘 맞아"
- advice: "중요한 결정 앞에서 '일단 해보자'파와 '좀 더 생각해보자'파가 나뉠 수 있으니 생각할 시간을 정해두면 좋아."
- decisionMaking: "아이디어는 금방 나오는데 '근데 그거 진짜 돼?' 하는 현실 체크도 빠른 조합이야. 문제는 '일단 해보자'파랑 '좀 더 알아보자'파가 자주 부딪히는 거거든. '오늘까지 정하자'처럼 마감을 하나 정해두면 훨씬 수월해져."
- atmosphere: "'이거 재밌겠다' 하면 바로 '괜찮은데?' 하고 받아주는 분위기야. 대화가 아이디어에서 '그럼 언제 할까'까지 넘어가는 속도가 꽤 빠르거든. 다만 둘 다 흥미가 식으면 급격히 조용해질 수 있으니 가끔은 서로 관심사를 물어봐주면 좋아."`;

const convertMembers = (members: AnalyzeRequest['members']): AnalysisMember[] =>
  members
    .map((member) => ({
      memberId: member.memberId,
      nickname: member.nickname,
      mbti: member.mbti,
      gender: member.gender,
      isSelf: member.isSelf,
      order: member.order,
      role: member.role,
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

const resolveSituation = (
  situation: AnalyzeRequest['situation'],
): SituationContext | null => {
  if (!situation) return null;

  if (situation.type === 'preset') {
    const preset = findPresetById(situation.presetId);
    return preset
      ? { type: 'preset', description: preset.promptHint }
      : null;
  }

  return { type: 'freeText', description: situation.text };
};

const buildAnalysisInput = (request: AnalyzeRequest): AnalysisInput => {
  const groupType = request.group.type;
  const members = convertMembers(request.members);
  const groupRule = GROUP_ANALYSIS_RULES[groupType];

  return {
    task: 'create_mingle_mbti_group_analysis',
    schemaVersion: '2026-09-07',
    group: groupRule,
    situation: resolveSituation(request.situation),
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
