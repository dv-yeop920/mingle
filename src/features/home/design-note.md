# 홈 조건부 스켈레톤 설계

## 배경과 결정

- 현재 `HomeHeaderContainer`와 `RecentTestsContainer`는 인증 확인과 실제 데이터 조회를 하나의 `Suspense` 경계에서 수행한다.
- 따라서 미인증 사용자는 프로필·분석 테이블을 조회하지 않더라도 `getAuthenticatedClient()`가 끝날 때까지 프로필/최근 테스트 스켈레톤을 본다.
- Next.js 16.3.1의 스트리밍 모델에서 fallback은 경계 안의 비동기 작업 종류를 구분하지 않는다. 실제 조회 여부를 인증 결과로 결정하려면 인증 경계와 데이터 조회 경계를 분리해야 한다.
- 홈의 두 개인화 영역 모두 **인증 확인 중에는 스켈레톤을 표시하지 않고**, 인증이 확인된 뒤 실제 프로필·분석 조회가 시작되는 경우에만 해당 섹션 스켈레톤을 표시한다.

## 1. 요구사항과 상태

- 사용자 행동은 홈 진입, 새 테스트 시작, 최근 테스트 전체/상세 진입이며 이번 변경에서 인터랙션과 목적지는 바꾸지 않는다.
- 홈 개인화 영역의 상태를 `auth-pending → guest` 또는 `auth-pending → data-loading → success/error`로 구분한다.
- `auth-pending`에서는 개인화 영역 fallback을 `null`로 두고 `SeoIntro`, `HeroCard` 등 정적 콘텐츠는 즉시 노출한다.
- `guest`에서는 최근 테스트 영역을 렌더링하지 않는다. 헤더는 프로필 query cache에 `null`을 주입해 기존 비로그인 인사 UI를 유지한다.
- `data-loading`은 로그인 사용자에게만 존재하며, 프로필 조회에는 헤더 스켈레톤, 분석 목록 조회에는 최근 테스트 스켈레톤을 표시한다.
- 로그인했지만 분석이 0건인 경우에도 실제 DB 조회가 있었으므로 조회 중에는 스켈레톤을 표시하고, 완료 후 기존 빈 상태를 표시한다.
- 인증 확인 실패는 현재 helper가 반환하는 미인증 결과 처리 계약을 유지한다. DB 조회 실패의 사용자 처리 방식은 별도 에러 UI 작업으로 확장하지 않는다.
- 부정적 요구사항: `SeoIntro` 자체에는 로딩 상태나 스켈레톤을 추가하지 않으며, 이 변경을 위해 클라이언트 상태나 새 네트워크 요청을 만들지 않는다.

## 2. 런타임 흐름

### 미인증 경로

1. `HomeView`는 헤더/최근 테스트 인증 게이트를 각각 `Suspense fallback={null}`로 렌더링하고 정적 홈 콘텐츠를 스트리밍한다.
2. 두 게이트가 `getAuthenticatedClient()`를 호출하지만 React `cache()`로 같은 요청 안의 인증 확인을 공유한다.
3. `user`가 없으면 헤더 게이트는 profile query에 `null`을 설정한 hydration 결과를 반환하고, 최근 테스트 게이트는 `null`을 반환한다.
4. 프로필 또는 analyses 테이블 조회가 시작되지 않으므로 어느 데이터 스켈레톤도 나타나지 않는다.

### 인증 경로

1. 인증 게이트가 `user`를 확인한다.
2. 게이트는 실제 prefetch를 담당하는 내부 async 컴포넌트를 데이터 전용 `Suspense`로 감싸 반환한다.
3. 프로필/분석 prefetch가 실행되는 동안 해당 데이터 스켈레톤만 표시한다.
4. prefetch 완료 후 dehydrated React Query state로 기존 `HomeHeader`/`RecentTestsSection`을 렌더링한다.

### 경계 구조

```text
HomeView
├─ Suspense(null)                 인증 확인 전용
│  └─ HomeHeaderContainer
│     ├─ guest: profile=null hydration → HomeHeader
│     └─ member: Suspense(HeaderSkeleton)
│        └─ HomeHeaderDataContainer → profile prefetch
├─ HeroCard / HomeResetEffect
├─ Suspense(null)                 인증 확인 전용
│  └─ RecentTestsContainer
│     ├─ guest: null
│     └─ member: Suspense(RecentTestsSkeleton)
│        └─ RecentTestsDataContainer → analyses prefetch
└─ SeoIntro                       항상 정적 렌더
```

- 인증을 `HomeView` 상단에서 await하지 않는다. 그렇게 하면 스켈레톤은 없어지지만 전체 정적 셸과 `SeoIntro`까지 인증 확인에 막힌다.
- 인증 중 빈 공간 뒤에 로그인 사용자용 스켈레톤이 삽입될 수 있어 작은 레이아웃 이동은 남는다. 이는 “조회가 없는 경로에서 스켈레톤 금지”와 정적 콘텐츠 선행 렌더를 동시에 지키는 비용이다.

## 3. 데이터 경계

- 서버 상태와 query key는 기존 `queryKeys.profile.detail()` 및 `queryKeys.analyses.list()`를 그대로 사용한다.
- 서버 인증은 기존 `getAuthenticatedClient()`만 사용하고, 쿠키를 직접 파싱하거나 클라이언트가 인증 여부를 결정하지 않는다.
- 게스트 헤더는 `queryClient.setQueryData(queryKeys.profile.detail(), null)` 후 dehydrate한다. 전역 `staleTime: Infinity` 덕분에 hydration 직후 브라우저에서 불필요한 profile query가 재실행되지 않는다.
- 인증 사용자의 실제 조회는 기존 `fetchProfile()`과 `fetchAnalyses()`를 유지한다. 이 함수들이 다시 호출하는 인증 helper는 요청 단위로 캐시되어 인증 네트워크 호출을 중복하지 않는다.
- 별도 Zustand 상태, query key, mutation, cache invalidation은 추가하지 않는다.
- DB 보안과 RLS는 바꾸지 않으며, 사용자별 analyses 필터도 기존 서버 query를 유지한다.

## 4. UI 컴포넌트와 접근성

- `HeaderSkeleton`은 헤더 데이터 경계를 소유하는 파일로, `RecentTestsSkeleton`은 최근 테스트 데이터 경계를 소유하는 파일로 이동한다.
- 스켈레톤의 크기·색상·애니메이션은 유지하여 로그인 경로의 시각적 회귀를 피한다.
- 인증 확인 중 `null` fallback에는 가짜 `aria-busy`나 로딩 안내를 붙이지 않는다. 사용자 관점에서 아직 실제 섹션 조회가 시작되지 않았기 때문이다.
- 실제 데이터 경계의 스켈레톤에는 필요하면 `aria-hidden="true"`를 적용하고, 컨테이너에 접근 가능한 busy 상태를 제공하는 방식으로 테스트한다. 시각 디자인 변경이 필요하면 구현 단계에서 UI 역할 에이전트가 확정한다.
- `SeoIntro`, `HeroCard`, `HomeResetEffect`, 모바일 터치 영역 및 탐색 순서는 변경하지 않는다.

## 5. 성능, 장애, 운영

- 정적 홈 콘텐츠는 인증 확인과 독립적으로 먼저 스트리밍되어 FCP/LCP를 막지 않는다.
- 기존 요청 단위 인증 dedupe를 유지하므로 헤더와 최근 테스트를 별도 게이트로 두어도 `auth.getUser()` 호출 수는 증가하지 않는다.
- 로그인 사용자의 프로필과 분석 조회는 독립된 sibling 경계에서 병렬로 진행되며, 빠른 영역이 느린 영역을 기다리지 않는다.
- 미인증 경로는 DB 조회와 데이터 스켈레톤을 모두 생략한다.
- 인증 또는 Supabase 지연 시 정적 콘텐츠는 유지된다. 데이터 조회 에러가 다른 홈 영역을 가리지 않도록 현재의 작은 경계 범위를 유지한다.
- 브라우저 검증 시 느린 네트워크에서 `auth-pending`, `data-loading`, guest/member 전환을 각각 확인하고, React Query Devtools 또는 서버 로그로 미인증 경로의 `profiles`/`analyses` 요청 부재를 확인한다.

## 변경 대상 파일

- `src/views/home/home-view.tsx`: 인증 게이트의 outer fallback을 `null`로 변경하고 데이터 스켈레톤 소유권을 컨테이너로 이동한다.
- `src/views/home/home-header-container.tsx`: 인증 분기, 게스트용 null hydration, 로그인용 내부 데이터 `Suspense` 경계를 추가한다.
- `src/views/home/recent-tests-container.tsx`: 인증 분기와 실제 analyses prefetch를 서로 다른 async 컴포넌트/`Suspense` 경계로 분리한다.
- `src/views/home/home-view.test.tsx`: 정적 홈 조합 회귀를 유지하고 변경된 경계 구조에 맞게 보완한다.
- `src/views/home/home-header-container.test.tsx` (신규 검토): 게스트는 profile fetch 없이 null hydration, 로그인은 데이터 컨테이너를 선택하는지 검증한다.
- `src/views/home/recent-tests-container.test.tsx` (신규 검토): 게스트는 analyses fetch와 스켈레톤 없이 null, 로그인은 데이터 조회 경계를 선택하는지 검증한다.

## 테스트 계획

- 단위 테스트: 미인증 시 `fetchProfile`/`fetchAnalyses`가 호출되지 않는다.
- 단위 테스트: 미인증 시 헤더는 비로그인 상태로 렌더되고 최근 테스트는 렌더되지 않는다.
- 단위 테스트: 인증 시 각 fetch가 한 번 호출되고 dehydrated 결과가 기존 UI로 전달된다.
- 단위 테스트: 로그인 사용자의 느린 query에서 각 섹션의 스켈레톤이 나타나며 `SeoIntro`는 항상 렌더된다.
- 통합/브라우저 테스트: 로그아웃 상태의 느린 인증 환경에서도 최근 테스트 스켈레톤이 한 프레임도 노출되지 않는지 확인한다.
- 통합/브라우저 테스트: 로그인 상태에서 인증 확인 뒤 DB 응답 전에는 스켈레톤, 응답 후에는 목록 또는 빈 상태가 표시되는지 확인한다.
- 회귀 테스트: 홈 CTA, 최근 테스트 상세 링크, MBTI 설정 안내 sheet, 모바일 레이아웃을 확인한다.

## 검토한 대안

- `RecentTestsSkeleton`만 삭제: 로그인 사용자의 실제 조회 진행 상태도 사라져 요구사항보다 과도하다.
- `HomeView`에서 인증을 먼저 await: 조건 분기는 단순하지만 홈 전체 스트리밍과 정적 SEO 콘텐츠가 인증 지연에 막힌다.
- 쿠키 존재만으로 로그인 여부 판단: 빠르지만 만료·폐기된 세션을 로그인으로 오판할 수 있어 보안 경계로 사용하지 않는다.
- 클라이언트에서 인증 확인 후 query enable: 서버 prefetch와 초기 HTML 이점을 잃고 hydration 후 요청 워터폴이 생긴다.
