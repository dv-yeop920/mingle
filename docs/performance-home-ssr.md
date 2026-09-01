# 홈 페이지 SSR 데이터 패칭 리팩토링 (2026-08-28)

> 대상: `src/app/(main)/page.tsx`, `src/views/home/`
>
> 키워드: React Query v5 `queryOptions()`, HydrationBoundary, `useSuspenseQuery`, Partial Prerender

---

## 1. 문제

### 배경

홈 페이지(`/`)의 데이터 패칭 구조가 여러 차례 변경되면서 성능과 코드 구조 모두 불안정해짐.

**변경 이력:**
1. 초기: `HomeView`가 `'use client'` 전체 — `useProfile()`, `useAnalyses()` 직접 호출
2. INP 최적화(섹션 5): Server/Client 분리 — `page.tsx`에서 `fetchProfile()` 서버 호출, props로 전달
3. 이 시점의 구조: `page.tsx`(async) → `HomeView`(Server Component, props로 닉네임 전달) + `RecentTestsSection`(Client, `useAnalyses()` 호출)

### 증상

- `page.tsx`가 async → HTML 전송이 서버 쿼리 완료까지 블로킹
- `RecentTestsSection`은 클라이언트에서 `useAnalyses()` 호출 → 서버에서 프리패칭 안 됨 → 스켈레톤 → 데이터 → 깜빡임
- `queryFn`이 hooks.ts에 인라인으로 정의 → `useQuery`와 서버 프리패칭이 같은 queryFn을 공유할 방법 없음
- 각 컴포넌트의 데이터 의존성이 props / 직접 fetch / 서버 호출로 혼재

---

## 2. 목표

1. **React Query 공식 SSR 패턴** 적용: server prefetch + HydrationBoundary + `useSuspenseQuery`
2. **queryFn 단일 소스**: `queryOptions()` 헬퍼로 queryKey + queryFn을 한 곳에서 정의
3. **Suspense 기반 로딩**: 각 컴포넌트가 `useSuspenseQuery`로 데이터 보장, `<Suspense>` fallback으로 스켈레톤 처리
4. **기존 다른 페이지 패턴과 통일**: mypage, history 등에서 이미 사용 중인 HydrationBoundary 패턴과 동일하게

---

## 3. 해결 과정

### Phase 1: queryOptions 분리 (entities 레이어)

기존에 `hooks.ts`에 인라인으로 정의된 queryFn + queryKey를 `queryOptions()` 헬퍼로 추출.

**신규 파일:**

| 파일 | 내용 |
|------|------|
| `src/entities/user/api/query-options.ts` | `profileQueryOptions()`, `userStatsQueryOptions()` |
| `src/entities/analysis/api/query-options.ts` | `analysesQueryOptions()`, `analysisQueryOptions()` |

**핵심 패턴:**

```ts
// entities/user/api/query-options.ts
'use client';

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/query-keys';
import { createClient } from '@/shared/lib/supabase/client';

const profileQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.profile.detail(),
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return data;
    },
  });
```

**hooks.ts 변경:**

```ts
// Before — queryFn 인라인
const useProfile = () => useQuery({
  queryKey: queryKeys.profile.detail(),
  queryFn: async () => { /* 20줄의 쿼리 로직 */ },
});

// After — queryOptions import
const useProfile = () => useQuery(profileQueryOptions());
```

**왜 두 계층(queryOptions + hooks)을 유지하는가:**

- `queryOptions`: queryKey + queryFn의 단일 소스. `useQuery`, `useSuspenseQuery`, `prefetchQuery` 모두에서 사용 가능
- `hooks`: 컴포넌트에서 직접 import하는 편의 래퍼. `enabled` 등 호출부 옵션 추가 가능
- 서버 프리패칭(`queries.ts`)은 서버 Supabase 클라이언트를 사용하므로 별도 queryFn 유지. **queryKey만 일치하면 HydrationBoundary가 캐시를 공유**

### Phase 2: page.tsx — server prefetch + HydrationBoundary

```tsx
// src/app/(main)/page.tsx
const HomePage = async () => {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(),
      queryFn: fetchProfile,           // 서버 Supabase 클라이언트 사용
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.analyses.list(),
      queryFn: () => fetchAnalyses(),   // 서버 Supabase 클라이언트 사용
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeView />
    </HydrationBoundary>
  );
};
```

**동작 원리:**

1. 서버에서 `fetchProfile()`, `fetchAnalyses()`를 병렬 실행 (서버 Supabase 클라이언트 — 쿠키 기반 인증)
2. 결과를 QueryClient 캐시에 저장
3. `dehydrate(queryClient)`로 캐시를 직렬화 → HTML에 포함
4. 클라이언트에서 `HydrationBoundary`가 직렬화된 캐시를 클라이언트 QueryClient에 주입
5. 클라이언트 `useSuspenseQuery`가 캐시에서 데이터를 찾음 → suspend 하지 않음 → 즉시 렌더

### Phase 3: 클라이언트 컴포넌트 — useSuspenseQuery

```tsx
// src/views/home/home-header.tsx
'use client';

const HomeHeader = () => {
  const { data: profile } = useSuspenseQuery(profileQueryOptions());
  // data는 항상 존재 (undefined 아님) — 타입 안전
  const nickname = profile?.nickname ?? null;
  // ... 렌더링
};
```

```tsx
// src/views/home/recent-tests-section.tsx
'use client';

const RecentTestsSection = () => {
  const { data: analyses } = useSuspenseQuery(analysesQueryOptions());
  return <RecentTests analyses={analyses ?? []} />;
};
```

**`useQuery` vs `useSuspenseQuery` 선택 이유:**

| | `useQuery` | `useSuspenseQuery` |
|---|---|---|
| 캐시 miss 시 | `{ isLoading: true, data: undefined }` | Promise throw → Suspense boundary |
| 타입 | `data: T \| undefined` | `data: T` (항상 존재) |
| HydrationBoundary와 함께 | 동작하지만 isLoading 처리 필요 | 캐시 hit → 즉시 렌더, miss → Suspense fallback |

HydrationBoundary가 캐시를 주입하므로 `useSuspenseQuery`는 suspend하지 않음. 만약 캐시가 없는 경우(비정상)에도 Suspense boundary가 스켈레톤을 보여줌.

### Phase 4: HomeView — Suspense 경계

```tsx
// src/views/home/home-view.tsx (Server Component)
const HomeView = ({ className }: HomeViewProps) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <Suspense fallback={<HeaderSkeleton />}>
        <HomeHeader />
      </Suspense>

      <div className="px-5 pt-5">
        <HeroCard />          {/* Server Component — 즉시 SSR */}
      </div>

      <HomeResetEffect />

      <Suspense fallback={<RecentTestsSkeleton />}>
        <RecentTestsSection />
      </Suspense>

      <SeoIntro />            {/* Server Component — 즉시 SSR */}
    </div>
  );
};
```

**Suspense 역할:**
- HydrationBoundary가 정상 동작하면 fallback은 표시되지 않음 (캐시 hit)
- 안전망: 클라이언트 네비게이션 등에서 캐시가 없을 때 스켈레톤 표시

---

## 4. 해결 과정에서의 시행착오

### 시행착오 1: HydrationBoundary 없이 useSuspenseQuery

**시도:** page.tsx를 non-async로 만들고, 클라이언트에서 `useSuspenseQuery` 직접 호출

**결과:** Hydration mismatch 에러

```
Hydration failed because the server rendered text didn't match the client.
```

**원인:**
- SSR 시 브라우저 Supabase 클라이언트는 `document.cookie`에 접근 불가 → 인증 실패 → `null` 반환
- 서버에서 `null` 기반으로 HTML 렌더링
- 클라이언트에서 hydration 시 QueryClient 캐시 비어있음 → `useSuspenseQuery`가 Promise throw → Suspense fallback 렌더
- 서버 HTML(데이터 렌더링) vs 클라이언트(스켈레톤) 불일치 → hydration mismatch

### 시행착오 2: useQuery로 우회

**시도:** `useSuspenseQuery` → `useQuery`로 변경, 각 컴포넌트에서 `isLoading` 분기 처리

**결과:** Hydration 에러 해소, 하지만:
- 서버/클라이언트 모두 `{ isLoading: true }` → 스켈레톤 표시 → 일치
- 데이터를 서버에서 프리패칭하지 않으므로 **항상 클라이언트에서 fetch** → 스켈레톤 깜빡임
- 다른 페이지(mypage, history)와 패턴 불일치

### 최종 결론: HydrationBoundary + useSuspenseQuery

React Query 공식 Next.js App Router 패턴 그대로 적용:
- 서버 prefetch → HydrationBoundary로 캐시 전달 → 클라이언트 useSuspenseQuery가 캐시 hit → 즉시 렌더
- 기존 mypage, history 페이지와 동일한 패턴으로 통일

---

## 5. 변경 파일

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `src/entities/user/api/query-options.ts` | 신규 | profileQueryOptions, userStatsQueryOptions |
| `src/entities/analysis/api/query-options.ts` | 신규 | analysesQueryOptions, analysisQueryOptions |
| `src/entities/user/api/hooks.ts` | 수정 | queryFn 인라인 → queryOptions import |
| `src/entities/analysis/api/hooks.ts` | 수정 | queryFn 인라인 → queryOptions import |
| `src/entities/user/index.ts` | 수정 | queryOptions export 추가 |
| `src/entities/analysis/index.ts` | 수정 | queryOptions export 추가 |
| `src/app/(main)/page.tsx` | 수정 | async + prefetch + HydrationBoundary |
| `src/views/home/home-view.tsx` | 수정 | Suspense 경계 + 스켈레톤 fallback |
| `src/views/home/home-header.tsx` | 신규 | useSuspenseQuery + 헤더 UI |
| `src/views/home/recent-tests-section.tsx` | 수정 | useSuspenseQuery로 전환 |
| `src/views/home/types.ts` | 수정 | nickname, isMbtiSetupRequired props 제거 |
| `src/features/home/ui/recent-tests/recent-tests.tsx` | 수정 | useAnalyses() 제거, analyses props |
| `src/features/home/ui/recent-tests/types.ts` | 수정 | analyses prop 타입 추가 |

총 4개 신규 + 9개 수정

---

## 6. 검증 결과

### 자동화 검증

| 항목 | 결과 |
|------|------|
| ESLint | PASS — 에러 0건 |
| TypeScript (`tsc --noEmit`) | PASS — 에러 0건 |
| Next.js Build | PASS — `/` 라우트 `◐ Partial Prerender` |
| Unit Tests | PASS — 4/4 (home-view, recent-tests) |
| Console Errors | 0건 |
| Hydration Mismatch | 없음 |

### 성능 수치 (dev 서버, Performance API, 3회 측정)

| 지표 | #1 (cold) | #2 | #3 | Warm 평균 |
|------|-----------|----|----|----------|
| TTFB | 154ms | 56ms | 66ms | **61ms** |
| FP | 268ms | 172ms | 208ms | **190ms** |
| FCP | 268ms | 172ms | 208ms | **190ms** |
| LCP | 1200ms | 704ms | 708ms | **706ms** |

- **LCP 요소**: `<H1>` (HeroCard 타이틀)
- **HTML 페이로드**: 127KB (프리패치 데이터 포함)
- **이전 기준치 대비**: 756ms → 706ms (−50ms, −6.6%)

### 프로덕션 검증 (2026-09-01)

- [x] ~~Lighthouse 프로덕션 빌드 기준 측정~~ → Score 94, LCP 1.7s (simulate), FCP 1.4s — `마이그레이션.md` 참조
- [x] ~~PageSpeed Insights 실측~~ → API 쿼터 제한으로 Lighthouse CLI로 대체 측정 완료

---

## 7. 데이터 흐름 요약

```
[Server Component: page.tsx]
  │
  ├─ getQueryClient() — 요청 당 1개 QueryClient
  ├─ prefetchQuery(profile) — 서버 Supabase 클라이언트 (쿠키 기반 인증)
  ├─ prefetchQuery(analyses) — 서버 Supabase 클라이언트
  ├─ dehydrate(queryClient) — 캐시 직렬화 → HTML 포함
  │
  └─ <HydrationBoundary> — 클라이언트 QueryClient에 캐시 주입
       │
       └─ <HomeView> (Server Component)
            │
            ├─ <Suspense fallback={HeaderSkeleton}>
            │    └─ <HomeHeader> (Client)
            │         └─ useSuspenseQuery(profileQueryOptions())
            │              → 캐시 hit → 즉시 렌더 (suspend 안 함)
            │
            ├─ <HeroCard /> — Server Component, 즉시 SSR
            │
            └─ <Suspense fallback={RecentTestsSkeleton}>
                 └─ <RecentTestsSection> (Client)
                      └─ useSuspenseQuery(analysesQueryOptions())
                           → 캐시 hit → 즉시 렌더
```

---

## 8. 참고: queryKey 매칭 원리

서버 prefetch와 클라이언트 useSuspenseQuery가 다른 queryFn을 사용해도 동작하는 이유:

| | 서버 (prefetch) | 클라이언트 (useSuspenseQuery) |
|---|---|---|
| queryKey | `queryKeys.profile.detail()` | `queryKeys.profile.detail()` |
| queryFn | `fetchProfile()` (서버 Supabase) | `profileQueryOptions().queryFn` (브라우저 Supabase) |
| Supabase 클라이언트 | `createServerClient` (쿠키 직접 접근) | `createClient` (브라우저 쿠키) |

- **queryKey가 동일** → HydrationBoundary가 캐시를 매칭
- queryFn은 캐시 miss 시에만 실행 → `staleTime: Infinity`이므로 클라이언트에서 재실행되지 않음
- 서버에서 받은 데이터가 클라이언트에서 그대로 사용됨
