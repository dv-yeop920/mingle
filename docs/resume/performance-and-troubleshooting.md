# MIXTI 성능 개선 및 트러블슈팅 이력서 정리

## 프로젝트 맥락

MIXTI는 사용자가 2~15명의 MBTI와 관계 유형을 입력하면 OpenAI가 그룹 케미를 분석하고, 로그인 사용자는 결과를 Supabase에 저장할 수 있는 모바일 웹 서비스다. Next.js 16.3.1, React 19, React Query, Zustand, Zod 4, Supabase, OpenAI Responses API를 사용했다.

이 문서는 기존 성능 측정 및 트러블슈팅 기록을 이력서와 면접에서 활용할 수 있도록 `문제 배경 → 해결 과정 → 결과 → 도메인` 구조로 재구성한 것이다.

## 측정 수치 사용 시 주의사항

- Lighthouse 수치는 측정 모드와 캐시 상태에 민감하다. 프로덕션 점수 `48 → 94`는 동일한 Lighthouse CLI mobile `simulate` 조건에서 측정한 값이므로 전후 비교에 사용할 수 있다.
- PPR 관련 기록의 적용 전 `LCP 5.0초`와 적용 후 `1.7초`는 Lighthouse 측정 모드가 달라 통제된 전후 비교로 사용하지 않는다. 전체 최적화 적용 후 Chrome `devtools` 스로틀링에서는 LCP `1.6초`를 관측했다. Vercel RUM mobile P75 `1.83초`는 별도 시점의 기준 관측값으로만 사용한다.
- INP `desktop 456ms / mobile 416ms`는 과거 PageSpeed Insights 관측값이고, `64ms`는 이후 Vercel Speed Insights RUM P75 관측값이다. 측정 출처와 시점이 달라 통제된 개선율로 계산하지 않는다.
- 폰트 약 `1MB`는 현재 브라우저가 로드하는 self-hosted 웹폰트 리소스 기준이다. OG 이미지 생성용 TTF 등 저장소 전체 폰트 파일 크기와는 다르다.
- OpenAI 관련 응답 시간과 비용 개선율은 별도 관측 데이터가 없어 수치로 주장하지 않는다. 대신 외부 호출 차단, 출력 상한 설정, 완전성 검사처럼 코드와 테스트로 확인한 결과만 사용한다.

---

## 1. 웹폰트와 Core Web Vitals 최적화

### 문제 배경

한글 본문에 사용하는 Gothic A1을 weight별 TTF로 제공해 서비스용 폰트 에셋이 약 11.4MB에 달했다. 텍스트 중심의 첫 화면에서는 폰트 다운로드와 교체가 LCP 요소를 다시 그리게 했고, 배포 해시가 다른 CSS와 RSC preload 힌트가 섞인 환경에서는 같은 폰트가 중복 요청되는 문제도 확인됐다.

### 해결 과정

- `fonttools`와 `brotli`로 TTF를 WOFF2로 변환하고 한글 및 기본 라틴 글리프만 남기도록 서브셋을 적용했다.
- 실제 사용하지 않는 weight를 코드 검색으로 식별해 웹폰트 선언과 preload 대상에서 제거했다.
- 네트워크 요청과 배포 해시를 대조해 중복 폰트 로드 원인을 확인하고 CSS를 단일 배포 기준으로 재생성했다.
- `font-display: swap`이 느린 네트워크에서 폰트 교체 시점을 새 LCP로 기록하는 현상을 분석해 `optional`로 변경했다.
- Lighthouse `simulate`, 실제 Chrome 기반 `devtools` 스로틀링, Vercel RUM을 함께 비교해 측정 도구의 모델링 차이를 분리했다.

### 결과

- TTF의 WOFF2 서브셋 변환과 미사용 weight 제거로 서비스용 폰트 에셋을 약 `11.4MB`에서 브라우저 로드 기준 약 `1.04MB`로 줄였다.
- 별도의 프로덕션 배포 문제였던 혼합 deployment hash의 중복 WOFF2 요청을 해소하고 `font-display: optional`을 적용했다. 동일한 Lighthouse mobile `simulate` 조건에서 성능 점수는 `48 → 94`, FCP는 `8.0초 → 1.4초`, LCP는 `14.4초 → 1.7초`로 개선됐다.
- 이 프로덕션 개선 과정에서 폰트 요청은 `9개(1,960KB) → 5개(987KB)`로 감소했다. Lighthouse 향상은 TTF 변환만의 효과가 아니라 중복 WOFF2 해소와 font-display 전략 변경을 함께 반영한 결과다.
- `devtools` 스로틀링과 RUM에서도 각각 LCP `1.6초`, mobile P75 LCP `1.83초`를 관측해 도구 편향과 실제 사용자 지표를 교차 확인했다.

### 도메인

Frontend Performance, Core Web Vitals, Web Font Optimization, Observability

### 이력서 문장

> TTF 웹폰트를 WOFF2로 서브셋화해 브라우저 로드 리소스를 약 11.4MB에서 1.04MB로 축소했으며, 별도로 혼합 배포 해시의 중복 WOFF2 요청을 해소하고 `font-display: optional`을 적용해 동일한 프로덕션 Lighthouse 조건에서 성능 점수 48점에서 94점, LCP 14.4초에서 1.7초를 달성했습니다.

---

## 2. PPR과 Suspense를 활용한 초기 렌더링 개선

### 문제 배경

홈 `page.tsx`가 프로필과 최근 분석 데이터를 모두 기다리는 async Server Component여서, 정적 HeroCard까지 데이터 조회 완료 전에는 렌더링되지 않았다. 사용자별 데이터와 무관한 LCP 요소가 `loading.tsx` 뒤에서 함께 지연되는 구조였다.

### 해결 과정

- 페이지 루트를 동기 컴포넌트로 바꿔 정적 shell이 데이터 요청에 종속되지 않게 했다.
- 프로필 헤더와 최근 분석 목록을 각각 독립적인 async Server Component container로 분리했다.
- 각 container가 필요한 데이터만 prefetch하고 자체 `HydrationBoundary`와 `Suspense` 경계를 갖도록 구성했다.
- 정적 HeroCard는 즉시 prerender하고, 사용자별 영역만 streaming하도록 Partial Prerender 구조를 적용했다.

### 결과

- 데이터 조회가 느려져도 정적 LCP 콘텐츠는 즉시 표시되고, 프로필과 최근 분석 영역은 서로 독립적으로 로딩할 수 있게 됐다.
- Next.js build에서 홈 라우트가 Partial Prerender 대상으로 생성되는 것을 확인했다.
- PPR과 폰트 최적화가 모두 적용된 이후 Chrome `devtools` 스로틀링에서 LCP `1.6초`를 관측했다. Vercel Speed Insights mobile P75 LCP `1.83초`는 별도 시점의 RUM 기준값으로 측정 결과를 교차 확인하는 데만 사용했으며, PPR 적용 후 성과로 귀속하지 않는다. 적용 전 수치도 다른 Lighthouse 모드에서 수집돼 PPR 단독 개선율로 사용하지 않는다.

### 도메인

Next.js App Router, Partial Prerendering, React Suspense, Streaming SSR

### 이력서 문장

> 사용자 데이터 조회가 정적 홈 콘텐츠까지 막던 구조를 PPR·Suspense 기반 streaming으로 재설계해 정적 shell을 즉시 제공하고 데이터 영역별 독립 로딩을 구현했으며, 전체 최적화 적용 후 LCP 1.6초를 관측했습니다.

---

## 3. INP 병목과 클라이언트 실행 비용 개선

### 문제 배경

첫 화면의 주요 네비게이션에서 PageSpeed Insights INP가 desktop `456ms`, mobile `416ms`로 관측됐다. 홈 전체가 Client Component였고, 클릭 시 `router.push()`와 전역 Zustand 구독, sessionStorage 접근, BottomSheet의 double `requestAnimationFrame`이 같은 인터랙션 경로에서 실행됐다.

### 해결 과정

- 명령형 `router.push()`를 prefetch가 가능한 `<Link>`로 교체하고 HeroCard를 Server Component로 전환했다.
- HomeView의 정적 UI와 상태 초기화 로직을 분리해 hydration 범위를 client leaf로 축소했다.
- 분석 결과 및 멤버 draft 세션 매니저를 전역 Provider에서 실제 사용하는 route layout으로 이동했다.
- BottomSheet 진입 애니메이션을 double-rAF에서 CSS `@starting-style`로 전환했다.
- SplashOverlay에 `pointer-events-none`을 적용하고, `will-change`는 실제 opacity 전환 구간에만 사용했다.
- 진행 바는 `width` 변경 대신 `transform: scaleX()`를 사용하고 갱신 빈도를 초당 12.5회에서 5회로 낮춰 layout 연산을 제거했다.

### 결과

- 클릭 경로에서 불필요한 hydration, 전역 상태 구독, 브라우저 저장소 I/O와 JS 기반 애니메이션 타이밍 의존성을 줄였다.
- 진행 바는 매 갱신마다 발생하던 Layout 단계를 제거하고 compositor 중심으로 동작하도록 변경했다.
- 이후 Vercel Speed Insights에서 mobile/desktop INP P75 `64ms`가 관측됐다. 다만 과거 PageSpeed Insights 값과 측정 체계가 달라 이를 통제된 전후 개선율로 표현하지 않는다.

### 도메인

React Rendering, Interaction Performance, INP, Client Boundary Optimization

### 이력서 문장

> Next.js 홈의 Client Component 경계를 축소하고 `<Link>` prefetch, route 단위 상태 스코핑, compositor 기반 애니메이션을 적용해 클릭 경로의 메인 스레드 작업을 줄였으며, 이후 실제 사용자 데이터에서 INP P75 64ms를 확인했습니다.

---

## 4. React Query SSR Hydration 안정화

### 문제 배경

홈 데이터 패칭이 서버 props 전달과 클라이언트 `useQuery`로 혼재해 있었다. `useSuspenseQuery`를 바로 적용했을 때는 서버의 브라우저용 Supabase 클라이언트가 인증 정보를 읽지 못하고, 클라이언트 캐시도 비어 있어 서버 HTML과 Suspense fallback이 달라지는 hydration mismatch가 발생했다. `useQuery`로 우회하면 오류는 사라졌지만 매번 클라이언트 fetch와 스켈레톤 깜빡임이 남았다.

### 해결 과정

- query key와 query function을 `queryOptions()`로 분리해 `useQuery`, `useSuspenseQuery`, prefetch가 같은 계약을 사용하게 했다.
- 서버에서는 쿠키 기반 Supabase client로 데이터를 prefetch하고 `dehydrate()`로 QueryClient 상태를 직렬화했다.
- 클라이언트에는 `HydrationBoundary`로 캐시를 전달하고 동일한 query key의 `useSuspenseQuery`가 즉시 cache hit하도록 구성했다.
- 서버와 브라우저의 query function은 런타임에 맞게 분리하되 query key를 단일 소스로 유지했다.
- 이후 PPR 전환 시에도 이 패턴을 데이터 영역별 container 내부로 이동해 streaming 구조와 결합했다.

### 결과

- hydration mismatch와 초기 클라이언트 재요청에 따른 스켈레톤 깜빡임을 제거했다.
- 중간 리팩터링 단계의 dev 서버 3회 측정에서 warm LCP 평균 `706ms`를 기록했으며, 기존 기준 `756ms`보다 `50ms` 단축됐다.
- ESLint, TypeScript, Next.js build, 관련 단위 테스트와 브라우저 console 검증을 통과했다.

### 도메인

React Query, SSR Hydration, Supabase Auth, Server/Client Data Boundary

### 이력서 문장

> React Query의 서버 prefetch·dehydrate·HydrationBoundary·`useSuspenseQuery` 흐름을 구축해 Supabase 인증 데이터의 hydration mismatch와 초기 중복 fetch를 제거하고, 이후 PPR 데이터 경계에서도 재사용 가능한 SSR 캐시 구조를 만들었습니다.

---

## 5. OpenAI 응답 완전성 검증과 비용 방어

### 문제 배경

JSON mode는 문법적으로 유효한 JSON만 보장해 특정 멤버 역할이나 1:1 pair가 누락되어도 UI까지 전달될 수 있었다. 또한 잘못된 인원 수, 중복 ID, 잘못된 순서 같은 요청도 OpenAI 호출 뒤에 발견하면 불필요한 API 비용이 발생하고, 최대 인원 제한이 없으면 pair 수와 출력 토큰이 `O(n²)`로 증가할 수 있었다.

### 해결 과정

- Chat Completions의 느슨한 JSON 처리에서 Responses API와 Zod Structured Outputs로 전환했다.
- 외부 호출 전에 schema version, 2~15명 인원 제한, `isSelf` 1명, 연속된 order, memberId와 nickname 중복을 서버 Zod 스키마로 검증했다.
- 서버에서 예상 member ID와 pair ID 집합을 계산한 뒤, 모델 응답의 고유 ID 개수와 expected ID 포함 여부를 `Set` 기반으로 대조해 누락되거나 예상 범위를 벗어난 ID 집합을 검사했다.
- 불완전한 결과는 result 이벤트로 보내지 않고 SSE `error` 이벤트로 전달해 클라이언트가 결과 화면으로 전환하지 않도록 했다.
- 정적 instructions와 동적 JSON input을 분리하고 `prompt_cache_key`를 적용했으며, E/I·T/F·J/P 집계와 expected pair를 서버에서 선계산했다.
- 상세 설명에는 `high` verbosity를 사용하되 별도 고난도 추론이 필요하지 않은 작업 특성에 맞춰 reasoning effort는 `low`로 유지했다.

### 결과

- “스키마에 맞는 JSON”과 “모든 멤버와 pair를 포함한 서비스 사용 가능 결과”를 별도로 검증하게 됐다.
- 최대 15명, 105개 pair로 출력 규모의 상한을 고정하고 잘못된 요청은 OpenAI 호출 전에 차단했다.
- quota 부족과 일시적 rate limit을 구분해 재시도로 해결되지 않는 오류에 불필요한 반복 요청을 유도하지 않게 했다.
- API 성공·입력 거부·멤버/pair 누락·quota·rate limit 분기를 자동화 테스트로 검증했다.

### 도메인

Generative AI Backend, API Contract, Runtime Validation, Cost Guardrail, SSE

### 이력서 문장

> OpenAI Responses API와 Zod Structured Outputs에 memberId·pairId 기반 완전성 검사를 더해 누락된 AI 결과를 SSE 경계에서 차단하고, 서버 선검증과 15명·105 pair 상한으로 불필요한 외부 호출과 출력 비용을 방어했습니다.

---

## 6. AI 응답과 Supabase JSONB 간 데이터 호환 계층 설계

### 문제 배경

OpenAI 응답 계약을 개선하면서 pair 필드가 `memberA`에서 `memberANickname`으로, 추천 상황이 문자열에서 배열로 바뀌는 등 기존 Supabase JSONB와 최신 응답의 형태가 달라졌다. 분위기 데이터는 정규화와 저장 과정에서 title만 남고 description이 유실됐으며, DB 조회에 결합된 상세 UI는 Zustand에만 있는 게스트 결과를 열 수 없었다.

### 해결 과정

- `normalizePairChemistry()`, `normalizeMemberRoles()`, `normalizeAtmosphereSections()`를 데이터 경계에 두어 신·구 필드명을 하나의 view model로 변환했다.
- 구버전 pair에 MBTI가 없으면 그룹 멤버 데이터로 보완하고, 필수 식별 정보가 손상된 항목은 안전하게 제외했다.
- `convertAtmosphereForStorage()`를 추가해 네 개 분위기 섹션의 title과 description을 중첩 JSONB 구조 그대로 저장했다.
- 일반 저장과 회원가입 후 pending save가 같은 변환 함수를 사용하도록 통일했다.
- view 레이어가 `analysisId` 유무에 따라 React Query의 Supabase 데이터 또는 Zustand 임시 결과를 선택하고, UI 컴포넌트는 정규화된 props만 받도록 분리했다.

### 결과

- API 스키마 변경의 영향을 호환 계층 안으로 제한해 기존 저장 데이터와 신규 AI 응답을 동일한 결과 UI에서 처리했다.
- 로그인 사용자의 저장 결과와 게스트의 임시 결과 모두에서 역할, 1:1 pair, 그룹 분위기 상세 화면을 제공했다.
- 신규 분석부터 분위기 본문이 저장·조회·상세 렌더링 전 과정에서 보존된다. 과거 저장 시 이미 유실된 description 원문은 복구 대상에서 제외했다.
- 신·구 pair 필드, 역할 `role/title`, 추천 상황 배열, 분위기 중첩/평탄화 구조를 단위 테스트로 검증했다.

### 도메인

Data Compatibility, Supabase JSONB, Schema Evolution, Frontend Architecture

### 이력서 문장

> OpenAI 최신 응답·Supabase 구버전 JSONB·Zustand 임시 결과를 통합하는 정규화 계층을 설계해 스키마 변경의 UI 전파를 차단하고, 게스트와 로그인 사용자에게 동일한 상세 결과 경험을 제공했습니다.

---

## 7. 번들 최적화와 Turbopack 청크 분석

### 문제 배경

결과 페이지(`result-view.tsx`)가 655행의 모놀리식 Client Component로 저장 시트, 게스트 프롬프트 등 사용자 인터랙션 전까지 불필요한 모달 컴포넌트를 초기 로드 시 함께 마운트하고 있었다. Zustand를 whole-store로 구독하는 곳이 있어 관련 없는 상태 변경에도 전체 트리가 리렌더링됐고, `'use client'`가 필요 없는 공용 컴포넌트에도 선언이 남아 Server Component 트리에서 불필요한 클라이언트 경계를 형성했다.

### 해결 과정

- 3단계로 작업을 나눠 진행했다. Phase 1에서 Button의 불필요한 `'use client'` 제거와 Zustand 개별 셀렉터 전환, Phase 2에서 모달/시트 5곳에 `next/dynamic` 지연 로딩, Phase 3에서 result-view.tsx의 커스텀 훅 및 서브 컴포넌트 분해.
- React 19 `Activity` API가 `mode='hidden'`에서도 하위 트리를 렌더링하는 특성 때문에 `next/dynamic`만으로는 React 트리 마운트를 막을 수 없었다. `hasEverOpened` boolean 가드를 조합해 사용자가 시트를 한 번이라도 열기 전까지 dynamic 컴포넌트 자체를 조건부 렌더링에서 제외하는 패턴을 설계했다.
- 프로덕션 빌드 후 Playwright 네트워크 캡처와 `curl` gzip 전송 크기 측정으로 before/after를 라우트별로 비교했다.
- 측정 과정에서 Turbopack이 `next/dynamic` 청크를 `<script async>` 태그로 HTML에 포함시켜 초기 로드에 함께 다운로드하는 동작을 발견했다. webpack은 동적 청크를 런타임에 요청하지만 Turbopack은 이를 eager로 처리해 네트워크 전송량 절감 효과가 제한적이었다.

### 결과

- 3개 주요 라우트 합산 JS 전송량이 `981.5 KB → 970.4 KB` (`-11.2 KB gzip`)로 감소했다. `/` 라우트에서 `-15.4 KB (-4.6%)`가 가장 큰 절감이었고, `/result`는 dynamic import 래퍼 오버헤드로 `+3.8 KB (+1.1%)` 미미한 증가가 있었다.
- 네트워크 절감보다 런타임 렌더링 최적화가 주 효과다. `hasEverOpened` 가드로 BottomSheet 하위 React 트리(Zod + React Hook Form resolver 포함)를 사용자 인터랙션 전까지 마운트하지 않아 초기 렌더링 비용을 줄였다.
- result-view.tsx를 `655행 → 399행`으로 분해하고 저장 로직 전체를 `useResultSave` 훅으로 추출해 뷰 레이어가 조합만 담당하도록 개선했다.
- Turbopack의 dynamic chunk eager loading 동작을 문서화해 향후 번들 최적화 시 webpack과의 차이를 고려하도록 했다.

### 도메인

Code Splitting, React 19, Next.js Turbopack, Bundle Analysis, Component Architecture

### 이력서 문장

> React 19 Activity API 환경에서 `next/dynamic`과 조건부 마운트 가드를 조합해 모달 5곳의 초기 렌더링 트리를 제거하고, 655행 모놀리식 뷰를 훅·서브 컴포넌트로 분해했으며, 프로덕션 빌드 측정 중 Turbopack이 동적 청크를 eager loading하는 동작을 발견해 번들러별 코드 스플리팅 전략 차이를 팀 문서에 기록했습니다.

---

## 이력서에서 우선 사용할 핵심 3문장

1. TTF 웹폰트를 WOFF2로 서브셋화해 브라우저 로드 리소스를 약 11.4MB에서 1.04MB로 축소했으며, 별도로 혼합 배포 해시의 중복 WOFF2 요청을 해소하고 `font-display: optional`을 적용해 동일한 프로덕션 Lighthouse 조건에서 성능 점수 48점에서 94점, LCP 14.4초에서 1.7초를 달성했습니다.
2. 사용자 데이터 조회가 정적 홈 콘텐츠까지 막던 구조를 PPR·Suspense 기반 streaming으로 재설계해 정적 shell을 즉시 제공하고 데이터 영역별 독립 로딩을 구현했으며, 전체 최적화 적용 후 LCP 1.6초를 관측했습니다.
3. OpenAI Responses API와 Zod Structured Outputs에 memberId·pairId 기반 완전성 검사를 더해 누락된 AI 결과를 SSE 경계에서 차단하고, 서버 선검증과 15명·105 pair 상한으로 불필요한 외부 호출과 출력 비용을 방어했습니다.

## 참고 문서

- `docs/performance/optimization-log.md`
- `docs/performance/bundle-optimization.md`
- `docs/performance/home-ssr.md`
- `docs/troubleshooting/openai-result.md`
- `docs/design/openai-requirements.md`
- `docs/guides/supabase.md`
