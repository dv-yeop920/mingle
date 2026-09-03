# 홈 인증별 데이터 로딩 설계

## 배경과 원인

- 현재 홈은 `getAuthenticatedClient()`가 끝난 뒤 회원 분기 안에서 새 `Suspense` 경계를 만든다. 이 늦은 중첩 경계의 fallback은 인증 결과와 데이터 결과가 서로 다른 RSC 청크로 실제 페인트된다는 보장이 없다. 조회가 빠르거나 전송 청크가 합쳐지면 테스트에서 fallback element가 존재해도 브라우저는 스켈레톤을 보지 못할 수 있다.
- Next.js 16.3.1 로컬 Streaming 가이드는 정적 shell에 포함된 `Suspense` fallback이 즉시 전송되고 sibling 경계가 독립적으로 스트리밍된다고 설명한다. 그러나 현재 필요한 fallback은 인증 결과를 알아야 선택할 수 있어 최초 정적 shell에 넣을 수 없다.
- 홈 게스트 분기는 `queryKeys.profile.detail()`에 `null`을 넣는다. 브라우저 `QueryClient`의 전역 `staleTime: Infinity`와 사용자 ID가 없는 key 조합 때문에 로그인 직후에도 이 값이 fresh로 남아 프로필 query의 suspension/fetch를 막을 수 있다.
- `profile`, `groups`, `analyses` key는 모두 인증 사용자와 무관한 전역 key다. 로그아웃 후 다른 계정으로 로그인해도 같은 브라우저 `QueryClient`가 유지되므로 이전 계정 데이터가 잠깐 노출되거나 새 계정 fetch가 생략될 위험이 있다.
- 따라서 서버 스트리밍 fallback의 타이밍에 의존하지 않고, **서버 인증 판별 → 회원 전용 클라이언트 query의 명시적 초기 로딩 상태**로 책임을 나눈다. 인증 데이터 key는 사용자별 namespace를 사용하고 인증 identity가 바뀔 때 기존 인증 cache를 취소·제거한다.

## 1. 요구사항과 상태

### 사용자 행동과 권한 경계

- 홈 직접 진입, 로그인/회원가입 성공 후 홈 진입, 다른 화면에서 홈 복귀, 로그아웃, 회원탈퇴, 같은 브라우저에서 다른 계정 로그인 흐름을 지원한다.
- 게스트는 프로필 및 최근 분석 DB query를 시작하지 않는다. 헤더는 기존 비로그인 인사 UI를 즉시 표시하고 최근 테스트 영역은 렌더링하지 않는다.
- 회원은 실제 프로필/최근 분석 query의 **초기 fetch가 진행되는 동안** 각 영역 스켈레톤을 표시한다.
- 같은 회원의 fresh cache가 있어 fetch 자체가 일어나지 않는 홈 복귀에서는 스켈레톤을 다시 표시하지 않는다.
- fresh 데이터를 가진 background refetch는 기존 데이터를 유지하고 작은 갱신 상태만 허용한다. 전체 스켈레톤은 `data === undefined`인 초기 fetch에만 사용해 콘텐츠 깜빡임을 막는다.
- 프로필 조회와 최근 분석 조회는 독립 상태다. 한쪽이 먼저 끝나면 해당 영역만 실제 UI로 바뀐다.

### 상태 전이

```text
server auth-pending
├─ guest → guest-ready (query disabled, skeleton 없음)
└─ member(userId)
   ├─ initial-fetching (data 없음 + fetch 중) → skeleton
   ├─ success(data/empty) → 실제 UI/빈 상태
   ├─ error → 영역별 오류 UI + 재시도
   └─ cached-success → 즉시 실제 UI (background fetch가 있어도 전체 skeleton 없음)

identity A → sign-out/sign-in B
→ A의 auth query 취소
→ A namespace cache 제거
→ B namespace의 initial-fetching
```

### 엣지 케이스와 부정적 요구사항

- 로그인 회원의 분석이 0건이어도 query가 완료되기 전에는 최근 테스트 스켈레톤, 완료 후에는 기존 빈 상태를 표시한다.
- 오프라인/지연/오류에서는 스켈레톤을 무한히 가장하지 않고 React Query의 `isError`를 영역별 오류 UI로 전환한다. 재시도 정책은 현재 전역 1회를 유지한다.
- `SeoIntro`, `HeroCard`, CTA와 탐색 목적지는 변경하지 않는다.
- 스켈레톤을 보이게 만들기 위한 `setTimeout`, 최소 노출 시간, 네트워크 지연 삽입은 금지한다.
- 게스트용 `profile=null`을 React Query cache에 주입하지 않는다.

## 2. 아키텍처와 런타임 흐름

### 결정: 인증은 서버, 최초 데이터 로딩 UI는 클라이언트

```text
HomeView (정적 shell)
├─ Suspense(null)                         서버 인증 확인만 격리
│  └─ HomeHeaderContainer
│     ├─ guest → HomeHeader(userId=null)  query disabled, 즉시 guest UI
│     └─ member → HomeHeader(userId)      client initial query → HeaderSkeleton
├─ HeroCard / HomeResetEffect
├─ Suspense(null)                         서버 인증 확인만 격리
│  └─ RecentTestsContainer
│     ├─ guest → null
│     └─ member → RecentTestsSection(userId)
│                 client initial query → RecentTestsSkeleton
└─ SeoIntro                               항상 정적 렌더
```

1. `HomeView`의 두 바깥 `Suspense fallback={null}`은 서버 `getUser()` 확인만 감싼다. `HeroCard`와 `SeoIntro`는 인증과 무관하게 먼저 렌더링된다.
2. `HomeHeaderContainer`와 `RecentTestsContainer`는 요청 단위로 cache된 `getAuthenticatedClient()`에서 `user.id`만 하위 client component에 전달한다.
3. 게스트 헤더는 query를 실행하지 않고 비로그인 UI를 렌더링한다. 최근 테스트 컨테이너는 `null`을 반환한다.
4. 회원 헤더와 최근 테스트 영역은 `useQuery`를 사용한다. 사용자별 key가 비어 있고 query가 활성화된 첫 렌더에서 `isPending && isFetching`이므로 스켈레톤을 렌더링하고, 같은 커밋 이후 실제 브라우저 query가 시작된다.
5. 응답 완료 시 각 영역이 독립적으로 success/empty UI로 바뀐다. 서버가 데이터를 미리 await하지 않으므로 RSC fallback 청크 병합 여부가 로딩 UI 표시를 결정하지 않는다.

이 구조는 홈 개인화 데이터의 SSR prefetch/hydration을 의도적으로 제거한다. 인증 확인 뒤 브라우저 query가 시작되어 작은 워터폴이 생기지만, “게스트에게 query/skeleton 없음”과 “회원의 실제 최초 fetch에는 결정적 skeleton”을 인위적 지연 없이 동시에 만족시키는 단순한 경계다.

### 인증 identity 전환

- `queryKeys.auth.all` 아래에 사용자 소유 query를 모으고 모든 상세 key에 `userId`를 포함한다.
- 로그인/회원가입 성공 후 `router.push` 전에 공통 `clearAuthQueryCache(queryClient)`를 호출한다. 이 helper는 진행 중인 auth query를 `cancelQueries`한 뒤 `removeQueries`하여 게스트/이전 계정 값을 제거한다.
- 로그아웃/회원탈퇴는 Server Action 성공을 결과 객체로 돌려주고, client orchestrator가 cache 정리 후 `/login`으로 `router.replace`한다. redirect가 throw되어 cleanup 코드가 실행되지 않는 현재 구조를 피한다.
- Supabase `onAuthStateChange` 구독을 Provider 하위의 작은 client effect에 두어 다른 탭 또는 세션 만료의 `SIGNED_OUT`/identity 변경도 같은 정리 helper로 방어한다. callback 자체는 async로 만들지 않고 cleanup promise를 별도 실행하며 unmount 시 구독을 해제한다.
- `TOKEN_REFRESHED`처럼 user ID가 유지되는 이벤트는 cache를 제거하지 않는다. 이전 user ID와 다음 user ID가 다를 때만 identity transition으로 처리한다.
- 사용자별 key가 1차 격리 장치이고 전환 시 cancel/remove가 2차 정리 장치다. 이벤트를 놓쳐도 다른 사용자의 key가 현재 UI observer와 일치하지 않는다.

## 3. 데이터와 query key 설계

### 사용자별 key

```ts
queryKeys.auth.all
queryKeys.profile.detail(userId)
queryKeys.profile.stats(userId)
queryKeys.groups.list(userId)
queryKeys.groups.detail(userId, groupId)
queryKeys.analyses.list(userId, groupType?)
queryKeys.analyses.detail(userId, analysisId)
```

- 실제 배열은 `['auth', userId, 'profile', 'detail']`처럼 auth root와 user ID를 선두에 둔다. `queryKeys.auth.user(userId)`로 특정 사용자만 무효화할 수 있게 한다.
- query option factory와 hook은 `userId: string | null`을 받는다. `null`이면 `enabled: false`; 회원이면 사용자별 key로 query를 활성화한다.
- Supabase 브라우저 query는 현재 세션/RLS를 계속 신뢰하며 user ID는 cache namespace로만 사용한다. 전달된 ID를 권한 근거로 사용하지 않는다.
- 홈에서는 `prefetchQuery`, `dehydrate`, `HydrationBoundary`, 게스트 `setQueryData(null)`를 제거한다.
- History/MyPage/테스트 결과 등 기존 server prefetch 화면은 서버에서 인증된 `user.id`를 얻어 동일한 사용자별 key로 prefetch하고 해당 ID를 client view/hook에 전달한다. 서버와 브라우저 key가 일치해야 hydration이 중복 fetch를 만들지 않는다.
- 분석 저장·프로필 변경 mutation은 `queryKeys.auth.user(userId)` 아래의 해당 도메인 key만 invalidate한다.
- `staleTime: Infinity` 전역 정책은 이번 범위에서 유지한다. 사용자별 namespace와 identity purge로 cross-account freshness 문제를 제거한다.

### 오류와 동시성

- 인증 확인 실패는 기존 helper 계약대로 guest 취급하지 말고, 향후 오류를 구분할 수 있도록 `getAuthenticatedClient()`의 error 관찰 가능성을 테스트한다. 이번 구현에서 helper 계약을 바꾸지 않는다면 서버 로그와 guest fallback이라는 현재 동작을 문서화한다.
- 로그아웃 중 query가 완료되어 이전 데이터를 다시 쓰지 않도록 `cancelQueries`를 먼저 수행한다. Supabase query에 AbortSignal 연결이 가능한지는 구현 단계에서 현재 라이브러리 API로 검증하고, 연결하지 못해도 사용자별 key 때문에 새 identity UI에는 노출되지 않는다.
- 로그인/로그아웃 버튼의 기존 guarded action으로 중복 제출을 막는다.

## 4. UI 컴포넌트와 접근성

- `HeaderSkeleton`과 `RecentTestsSkeleton`은 해당 client component의 초기 query 상태 가까이 배치한다. 기존 크기·토큰·애니메이션을 유지한다.
- 스켈레톤 wrapper는 `aria-hidden="true"`를 유지하고, 실제 section wrapper에 `aria-busy={isInitialFetching}`를 둔다. 스켈레톤 자체를 스크린리더가 반복 읽지 않게 한다.
- 오류 상태에는 짧은 설명과 44×44px 이상 재시도 버튼을 제공한다. 한 query 오류가 다른 홈 콘텐츠나 다른 개인화 영역을 가리지 않는다.
- 헤더 guest/member markup 높이와 최근 테스트 skeleton/결과 카드 높이를 맞춰 CLS를 최소화한다.
- 상태 보존이 필요 없는 loading/error 분기이므로 `Activity`는 사용하지 않는다.
- 구현 단계에서 UI 역할 에이전트는 기존 스켈레톤의 이동, `aria-busy`, 오류/재시도 UI만 담당하고 시각 디자인 확장은 하지 않는다.

## 5. 성능, 장애, 운영

- 장점: member initial fetch의 스켈레톤이 React Query 상태로 결정되어 서버 청크 타이밍과 무관하다. 게스트 DB query는 0회이며 정적 SEO 콘텐츠는 인증/데이터 조회에 막히지 않는다.
- 비용: 로그인 회원의 profile/analyses가 hydration 이후 시작되어 기존 server prefetch보다 한 단계 늦다. 두 query는 sibling client component에서 병렬 시작하므로 서로의 완료를 기다리지는 않는다.
- `staleTime: Infinity` 때문에 같은 회원의 홈 재방문은 cache hit로 즉시 그린다. 명시적 mutation invalidation과 identity purge만 재조회 트리거가 된다.
- 오류 관찰은 query error 상태와 기존 Supabase/서버 로그를 사용한다. 이번 작업은 스키마/RLS/Data API 노출을 변경하지 않는다.
- 현재 Supabase changelog에서 이 흐름에 직접 영향을 주는 Auth breaking change는 확인되지 않았다. 공식 SSR 문서는 서버 권한 판별에 검증된 identity (`getUser` 또는 환경에 맞는 `getClaims`)를 사용하고, 브라우저 저장소의 session 객체만 권한 근거로 쓰지 말 것을 안내한다. 현재의 서버 `getUser()` 경계를 유지한다.

## 변경 대상과 의존 관계

### 홈 로딩 경계

- `src/views/home/home-view.tsx`: auth-only `Suspense(null)` 구조 유지, 변경된 container 조합 확인.
- `src/views/home/home-header-container.tsx`: profile prefetch/hydration/null cache 제거, 인증된 `userId` 전달.
- `src/views/home/home-header.tsx`: `userId` 기반 `useQuery`, guest/pending/success/error UI 분기와 header skeleton 소유.
- `src/views/home/recent-tests-container.tsx`: analyses prefetch/hydration/late nested Suspense 제거, 회원에게 `userId` 전달.
- `src/views/home/recent-tests-section.tsx`: `userId` 기반 `useQuery`, initial skeleton/success/empty/error 분기.

### 인증 cache 경계와 key migration

- `src/shared/config/query-keys.ts`: auth root 및 사용자별 profile/groups/analyses key 정의.
- `src/shared/lib/react-query/clear-auth-query-cache.ts` (신규): auth query cancel/remove 공통 helper.
- `src/app/providers.tsx` 및 auth cache sync client component(신규 검토): Supabase auth identity 전환 구독 및 정리.
- `src/features/auth/ui/login-form/login-form.tsx`, `signup-form/signup-form.tsx`: 성공 후 auth cache 정리 뒤 이동.
- `src/features/auth/api/actions.ts`: logout/deleteAccount의 결과 반환 계약과 client-side 이동 가능성 정리.
- `src/views/mypage/my-page-view.tsx`, `src/views/mypage/settings-view.tsx`, `src/features/profile/ui/settings-form/account-section.tsx`: logout/delete 성공 후 cache 정리와 replace.
- `src/entities/user/api/query-options.ts`, `hooks.ts`: userId 인자 및 사용자별 key.
- `src/entities/analysis/api/query-options.ts`, `hooks.ts`: userId/groupType 인자 및 사용자별 key.
- `src/entities/group/api/hooks.ts`: userId 기반 group key.
- server prefetch를 사용하는 `src/app/(main)/history/page.tsx`, `mypage/page.tsx`, `src/app/(test)/**/page.tsx`: 인증 userId를 동일 key와 client props로 전달.
- 위 hook을 소비하는 `src/views/history`, `src/views/mypage`, `src/views/group-type`, `src/features/history`, `src/views/result`의 props 및 invalidation 호출부를 함께 갱신한다.

### 테스트

- 위 변경 파일의 기존 테스트와 `src/shared/lib/react-query/clear-auth-query-cache.test.ts`를 갱신/추가한다.
- 테스트 역할 에이전트가 단위 테스트 외에 실제 Next.js streaming 및 인증 전환 브라우저 검증을 수행한다.

## 테스트 계획

### 단위/컴포넌트

- guest header: `userId=null`, profile query disabled, guest UI 표시, skeleton 없음, Supabase profile 호출 0회.
- guest recent tests: container가 `null`, analyses 호출 0회, skeleton 없음.
- member header: 빈 cache에서 첫 render는 skeleton과 `aria-busy=true`; deferred query resolve 후 nickname UI와 `aria-busy=false`.
- member recent tests: 빈 cache에서 첫 render는 skeleton; deferred query resolve 후 목록 또는 0건 empty UI.
- cache hit: 같은 userId의 success cache가 있으면 skeleton 없이 즉시 실제 UI.
- error: retry 종료 후 각 영역 오류/재시도 UI, 다른 영역과 `SeoIntro` 유지.
- key 격리: user A와 user B의 profile/analyses key가 다르며 B observer가 A 데이터를 읽지 않는다.
- cache cleanup: auth root의 진행 query를 취소한 뒤 profile/groups/analyses를 제거하고 공개 query는 유지한다.
- auth event: 같은 user의 `TOKEN_REFRESHED`는 유지, `SIGNED_OUT`과 A→B 변경은 정리, unsubscribe 수행.
- login/signup/logout/deleteAccount: 성공 때만 정리 및 navigation; 실패 시 현재 화면과 cache 유지.

### Streaming/브라우저 통합

- 느린 `getUser`, guest: `HeroCard`와 `SeoIntro`가 먼저 보이고 header/recent skeleton은 한 프레임도 보이지 않으며 profiles/analyses 요청이 없다.
- 느린 `getUser`, member + deferred DB: 인증 완료 뒤 두 skeleton이 실제 브라우저에 페인트되고, query 완료 순서대로 독립 교체된다.
- 빠른 member DB: 인위적 delay 없이 browser client 최초 pending render에서 skeleton 상태를 거친 뒤 실제 UI가 나타난다. 테스트는 DOM 존재뿐 아니라 animation frame 또는 screenshot/trace로 페인트를 검증한다.
- guest → login A: 기존 guest `null` cache 없이 member skeleton → A 데이터 순서 확인.
- login A → logout → login B: 어떤 프레임에도 A nickname/analyses가 B 화면에 보이지 않고 B의 initial skeleton 뒤 B 데이터가 나타난다.
- A로 재로그인/홈 복귀: fresh A cache가 정책대로 제거된 전환 직후에는 skeleton, 같은 세션 내 홈 복귀 cache hit에는 즉시 UI.
- 느린/실패 query, 오프라인, retry 1회, 새 테스트 CTA/최근 상세 링크/MBTI prompt/mobile layout 회귀를 확인한다.

## 위험과 대안

- **Client fetch 워터폴:** 결정적 조건부 skeleton을 위해 감수한다. profile/analyses를 병렬 시작하고 client bundle 증가를 측정한다.
- **전체 userId key migration 범위:** 호출부가 많지만 일부만 바꾸면 server hydration key와 client observer key가 어긋난다. 한 커밋에서 모든 auth-owned key 소비자를 기계적으로 갱신하고 타입 검사로 누락을 차단한다.
- **auth event 중복:** 명시적 action cleanup과 Supabase event cleanup이 모두 실행될 수 있다. helper를 idempotent하게 만들고 user ID 비교로 불필요한 purge를 막는다.
- **Server Action redirect 변경:** cache 정리를 성공 이후에 보장하려면 logout/delete의 navigation 소유권을 client로 옮기는 편이 명확하다. JS 없는 progressive enhancement가 필수라면 server redirect를 유지하고 cleanup을 action 호출 전에 수행하는 대안을 택하되, 실패 시 cache 복구가 필요하다.
- **기존 late nested Suspense 유지:** SSR prefetch 성능은 좋지만 fallback 페인트를 보장하지 못해 기각한다.
- **스켈레톤 최소 노출 시간:** 시각적으로는 확실하지만 실제 응답을 고의로 늦추므로 기각한다.
- **쿠키 존재 여부로 shell 선택:** 만료된 세션을 회원으로 오판할 수 있어 기각한다.

## 근거 문서

- 로컬 Next.js 16.3.1: `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
- 로컬 Next.js 16.3.1: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
- Supabase Auth SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase `onAuthStateChange`: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- Supabase changelog: https://supabase.com/changelog
- TanStack Query `QueryClient`: https://tanstack.com/query/latest/docs/reference/QueryClient
- TanStack Query SSR/Hydration: https://tanstack.com/query/latest/docs/framework/react/guides/ssr

## 승인 후 구현 순서

1. UI 역할 에이전트: client loading/error 상태에서 기존 skeleton 및 접근성 markup 확정.
2. Frontend 역할 에이전트: user-scoped key, auth cache cleanup, 홈 client query와 인증 전환 로직 구현.
3. Backend 역할 에이전트: logout/deleteAccount 결과 계약 및 인증 보안 경계 검토·구현.
4. Test 역할 에이전트: 단위·통합·실제 streaming/auth transition 테스트 작성 및 실행.
5. Review 역할 에이전트: FSD/import/security/cache leakage/접근성 회귀 점검 후 `/test`, 승인 시 `/ship`.

이 문서는 계획 단계 산출물이다. 사용자 승인 전에는 애플리케이션 코드를 변경하지 않는다.
