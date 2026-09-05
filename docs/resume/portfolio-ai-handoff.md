# MIXTI 성능 개선·트러블슈팅 포트폴리오 AI 핸드오프

> 이 파일 하나만 다른 AI에게 전달해 이력서, 포트폴리오, 면접 답변을 만들 수 있도록 정리한 근거 문서다. 현재 코드, git 이력, 측정 기록의 범위를 구분하며 확인되지 않은 성과를 만들지 않는다.

## 1. 프로젝트와 핵심 성과

MIXTI는 2~15명의 MBTI와 관계 유형을 입력하면 OpenAI가 그룹 케미를 분석하고, 로그인 사용자는 결과를 Supabase에 저장할 수 있는 모바일 웹 서비스다. Next.js 16.3.1, React 19, TypeScript, Tailwind CSS v4, React Query, Zustand, Zod 4, Supabase, OpenAI Responses API를 사용한다.

### 핵심 성과 3건

1. **웹폰트와 LCP:** TTF 웹폰트를 WOFF2로 변환·정리하고, 배포 해시가 섞여 같은 폰트가 중복 요청되던 구조를 `/fonts/v1/` 정적 URL로 교체했다. 해당 구조의 프로덕션 기록에서 5개 폰트 `987.2KB`, 중복 요청 0건, `?dpl=` 0건을 확인했다. `[CURRENT][E1]`
2. **AI 결과 신뢰성·비용 방어:** OpenAI Structured Outputs 이후에도 member/pair ID 집합을 대조해 의미적 완전성을 검증하고, 2~15명 입력 제한과 서버 선검증으로 잘못된 외부 호출 및 `O(n²)` 출력 규모를 제한했다. `[CURRENT][E2/E3]`
3. **서버·클라이언트 데이터 경계:** React Query hydration mismatch를 서버 prefetch와 캐시 hydration으로 해결한 뒤, 현재 홈은 인증된 `userId`를 기준으로 query key를 격리하고 인증 전환 시 auth 캐시를 취소·삭제하는 구조로 발전시켰다. `[EVOLVED][E2/E3]`

### 확인 가능한 기여 범위

- Core Web Vitals 병목 조사와 Lighthouse·브라우저 네트워크·Vercel RUM 교차 검증
- Next.js Server/Client Component 경계와 React Query 캐시·hydration 설계
- OpenAI 요청/응답 런타임 검증, SSE 오류 경계, 비용 상한 설계
- OpenAI 최신 응답·Supabase 구버전 JSONB·Zustand 임시 결과 호환 계층
- 인증 왕복 중 세션 결과 복구와 계정 전환 시 캐시 격리
- React 렌더링·애니메이션 및 dynamic import 실험
- OG 이미지 폰트 500 장애와 Vitest ESM 의존성 충돌 해결

팀 규모, 개인 담당 비율, 사용자 수, 비용 절감액은 저장소에서 확인되지 않으므로 주장하지 않는다.

## 2. 상태와 증거 체계

### 현재성

| 상태 | 의미 |
|---|---|
| `CURRENT` | 현재 소스에서 확인되는 구조 |
| `HISTORICAL` | 당시 문제 또는 중간 단계이며 현재는 대체된 구조 |
| `EVOLVED` | 핵심 아이디어는 유지되지만 구현 경계가 후속 작업으로 변경됨 |
| `PARTIAL` | 일부 경로나 조건에만 적용됨 |

### 증거 수준

| 등급 | 의미 | 표현 범위 |
|---|---|---|
| `E1 · 실측` | 동일 조건 측정, 네트워크 캡처, RUM, 빌드 산출물 | 조건·시점과 함께 정량 결과 사용 가능 |
| `E2 · 자동 검증` | 단위/통합 테스트, lint, typecheck, build | 검증한 동작 범위만 주장 |
| `E3 · 구현 확인` | 현재 코드 또는 커밋 | 구현·제거·구조화 사실을 주장 |
| `E4 · 분석 기록` | 당시 진단·관측 문서 | “관측했다/분석했다”로 표현 |
| `E0 · 미검증` | 근거를 찾지 못함 | 외부 산출물에 사용하지 않음 |

### 수치 사용 원칙

- Lighthouse `simulate`, Lighthouse `devtools`, PageSpeed Insights, Vercel Speed Insights RUM은 서로 다른 측정 체계다. 서로의 값을 화살표나 개선율로 연결하지 않는다.
- 전후 비교는 도구, 스로틀링, 캐시, 대상 배포가 같은 경우에만 사용한다.
- PPR, 폰트 정책 등 여러 변경이 함께 반영된 수치는 특정 한 기법의 단독 효과가 아니라 **전체 최적화 묶음**의 결과로 쓴다.
- 평균, P75, 단일 관측값을 구분한다. 작은 표본은 추세의 확정값으로 쓰지 않는다.
- `15명·105 pair`는 실측 개선치가 아니라 조합식 `n(n-1)/2`에서 계산되는 출력 상한이다.
- OpenAI p50/p95 지연, 토큰 비용, prompt cache hit rate는 측정 기록이 없다. 비용·속도 개선률을 만들지 않는다.
- 폰트 크기는 원본 에셋, 저장소 파일 합계, 브라우저 전송량을 구분한다. OG 생성용 2.2MB TTF는 브라우저 웹폰트와 별개다.
- 과거 테스트 통과 기록은 당시 검증 결과다. 현재 전체 저장소의 최신 통과 수로 바꾸지 않는다.

## 3. 대표 사례

### 3.1 웹폰트, Core Web Vitals, deployment hash 중복

**요약:** 한글 폰트 용량과 font swap을 줄인 뒤, 서로 다른 Vercel deployment hash가 동일 폰트를 이중 요청하게 만드는 근본 원인을 배포 독립 정적 URL로 제거했다.

- **상태:** `CURRENT`
- **증거:** 폰트·네트워크 수치 `E1`, 현재 구조 `E3`, 원인 해석 `E4`
- **관련 커밋:** `9068f89`, `c5f5ce7`, `f525b96`, 문서화 `3f17419`

#### 문제와 사용자 영향

Gothic A1의 여러 TTF 원본은 모바일 첫 화면에서 큰 전송 비용을 만들었다. WOFF2 전환 뒤에도 Vercel 캐시가 이전 배포 CSS를 재사용하면 HTML preload는 현재 `?dpl=ABC`, CSS `@font-face`는 이전 `?dpl=XYZ`를 참조했다. 브라우저는 바이트가 같아도 URL이 다르면 별도 리소스로 취급하므로 Gothic A1 약 `994KB`가 다시 내려갈 수 있었다. 느린 네트워크에서는 `font-display: swap`에 의한 텍스트 재페인트가 LCP 후보를 늦게 갱신하는 현상도 관측됐다. `[E1/E4]`

#### 관측 및 원인 가설

- 초기 변환 기록에서 서비스 웹폰트 원본은 약 `11.4MB`였고 WOFF2 세트는 약 `1.04MB` 수준으로 줄었다. `[E1]`
- 프로덕션 네트워크에서 CSS와 preload의 `dpl` 값이 다른 동일 폰트 요청을 확인했다. `[E1]`
- 같은 코드에서도 Lighthouse Lantern의 `simulate`와 실제 Chrome 네트워크를 사용하는 `devtools` 결과가 크게 달랐다. `optional` 정책을 Lantern이 정확히 모델링하지 못한다는 해석은 RUM과 devtools의 유사성을 근거로 한 분석이다. `[E4]`

#### 시도한 접근과 실패/한계

1. TTF를 WOFF2로 변환하고 사용하지 않는 weight를 제거했다. 전송량은 줄었지만 deployment hash 혼합 가능성은 남았다.
2. Gothic A1을 `font-display: optional`로 바꿨다. 실제 브라우저에서는 swap을 막았지만 URL 중복 가능성을 없애지는 못했다.
3. preload 제거 실험은 Lighthouse `simulate` 수치를 낮췄지만 실제 브라우저에서 폰트를 제때 사용할 확률을 떨어뜨리는 선택이라 채택하지 않았다.

#### 최종 해결과 선택 이유

`next/font/local`을 제거하고 WOFF2를 버전 경로 `/fonts/v1/`에서 제공했다. CSS와 수동 preload가 같은 고정 URL을 사용하며 `immutable` 캐시를 적용했다. Gothic A1 700/900만 preload하고 다른 weight는 사용 시 요청한다. Gothic A1은 `optional`, Nunito는 `swap`을 유지하며 metric-adjusted Arial fallback을 정의했다. 배포가 바뀌어도 URL이 흔들리지 않고, 폰트 바이트가 바뀔 때만 `/fonts/v2/`처럼 버전을 올리는 구조다. `[E3]`

#### 검증 결과

- 2026-09-02 프로덕션 기록: 홈에서 폰트 5개 `987.2KB`, 각 1회 요청, `?dpl=` 및 `/_next/static/media` 요청 0건. `[E1]`
- 같은 Lighthouse mobile `simulate` 조건의 과거 혼합 배포 비교에서는 score `48 → 94`, FCP `8.0초 → 1.4초`, LCP `14.4초 → 1.7초`를 기록했다. 이는 CSS 재생성으로 중복 요청이 사라진 효과와 `font-display: optional`이 함께 반영된 **당시 배포 묶음 결과**이며, 현재 수동 `@font-face` 구조의 단독 성과가 아니다. `[HISTORICAL][E1]`
- 정적 폰트 URL 전환 후 2026-09-02 Lighthouse `devtools` mobile LCP는 `2.3초`였다. 별도의 Vercel RUM `1.82초`는 전환 전인 2026-08-30~09-01의 2일 평균 P75이며 표본은 LCP 53건이다. 측정 체계와 대상 기간이 달라 두 값을 전후 성과로 비교하지 않는다. `[E1]`

#### 트레이드오프 및 남은 한계

수동 폰트 관리로 자동 최적화 편의가 줄고 버전 디렉터리 운영 책임이 생겼다. Lighthouse `simulate`는 수동 `@font-face` 전환 후 LCP `9.5초`를 산출했지만 같은 배포의 `devtools` 결과와 괴리가 컸다. RUM은 전환 전 기간의 작은 표본이므로 현재 구조의 운영 성능이나 장기 추세를 입증하지 못한다.

#### 면접 포인트

- `optional`은 느린 연결에서 늦은 font swap이 LCP와 CLS를 다시 유발하지 않도록 fallback을 유지하는 선택이다.
- `next/font`의 일반적 문제가 아니라 이 배포 환경에서 CSS와 preload의 deployment ID가 달라지는 실제 네트워크 증거가 있어 정적 URL을 택했다.
- 파일 압축만으로 끝내지 않고 URL identity, preload, cache, render timing을 하나의 로딩 경로로 분석했다.

#### 재사용 문장

> TTF 웹폰트를 WOFF2로 경량화하고, Vercel 배포 해시 혼합으로 동일 폰트 약 994KB가 중복 요청되던 구조를 버전 고정 정적 URL로 전환해 프로덕션 네트워크에서 폰트 중복 0건을 확인했습니다.

### 3.2 OpenAI 결과 완전성 검증과 호출 비용 방어

**요약:** 문법적 스키마 검증과 서비스 수준의 의미적 완전성을 분리하고, 외부 호출 전에 요청을 거부해 잘못된 결과와 불필요한 토큰 사용을 함께 차단했다.

- **상태:** `CURRENT`
- **증거:** 자동 테스트 `E2`, 현재 코드 `E3`, 당시 실제 API·브라우저 확인 `E4`

#### 문제와 사용자 영향

JSON mode는 JSON 문법을 보장해도 특정 멤버 역할이나 1:1 pair의 누락·중복까지 막지 못한다. 불완전한 결과가 UI에 도착하면 카드가 비거나 잘못된 상세 화면으로 이어진다. 인원 수, 중복 ID, 잘못된 order 같은 요청을 OpenAI 호출 뒤에 발견하면 실패가 확실한 요청에도 비용과 대기 시간이 발생한다.

#### 관측 및 원인 가설

- 배열 길이만 맞아도 한 ID가 중복되고 다른 ID가 빠질 수 있어 Zod 구조 검증만으로 충분하지 않았다.
- pair 수는 `n(n-1)/2`로 증가하므로 입력 상한이 없으면 출력 토큰과 응답 크기가 빠르게 커진다.
- 같은 HTTP 429라도 `insufficient_quota`와 일시적 rate limit은 사용자가 취할 행동이 다르다.

#### 시도한 접근과 실패/한계

초기의 Chat Completions `json_object`와 느슨한 후처리는 필드 형태를 강제하기 어려웠다. Responses API와 Structured Outputs로 구문·필드 계약을 강화했지만 “예상한 모든 엔티티가 정확히 들어 있다”는 비즈니스 완전성은 여전히 별도 검사가 필요했다.

#### 최종 해결과 선택 이유

1. Route Handler 진입 직후 `analyzeRequestSchema.safeParse()`로 schema version, 그룹 타입, 2~15명, `isSelf` 정확히 1명, 중복 nickname/member ID, 연속 order를 검사한다.
2. `openai.responses.stream()`과 `zodTextFormat()`으로 구조화된 출력을 받는다.
3. 서버가 예상 member ID와 pair ID 집합을 미리 만들고, 파싱된 결과의 고유 ID 수와 포함 여부를 `Set`으로 대조한다.
4. 누락된 결과는 SSE `result`를 보내지 않고 일반화된 `error` 이벤트로 종료한다.
5. 정적 instructions와 동적 JSON input을 분리하고 `prompt_cache_key`를 사용한다. 결정론적 집계와 expected pair는 서버에서 계산하며 visible output은 `high` verbosity, reasoning은 `low`, 저장은 `store: false`로 설정한다.
6. quota와 rate limit 메시지를 분리해 재시도로 해결되지 않는 문제에 반복 호출을 유도하지 않는다.

#### 검증 결과

- 유효 요청 성공, 입력 거부 시 OpenAI mock 미호출, member/pair 누락, quota, rate limit 분기를 Route Handler 테스트로 검증한 기록이 있다. `[E2]`
- 최대 15명에서 pair 상한은 105개로 고정된다. 이는 계산된 안전 상한이지 비용 절감 실측치가 아니다. `[E3]`
- 당시 통합 작업은 `16개 테스트 파일 / 109개 테스트`, ESLint, Next build, 실제 OpenAI 브라우저 흐름 통과로 기록됐다. 현재 전체 저장소의 최신 통과 수로 재해석하지 않는다. `[HISTORICAL][E2/E4]`

#### 트레이드오프 및 남은 한계

완전성 실패 시 부분 결과를 활용하지 않고 전체 재시도가 필요하다. prompt cache의 실제 hit rate, 분석 1회 비용, p50/p95 latency, Structured Outputs 전후 재시도율은 측정하지 않았다. SSE progress는 수신 문자 수와 예상 크기를 이용한 추정치이며 모델의 실제 사고 진행률이 아니다.

#### 면접 포인트

- Zod는 항목의 모양을, Set 비교는 입력 집합과 출력 집합의 의미적 동등성을 검증한다.
- 비용 방어는 외부 호출 전 거부, 입력 15명 제한, 서버 선계산으로 비용 발생 조건과 최대 출력 규모를 제한한 것이다. 절감률은 측정하지 않았다.
- 역할·pair 누락은 분석 전체의 신뢰를 깨므로 불완전한 성공보다 명시적 실패를 택했다.

#### 재사용 문장

> OpenAI Responses API와 Zod Structured Outputs에 memberId·pairId 집합 기반 완전성 검사를 추가해 누락 결과를 SSE 경계에서 차단하고, 서버 선검증과 15명·105 pair 상한으로 불필요한 외부 호출과 출력 규모를 제한했습니다.

### 3.3 React Query hydration, 홈 데이터 경계, 계정별 캐시 격리

**요약:** hydration mismatch를 서버 prefetch로 해결한 중간 단계를 거쳐, 현재는 `staleTime: Infinity` 환경에서 사용자 ID가 포함된 query key와 인증 전환 캐시 purge로 계정 간 데이터 혼입을 방지한다.

- **상태:** `EVOLVED`
- **증거:** 당시 측정·빌드 `E1/E2`, 현재 구조와 테스트 `E2/E3`, 설계 판단 `E4`
- **관련 커밋:** `8b01bf5`, `7223d4a`, `c25667c`

#### 문제와 사용자 영향

초기 홈은 client query와 server props가 섞여 있었다. `useSuspenseQuery`만 적용했을 때 서버에서는 브라우저 Supabase client가 인증을 읽지 못하고, 클라이언트 캐시는 비어 있어 server HTML과 Suspense fallback이 달라지는 hydration mismatch가 발생했다. `useQuery`로 우회하면 오류는 없어졌지만 초기 client fetch와 skeleton 깜빡임이 남았다.

후속 단계에서는 전역 `staleTime: Infinity`와 사용자 구분 없는 key를 함께 쓰면 로그아웃 후 다른 계정으로 로그인할 때 이전 계정의 profile/analyses가 캐시에 남을 수 있다는 더 큰 신뢰 경계를 다뤘다.

#### 관측 및 원인 가설

- 서버 쿠키 기반 client와 브라우저 client는 데이터 접근 시점이 다르므로 query key와 hydration 상태를 맞춰야 한다.
- cache freshness와 data ownership은 별개다. 오래 유지할 cache일수록 사용자 identity를 key에 포함해야 한다.
- 홈에서 게스트까지 auth query를 돌리거나 null cache를 hydrate하면 불필요한 요청·skeleton과 계정 전환 복잡성이 생긴다.

#### 시도한 접근과 실패/한계

1. **HydrationBoundary 없는 `useSuspenseQuery`:** server HTML과 client fallback 불일치로 실패했다.
2. **`useQuery` 단독:** mismatch는 사라졌지만 매번 client fetch와 깜빡임이 생겼다.
3. **server prefetch + dehydrate + HydrationBoundary:** 같은 key의 `useSuspenseQuery`가 cache hit하도록 해 중복 fetch를 제거했다. 이후 홈 PPR에서 데이터 영역별 boundary로 발전했다. `[HISTORICAL]`
4. 이 중간 구조는 현재 홈에서 제거됐다. 현재 홈은 서버에서 인증 identity만 확인하고 회원에게만 profile/analyses client query를 병렬 실행한다. `[CURRENT]`

#### 최종 해결과 선택 이유

- 모든 인증 소유 query key를 `['auth', userId, ...]` 아래에 둔다.
- 로그인·회원가입·로그아웃·탈퇴 성공 경로에서 auth root query를 `cancelQueries`한 뒤 `removeQueries`한다.
- `onAuthStateChange`가 실제 user ID 변경을 감지하면 같은 purge를 실행하고 `router.refresh()`로 server identity를 동기화한다. 같은 사용자 token refresh는 제거 대상이 아니다.
- 현재 홈은 게스트에게 profile/analyses query와 skeleton을 만들지 않는다. 회원 데이터는 인증된 `userId`를 받은 sibling client component에서 병렬 조회하며 최초 fetch에만 결정적 skeleton을 표시한다.
- history, mypage, 저장 결과 상세처럼 server prefetch가 유리한 경로는 server와 browser가 같은 user-scoped key를 사용해 hydration 패턴을 유지한다.

#### 검증 결과

- 중간 SSR 단계의 dev Performance API 3회 기록에서 warm LCP 평균 `756ms → 706ms`를 관측했고 hydration mismatch가 사라졌다. dev 측정이며 현재 홈 구조의 수치가 아니다. `[HISTORICAL][E1]`
- PPR과 폰트 변경이 함께 반영된 localhost Lighthouse `devtools` 기록은 LCP `5.0초 → 1.6초`다. PPR 단독 성과로 귀속하지 않는다. `[HISTORICAL][E1]`
- 현재 key factory, auth cache sync, 로그인/회원가입 및 data hook 테스트에서 identity namespace와 cache purge 구현을 확인할 수 있다. `[CURRENT][E2/E3]`

#### 트레이드오프 및 남은 한계

현재 홈 회원 데이터는 hydration 이후 시작되어 server prefetch보다 한 단계 늦다. 대신 게스트의 불필요한 query와 null hydration, cross-account cache 위험을 줄였다. 현재 홈 `page.tsx`는 인증 확인을 기다리는 async 페이지이므로 과거의 “정적 shell을 즉시 PPR” 설명을 현행 구조로 말하면 안 된다.

#### 면접 포인트

- 과거 최적화를 바꾼 이유는 LCP뿐 아니라 인증 identity와 cache ownership을 정확성 요구에 포함했기 때문이다.
- `staleTime: Infinity`에서는 key가 같으면 이전 사용자의 데이터를 fresh로 재사용할 수 있어 userId가 필수다.
- history/mypage/저장 결과처럼 server prefetch가 유리한 경로는 user-scoped key로 hydration을 유지한다.

#### 재사용 문장

> React Query의 서버 prefetch·hydration으로 초기 mismatch를 해결한 뒤, 인증 데이터 key를 userId namespace로 재설계하고 계정 전환 시 진행 query 취소와 cache 제거를 적용해 장기 cache에서도 계정 간 데이터 혼입을 방지했습니다.

## 4. 보조 사례

### 4.1 INP와 애니메이션 실행 비용

**요약:** 정적 홈의 client boundary와 navigation 경로를 줄이고 JS timing·layout 기반 animation을 CSS/compositor 경로로 옮겼다.

- **상태:** `EVOLVED`
- **증거:** 현재 구현 `E3`, RUM 관측 `E1`, 당시 원인 분석 `E4`
- **관련 커밋:** `3dc2075`, `828502d`, SSE 진행률 `ba91047`

#### 문제와 사용자 영향

PageSpeed Insights에서 첫 화면 INP가 desktop `456ms`, mobile `416ms`로 관측됐다. 당시 홈 전체 hydration, 명령형 `router.push`, 전역 세션 매니저, BottomSheet double `requestAnimationFrame`, splash 입력 차단이 한 클릭 경로에 겹쳤다. `[HISTORICAL][E4]`

#### 관측 및 원인 가설

한 함수보다 client tree 크기, navigation 준비 여부, storage 구독, animation scheduling이 합쳐진 문제로 분석했다. progress bar의 `width` 갱신은 layout을 만들 수 있고 `transform`은 compositor 경로를 활용할 수 있다.

#### 시도한 접근과 실패/한계

기록의 phase별 `-150~200ms` 같은 값은 예상치였으므로 성과 수치로 사용하지 않는다. 최적화 전 PSI와 이후 RUM은 측정 체계가 달라 직접 개선율을 계산하지 않는다.

#### 최종 해결과 선택 이유

- Hero CTA를 `<Link>`로 바꾸고 정적 HeroCard를 Server Component로 유지했다.
- Zustand·sessionStorage manager를 필요한 route layout으로 좁혔다.
- BottomSheet 진입을 double-rAF에서 CSS `@starting-style`로 바꾸고 `will-change`는 실제 전환 구간으로 제한했다.
- splash에 `pointer-events-none`을 적용했다.
- 분석 progress bar를 `width` 대신 `transform: scaleX()`로 갱신한다. SSE event도 최소 3% 변화 또는 500ms 간격으로 제한한다.

#### 검증 결과

Vercel Speed Insights에서 2026-08-31 dashboard snapshot의 INP P75 `64ms`와 2026-08-30~09-01 CLI 2일 평균 P75 `45ms`를 각각 관측했다. 두 기간은 겹치고 집계 방식도 달라 전후 개선으로 연결하지 않으며, 2일 평균의 표본도 16건에 불과하다. `[E1]`

#### 트레이드오프 및 남은 한계

실험 구간의 PSI baseline과 RUM을 직접 비교할 수 없고, 서로 겹치는 RUM snapshot과 2일 평균도 전후 개선치가 아니다. 더 큰 표본의 장기 RUM과 interaction attribution이 필요하다.

#### 면접 포인트

예상 개선치를 결과로 말하지 않고 클릭 경로에서 제거한 main-thread 작업과 이후 같은 체계의 RUM 관측을 구분한다.

#### 재사용 문장

> 홈의 client boundary와 session 구독 범위를 줄이고 Link prefetch, CSS 진입 animation, `scaleX()` progress bar를 적용해 interaction 경로의 JS·layout 작업을 줄였습니다.

### 4.2 OpenAI 응답과 Supabase JSONB 호환 계층

**요약:** API schema 변화와 과거 저장 JSON의 차이를 view 경계에서 정규화해 로그인 저장 결과와 guest 임시 결과가 같은 UI를 사용하게 했다.

- **상태:** `CURRENT`
- **증거:** 정규화·저장 테스트 `E2`, 현재 구현 `E3`

#### 문제와 사용자 영향

OpenAI pair 필드가 `memberA`에서 `memberANickname`으로, 추천 상황이 문자열에서 배열로 바뀌었다. 분위기 데이터는 저장 과정에서 title만 남고 description이 유실됐으며, DB 조회에 결합된 상세 UI는 Zustand에만 있는 guest 결과를 열 수 없었다.

#### 관측 및 원인 가설

API 계약 변경을 각 component가 직접 흡수하면 조건 분기가 퍼지고 구버전 JSONB를 깨뜨린다. 읽기 경계의 view model과 쓰기 경계의 저장 변환을 분리할 필요가 있었다.

#### 시도한 접근과 실패/한계

title만 평탄화하는 기존 로직은 description을 render와 저장 양쪽에서 잃었다. 이미 저장 시점에 버려진 과거 description 원문은 사후 정규화로 복구할 수 없다.

#### 최종 해결과 선택 이유

`normalizePairChemistry`, `normalizeMemberRoles`, `normalizeAtmosphereSections`, `normalizeMetrics`가 신·구 필드와 중첩/평탄화 구조를 공통 view model로 변환한다. 저장 시에는 `convertAtmosphereForStorage`가 네 section의 title과 description을 보존한다. view는 URL의 analysis ID가 있으면 React Query/Supabase, 없으면 Zustand 결과를 선택하고 표현 component에는 정규화된 props만 전달한다.

#### 검증 결과

신·구 pair 이름, MBTI fallback, 역할 `role/title`, 추천 상황 배열, 분위기 중첩·평탄화, 손상 항목 제외와 저장 변환을 단위 테스트로 다룬다. `[E2]`

#### 트레이드오프 및 남은 한계

호환 계층은 읽기 복잡성을 늘린다. 과거에 실제로 유실된 description은 복구하지 못하며 신규 저장부터 보존된다.

#### 면접 포인트

DB 전체 즉시 migration보다 read normalization을 택한 이유와 손상 데이터를 억지로 채우지 않고 제외하는 기준을 설명한다.

#### 재사용 문장

> OpenAI 최신 응답·Supabase 구버전 JSONB·Zustand 임시 결과를 통합하는 정규화 계층을 만들어 schema 변경의 UI 전파를 제한하고 guest와 로그인 결과 화면을 재사용했습니다.

### 4.3 dynamic import와 Turbopack 실측

**요약:** 지연 로딩이 곧 초기 전송량 감소라는 가정을 검증했고, Turbopack에서는 네트워크보다 조건부 mount에 따른 runtime rendering 절감이 핵심임을 확인했다.

- **상태:** `CURRENT`(조건부 mount), `HISTORICAL`(측정 시점의 chunk 결과)
- **증거:** production build·network 측정 `E1`, 현재 구현 `E3`
- **관련 커밋:** `e7e2fe3`

#### 문제와 사용자 영향

결과 view는 저장 sheet 등 사용 전 필요 없는 component를 포함한 655행 Client Component였고, React 19 `Activity`는 hidden 상태에서도 하위 tree를 render하므로 `dynamic()` 선언만으로 초기 mount를 막지 못했다.

#### 관측 및 원인 가설

`next/dynamic`이면 별도 chunk가 click 전까지 전송되지 않을 것으로 예상했지만 production network capture에서 Turbopack이 dynamic chunk를 HTML의 `<script async>`로 포함해 초기 download하는 동작을 관측했다.

#### 시도한 접근과 실패/한계

dynamic import만으로 network transfer를 크게 줄일 것이라는 가설은 성립하지 않았다. `/result`는 wrapper overhead로 오히려 `+3.8KB gzip` 증가했다.

#### 최종 해결과 선택 이유

`next/dynamic`에 `hasEverOpened` guard를 조합해 사용자가 열기 전에는 sheet component를 React tree에 넣지 않는다. 저장 state와 handler는 `useResultSave`로 분리하고 hero, metrics, footer를 추출했다.

#### 검증 결과

과거 같은 절차에서 `/`, `/members`, `/result` 합산 JS gzip은 `981.5KB → 970.4KB`로 `11.2KB` 감소했다. `/`는 `-15.4KB`, `/members`는 `+0.5KB`, `/result`는 `+3.8KB`였다. `result-view.tsx`는 당시 `655행 → 399행`으로 분해됐다. `[HISTORICAL][E1/E3]`

#### 트레이드오프 및 남은 한계

합산 수치는 한 사용자가 세 route를 한 번에 모두 받는다는 뜻이 아니다. code splitting 효과는 bundler와 build 버전에 종속되므로 현재 전송량으로 재사용하려면 다시 측정해야 한다.

#### 면접 포인트

가설, network capture에서 발견한 반례, network 대신 mount 비용 절감으로 목표를 수정한 과정을 설명한다.

#### 재사용 문장

> `next/dynamic` 적용 후 production chunk를 직접 측정해 Turbopack의 eager 전송 동작을 발견하고, `hasEverOpened` guard로 전략을 전환해 interaction 전 React 하위 tree mount를 차단했습니다.

### 4.4 인증 왕복 중 분석 결과 복원

**요약:** guest 결과를 저장하려고 로그인·회원가입을 거치는 동안 memory state가 비어도 session snapshot을 보존하고 `/result` 복귀 전에 복원해 빈 화면 깜빡임을 막았다.

- **상태:** `CURRENT`
- **증거:** 상태 전이 테스트 `E2`, 현재 구현 `E3`
- **관련 커밋:** `d94d669`

#### 문제와 사용자 영향

guest가 분석 결과 저장을 위해 `/signup?redirect=/result`로 이동하면 Zustand 결과가 일시적으로 비워질 수 있었다. 기존 구독은 이를 실제 삭제로 해석해 sessionStorage까지 지웠고, 인증 후 돌아온 결과 화면이 “결과 없음”을 먼저 그리거나 복구되지 않았다.

#### 관측 및 원인 가설

`result`, `auth-save`, `outside`는 같은 `null` 상태라도 의미가 다르다. route state를 구분하지 않고 값 변화만 구독한 것이 원인이었다.

#### 시도한 접근과 실패/한계

모든 route에서 session을 보존하면 민감한 임시 결과가 불필요하게 남고, `analysisResult === null`마다 삭제하면 인증 왕복을 견디지 못한다.

#### 최종 해결과 선택 이유

pathname과 `redirect=/result` query로 세 상태를 판별한다. `auth-save`에서는 hydration 완료를 잠시 해제하고 memory null을 session 삭제로 전파하지 않는다. `auth-save → result` 전환 때 session을 Zustand에 복원한 뒤 hydrated flag를 켠다. 실제 결과 영역 이탈 시에는 분석 결과와 pending save를 정리한다. snapshot은 schema version과 Zod 검증을 통과한 같은 탭의 `sessionStorage` 데이터만 사용한다.

#### 검증 결과

앱 시작 복원, 손상 JSON 폐기, 인증 화면에서 결과가 비워진 뒤 복귀 전 복원, 결과 영역 이탈 삭제를 관련 단위·component 테스트로 검증한다. `[E2]`

#### 트레이드오프 및 남은 한계

sessionStorage이므로 새 탭·다른 기기에는 이어지지 않는다. 브라우저 저장소 접근 실패 시에는 현재 memory 결과만 사용한다.

#### 면접 포인트

값 자체가 아니라 route state machine으로 수명을 정의한 이유와 결과 복구와 pending save idempotency를 분리한 점을 설명한다.

#### 재사용 문장

> 결과·인증 저장·이탈 경로를 상태 머신으로 구분해 로그인 왕복 중 sessionStorage snapshot을 보존하고, 결과 화면 복귀 전에 Zustand를 복원해 빈 결과 깜빡임을 방지했습니다.

### 4.5 웹폰트 최적화로 발생한 OG 이미지 500

**요약:** 브라우저 폰트 포맷을 일괄 변경하면서 서버 이미지 생성기의 TTF 의존성을 놓쳐 발생한 500을 복구하고 런타임별 에셋 경계를 분리했다.

- **상태:** `CURRENT`
- **증거:** 당시 감사·테스트 기록 `E2/E4`, 현재 파일·참조 `E3`
- **관련 커밋:** 원인 변경 `9068f89`, 복구 `164091f`

#### 문제와 사용자 영향

TTF를 모두 삭제하고 WOFF2로 바꾼 뒤 OG 이미지 요청이 `ENOENT`와 함께 500을 반환해 SNS 공유 미리보기가 깨졌다.

#### 관측 및 원인 가설

브라우저는 WOFF2를 사용하지만 Satori 기반 `next/og` renderer는 server에서 `gothic-a1-800.ttf`를 직접 읽고 있었다. “미사용 TTF” 판단이 브라우저 CSS 검색에만 한정된 것이 원인이었다.

#### 시도한 접근과 실패/한계

WOFF2로 단순 치환할 수 없었다. 해당 image renderer의 입력 format 제약 때문에 TTF/OTF가 필요했다.

#### 최종 해결과 선택 이유

삭제 직전 commit에서 Gothic A1 800 TTF `2,277,524 bytes`를 복구하고 OG 이미지, 앱 아이콘, Apple 아이콘의 server 전용 입력으로 유지했다. 브라우저는 `/fonts/v1/*.woff2`만 사용해 성능 최적화와 server image 생성을 분리했다.

#### 검증 결과

현재 세 image generator가 같은 TTF를 참조하고 파일이 존재한다. 당시 전체 감사에서 OG·icon 경로 복구와 자동 검증 통과를 기록했다. `[E2/E3]`

#### 트레이드오프 및 남은 한계

저장소에는 2.2MB TTF가 남지만 브라우저 웹폰트 전송량에는 포함되지 않는다. asset 정리 시 CSS뿐 아니라 `readFile` 같은 server 참조도 검색해야 한다.

#### 면접 포인트

성능 최적화가 다른 runtime의 기능 장애를 만들 수 있다는 점과 browser/server renderer용 asset을 명시적으로 분리한 교훈을 설명한다.

#### 재사용 문장

> 웹폰트 WOFF2 전환 중 Satori의 TTF 직접 참조를 놓쳐 발생한 OG 이미지 500을 원인 추적해 복구하고, 브라우저용 WOFF2와 서버 이미지 생성용 TTF의 에셋 경계를 분리했습니다.

### 4.6 Vitest ESM 의존성 충돌

**요약:** ESM-only plugin의 첫 오류만 고치는 데서 멈추지 않고 DOM 환경 의존성 chain까지 추적해 테스트 전체를 복구했다.

- **상태:** `CURRENT`
- **증거:** 당시 전체 테스트 실측 `E2`, 현재 설정 `E3`
- **관련 커밋:** `164091f`

#### 문제와 사용자 영향

`vitest run`이 `ERR_REQUIRE_ESM`으로 종료되어 35개 test file을 실행할 수 없었다. `@vitejs/plugin-react` v6을 CommonJS `require()`로 불러오려 한 것이 첫 실패 지점이었다.

#### 관측 및 원인 가설

Vitest 4와 React plugin은 ESM-only인데 package가 CJS로 해석됐다. package를 ESM으로 바꾸자 jsdom의 `html-encoding-sniffer → @exodus/bytes` CJS/ESM 혼합이 두 번째 실패 지점으로 드러났다.

#### 시도한 접근과 실패/한계

`package.json`에 `"type": "module"`만 추가하는 1차 수정은 plugin 오류는 해결했지만 jsdom 의존성 충돌로 테스트가 다시 실패했다. 최초 stack trace만 고쳐서는 전체 실행 경로가 복구되지 않았다.

#### 최종 해결과 선택 이유

package를 ESM으로 명시하고 DOM test environment를 jsdom에서 ESM-native `happy-dom`으로 바꿨다. 현재 `vitest.config.ts`는 ESM import와 `import.meta.dirname` alias를 사용하며 `happy-dom`을 지정한다.

#### 검증 결과

당시 `35 files / 187 tests`가 `6.54초`에 모두 통과했다. 이는 2026-08-26 snapshot이며 현재 전체 테스트 수나 속도로 쓰지 않는다. `[HISTORICAL][E2]`

#### 트레이드오프 및 남은 한계

happy-dom과 실제 브라우저의 동작 차이가 있으므로 DOM unit test만으로 브라우저 호환성을 보장하지 않는다. 브라우저 고유 동작은 E2E로 보완해야 한다.

#### 면접 포인트

ESM 전환은 top-level 설정만의 문제가 아니라 transitive dependency 전체의 module format 호환성 문제라는 점을 설명한다.

#### 재사용 문장

> Vitest 4·React plugin의 ESM 전환으로 발생한 `ERR_REQUIRE_ESM`을 추적해 package module type과 jsdom의 전이 의존성 충돌을 분리하고, happy-dom으로 전환해 당시 187개 테스트 실행을 복구했습니다.

## 5. 횡단적 배움

### 측정은 도구가 아니라 조건의 계약이다

같은 코드도 Lighthouse Lantern, 실제 Chrome throttling, RUM에서 다른 결과가 나온다. 점수보다 URL·전송량·LCP element·cache state를 함께 저장하고 같은 조건의 전후만 비교해야 한다.

### 외부 API의 schema 통과는 비즈니스 성공이 아니다

Structured Outputs는 모양을 보장하지만 입력의 모든 member와 pair 포함까지 보장하지 않는다. 구조 검증, 집합 완전성, 저장 변환, UI 정규화는 서로 다른 경계의 책임이다.

### cache key는 data ownership을 표현해야 한다

server와 client queryFn이 달라도 key가 같으면 hydration cache를 공유할 수 있다. 반대로 사용자 데이터가 같은 key를 공유하면 정확한 데이터도 잘못된 사용자에게 노출될 수 있다. `userId` namespace와 identity change purge는 freshness 설정과 별도로 필요하다.

### 최적화는 다른 runtime을 깨뜨릴 수 있다

브라우저 웹폰트를 줄이는 변경이 server OG generator를 깨뜨렸고, ESM 설정을 고치자 DOM emulator의 전이 의존성 문제가 드러났다. 직접 import뿐 아니라 file system 참조와 runtime별 consumer도 확인해야 한다.

### 가설이 틀리면 성공 기준을 다시 정의한다

Turbopack에서 dynamic chunk가 eager 전송된 결과는 유용한 결론이었다. 전송량 절감 가설을 폐기하고 조건부 mount와 rendering cost 절감이라는 실제 효과로 범위를 좁혔다.

## 6. 다른 AI에게 전달할 작업 지침

1. 출력 형식을 `이력서 bullet`, `포트폴리오 상세`, `면접 STAR 답변` 중 먼저 정한다.
2. 문제, 직접 수행한 행동, 검증 결과, 한계를 보존하되 분량에 맞게 축약한다.
3. `E1` 수치만 측정 조건과 함께 정량 성과로 강조한다. 서로 다른 도구·시점의 값으로 개선율을 만들지 않는다.
4. `E2/E3`는 “테스트로 검증했다/코드에 구현했다”, `E4`는 “관측·분석했다”로 표현한다. `E0`는 사용하지 않는다.
5. `CURRENT`, `EVOLVED`, `PARTIAL`, `HISTORICAL`을 확인하고 과거 구조를 현재형으로 바꾸지 않는다.
6. 원문에 없는 사용자 수, 비용 절감액·비율, 응답 속도 개선률, 팀 규모, 기여율, 장애 빈도, 사용자 반응을 생성하지 않는다.
7. 하나의 bullet에는 가능하면 하나의 문제와 하나의 검증 결과만 넣는다.
8. 기술명 나열보다 `왜 선택했고 어떤 실패를 피했는지`를 우선한다.
9. 필요한 정보가 없으면 추정하지 말고 `추가 검증 필요`로 표시한 뒤 근거 인덱스 파일을 확인한다.
10. 공개 문서에는 비밀키, 내부 운영 URL, 개인 식별 정보를 넣지 않는다.

### 출력별 권장 형식

- **이력서 bullet:** `문제/규모 → 핵심 행동 → 검증 결과`를 1~2문장으로 쓴다. 숫자가 없으면 안정성·구조 개선을 결과로 쓴다.
- **포트폴리오 상세:** `상황 → 관측 → 가설 → 실패한 시도 → 최종 선택 → 검증 → 트레이드오프` 순서를 유지하고 대표 사례 3개를 우선 사용한다.
- **면접 STAR:** Situation은 사용자 영향, Task는 성능·신뢰성 목표, Action은 가설 검증과 선택 이유, Result는 E1~E3 범위 결과와 한계로 구성한다.

### 바로 사용할 수 있는 핵심 3문장

1. TTF 웹폰트를 WOFF2로 경량화하고, Vercel 배포 해시 혼합으로 동일 폰트 약 994KB가 중복 요청되던 구조를 버전 고정 정적 URL로 전환해 프로덕션 네트워크에서 폰트 중복 0건을 확인했습니다.
2. OpenAI Responses API와 Zod Structured Outputs에 memberId·pairId 집합 기반 완전성 검사를 추가해 누락 결과를 SSE 경계에서 차단하고, 서버 선검증과 15명·105 pair 상한으로 불필요한 외부 호출과 출력 규모를 제한했습니다.
3. React Query의 서버 prefetch·hydration으로 초기 mismatch를 해결한 뒤, 인증 데이터 key를 userId namespace로 재설계하고 계정 전환 시 진행 query 취소와 cache 제거를 적용해 장기 cache에서도 계정 간 데이터 혼입을 방지했습니다.

## 7. 근거 인덱스

| 사례 | 원문 기록 | 현재 코드·테스트 | 주요 커밋 |
|---|---|---|---|
| 웹폰트·LCP·deployment hash | `docs/performance/optimization-log.md`, `docs/performance/font-loading/design-note.md` | `src/shared/styles/fonts.css`, `src/app/layout.tsx`, `next.config.ts`, `public/fonts/v1/` | `9068f89`, `c5f5ce7`, `f525b96` |
| OpenAI 완전성·비용 방어 | `docs/troubleshooting/openai-result.md`, `docs/design/openai-requirements.md` | `src/app/api/analyze/route.ts`, `src/app/api/analyze/route.test.ts`, `src/entities/analysis/model/schemas.ts`, `src/entities/analysis/api/prompt.ts` | 파일별 git history 참조 |
| React Query hydration·cache isolation | `docs/performance/home-ssr.md`, `src/features/home/design-note.md` | `src/shared/config/query-keys.ts`, `src/shared/lib/react-query/`, `src/app/(main)/page.tsx`, `src/views/home/`, 관련 tests | `8b01bf5`, `7223d4a`, `c25667c` |
| INP·animation | `docs/performance/optimization-log.md` §5·§13 | `src/features/home/ui/hero-card/`, `src/shared/ui/bottom-sheet/`, `src/features/test-flow/ui/analysis-animation/` | `3dc2075`, `828502d`, `ba91047` |
| JSONB 호환성 | `docs/troubleshooting/openai-result.md` §6~§8 | `src/views/result/lib/normalize-analysis.ts`, 관련 test, `src/features/analysis-result/`, `src/views/result/result-view.tsx` | 파일별 git history 참조 |
| dynamic import 실험 | `docs/performance/bundle-optimization.md`, 측정 PNG 2개 | `src/views/result/result-view.tsx`, `src/views/result/hooks/use-result-save.ts`, profile/member form | `e7e2fe3` |
| 인증 왕복 복원 | `src/features/test-flow/design-note.md` | `src/features/test-flow/lib/analysis-result-session.ts`, session manager와 tests, `src/views/result/hooks/use-result-save.ts` | `d94d669` |
| OG 이미지 500 | `docs/audit/full-2026-08-26.md` §이슈 1 | `src/app/opengraph-image.tsx`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `src/app/fonts/gothic-a1-800.ttf` | `9068f89`, `164091f` |
| Vitest ESM | `docs/audit/full-2026-08-26.md` §이슈 2 | `package.json`, `vitest.config.ts` | `164091f` |

## 8. 추가 측정 전에는 주장하지 않을 항목

다음은 현재 `E0`이므로 외부 산출물에 수치로 쓰지 않는다.

- OpenAI 요청 p50/p95 latency와 분석 1회 평균 비용
- prompt cache hit·cached token 비율
- Structured Outputs 도입 전후 형식 오류율과 재시도율
- 계정별 cache isolation 도입 전후 오류·노출 건수
- 인증 왕복 복원 개선 전후 이탈률
- dynamic import 현행 Next/Turbopack build의 최신 route별 전송량
- 장기·충분한 표본의 Core Web Vitals 전후 추세

문서 갱신 시 `주장 수집 → 근거 연결 → 현재성 판정 → 비교 가능성 판정 → E0 제거 → 서술` 순서를 유지한다.
