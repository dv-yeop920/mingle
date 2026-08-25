# MINGLE 개발 트러블슈팅 및 최적화 기록

> 대상: Next.js 16.3.1, React 19, OpenAI Responses API, Supabase, React Query, Zustand, Zod 4
>
> 이 문서는 OpenAI 분석 연동과 결과 화면을 구현하면서 실제로 발생한 문제, 해결 과정, 성능·비용 최적화 판단을 기록한다. 측정하지 않은 응답 시간이나 비용 개선율은 사용하지 않고 코드와 검증으로 확인된 내용만 기술한다.

## 1. 전체 결과

- OpenAI Chat Completions의 느슨한 JSON 응답 방식을 Responses API + Structured Outputs로 전환했다.
- 클라이언트 입력, OpenAI 출력, 전체 멤버·pair 포함 여부를 각각 다른 경계에서 검증한다.
- 임시 결과(Zustand)와 저장 결과(Supabase)의 필드 차이를 정규화해 동일한 결과 UI에서 처리한다.
- 누락되던 분위기 설명을 저장·조회·상세 화면까지 보존한다.
- 역할 상세, 1:1 케미 상세, 그룹 분위기 상세를 게스트와 로그인 사용자 모두에게 제공한다.
- 실제 OpenAI 요청과 전체 브라우저 플로우를 검증했고, 최종적으로 테스트 109개, ESLint, 프로덕션 빌드, `git diff --check`를 통과했다.

---

## 2. OpenAI 응답 형식이 불안정한 문제

### 증상

초기 분석 API는 Chat Completions와 `json_object` 방식에 의존했다. JSON 문법이 맞더라도 필요한 멤버 역할이나 1:1 조합이 빠지거나 필드명이 달라질 가능성이 있었다. UI는 OpenAI 응답 구조를 신뢰하고 있어 일부 데이터 누락이 빈 카드나 잘못된 상세 화면으로 이어질 수 있었다.

### 원인

- JSON mode는 JSON 문법만 보장하며 애플리케이션의 상세 스키마까지 강제하지 않는다.
- 닉네임 문자열로 pair를 연결하면 닉네임 변경·중복·필드명 변경에 취약하다.
- 배열 길이만 검사해서는 특정 멤버나 pair가 중복되고 다른 항목이 빠진 상황을 찾기 어렵다.

### 해결

1. `openai.responses.parse()`와 `zodTextFormat()`을 사용해 Responses API + Structured Outputs로 전환했다.
2. 요청에 `schemaVersion: '2026-08-24'`를 추가해 클라이언트와 서버의 계약 버전을 고정했다.
3. 멤버와 pair를 닉네임이 아닌 `memberId`, `pairId`로 연결했다.
4. Zod 파싱 이후에도 `Set` 기반 완전성 검사를 추가했다.
   - 모든 member ID가 `memberRoles`에 정확히 한 번 포함되는지 확인
   - 가능한 모든 pair ID가 `pairChemistry`에 정확히 한 번 포함되는지 확인
5. 불완전한 출력은 잘못된 UI를 렌더링하지 않고 `502`로 처리한다.

### 효과

- “유효한 JSON”과 “서비스에서 사용할 수 있는 완전한 분석 결과”를 구분했다.
- 필드 누락을 UI에서 뒤늦게 발견하는 대신 API 경계에서 조기에 차단한다.
- 멤버 수가 늘어도 pair 연결의 기준이 변하지 않는다.

### 관련 코드

- `src/app/api/analyze/route.ts`
- `src/entities/analysis/model/schemas.ts`
- `src/entities/analysis/api/prompt.ts`

---

## 3. 잘못된 요청에도 외부 API 비용이 발생할 수 있는 문제

### 증상

멤버 수, 본인 여부, 중복 닉네임, 잘못된 그룹 타입 같은 오류가 OpenAI 호출 직전까지 전달될 수 있었다.

### 원인

클라이언트 폼 검증만 신뢰하면 직접 API 호출이나 상태 불일치 요청을 서버에서 막을 수 없다.

### 해결

- 서버 Route Handler 시작점에서 `analyzeRequestSchema.safeParse()`를 실행한다.
- 다음 조건을 OpenAI 호출 전에 거부한다.
  - 지원하지 않는 schema version
  - `friends | company | family` 이외의 그룹 타입
  - 2명 미만 또는 15명 초과
  - 본인이 정확히 한 명이 아닌 경우
  - 대소문자만 다른 닉네임 중복
  - member ID 중복
  - 0부터 시작하지 않는 불연속 order

### 성능·비용 효과

- 실패가 확실한 요청은 네트워크 외부 경계를 넘지 않으므로 OpenAI 토큰과 API 대기 시간이 발생하지 않는다.
- 최대 인원을 15명으로 제한해 전체 pair 생성의 상한을 105쌍으로 고정했다. pair 생성은 본질적으로 `O(n²)`이므로 입력 제한이 응답 크기와 비용의 안전장치 역할을 한다.

### 검증

Route Handler 테스트에서 유효하지 않은 요청이 `400`을 반환하고 OpenAI mock이 호출되지 않는지 확인했다.

---

## 4. OpenAI 429 오류를 모두 같은 문제로 표시한 경우

### 증상

실제 API 테스트 중 `429 insufficient_quota`가 발생했다. 기존 처리에서는 사용량 한도 초과와 일시적인 요청 집중을 같은 메시지로 표시할 수 있었다.

### 원인

HTTP status만 확인하면 동일한 429 안에 포함되는 영구적 결제·quota 문제와 일시적인 rate limit을 구분할 수 없다.

### 해결

- `code === 'insufficient_quota'`를 먼저 검사해 “AI 분석 사용량 한도를 초과했습니다”를 반환한다.
- 그 외 `status === 429`는 “분석 요청이 몰리고 있어요. 잠시 후 다시 시도해주세요”로 처리한다.
- 예상하지 못한 오류는 서버 로그에 남기고 일반화된 `500` 메시지를 반환한다.

### 운영 효과

- 재시도로 해결되지 않는 quota 문제에 불필요한 재시도를 유도하지 않는다.
- 사용자 메시지만으로 결제/한도 문제와 트래픽 문제를 구분할 수 있어 운영 대응이 쉬워졌다.

---

## 5. 분석 설명이 지나치게 짧은 문제

### 증상

`GROUP ATMOSPHERE`, `DECISION MAKING`, `BEST MOMENT`가 제목 수준의 짧은 문장으로 생성되어 결과의 개인화와 설명력이 부족했다.

### 원인

- 프롬프트에 “모바일 카드에 들어갈 수 있게 짧게”와 “description은 1~2문장”이라는 광범위한 축약 지시가 있었다.
- 제목, 목록 요약, 상세 설명이 서로 다른 UI 책임을 갖는데도 동일한 길이 기준을 사용했다.
- 상세 설명이 반드시 포함해야 할 내용과 성공 기준이 정의되어 있지 않았다.

### 해결

프롬프트를 출력 용도별로 분리했다.

- `title`, `tagline`, 목록용 `summary`: 짧고 스캔하기 쉬운 카피
- `groupAtmosphere.description`: 분위기를 만드는 멤버 → 실제 대화 흐름 → 균형이 좋아지는 조건
- `decisionMaking.description`: 아이디어 제안 → 기준 정리 → 충돌 지점 → 현실적인 결정 방법
- `bestMoment.description`: 구체적인 상황 → 멤버 성향 연결 → 긍정적인 결과
- `memberRoles[].description`: 역할이 드러나는 행동 → 그룹에 미치는 영향
- `pairChemistry[].description`: 대화 방식 → 보완/충돌 지점 → 더 편하게 지내는 방법

추가로 Zod `minLength`/`maxLength`를 적용해 프롬프트 지시가 지켜지지 않은 짧은 응답도 구조적으로 차단했다. 상세 설명이 중요해진 요구사항에 맞춰 `text.verbosity`는 `high`, 추론 비용과 지연을 제한하기 위해 `reasoning.effort`는 `low`로 설정했다.

### 성능 대비 판단

- 모든 출력의 길이를 늘리지 않고 상세 화면용 description만 확장했다.
- 목록용 카피는 계속 짧게 유지해 모바일 가독성과 렌더링 밀도를 보존했다.
- 품질이 필요한 visible output에는 토큰을 사용하되, 별도 고난도 추론이 필요하지 않은 작업이므로 reasoning effort는 낮게 유지했다.

### 검증

실제 ENFP/ISTJ 분석에서 세 항목이 각각 3문장으로 생성되고, 닉네임·MBTI·행동 흐름·조율 방법이 포함되는 것을 브라우저에서 확인했다.

---

## 6. 카드에 제목만 보이고 본문이 사라진 문제

### 증상

결과 화면의 분위기 카드에서 제목은 렌더링되지만 설명 `<p>`가 비어 있었다.

### 원인

OpenAI 응답에는 `{ title, description }`이 모두 존재했지만 결과 정규화 과정에서 `title`만 평탄화했다. 렌더링 코드도 `description=""`을 전달했고, 저장할 때도 제목만 JSONB에 넣어 설명 데이터가 영구적으로 유실됐다.

### 해결

- 최신 응답의 네 섹션을 `{ title, description }` 구조 그대로 유지한다.
- 메인 결과 카드와 분위기 상세 화면에 실제 description을 전달한다.
- 저장 전 `convertAtmosphereForStorage()`로 다음 네 섹션 전체를 JSONB에 저장한다.
  - Group Atmosphere
  - Decision Making
  - Caution Point
  - Best Moment
- 회원가입 후 이어지는 pending save 흐름에도 같은 변환 함수를 적용했다.

### 데이터 호환성

새로운 중첩 구조와 기존 평탄화 구조를 모두 읽을 수 있는 정규화 함수를 만들었다. 다만 과거 저장 시점에 이미 버려진 설명 원문은 복구할 수 없으며, 새 분석 결과부터 완전한 데이터가 보존된다.

---

## 7. 게스트 결과에서는 상세 화면이 열리지 않는 문제

### 증상

- 로그인 전 임시 결과에서는 분위기 상세 클릭이 막혀 있었다.
- 1:1 상세 컴포넌트는 `analysisId`로 Supabase만 조회해 Zustand에 있는 임시 결과를 표시할 수 없었다.
- 역할 카드는 한 줄로 잘렸지만 별도의 상세 화면이 없었다.

### 원인

표현 컴포넌트 내부에 React Query 조회가 결합되어 데이터 원본을 DB로 한정했다. 임시 결과와 저장 결과가 서로 다른 경로로 렌더링되었다.

### 해결

- `view` 레이어가 `analysisId` 유무에 따라 React Query 또는 Zustand를 선택한다.
- UI 컴포넌트는 정규화된 props만 받는 순수 표현 컴포넌트로 변경했다.
- 역할 카드 전체를 semantic button으로 만들고 `/result/role-detail`을 추가했다.
- pair와 분위기 상세도 ID가 없는 게스트 상태에서 Zustand 결과를 사용한다.
- 뒤로가기는 브라우저 history를 사용해 임시 결과와 스크롤 흐름을 유지한다.

### 성능 효과

- 게스트 상세 이동은 추가 DB 요청 없이 메모리 상태로 즉시 렌더링된다.
- 저장 결과는 `queryKeys.analyses.detail(id)`로 캐시하며, 빈 ID에서는 `enabled: false`로 불필요한 Supabase 요청을 막는다.
- 데이터 조회와 UI를 분리해 동일한 컴포넌트를 두 데이터 원본에서 재사용한다.

---

## 8. OpenAI 응답 필드명과 저장 데이터 필드명이 달랐던 문제

### 증상

새 OpenAI 응답은 `memberANickname`, `memberAMbti`, 배열 형태의 `recommendedSituations`를 반환했지만, 기존 상세 화면은 `memberA`, 닉네임 기반 MBTI lookup, 문자열 형태의 추천 상황을 기대했다.

### 원인

API 계약을 개선한 뒤 소비하는 UI와 기존 저장 JSON의 마이그레이션 경계가 없었다.

### 해결

`normalizePairChemistry()`, `normalizeMemberRoles()`, `normalizeAtmosphereSections()`를 추가해 다음을 처리했다.

- 신·구 pair 필드명 병합
- MBTI가 없는 구버전 pair는 그룹 멤버 데이터에서 보완
- 추천 상황 배열을 UI 표시 문자열로 변환
- `role`과 `title` 필드 호환
- 신규 중첩 분위기 구조와 구버전 평탄화 구조 호환
- 손상되거나 필수 식별 정보가 없는 항목은 안전하게 제외

### 효과

API 스키마 변경이 곧바로 모든 UI 컴포넌트 수정으로 확산되지 않도록 호환 계층을 만들었다.

---

## 9. Next.js 16 Instant Navigation 경고

### 증상

브라우저 E2E 검증에서 다음과 같은 개발자 도구 Insight가 발생했다.

```text
Next.js encountered runtime data during a navigation.
This prevents the navigation from being instant.
```

`searchParams`를 await하는 결과 및 상세 페이지가 instant navigation 대상으로 추론되면서 경고가 표시됐다.

### 해결

해당 페이지들은 query string의 분석 ID와 선택 index가 있어야 내용을 결정할 수 있는 데이터 의존 라우트다. 따라서 억지로 정적 shell로 만들기보다 페이지의 성격을 명시했다.

```ts
export const instant = false;
```

적용 라우트:

- `/result`
- `/result/atmosphere`
- `/result/pair-detail`
- `/result/role-detail`

### 성능 대비 판단

이 선택은 “무조건 즉시 이동”보다 올바른 request-time 데이터 경계를 우선한 것이다. 경고를 숨기는 목적이 아니라, 분석 ID와 index에 의존하는 페이지가 blocking route임을 Next.js에 명시해 예측 가능한 네비게이션을 만든다.

### 검증

수정 후 새 브라우저 플로우에서 Next.js 오류 오버레이와 Instant Insight가 사라진 것을 확인했다.

---

## 10. OpenAI 호출의 비용·지연·프라이버시 최적화

### 10.1 정적 프롬프트와 동적 입력 분리

- 변하지 않는 역할·정책·출력 기준은 `instructions`에 둔다.
- 멤버와 그룹 데이터는 JSON `input`으로 분리한다.
- `prompt_cache_key: 'mingle-analysis-v2'`를 사용해 반복 요청의 안정적인 정적 prefix를 재사용할 수 있게 했다.

### 10.2 결정론적 계산을 애플리케이션에서 선처리

모델이 매번 다시 세지 않도록 다음 값을 서버에서 계산해 `computedSignals`로 전달한다.

- E/I, T/F, J/P 인원수
- 기질군별 인원수
- 전체 멤버 수
- 누락 없이 생성해야 할 expected pair 목록

이 방식은 단순 집계 작업을 모델 추론에서 제거하고, 동일한 입력에 대해 분석 기준을 더 일관되게 만든다.

### 10.3 모델 품질과 지연의 균형

- 기본 모델은 환경변수로 교체 가능하고 기본값은 `gpt-5.6-luna`다.
- 설명 품질을 위해 visible output의 `verbosity`는 `high`로 설정했다.
- MBTI 조합 설명은 복잡한 수학적 추론이 아니므로 reasoning effort는 `low`로 유지했다.
- Structured Outputs를 사용해 잘못된 JSON을 애플리케이션에서 재파싱하거나 복구하는 루프를 줄였다.

### 10.4 데이터 보관 최소화

- OpenAI 요청은 `store: false`로 설정한다.
- 분석 결과는 사용자가 저장 의사를 표시했을 때만 서비스 DB에 저장한다.
- API key는 Route Handler 서버 경계 안에서만 사용한다.

---

## 11. 검증 전략

### 자동화 테스트

- 요청 스키마: 버전, 그룹 타입, 닉네임/ID 중복, 본인 수, order 검증
- 프롬프트: 그룹별 분석 기준, conflict 의미, 상세 설명 계약 검증
- API Route: 성공, 입력 거부, 멤버/pair 누락, quota, rate limit 분기
- 결과 정규화: 신·구 필드명, 추천 상황 배열, 역할 title/role 호환
- 저장 변환: 네 개 분위기 섹션의 제목·설명 보존, 구버전 구조 유지

최종 결과:

```text
Test Files  16 passed
Tests      109 passed
ESLint     passed
Next build passed
diff check passed
```

### 실제 브라우저 검증

```text
Home
→ 그룹 유형 선택
→ 2명 입력
→ 실제 OpenAI 분석 요청
→ Result 렌더링
→ 역할 상세
→ Pair 상세
→ 그룹 분위기 상세
```

확인 항목:

- 실제 OpenAI API `200 OK`
- 상세 설명의 문장 수와 개인화 내용
- 게스트 상태에서 세 상세 페이지 이동
- 빈 본문과 빈 카드 여부
- Next.js 오류 overlay 여부
- 주요 라우트의 네비게이션 경고 여부

---

## 12. 남아 있는 경고와 후속 개선

### Vite native config loader 경고

테스트 실행 시 `vitest.config.ts`의 ESM 문법을 CommonJS로 로드하는 향후 호환성 경고가 있다. 현재 테스트 동작에는 영향이 없지만, 추후 package type 또는 config 확장자 정리가 필요하다.

### 저장소 외부 package-lock 경고

Next build가 `/Users/dv-yeop/package-lock.json`을 저장소 밖의 lockfile로 감지하고 무시한다. 빌드는 성공하지만 monorepo가 아니라면 상위 lockfile 정리, 필요한 구조라면 `outputFileTracingRoot` 명시를 검토할 수 있다.

### 정량 성능 측정

현재 최적화는 구조와 실패 방지 중심이다. 이력서에 응답 시간·비용 개선율을 쓰려면 다음 지표를 별도로 수집해야 한다.

- OpenAI 요청 p50/p95 latency
- 멤버 수와 pair 수에 따른 output token 변화
- `cached_tokens`와 prompt cache hit 비율
- 분석 1회당 평균 비용
- Structured Outputs 도입 전후 재시도율과 형식 오류율
- Result 및 상세 페이지 Web Vitals

측정 전에는 “응답 시간 30% 개선”처럼 근거 없는 수치를 사용하지 않는다.

---

## 13. 이력서용 정리

### 한 줄 버전

- OpenAI Responses API와 Zod Structured Outputs를 도입해 MBTI 그룹 분석의 스키마 안정성을 높이고, memberId 기반 완전성 검증으로 전체 멤버·pair 누락을 API 경계에서 차단했습니다.
- 정적 프롬프트 캐싱, 서버 선검증, `low` reasoning effort와 상세 필드 중심의 `high` verbosity를 조합해 AI 응답 품질과 비용·지연의 균형을 설계했습니다.
- Zustand 임시 결과와 Supabase 저장 결과를 통합하는 정규화 계층을 구현해 게스트/로그인 사용자에게 동일한 역할·1:1·그룹 상세 경험을 제공했습니다.
- Next.js 16의 request-time navigation 특성을 분석해 데이터 의존 결과 라우트를 명시적으로 구성하고, 실제 브라우저 E2E와 109개 테스트로 회귀를 검증했습니다.

### 프로젝트 설명 버전

> MBTI 그룹 케미 서비스의 OpenAI 분석 파이프라인을 Chat Completions의 느슨한 JSON 처리에서 Responses API + Structured Outputs로 전환했습니다. 서버 입력 검증과 memberId 기반 결과 완전성 검사를 추가해 잘못된 외부 API 호출과 누락된 멤버/pair 결과를 차단했으며, 정적 prompt cache key·서버 계산 신호·낮은 reasoning effort를 적용해 품질 대비 비용과 지연을 관리했습니다. 또한 Zustand 임시 데이터와 Supabase JSONB의 버전 차이를 흡수하는 정규화 계층을 설계해 게스트와 로그인 사용자 모두 동일한 상세 결과 UI를 사용할 수 있도록 개선했습니다.

### 면접용 STAR 구조

**Situation**

OpenAI가 반환한 JSON이 문법적으로 유효해도 멤버 역할이나 pair가 누락될 수 있었고, 응답 필드 구조가 바뀌면서 일부 결과 카드의 본문이 사라졌다. 게스트 결과는 DB 기반 상세 컴포넌트를 사용할 수 없었으며 Next.js 16 네비게이션 경고도 함께 발생했다.

**Task**

AI 결과 형식을 안정화하고, 불필요한 외부 호출과 재시도를 줄이면서, 임시/저장 결과 모두에서 완전한 상세 분석을 제공해야 했다.

**Action**

Responses API + Zod Structured Outputs로 전환하고, 요청 스키마와 ID 기반 결과 완전성 검증을 추가했다. 정적 instructions와 동적 input을 분리하고 prompt cache key, computed signals, low reasoning effort를 적용했다. UI에는 신·구 JSON을 흡수하는 정규화 계층과 순수 상세 컴포넌트를 도입했으며, Next.js 데이터 의존 라우트에는 `instant = false`를 명시했다.

**Result**

실제 OpenAI 분석에서 모든 멤버와 pair, 상세 설명이 정상 생성·렌더링되는 것을 확인했다. 게스트 상태에서도 역할·pair·분위기 상세 이동이 동작했고, 테스트 109개와 ESLint·프로덕션 빌드·브라우저 E2E를 모두 통과했다. 정량적인 지연·비용 개선율은 별도 관측 데이터가 없으므로 주장하지 않고, 재시도 방지와 외부 호출 차단처럼 코드로 검증 가능한 개선만 성과로 기록했다.
