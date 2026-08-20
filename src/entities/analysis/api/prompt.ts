type PromptInput = {
  groupType: string;
  customName?: string;
  members: Array<{
    nickname: string;
    mbti: string;
    gender: string;
    isSelf: boolean;
  }>;
};

const GROUP_TYPE_LABELS: Record<string, string> = {
  friends: '친구',
  work: '회사·팀',
  family: '가족',
  custom: '기타',
};

const SYSTEM_PROMPT = `당신은 MBTI 기반 그룹 케미 분석 전문가입니다. MBTI 16가지 유형의 인지 기능(Fi, Fe, Ti, Te, Ni, Ne, Si, Se)과 기질론(분석가, 외교관, 관리자, 탐험가)을 기반으로 그룹 구성원들의 관계 역학을 분석합니다.

분석 시 다음을 고려하세요:
- 각 MBTI 유형의 주기능/부기능 조합이 만드는 시너지와 갈등
- 그룹 내 E/I, T/F, J/P 비율이 전체 분위기에 미치는 영향
- 성별 구성이 그룹 역학에 미치는 미묘한 영향
- 관계 유형(친구/회사/가족)에 따른 상호작용 패턴 차이

톤: 친근하고 재미있게, 하지만 MBTI 이론에 기반한 근거 있는 분석. 한국어로 작성.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "chemistryScore": (0-100 정수, 그룹 전체 케미 점수),
  "metrics": {
    "conversation": (0-100, 대화 케미),
    "friendship": (0-100, 우정/관계 깊이),
    "teamwork": (0-100, 팀워크),
    "atmosphere": (0-100, 분위기),
    "conflict": (0-100, 갈등 가능성 - 높을수록 갈등 많음)
  },
  "groupAtmosphere": {
    "description": "(이 그룹이 함께 있을 때의 전반적인 분위기 설명, 2-3문장)",
    "decisionMaking": "(그룹이 결정을 내릴 때의 패턴, 2-3문장)",
    "conflict": "(갈등 상황에서 보이는 패턴, 2-3문장)",
    "bestMoment": "(이 조합이 가장 빛나는 순간, 2-3문장)"
  },
  "memberRoles": [
    {
      "nickname": "(멤버 닉네임)",
      "mbti": "(MBTI)",
      "role": "(그룹 내 역할, 예: 분위기메이커, 조율자, 아이디어뱅크 등)",
      "description": "(이 멤버가 그룹에서 어떤 역할을 하는지 1-2문장)"
    }
  ],
  "pairChemistry": [
    {
      "memberA": "(멤버A 닉네임)",
      "memberB": "(멤버B 닉네임)",
      "score": (0-100, 둘 사이 케미 점수),
      "summary": "(한 줄 요약)",
      "detail": "(상세 분석 2-3문장)"
    }
  ],
  "summary": "(그룹 전체를 한 문장으로 표현하는 인용문)"
}`;

const buildAnalysisPrompt = (input: PromptInput) => {
  const groupLabel =
    input.groupType === 'custom' && input.customName
      ? input.customName
      : GROUP_TYPE_LABELS[input.groupType] ?? input.groupType;

  const memberList = input.members
    .map(
      (m, i) =>
        `${i + 1}. ${m.nickname} (${m.mbti}, ${m.gender === 'male' ? '남성' : m.gender === 'female' ? '여성' : '기타'}${m.isSelf ? ', 본인' : ''})`,
    )
    .join('\n');

  const userPrompt = `다음 ${groupLabel} 그룹의 케미를 분석해주세요.

관계 유형: ${groupLabel}
구성원 (${input.members.length}명):
${memberList}

모든 구성원 간의 1:1 케미(pairChemistry)를 빠짐없이 분석해주세요.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
};

export { buildAnalysisPrompt, type PromptInput };
