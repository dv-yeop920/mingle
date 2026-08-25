# MINGLE OpenAI 분석 API 요구사항

## 1. 결론

MINGLE의 MBTI 분석은 클라이언트가 입력값을 모으고, 서버가 검증·OpenAI 호출·응답 검증·저장을 책임지는 단일 서버 경계로 설계한다. OpenAI는 결과 문장을 자유롭게 생성하는 도구가 아니라, MINGLE이 정의한 `AnalysisResult` JSON 스키마를 채우는 분석 엔진으로 사용한다.

현재 코드 기준으로 바로 손봐야 할 약점은 다음이다.

- `groupType` 값이 문서/DB는 `company`, 코드 일부는 `work`로 갈라져 있다. 현재 활성 표준값은 `friends | company | family`로 통일한다. `custom`은 예약값으로 두되 아직 사용하지 않는다.
- 현재 `src/app/api/analyze/route.ts`는 Chat Completions + `json_object`를 사용한다. OpenAI 공식 문서 기준으로는 Responses API + Structured Outputs(JSON Schema/Zod)로 바꾸는 편이 결과 형식 안정성이 높다.
- members 입력 단계에서 닉네임 중복을 Zod로 막는다. 같은 닉네임이 있으면 "같은 닉네임은 쓸 수 없어요" 메시지를 보여주고 분석 요청을 보내지 않는다.
- pair 결과는 `memberA`, `memberB` 닉네임 문자열만 참조하면 안 된다. 요청과 응답 모두 `memberId` 기반으로 연결한다.
- 자동 저장은 하지 않는다. 분석 API는 임시 결과만 반환하고, 사용자가 "결과 저장" CTA를 눌렀을 때만 저장한다.
- 비로그인 사용자가 저장을 누르면 회원가입을 먼저 유도하고, 가입 완료 후 사용자가 저장 의사를 낸 임시 결과만 저장한다.

## 2. 기준 문서와 API 선택

참고한 공식 문서:

- OpenAI Developer Quickstart: `https://platform.openai.com/docs/quickstart/make-your-first-api-request`
- OpenAI Responses API Reference: `https://developers.openai.com/api/reference/responses/create`
- OpenAI Model Catalog: `https://developers.openai.com/api/docs/models`
- OpenAI Structured Outputs Guide: `https://developers.openai.com/api/docs/guides/structured-outputs`
- OpenAI Text Generation Guide: `https://developers.openai.com/api/docs/guides/text`
- OpenAI Prompt Engineering Guide: `https://developers.openai.com/api/docs/guides/prompt-engineering`
- Next.js Route Handlers: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Next.js Mutating Data / Server Actions: `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`

권장 OpenAI 설정:

```ts
const response = await openai.responses.parse({
  model: 'gpt-5.6-luna',
  instructions: ANALYSIS_INSTRUCTIONS,
  input: [
    {
      role: 'user',
      content: JSON.stringify(analysisInput),
    },
  ],
  text: {
    format: zodTextFormat(analysisResultSchema, 'mingle_analysis_result'),
    verbosity: 'medium',
  },
  reasoning: {
    effort: 'low',
  },
});
```

모델명은 비용/지연시간에 따라 최종 결정한다. 운영 기본값은 환경변수 `OPENAI_ANALYSIS_MODEL`로 두고, 기본 후보는 공식 모델 카탈로그에서 비용 민감 워크로드용으로 제시되는 `gpt-5.6-luna`로 시작한다. 고품질이 필요해지면 같은 스키마를 유지한 채 `gpt-5.6-terra` 또는 `gpt-5.6-sol`로 교체한다.

## 3. 사용자 흐름

```txt
Home
  -> 새로운 케미 테스트
  -> /group-type
  -> groupType 선택
  -> 인원 수 입력
  -> Zustand draft 초기화
  -> /members
  -> 멤버별 nickname/mbti/gender 입력
  -> 분석 CTA
  -> /analyzing
  -> requestAnalysis()
  -> POST /api/analyze
  -> 서버 검증
  -> OpenAI Responses API
  -> 응답 스키마 검증
  -> 결과 반환
  -> /result
```

`/analyzing` 화면은 실제 분석 요청의 시작점이다. 클라이언트는 OpenAI 키를 절대 알면 안 되고, `/api/analyze`에 정규화된 요청 본문만 보낸다.

## 4. 클라이언트 상태 구조

Zustand의 `features/test-flow/model/store.ts`는 입력 중인 draft만 가진다.

```ts
type TestFlowDraft = {
  groupType: 'friends' | 'company' | 'family' | null;
  customName: string | null;
  memberCount: number;
  members: TestMemberDraft[];
  isAnalyzing: boolean;
  saveIntent: boolean;
  analysisResult: AnalysisResult | null;
};

type TestMemberDraft = {
  memberId: string;
  nickname: string;
  mbti: MbtiType;
  gender: 'male' | 'female' | 'other';
  isSelf: boolean;
  order: number;
};
```

주의할 점:

- `memberId`는 DB id가 아니라 draft 식별자다. `crypto.randomUUID()`로 만들고, pair 결과 연결에 사용한다.
- `order`는 표시 순서와 저장 순서를 고정한다.
- `isSelf`는 정확히 1명이어야 한다. 비로그인 사용자도 첫 번째 멤버를 본인으로 본다.
- 닉네임은 1~8자, 한글/영문만 허용한다.
- 닉네임 중복은 허용하지 않는다. `members` 배열 전체를 Zod `superRefine`으로 검사하고, 중복된 각 필드에 "같은 닉네임은 쓸 수 없어요"를 표시한다.
- MBTI 기본값을 무작위로 채우더라도 분석 요청 직전에는 모든 멤버가 명시적으로 유효해야 한다.

members 입력 검증 예시:

```ts
const membersFormSchema = z.object({
  members: z.array(memberDraftSchema).min(2).max(15),
}).superRefine((value, ctx) => {
  const nicknameMap = new Map<string, number[]>();

  value.members.forEach((member, index) => {
    const key = member.nickname.trim();
    if (!key) return;
    nicknameMap.set(key, [...(nicknameMap.get(key) ?? []), index]);
  });

  nicknameMap.forEach((indexes) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => {
      ctx.addIssue({
        code: 'custom',
        message: '같은 닉네임은 쓸 수 없어요',
        path: ['members', index, 'nickname'],
      });
    });
  });
});
```

## 5. 서버 요청 구조

`features/test-flow/api/actions.ts`의 `requestAnalysis()`는 아래 형태만 `/api/analyze`로 보낸다.

```ts
type AnalyzeRequest = {
  schemaVersion: '2026-08-24';
  group: {
    type: 'friends' | 'company' | 'family';
    customName: string | null;
  };
  members: Array<{
    memberId: string;
    nickname: string;
    mbti: MbtiType;
    gender: 'male' | 'female' | 'other';
    isSelf: boolean;
    order: number;
  }>;
  options: {
    locale: 'ko-KR';
    tone: 'friendly';
    includeAllPairs: true;
  };
};
```

서버 검증 규칙:

- `schemaVersion`이 현재 서버가 아는 값인지 확인한다.
- 인원 수는 최소 2명, 최대 15명이다.
- `isSelf === true`인 멤버가 정확히 1명이어야 한다.
- `order`는 0부터 시작하는 연속 숫자여야 한다.
- `memberId`와 `nickname`은 요청 안에서 중복되면 안 된다.
- `custom`은 현재 사용하지 않는다. API 요청에서는 `friends | company | family`만 허용한다.
- `customName`은 현재 항상 `null`이다. 나중에 custom을 열 때만 필수값으로 전환한다.
- 모든 enum은 서버 Zod 스키마로 다시 검증한다.

## 6. 서버 처리 구조

권장 파일 배치:

```txt
src/app/api/analyze/route.ts
  - POST route shell
  - request.json()
  - analyzeRequestSchema.safeParse()
  - 인증 사용자 조회
  - entities/analysis/api 호출

src/entities/analysis/api/openai-client.ts
  - OpenAI client 생성
  - OPENAI_API_KEY 서버 전용 확인

src/entities/analysis/api/prompt.ts
  - instructions 생성
  - input 정규화

src/entities/analysis/model/schemas.ts
  - analyzeRequestSchema
  - analysisResultSchema
  - Zod inferred types

src/features/analysis-result/api/actions.ts
  - saveAnalysis()
  - deleteAnalysis()
```

`route.ts`는 얇게 유지한다. 실제 OpenAI 호출과 결과 파싱은 `entities/analysis/api`에 둔다. 저장은 "사용자 action" 성격이 강하므로 `features/analysis-result/api/actions.ts`가 맡는다.

Route Handler가 맞는 이유:

- OpenAI 외부 API 호출이 필요하다.
- 분석 중 timeout, retry, rate limit, JSON 파싱 실패를 HTTP 상태로 다뤄야 한다.
- 나중에 스트리밍/백그라운드 처리로 확장할 수 있다.

Server Action이 맞는 영역:

- 결과 저장
- 결과 삭제
- 히스토리 mutation

## 7. OpenAI 입력 프롬프트 구조

`instructions`에는 고정 규칙만 넣고, 사용자 데이터는 `input` JSON으로 분리한다.

```txt
Identity:
너는 MBTI 기반 그룹 케미 분석 엔진이다.

Task:
입력된 group과 members만 근거로 한국어 분석 결과를 생성한다.
group.type에 따라 분석 관점을 반드시 다르게 적용한다.

Rules:
- MBTI를 실제 심리 진단처럼 단정하지 않는다.
- 사용자의 성별을 고정관념 근거로 삼지 않는다.
- 같은 MBTI라도 성별에 따라 표현 방식과 관계에서 드러나는 경향이 약간 달라질 수 있다는 정도로만 참고한다.
- 모든 멤버와 모든 pair를 빠짐없이 포함한다.
- pair는 memberId로 참조한다.
- 점수는 0~100 정수다.
- conflict 점수는 높을수록 갈등 관리/해소 케미가 좋다는 뜻이다. 갈등 위험도를 뜻하지 않는다.
- 주의 포인트는 점수와 별개로 문장 필드에서 설명한다.
- 출력은 제공된 JSON Schema를 반드시 따른다.

Tone:
친근하고 재미있게 쓰되, 조롱/비하/운명론적 표현은 피한다.
결과 문구는 모바일 카드 UI에 들어갈 정도로 짧고 선명하게 쓴다.
```

그릴링 포인트: "MBTI 기반"이라는 말만으로 품질이 나오지 않는다. 프롬프트에는 결과 계산 기준을 줘야 한다. 예를 들어 E/I 비율, T/F 비율, J/P 비율, 같은 기질군 개수, 상호 보완 가능성, 의사결정 마찰 가능성을 입력에서 계산하거나 모델이 고려하도록 명시해야 한다. 성별은 보조 맥락일 뿐이며 성별 고정관념이나 단정 표현의 근거로 쓰면 안 된다.

### 7.1 단체별 분석 기준

`group.type`별로 우선순위를 다르게 둔다. 같은 멤버 조합이라도 친구, 회사/팀, 가족에서는 좋은 케미의 의미가 다르다.

```ts
const GROUP_ANALYSIS_RULES = {
  friends: {
    label: '친구',
    focus: [
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
    label: '회사/팀',
    focus: [
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
    label: '가족',
    focus: [
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
} as const;
```

`custom`은 현재 사용하지 않는다. 프롬프트와 요청 스키마에서 active group type으로 열지 않는다.

### 7.2 결과 문구 스타일

문구는 분석 보고서가 아니라 모바일 카드에 들어가는 짧은 카피처럼 작성한다.

- title: 18자 안팎의 한 줄. 예: "아이디어가 끊이지 않는 수다형 모임"
- 목록 카피(tagline, summary, pair summary)는 한 줄로 짧게 쓴다.
- 상세 description은 제목을 반복하지 않고 실제 멤버/MBTI의 상호작용을 연결한다.
- Group Atmosphere, Decision Making, Best Moment 설명은 각각 3문장, 100~260자를 목표로 한다.
- summary: 따옴표 안에 넣어도 어색하지 않은 짧은 한 줄.
- 주의 포인트: 비난이 아니라 조심하면 좋은 패턴으로 쓴다.
- 금지: "무조건", "절대", "최악", "문제적", 성별 고정관념, 특정 MBTI 비하.

예시 톤:

```txt
"아이디어가 끊이지 않는 수다형 모임"
ENFP와 ENTP가 분위기를 이끌고 ISTJ가 현실적인 방향을 잡아주는 조합입니다. 대화가 활발하지만 의견이 많아 결정이 늦어질 수 있습니다.

"시작은 빠르지만 최종 결정까지 시간이 필요한 팀"
누군가는 새로운 아이디어를 계속 제안하고 누군가는 현실적인 기준을 세우기 때문에 충분한 의견 교환 후 결론을 내리는 스타일입니다.

"여행 계획을 짤 때보다 여행지에서 더 강한 조합"
계획 과정에서는 의견이 많지만 실제로 함께 움직이기 시작하면 높은 적응력을 보여주는 그룹입니다.
```

### 7.3 프롬프트 템플릿

실제 `prompt.ts`는 아래 구조를 기준으로 작성한다.

```txt
# Identity
너는 MBTI 기반 그룹 케미 분석 엔진이다.

# Input
사용자 입력은 JSON으로 제공된다.
- group.type: friends | company | family
- members: memberId, nickname, mbti, gender, isSelf, order

# Group-Specific Lens
group.type이 friends이면 친밀감, 대화 텐션, 장난/공감, 갈등 후 회복, 함께 놀 때의 에너지를 중심으로 본다.
group.type이 company이면 업무 역할, 의사결정, 리더십/팔로워십, 커뮤니케이션 비용, 실행력을 중심으로 본다.
group.type이 family이면 정서적 안정감, 세대/역할 차이, 돌봄/간섭, 갈등 회복, 생활 패턴을 중심으로 본다.

# Scoring
모든 score는 0~100 정수다.
metrics.conflict와 pairChemistry.conflictScore는 높을수록 갈등 관리/해소 케미가 좋다.
주의 포인트는 risk 점수가 아니라 cautionPoint 문장으로 설명한다.

# Output
반드시 JSON Schema를 따른다.
모든 멤버를 memberRoles에 포함한다.
모든 pair를 빠짐없이 포함한다.
pair는 memberId로 참조한다.

# Style
한국어로 쓴다.
모바일 카드 UI에 들어갈 수 있도록 짧고 선명하게 쓴다.
친근하지만 과장하거나 단정하지 않는다.
```

### 7.4 실제 전송 구조

OpenAI 요청은 아래 세 가지를 분리해서 보낸다.

1. `instructions`: 정적 프롬프트. 역할, 분석 기준, 점수 의미, 말투만 담는다.
2. `analysisInput`: 동적 입력 JSON. group, members, 계산된 보조 신호, 생성해야 할 pair 목록을 담는다.
3. `analysisResultSchema`: 출력 JSON Schema. 필드 강제는 프롬프트가 아니라 Structured Outputs가 맡는다.

이렇게 분리하는 이유:

- 정적 프롬프트는 요청마다 거의 같아서 캐시 효율이 좋다.
- 사용자 입력은 JSON으로 들어가므로 모델이 멤버와 pair를 빠뜨릴 가능성이 줄어든다.
- 출력 형식은 `zodTextFormat()`으로 강제하므로 프롬프트에 긴 JSON 예시를 매번 반복하지 않는다.
- 말투 예시는 제품 카피 품질을 잡기 위한 최소 예시로만 둔다.

권장 파일 구조:

```txt
src/entities/analysis/api/prompt.ts
  - ANALYSIS_INSTRUCTIONS
  - GROUP_ANALYSIS_RULES
  - buildAnalysisInput()
  - buildExpectedPairs()

src/entities/analysis/model/schemas.ts
  - analyzeRequestSchema
  - analysisResultSchema
```

`instructions` 예시:

```ts
const ANALYSIS_INSTRUCTIONS = `
# Role
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
- 모바일 카드에 들어갈 수 있게 짧고 선명하게 쓴다.
- title은 18자 안팎의 한 줄로 쓴다.
- description은 1~2문장으로 쓴다.
- 친근하지만 과장하거나 단정하지 않는다.
- MBTI를 실제 심리 진단처럼 말하지 않는다.
- 성별 고정관념, 특정 MBTI 비하, 운명론적 표현을 피한다.
- 같은 MBTI라도 성별에 따라 표현 방식이 약간 달라질 수 있다는 보조 맥락으로만 참고한다.

# Copy Examples
- "아이디어가 끊이지 않는 수다형 모임"
- "시작은 빠르지만 최종 결정까지 시간이 필요한 팀"
- "여행 계획을 짤 때보다 여행지에서 더 강한 조합"
- "말이 끊이지 않는 조합"
`;
```

`analysisInput`은 모델이 놓치면 안 되는 내용을 구조화해서 넣는다.

```ts
type AnalysisInput = {
  task: 'create_mingle_mbti_group_analysis';
  schemaVersion: '2026-08-24';
  group: {
    type: 'friends' | 'company' | 'family';
    label: '친구' | '회사/팀' | '가족';
    analysisFocus: string[];
    scoringBias: Record<
      'conversation' | 'friendship' | 'teamwork' | 'atmosphere' | 'conflict',
      string
    >;
  };
  members: Array<{
    memberId: string;
    nickname: string;
    mbti: MbtiType;
    gender: 'male' | 'female' | 'other';
    isSelf: boolean;
    order: number;
  }>;
  expectedPairs: Array<{
    pairId: string;
    memberAId: string;
    memberBId: string;
    memberANickname: string;
    memberBNickname: string;
    memberAMbti: MbtiType;
    memberBMbti: MbtiType;
  }>;
  computedSignals: {
    memberCount: number;
    eCount: number;
    iCount: number;
    tCount: number;
    fCount: number;
    jCount: number;
    pCount: number;
    temperamentCounts: Record<string, number>;
  };
};
```

`expectedPairs`를 서버에서 미리 만들어 input에 넣어야 한다. 모델에게 "모든 pair를 만들어줘"라고만 말하면 누락 가능성이 올라간다.

```ts
const buildExpectedPairs = (members: AnalysisInput['members']) =>
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
```

`buildAnalysisInput()`은 group type별 분석 기준을 입력에 같이 넣는다.

```ts
const buildAnalysisInput = (request: AnalyzeRequest): AnalysisInput => {
  const groupRule = GROUP_ANALYSIS_RULES[request.group.type];
  const members = request.members.toSorted((a, b) => a.order - b.order);

  return {
    task: 'create_mingle_mbti_group_analysis',
    schemaVersion: request.schemaVersion,
    group: {
      type: request.group.type,
      label: groupRule.label,
      analysisFocus: groupRule.focus,
      scoringBias: groupRule.scoringBias,
    },
    members,
    expectedPairs: buildExpectedPairs(members),
    computedSignals: buildComputedSignals(members),
  };
};
```

OpenAI 호출은 `instructions`와 `analysisInput`만 보내고, 출력 형식은 Zod 스키마로 강제한다.

```ts
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

const openai = new OpenAI();

const createAnalysis = async (request: AnalyzeRequest) => {
  const analysisInput = buildAnalysisInput(request);

  const response = await openai.responses.parse({
    model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-5.6-luna',
    instructions: ANALYSIS_INSTRUCTIONS,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify(analysisInput),
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(
        analysisResultSchema,
        'mingle_analysis_result',
        {
          description:
            'MINGLE MBTI group chemistry analysis result for mobile UI cards.',
        },
      ),
      verbosity: 'medium',
    },
    reasoning: {
      effort: 'low',
    },
    prompt_cache_key: 'mingle-analysis-v1',
    store: false,
  });

  if (!response.output_parsed) {
    return { error: '분석 결과를 완성하지 못했어요. 다시 시도해주세요' };
  }

  return { data: response.output_parsed };
};
```

후처리는 반드시 별도로 한다. Structured Outputs는 타입 형태를 강제하지만, "모든 pair가 정확히 포함됐는지" 같은 비즈니스 무결성은 서버가 검증해야 한다.

```ts
const validateAnalysisCompleteness = (
  input: AnalysisInput,
  result: AnalysisResult,
) => {
  const expectedPairIds = new Set(input.expectedPairs.map((pair) => pair.pairId));
  const actualPairIds = new Set(result.pairChemistry.map((pair) => pair.pairId));

  if (result.memberRoles.length !== input.members.length) {
    return { error: '멤버 역할 분석이 누락되었습니다' };
  }

  if (actualPairIds.size !== expectedPairIds.size) {
    return { error: '1:1 케미 분석이 누락되었습니다' };
  }

  for (const pairId of expectedPairIds) {
    if (!actualPairIds.has(pairId)) {
      return { error: '1:1 케미 분석이 누락되었습니다' };
    }
  }

  return { data: true };
};
```

### 7.5 전송 payload 예시

OpenAI에 보내는 동적 입력은 사람이 읽는 프롬프트 문장이 아니라 아래처럼 구조화된 JSON이어야 한다.

```json
{
  "task": "create_mingle_mbti_group_analysis",
  "schemaVersion": "2026-08-24",
  "group": {
    "type": "company",
    "label": "회사/팀",
    "analysisFocus": [
      "업무 역할",
      "의사결정",
      "리더십/팔로워십",
      "커뮤니케이션 비용",
      "실행력"
    ],
    "scoringBias": {
      "conversation": "업무 커뮤니케이션이 명확하고 오해가 적은지",
      "friendship": "개인적 친밀감보다 신뢰와 협업 안정감",
      "teamwork": "역할 분담, 실행력, 마감 대응력",
      "atmosphere": "팀 분위기, 회의 텐션, 심리적 안정감",
      "conflict": "의견 충돌을 생산적으로 조율하는 능력"
    }
  },
  "members": [
    {
      "memberId": "member-1",
      "nickname": "준",
      "mbti": "ENTP",
      "gender": "male",
      "isSelf": true,
      "order": 0
    },
    {
      "memberId": "member-2",
      "nickname": "지연",
      "mbti": "ENFP",
      "gender": "female",
      "isSelf": false,
      "order": 1
    }
  ],
  "expectedPairs": [
    {
      "pairId": "member-1:member-2",
      "memberAId": "member-1",
      "memberBId": "member-2",
      "memberANickname": "준",
      "memberBNickname": "지연",
      "memberAMbti": "ENTP",
      "memberBMbti": "ENFP"
    }
  ],
  "computedSignals": {
    "memberCount": 2,
    "eCount": 2,
    "iCount": 0,
    "tCount": 1,
    "fCount": 1,
    "jCount": 0,
    "pCount": 2,
    "temperamentCounts": {
      "analyst": 1,
      "diplomat": 1,
      "sentinel": 0,
      "explorer": 0
    }
  }
}
```

이 구조로 보내면 모델은 "어떤 톤으로 쓸지"는 `instructions`에서, "무엇을 분석할지"는 `analysisInput`에서, "어떤 JSON으로 내보낼지"는 `analysisResultSchema`에서 각각 안내받는다.

## 8. OpenAI 출력 스키마

응답은 UI와 DB가 그대로 사용할 수 있는 형태여야 한다.

```ts
type AnalysisResult = {
  chemistryScore: number;
  tagline: string;
  metrics: {
    /** 대화 케미 */
    conversation: number;
    /** 우정/관계 깊이. company에서는 개인적 친밀감보다 협업 신뢰를 포함 */
    friendship: number;
    /** 팀워크 */
    teamwork: number;
    /** 분위기 */
    atmosphere: number;
    /** 높을수록 갈등 관리/해소 케미가 좋음 */
    conflict: number;
  };
  groupAtmosphere: {
    title: string;
    description: string;
  };
  decisionMaking: {
    title: string;
    description: string;
  };
  cautionPoint: {
    title: string;
    description: string;
  };
  bestMoment: {
    title: string;
    description: string;
  };
  memberRoles: Array<{
    memberId: string;
    nickname: string;
    mbti: MbtiType;
    title: string;
    description: string;
  }>;
  pairChemistry: Array<{
    pairId: string;
    memberAId: string;
    memberBId: string;
    memberANickname: string;
    memberBNickname: string;
    memberAMbti: MbtiType;
    memberBMbti: MbtiType;
    score: number;
    summary: string;
    description: string;
    conversationScore: number;
    /** 높을수록 둘 사이의 갈등 관리/해소 케미가 좋음 */
    conflictScore: number;
    recommendedSituations: string[];
  }>;
  summary: string;
};
```

후처리 검증:

- `memberRoles.length === members.length`
- `pairChemistry.length === n * (n - 1) / 2`
- 모든 `memberAId/memberBId/memberId`가 요청의 `memberId`에 존재
- `memberAId !== memberBId`
- pair 중복 없음
- 모든 점수는 정수 0~100
- 문자열 길이 제한 적용

이 검증이 실패하면 UI를 조용히 깨뜨리지 않는다. 서버는 실패로 처리하고 사용자에게 "분석 결과를 완성하지 못했어요. 다시 시도해주세요"를 반환한다. 클라이언트는 `/analyzing` 에러 상태에서 재시도 버튼을 보여준다. 서버 로그에는 OpenAI 응답 id와 validation issue를 남긴다.

UI 점수 의미:

- `metrics.conflict`와 `pairChemistry[].conflictScore`는 높을수록 좋다.
- Progress/score UI는 높은 conflict 값을 긍정 색상으로 표현한다.
- "위험함", "주의 필요", "갈등 위험" 같은 경고 UI는 conflict 점수와 같은 의미로 쓰지 않는다.
- 경고 UI가 필요하면 별도 `riskLevel` 또는 `100 - conflict`로 파생한 `riskScore`를 사용하고, 문구와 색상도 경고 의미로 분리한다.

### 8.1 필드별 콘텐츠 책임

`metrics`:

- Progress UI에 바로 들어가는 숫자값이다.
- `conversation`: 대화 케미.
- `friendship`: 친구/가족에서는 관계 깊이, 회사/팀에서는 협업 신뢰와 심리적 안정감까지 포함한다.
- `teamwork`: 역할 분담과 함께 움직이는 힘.
- `atmosphere`: 같이 있을 때의 공기, 텐션, 편안함.
- `conflict`: 갈등 가능성이 아니라 갈등 관리/해소 케미다. 높을수록 좋다.

`groupAtmosphere`:

- 이 모임의 정체성을 표현한다.
- `title` 예: "아이디어가 끊이지 않는 수다형 모임"
- `description` 예: "ENFP와 ENTP가 분위기를 이끌고 ISTJ가 현실적인 방향을 잡아주는 조합입니다. 대화가 활발하지만 의견이 많아 결정이 늦어질 수 있습니다."
- 상세 설명에는 분위기를 만드는 멤버, 실제 대화의 흐름, 균형이 좋아지는 조건을 순서대로 포함한다.

`memberRoles`:

- 각 인원이 이 단체에서 맡는 역할을 카드로 표시한다.
- 모든 멤버를 빠짐없이 포함한다.
- `title` 예: "아이디어 뱅크", "현실 조율자", "분위기 전환 담당"
- `description` 예: "새로운 이야기를 꺼내고 분위기를 전환하는 역할"
- 상세 화면에서 잘리지 않은 설명을 보여주므로, 역할이 드러나는 행동과 그룹에 미치는 영향을 2문장으로 쓴다.

`pairChemistry`:

- 모든 1:1 조합을 포함한다.
- Pair detail과 list card에 바로 쓸 수 있어야 한다.
- `score`는 pair progress에 사용한다.
- `summary` 예: "말이 끊이지 않는 조합"
- `description`은 상세 화면용 2~3문장이다.

`decisionMaking`:

- 단체가 결정을 내릴 때의 패턴을 설명한다.
- 예: "시작은 빠르지만 최종 결정까지 시간이 필요한 팀"
- 예: "누군가는 새로운 아이디어를 계속 제안하고 누군가는 현실적인 기준을 세우기 때문에 충분한 의견 교환 후 결론을 내리는 스타일입니다."
- 아이디어 제안부터 최종 결정까지의 흐름, 속도 차이가 생기는 지점, 결정을 돕는 현실적인 방법을 3문장으로 설명한다.

`cautionPoint`:

- 주의 포인트를 한 가지 핵심 패턴으로만 쓴다.
- 예: "계획을 중요하게 생각하는 사람과 즉흥적인 사람 사이에서 일정이나 약속을 두고 의견 차이가 발생할 수 있습니다."
- 특정 멤버를 문제로 몰지 않고, 조합에서 생길 수 있는 패턴으로 쓴다.

`bestMoment`:

- 이 조합이 가장 강해지는 순간을 표현한다.
- 예: "여행 계획을 짤 때보다 여행지에서 더 강한 조합"
- 예: "계획 과정에서는 의견이 많지만 실제로 함께 움직이기 시작하면 높은 적응력을 보여주는 그룹입니다."
- 강해지는 구체적인 상황, 멤버별 성향이 연결되는 방식, 만들어지는 긍정적인 결과를 3문장으로 설명한다.

### 8.2 출력 예시

```json
{
  "chemistryScore": 88,
  "tagline": "아이디어가 끊이지 않는 수다형 모임",
  "metrics": {
    "conversation": 94,
    "friendship": 87,
    "teamwork": 78,
    "atmosphere": 91,
    "conflict": 72
  },
  "groupAtmosphere": {
    "title": "아이디어가 끊이지 않는 수다형 모임",
    "description": "ENFP와 ENTP가 분위기를 이끌고 ISTJ가 현실적인 방향을 잡아주는 조합입니다. 대화가 활발하지만 의견이 많아 결정이 늦어질 수 있습니다."
  },
  "decisionMaking": {
    "title": "시작은 빠르지만 최종 결정까지 시간이 필요한 팀",
    "description": "누군가는 새로운 아이디어를 계속 제안하고 누군가는 현실적인 기준을 세우기 때문에 충분한 의견 교환 후 결론을 내리는 스타일입니다."
  },
  "cautionPoint": {
    "title": "계획과 즉흥 사이의 속도 차이",
    "description": "계획을 중요하게 생각하는 사람과 즉흥적인 사람 사이에서 일정이나 약속을 두고 의견 차이가 발생할 수 있습니다."
  },
  "bestMoment": {
    "title": "여행 계획을 짤 때보다 여행지에서 더 강한 조합",
    "description": "계획 과정에서는 의견이 많지만 실제로 함께 움직이기 시작하면 높은 적응력을 보여주는 그룹입니다."
  },
  "memberRoles": [
    {
      "memberId": "member-1",
      "nickname": "준",
      "mbti": "ENTP",
      "title": "아이디어 뱅크",
      "description": "새로운 이야기를 꺼내고 분위기를 전환하는 역할"
    }
  ],
  "pairChemistry": [
    {
      "pairId": "member-1:member-2",
      "memberAId": "member-1",
      "memberBId": "member-2",
      "memberANickname": "준",
      "memberBNickname": "지연",
      "memberAMbti": "ENTP",
      "memberBMbti": "ENFP",
      "score": 94,
      "summary": "말이 끊이지 않는 조합",
      "description": "둘 다 새로운 이야기에 빠르게 반응해서 대화가 자연스럽게 이어집니다. 다만 선택지가 너무 많아지면 결정을 미루기 쉬워 한 사람이 기준을 잡아주면 더 안정적입니다.",
      "conversationScore": 96,
      "conflictScore": 78,
      "recommendedSituations": ["브레인스토밍", "여행 중 즉흥 코스 찾기", "가벼운 모임 진행"]
    }
  ],
  "summary": "말은 많지만 결국 방향을 찾아가는 활기찬 조합"
}
```

## 9. 저장 정책

정책은 두 단계다.

1. 분석 API는 결과만 반환한다.
2. 결과 화면의 "결과 저장" CTA가 `saveAnalysis()` Server Action을 호출한다.

이유:

- 요구사항에 "결과 저장" 액션이 명시되어 있다.
- 비로그인 사용자의 결과 확인과 로그인 후 저장 플로우를 분리하기 쉽다.
- OpenAI 호출 성공과 DB 저장 실패가 한 요청에 섞이지 않는다.
- 저장 실패 시 임시 결과를 즉시 지우고 에러 메시지를 보여준다. 실패한 결과를 화면에 남겨 저장된 것처럼 오해하게 만들지 않는다.

비로그인 저장 흐름:

```txt
비로그인 사용자 /result
  -> 결과 저장 CTA
  -> saveIntent = true
  -> 임시 analysisResult를 sessionStorage 또는 Zustand persist에 보관
  -> /signup?redirect=/result&saveIntent=1
  -> 회원가입 완료
  -> PendingAnalysisSaver가 saveIntent === true일 때만 저장
  -> 저장 성공: analysisId 설정, 임시 결과 제거, /result?id={analysisId}
  -> 저장 실패: 임시 결과 제거, saveIntent false, 에러 메시지 표시
```

중요한 점:

- 로그인/회원가입 완료만으로 자동 저장하지 않는다.
- 사용자가 저장 CTA를 누른 경우에만 `saveIntent`를 세운다.
- 저장 실패 시 `analysisResult`, `saveIntent`, pending storage를 모두 제거한다.
- 저장 실패 메시지는 "결과 저장에 실패했어요. 다시 테스트해주세요"처럼 명확히 표시한다.

저장 시 DB 구조:

```txt
groups
  user_id
  type
  custom_name

members
  group_id
  nickname
  gender
  mbti
  is_self
  order

analyses
  user_id
  group_id
  chemistry_score
  tagline
  metrics
  group_atmosphere
  decision_making
  caution_point
  best_moment
  member_roles
  pair_chemistry
  summary
```

`decision_making`, `caution_point`, `best_moment`를 별도 `jsonb` 컬럼으로 둘지, 기존 `group_atmosphere` JSON 안에 함께 저장할지는 DB 마이그레이션 단계에서 결정한다. API 응답 타입은 분리된 필드를 기준으로 유지한다. 자동 저장은 제품 정책에서 제외한다. API에서 그룹/멤버/분석을 한 번에 저장하는 구조로 가지 않는다.

## 10. 보안과 운영

환경변수:

```txt
OPENAI_API_KEY=...
OPENAI_ANALYSIS_MODEL=gpt-5.6-luna
OPENAI_ANALYSIS_TIMEOUT_MS=25000
OPENAI_ANALYSIS_MAX_MEMBERS=15
```

규칙:

- `OPENAI_API_KEY`에 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- 서버 로그에 전체 프롬프트, 닉네임, 원문 응답을 그대로 남기지 않는다.
- 요청 크기를 제한한다. 멤버 최대 15명으로 제한한다.
- 분석 CTA는 구현 시 debounce와 중복 제출 방지 플래그로 연타를 막는다. 서버도 같은 사용자/IP 기준으로 짧은 시간 내 반복 분석 요청을 제한한다.
- OpenAI 실패는 502, 입력 검증 실패는 400, 인증 필요 저장 실패는 401로 나눈다.
- OpenAI 응답은 항상 Zod로 재검증한다. Structured Outputs를 쓰더라도 DB 저장 전 검증은 생략하지 않는다.

## 11. 구현 순서

1. `groupType` 표준값을 `company`로 통일한다.
2. `entities/analysis/model/schemas.ts`를 만들고 요청/응답 Zod 스키마를 정의한다.
3. members 폼에 닉네임 중복 Zod 검증과 필드별 에러 메시지를 추가한다.
4. `TestMemberDraft`에 `memberId`, `order`, `saveIntent`를 명확히 둔다.
5. `requestAnalysis()` 요청 본문을 `AnalyzeRequest`로 정규화한다.
6. `prompt.ts`를 `instructions + input JSON` 구조로 바꾼다.
7. `prompt.ts`에 `friends/company/family`별 분석 기준을 상수로 분리한다.
8. `route.ts`를 Responses API + Structured Outputs 기반으로 바꾼다.
9. OpenAI 결과 후처리 검증을 추가하고 pair 누락 시 재시도 요구 에러를 반환한다.
10. result UI와 저장 payload를 `groupAtmosphere`, `decisionMaking`, `cautionPoint`, `bestMoment` 분리 구조에 맞춘다.
11. 자동 저장을 제거하고 저장 CTA + 비로그인 회원가입 유도 + `saveIntent` 저장 흐름으로 정리한다.
12. 저장 실패 시 임시 결과 제거와 에러 메시지 표시를 구현한다.
13. 테스트를 추가한다.

필수 테스트:

- request schema: 최소/최대 인원, `customName === null`, 중복 nickname/memberId, self 1명 검증
- members form schema: 중복 닉네임 필드별 에러 메시지 검증
- output schema: pair 개수, member 참조 무결성, 점수 범위 검증
- output schema: pair 누락 시 실패 처리 검증
- prompt: 모든 멤버가 input에 포함되는지
- prompt: group type별 분석 기준이 instructions에 포함되는지
- prompt: `conflict`를 갈등 위험도가 아니라 갈등 관리/해소 케미로 설명하는지
- route: OpenAI 성공, OpenAI 빈 응답, OpenAI validation 실패
- save action: 저장 성공, 저장 실패 시 임시 결과 제거, 비로그인 저장 시 회원가입 유도
- store: 인원 수 기반 멤버 초기화, order 유지, self 1명 유지, saveIntent 유지/초기화

## 12. 그릴링 체크리스트

구현 전에 아래 질문에 답하지 못하면 아직 설계가 덜 된 것이다.

- 닉네임 중복은 members 단계에서 막는다. 중복 시 "같은 닉네임은 쓸 수 없어요"를 필드 에러로 표시한다.
- 회사/팀 값은 `company`로 통일한다.
- 저장 실패 시 임시 결과를 바로 지우고 에러 메시지를 보여준다.
- 비로그인 사용자가 저장을 누르면 회원가입을 먼저 유도하고, 가입 완료 후 `saveIntent`가 있을 때만 저장한다.
- OpenAI가 pair를 하나라도 누락하면 재시도를 요구한다.
- `conflict`는 높을수록 좋다. 위험/주의 UI는 별도 의미와 색상으로 분리한다.
- 성별은 같은 MBTI 안에서도 표현 방식 차이를 보조적으로 반영하기 위해 사용한다. 단, 프롬프트에서 고정관념과 단정 표현을 금지한다.
- 분석 API 연타는 CTA debounce, 중복 제출 방지 상태, 서버 rate limit로 막는다.
- OpenAI 모델 변경이 UI/DB 타입 변경을 요구하지 않도록 스키마를 앱이 소유한다.
- 자동 저장은 하지 않는다. 저장은 사용자가 CTA를 눌렀을 때만 실행한다.
