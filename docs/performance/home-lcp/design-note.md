# 홈 모바일 LCP 2.5초 이하 회귀 개선 설계

2026-09-15 · Plan 단계. 사용자 보고 Lighthouse mobile LCP 4.4초를 재현하고 2.5초 이하로 낮추기 위한 설계다. 사용자 승인 전에는 소스, 테스트, 배포를 변경하지 않는다.

## Research 결과와 증거 수준

### 현재 렌더 경로

```text
RootLayout
├─ Gothic A1 700/900 preload
└─ Providers (Client boundary, children은 Server Component 유지)
   └─ HomeView (Server Component)
      ├─ HomeHeader (Client: auth session → profile)
      ├─ HeroCard + /analysis CTA (Server)
      ├─ HomeResetEffect (Client)
      ├─ HomeRecentTests (Client)
      │  ├─ auth pending → 3개 카드 높이의 RecentTestsSkeleton
      │  ├─ guest → null
      │  └─ member → analyses query → skeleton/data/error
      └─ SeoIntro (Server, 큰 700-weight 문단 포함)
```

- `src/views/home/home-view.tsx`의 공개 Hero와 `SeoIntro`는 서버 HTML에 포함되며 페이지 자체는 인증이나 DB를 await하지 않는다. 이전의 상위 인증 blocking 문제는 이미 제거됐다.
- `src/views/home/home-recent-tests.tsx`는 `useAuthUserId()`가 브라우저 세션을 확인하는 동안 약 300px 높이의 skeleton을 렌더하고, 게스트로 판명되면 이를 `null`로 접는다.
- 그 skeleton 뒤에 있는 `SeoIntro`는 게스트 cold load에서 처음에는 모바일 viewport 밖에 있다가 인증 완료 후 위로 이동할 수 있다. 과거 측정에서 `SeoIntro`의 700-weight `<p>`가 Hero H1보다 넓어 실제 LCP 요소였다는 기록이 있다. 따라서 늦게 viewport에 들어온 소개 문단이 LCP timestamp를 갱신한다는 것이 현재 가장 강한 구조 가설이다. 이는 trace로 확인 전까지 가설이며 4.4초를 단정적으로 설명하지 않는다.
- 2026-09-14 변경에서 auth-pending recent skeleton이 추가됐고, 기존 프로덕션 `devtools` 기록은 2026-09-02 LCP 2.3초였다. 코드 시점과 측정 체계가 다르므로 이를 통제된 전후 개선률로 계산하지 않는다.
- Gothic A1은 `/fonts/v1/`의 배포 독립 URL, `font-display: optional`, metric-adjusted Arial fallback을 사용한다. RootLayout은 홈 LCP 후보에 쓰이는 700/900만 preload한다. 파일 크기는 각각 약 244KB/246KB다.
- 과거 독립 실험에서 preload 제거는 Lighthouse `simulate` LCP를 낮췄지만, 실제 Chrome에서 optional block period 안에 웹폰트를 쓸 확률을 떨어뜨렸다. `devtools` 및 당시 RUM은 preload 유지 상태와 더 일관됐다. 현재 4.4초 보고가 어느 throttling mode인지 아직 확인되지 않았으므로 preload 제거를 곧바로 해결책으로 채택하지 않는다.
- 화면에 보인 `레거시 JavaScript 12KiB`, `렌더링 차단 요청 60ms`는 후속 최적화 후보지만, 각각의 최대 절감 추정만으로 4.4초에서 2.5초까지의 1.9초 차이를 설명하지 못한다. 기존 조사에서도 legacy 12,096B는 Next/의존 청크에 남았다. 이번 LCP 원인 실험과 섞지 않는다.

### 기존 문서와의 관계

- 이 문서는 기존 `docs/performance/home-lcp/design-note.md`를 현재 코드 기준으로 갱신한 단일 홈 LCP 설계다. 별도 중복 설계 문서를 만들지 않는다.
- `docs/performance/home-lcp/measurements.md`의 2026-09-08 로컬 값은 과거 구조의 기록으로 보존한다. 새 수치는 Implement/Test 단계에서 날짜, SHA, mode와 함께 새 절로 추가한다.
- `docs/performance/font-loading/design-note.md`의 고정 URL, optional, fallback metric, immutable versioning 계약을 유지한다. preload 자체만 통제 실험 대상으로 삼고, 폰트 경로를 `next/font`로 되돌리거나 v1 파일을 덮어쓰지 않는다.
- `docs/design/seo-home-analysis/design-note.md`의 단일 H1, visible `SeoIntro`, 설명형 링크 계약을 유지한다. 소개 콘텐츠를 숨기거나 삭제하거나 검색봇과 사용자에게 다르게 제공하지 않는다.
- 설치된 Next.js 16.3.1 문서 `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `13-fonts.md`, `01-app/03-api-reference/02-components/font.md`, `01-app/02-guides/production-checklist.md`를 확인했다. Server Component는 클라이언트 JS 없이 렌더되고, font module의 preload는 선택 가능하며, production build/`next start`와 Lighthouse를 field data와 함께 사용해야 한다. 현재 수동 `@font-face`는 과거 배포 hash 중복이라는 저장소 고유 근거 때문에 유지하는 예외다.

## 1단계: 요구사항과 사용자 상태

### 목표와 사용자 행동

- 모바일 홈 cold navigation에서 공개 Hero, `/group-type` CTA, `/analysis` 링크, `SeoIntro`를 인증과 개인 데이터 완료 전에 사용할 수 있어야 한다.
- 게스트는 최근 테스트 query를 시작하지 않으며 최종 recent section을 보지 않는다.
- 회원은 프로필과 최근 테스트를 기존처럼 조회하고, 기록 0/1/3개, 결과 링크, 캐시 hit, 초기 loading, 오류/재시도를 유지한다.
- 홈 진입 직후 CTA 클릭, 다른 화면에서 복귀, 로그아웃 후 게스트 전환, A 계정에서 B 계정 전환, 오프라인 상태에서도 기존 cache/reset/auth 계약이 깨지지 않아야 한다.

### 상태 전이와 엣지 케이스

```text
cold navigation
├─ public shell: header fallback + Hero + CTA + SeoIntro 즉시
└─ auth identity
   ├─ pending → recent skeleton (공개 LCP 영역 뒤)
   ├─ guest → recent null
   └─ member
      ├─ no analyses cache → query skeleton → empty/data/error
      └─ cached analyses → 기존 data 유지, background refetch
```

- 회원 recent 콘텐츠의 높이가 0/1/3개에 따라 달라도 그 앞의 공개 콘텐츠 위치는 바뀌지 않아야 한다.
- 게스트 auth가 매우 느리거나 실패해도 공개 콘텐츠가 skeleton 아래로 밀리거나 가려지면 안 된다.
- 긴 닉네임, 폰트 실패, 느린 4G, CDN MISS, 분석 기록이 큰 응답인 경우를 포함한다.
- 부정적 요구사항: LCP 점수를 위해 콘텐츠를 CSS로 숨기거나, skeleton에 인위적 timeout을 넣거나, 인증/RLS를 약화하거나, SeoIntro를 삭제·축약하거나, 폰트 v1 바이트를 덮어쓰지 않는다.
- 새 입력, Zustand 상태, React Query key, API, DB, Supabase 변경은 없다.

## 2단계: 아키텍처 흐름과 선택안

### 선택한 구현안: 공개 정적 소개를 개인화 recent 영역 앞으로 이동

```text
HomeView
├─ HomeHeader
├─ HeroCard + /analysis CTA
├─ HomeResetEffect
├─ SeoIntro                 정적·서버 렌더, DOM 위치 안정
└─ HomeRecentTests          인증/개인 query 및 skeleton은 그 뒤에서 전이
```

`SeoIntro`와 `HomeRecentTests`의 DOM 순서만 바꾼다. 공개 설명은 인증 상태와 무관한 안정된 초기 shell에 두고, 사용자별로 생기거나 사라지는 영역은 그 뒤로 내린다. 게스트 auth-pending skeleton이 접혀도 Hero와 소개의 위치 및 paint 시점은 바뀌지 않는다. 회원에게 recent skeleton을 유지해 개인 데이터 loading feedback과 skeleton→결과 간 높이 근사를 보존한다.

이 선택은 `SeoIntro`가 현재 LCP 후보라는 사실을 숨기는 대신, 그 후보가 최초 서버 paint에 참여하도록 한다. Server Component를 유지하므로 홈 JS를 추가하지 않으며 FSD상 page 조합 책임인 `views/home` 안에서만 순서를 결정한다.

### 반드시 분리할 A/B 실험

동시에 여러 변경을 넣지 않고 각 실험 뒤 baseline 소스로 복귀한 후 다음 실험을 수행한다. 모든 변형은 같은 production build 방식, URL, 환경에서 측정한다.

| 실험                     | 독립 변수                                               | 고정 조건                                          | 판정                                                                                      |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A0 baseline              | 현재 코드                                               | 폰트 preload 700/900, current order                | 실제 LCP element와 4.4초 재현                                                             |
| A1 font preload          | RootLayout의 700/900 preload만 제거한 임시 실험 build   | Home DOM 순서와 모든 font-face/fallback/cache 설정 | simulate와 devtools를 각각 A0와 비교. font request priority/transfer/사용 폰트/CLS도 기록 |
| B1 structure             | `SeoIntro`를 `HomeRecentTests` 앞으로 이동              | preload 700/900 유지                               | guest/member에서 LCP element/timestamp와 layout shift source 비교                         |
| B2 combined confirmation | B1 + A1은 A1이 실제 Chrome에서도 유의하게 이긴 경우에만 | 나머지 동일                                        | 상호작용 확인용이며 개별 효과로 보고하지 않음                                             |

실험 build는 커밋 후보와 섞지 않고 Test 역할이 별도 worktree/임시 patch 또는 각 build의 명시적 SHA로 관리한다. 사용자의 기존 dirty changes는 stash/reset/checkout하지 않는다.

### 대안과 트레이드오프

| 안                                           | 장점                                                                   | 비용/위험                                                                                     | 결정                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| SeoIntro를 recent 앞에 배치                  | 공개 LCP 후보의 DOM/viewport 위치 안정, 인증 상태와 분리, JS 증가 없음 | 회원이 최근 기록을 보기 위해 소개 카드만큼 더 스크롤                                          | 기본안. UI 역할이 정보 우선순위와 간격 확인         |
| auth-pending recent skeleton을 `null`로 변경 | 게스트 초기 밀림 제거, 마크업 감소                                     | 회원에서 인증 후 큰 section이 삽입되어 SeoIntro와 하단 콘텐츠 CLS 가능, loading feedback 지연 | 제외                                                |
| recent 영역 고정 높이 예약                   | 회원 CLS 억제                                                          | 게스트에게 빈 공간을 오래/영구 노출, viewport 낭비                                            | 제외                                                |
| SeoIntro 문단 분할/축소                      | LCP 후보 면적을 줄일 수 있음                                           | 콘텐츠/SEO를 지표에 맞춰 왜곡하며 근본적인 늦은 viewport 진입 미해결                          | 제외                                                |
| preload 700/900 제거                         | simulate 수치와 초기 대역폭 경쟁 개선 가능                             | optional의 짧은 block period 내 웹폰트 사용률 저하, 브랜드 폰트 표시 확률 감소                | A/B 결과가 devtools와 RUM까지 지지할 때만 후속 채택 |
| 700만/900만 preload                          | 실제 LCP weight만 우선화 가능                                          | 후보가 Hero 900↔SeoIntro 700으로 바뀌므로 route 공통 효과가 불명확                            | A1 결과가 혼합일 때 2차 실험                        |
| `next/font/local` 복귀                       | 설치 문서의 자동 최적화 사용                                           | 이 저장소에서 확인된 deployment ID 혼합과 중복 요청 위험 재도입                               | 제외                                                |
| legacy JS/60ms render-blocking 우선 수정     | 감사 항목 감소                                                         | 예상 절감이 LCP gap보다 작고 인과가 없음                                                      | 별도 과제                                           |

## 3단계: 데이터와 상태 설계

- `useAuthUserId`, `profileQueryOptions`, `analysesQueryOptions`, user-scoped query keys, `staleTime: Infinity`, cache purge 정책을 변경하지 않는다.
- HomeRecentTests의 auth pending/member loading/guest null 분기를 유지한다. DOM 순서 이동은 query 시작 시점이나 네트워크 병렬성에 영향을 주지 않아야 한다.
- `HomeResetEffect`의 mount와 `reset()` 실행 순서를 유지한다. 컴포넌트를 재마운트하거나 조건부로 옮기는 설계가 아니다.
- 개인 데이터 오류는 현재 section 내부에서 처리하고 공개 Hero/SeoIntro를 실패시키지 않는다.
- 실험용 폰트 preload 제거는 정적 head hint만 바꾸며 font-face URL, `optional`, fallback metric, cache header에는 손대지 않는다.

## 4단계: UI, 의미 구조, 접근성

- H1은 Hero에 정확히 하나, SeoIntro 제목과 최근 테스트 제목은 각각 H2를 유지한다. DOM order가 `H1 → SeoIntro H2 → RecentTests H2`가 되어도 올바른 동급 section 구조다.
- `SeoIntro`의 문구, list semantics, 책임 안내, 배경/테두리/토큰을 유지한다.
- recent loading의 `aria-busy`, skeleton의 `aria-hidden`, error의 `role="alert"`, 재시도 44px target을 유지한다.
- 모바일 390×844와 Lighthouse 기본 412×823 모두에서 Hero/CTA/SeoIntro의 첫 화면 위치, 소개와 recent 사이 간격, BottomNav 가림, 회원의 recent 발견 가능성을 확인한다.
- 순서 변경은 제품 정보 우선순위에 영향을 주므로 Implement 단계에서 UI 역할 에이전트가 레이아웃과 스크롤 UX를 확인한다. 새 컴포넌트나 시각 디자인은 요구하지 않는다.
- 상태 보존용 toggle이 아니므로 React `<Activity>` 대상은 없다.

## 5단계: 성능, 장애, 운영

### baseline 측정 프로토콜

1. 현재 배포 URL과 로컬 production build를 분리해 기록한다. dev server 결과는 원인 탐색 참고만 하고 합격 판정에 쓰지 않는다.
2. Chrome/Lighthouse 버전, OS, viewport/DPR, CPU slowdown, RTT/throughput, `simulate` 또는 `devtools`, URL, redirect 유무, GA 차단 여부, 배포 SHA를 각 결과에 기록한다.
3. `simulate`와 `devtools`를 각각 독립 series로 실행하며 서로 평균하거나 개선률로 연결하지 않는다. 각 series는 동일 조건 전후만 비교한다.
4. cold guest 5회: 새 incognito context 또는 storage/cookie/cache 완전 초기화 후 직접 `/` 탐색. server cold/JIT 첫 회는 버리지 말고 표시하고, 5회 전체 중앙값과 min/max를 함께 기록한다.
5. cold member 5회: 동일한 테스트 계정, 동일 기록 수(0개 또는 고정 fixture 3개), 유효 인증 상태를 매회 재구성하고 HTTP cache는 비운다. 인증 토큰 생성 시간을 포함했는지 명시한다.
6. guest/member 각각 warm navigation도 3회 보조 측정해 cache hit 회귀를 확인하되 cold 합격값과 섞지 않는다.
7. Lighthouse JSON과 trace를 보관하고 LCP node, candidate timestamp, TTFB, FCP, LCP breakdown, CLS source, TBT, transferred font/JS bytes, font initiator/priority/cache를 추출한다. PerformanceObserver 또는 trace에서 skeleton 제거와 SeoIntro viewport 진입 시점을 대조한다.
8. A0가 4.4초를 재현하지 못하면 숫자 자체를 목표 baseline으로 가정하지 않고 사용자 측정 조건 차이를 먼저 기록한다. 그래도 동일 프로토콜의 A/B는 진행할 수 있다.

### 테스트와 검증

- `src/views/home/home-view.test.tsx`: Hero H1 하나, `/group-type`·`/analysis` 링크, SeoIntro visible 계약에 더해 SeoIntro section이 recent section보다 DOM상 앞선다는 사용자 관찰 가능 순서를 검증한다.
- `src/views/home/home-cache.test.tsx`, `recent-tests-section` 테스트: guest query 0회, auth pending skeleton, member empty/data/error, cached data 유지 계약을 회귀 확인한다. 구현 마크업 전체 snapshot은 추가하지 않는다.
- 브라우저: guest/member, auth 지연, profile 오류, analyses 오류, 기록 0/1/3, CTA 즉시 클릭, back navigation, BottomNav 이동, console/hydration error를 확인한다.
- 정적 검사: 관련 Vitest → 전체 `npm test` → `npm run lint` → `npm run build`.
- production build에서 `/`가 의도한 Next.js 16 렌더 분류로 빌드되고 SeoIntro가 초기 HTML에 남아 있는지 확인한다. Client boundary를 상위로 확장하지 않는다.

### 합격 기준

- 주 목표: 선택 구현의 모바일 cold navigation **Lighthouse devtools** guest와 member 각각 5회 중앙값 LCP ≤ 2.5초. 각 run도 기록하며 단일 최고값으로 합격시키지 않는다.
- 보조 목표: 같은 코드의 Lighthouse simulate도 별도로 보고한다. 사용자가 말한 4.4초가 simulate에서 재현됐다면 동일 simulate 조건 중앙값 ≤ 2.5초도 목표로 하되, 이를 위해 devtools/RUM을 악화시키는 preload 제거는 채택하지 않는다.
- LCP 요소가 Hero 또는 SeoIntro의 최초 static paint이고, auth/skeleton 완료 시점에 새 LCP candidate가 생기지 않아야 한다.
- CLS ≤ 0.1(guest/member 각 중앙값 및 모든 대표 상태 확인), TBT ≤ 200ms. FCP는 baseline 대비 10% 초과 악화가 없어야 한다.
- font 404/중복 요청/`?dpl=`/`/_next/static/media/*.woff2`는 0건. preload 유지 시 700/900 URL과 CSS URL이 정확히 일치해야 한다.
- 기능: 게스트 recent query 0회, 회원 recent 정상 표시/재시도, 단일 H1, SeoIntro visible content, CTA/BottomNav 정상, hydration/console error 0건.
- RUM: 배포 후 Vercel Speed Insights Production/Mobile LCP·CLS를 최소 7일 또는 충분한 표본까지 관찰한다. mobile P75 LCP ≤ 2.5초, CLS ≤ 0.1을 운영 기준으로 삼되 표본 수와 배포 전후 기간을 함께 기록한다. 합성 테스트와 RUM 수치를 직접 전후 계산하지 않는다.

### 장애 관측과 롤백 순서

관측은 Lighthouse trace/JSON, Chrome Network/Performance, Vercel Speed Insights를 사용한다. 새 런타임 로깅이나 사용자 추적 이벤트는 추가하지 않는다.

1. B1에서 기능/SEO/접근성 회귀 또는 devtools LCP 악화가 발생하면 `home-view.tsx`의 두 section 순서만 원복한다.
2. A/B 결과로 font preload 변경까지 채택한 경우 LCP/CLS/브랜드 폰트 회귀 시 preload hint만 700/900 순서로 복구한다. font CSS, v1 assets, immutable cache는 건드리지 않는다.
3. 테스트 변경은 제품 순서와 함께 되돌리되 기존 SEO heading/cache 테스트를 삭제하지 않는다.
4. 배포 롤백 후 동일 cold guest/member devtools series와 Network 검사를 다시 실행해 기준선 복귀를 확인한다.
5. `git reset --hard`, 전체 파일 checkout, dirty WIP 삭제는 사용하지 않는다. 정확한 hunk revert 또는 변경 커밋 revert만 사용한다.

## 파일별 변경 계획과 역할

| 파일                                                       | 계획                                                                                                      | 역할              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| `src/views/home/home-view.tsx`                             | `SeoIntro`를 `HomeRecentTests` 앞으로 이동. Server/Client 경계와 HomeResetEffect 유지                     | Frontend, UI 검토 |
| `src/views/home/home-view.test.tsx`                        | 의미 구조·링크와 공개 소개가 개인 recent보다 먼저라는 순서 회귀 테스트                                    | Test              |
| `src/views/home/home-cache.test.tsx` 및 recent 관련 테스트 | 기존 auth/query/cache 상태 회귀 확인. 필요할 때만 테스트 보완                                             | Test              |
| `src/app/layout.tsx`                                       | 기본안은 무변경. A1 실험에서만 700/900 preload 제거 variant 생성; 실제 채택은 독립 판정 후 별도 승인 범위 | Frontend/Test     |
| `docs/performance/home-lcp/measurements.md`                | A0/A1/B1, guest/member, simulate/devtools 원본 경로와 중앙값 기록                                         | Test              |
| `docs/performance/optimization-log.md`                     | 최종 채택안과 배포/RUM 결과만 사실로 추가                                                                 | Frontend/Test     |

FSD 의존 방향은 바뀌지 않는다. `app`은 metadata/layout만, `views/home`은 페이지 조합, `features/home`은 기존 단위 UI를 유지한다. 같은 레이어 cross-import나 새 client boundary가 없다. Supabase/Auth/Route Handler 변경이 없어 Backend 구현은 필요하지 않으며, 인증 query가 실제 trace 병목으로 새롭게 확인될 때만 별도 Backend 설계를 시작한다.

## 승인 게이트와 dirty worktree 보호

현재 작업 전부터 `package.json`, `package-lock.json`, `src/proxy.ts`, `src/shared/types/database.ts` 수정과 auto-recovery/plan2 관련 미추적 파일이 존재한다. 이들은 이번 성능 계획의 범위가 아니며 수정·삭제·복원·커밋에 포함하지 않는다. Plan 산출물은 이 문서 하나뿐이다.

사용자 승인 후 `UI/Frontend → Test → /review → /test → /ship` 순서로 진행한다. 먼저 A0/A1/B1 측정으로 가설을 판정하고, 기본안 B1이 acceptance criteria를 충족할 때만 구현 후보로 확정한다. 사용자 승인 전에는 실험용 소스 변경, 테스트 실행을 위한 영구 수정, 커밋, 배포를 수행하지 않는다.

---

# Phase 2 — Gothic A1 critical family 설계

2026-09-15 · B1은 `devtools` LCP와 CLS를 개선했지만 동일한 mobile `simulate`에서 LCP 중앙값 6.632초로 목표를 충족하지 못했다. 아래 Phase 2는 B1을 고정한 다음 폰트 전송량만 독립적으로 줄이는 설계다. 이 절은 Phase 2 범위와 판정에 한해 위의 초기 preload 실험 계획을 대체한다.

## Research 결론과 선택 근거

- B1의 첫 `simulate` run은 Gothic A1 700/900 preload 약 502KB에 viewport에서 발견된 800 약 251KB까지, guest 초기 화면에서 Gothic A1만 약 751KB를 경쟁시켰다. font와 Next static JS를 함께 차단한 진단에서만 2.5초를 통과했으므로 폰트 절감은 필요하지만 단독 성공을 미리 가정하지 않는다.
- Google Fonts의 공식 CSS와 파일을 그대로 재현하는 full-coverage sharding은 700/800/900 세 weight만으로 99 shard/weight, 총 297개 `@font-face`, CSS 약 181KB raw/40KB gzip, 홈에서 약 25개 font request가 필요했다. 단일 대용량 파일보다 byte coverage는 좋아지지만 CSS 파싱·캐시 객체·요청 수와 검증 면적이 홈 최적화치고 과도하다.
- `HomeView` 내부에만 별도 family를 주면 sibling인 `BottomNav`가 기존 full Gothic A1을 계속 요청한다. 따라서 route wrapper가 아니라 전역 stack 선두에 작은 `Gothic A1 Critical` family를 배치한다.
- 기본안은 현재 검증된 `public/fonts/v1/gothic-a1-{400,700,800,900}.woff2`를 canonical input으로 삼아, 홈의 고정 UI 문자 inventory만 담은 물리적 subset 네 개를 로컬 `fonttools`로 생성하는 것이다. 같은 inventory `unicode-range`를 각 weight의 face에 명시하고 `Gothic A1 Critical`, 기존 `Gothic A1`, metric-adjusted fallback 순으로 사용한다.
- 이 방식은 브라우저에서 Google로 요청하지 않는다는 Next.js Font 문서의 self-hosting 원칙을 유지하면서도, 저장소에서 이미 해결한 `next/font` deployment ID 혼재를 재도입하지 않는다. Google Fonts CSS를 build/runtime에 가져와 복제하지 않으므로 upstream 응답 변화와 네트워크 가용성에도 빌드가 좌우되지 않는다.
- 재현성은 pinned `fonttools`/Brotli 버전, canonical input SHA-256, 정렬된 codepoint manifest, 고정된 subset 옵션, output SHA-256으로 보장한다. 배포 라이선스는 Gothic A1의 OFL 원문과 source/version 출처를 저장소에 함께 둔다. v1 원본은 수정하지 않고 산출물은 `/fonts/v2/`의 immutable URL로 추가한다.
- Research의 33~34KB/weight 이하는 현재 `hb-subset` 원시 결과에 기반한 예상치다. 구현 합격 여부는 실제 `fonttools` 산출물과 브라우저 요청으로 판단하며 예상치를 결과처럼 기록하지 않는다.
- F1 브라우저 검증에서 canonical v1 cmap의 exact `unicode-range`를 적용한 뒤에도, non-preloaded `font-display: optional` critical 800과 같은 weight의 v1 full 800이 cold load에서 병행 요청됐다. 제품의 800 weight를 바꾸는 F2 대신 약 18.7KB인 critical 800을 preload에 추가하면 700/800/900 합계가 약 56KB에 머물면서 guest 홈의 v1 Gothic A1 요청을 0으로 만드는 네트워크 계약을 유지할 수 있다.
- 700/800/900 critical preload 후 LCP는 `simulate` 중앙값 2.273초, `devtools` 1.634초로 통과했지만 actual throttling에서 critical과 canonical v1의 범위가 겹쳐 v1 700/800/900 약 752KB가 계속 요청됐다. v1 파일은 유지하되 각 weight의 CSS 범위를 `canonical v1 cmap − critical cmap` residual로 선언한다. 그러면 고정 문자는 Critical face에만 match하고, inventory 밖이면서 v1이 지원하는 동적 문자는 residual v1 exact-weight face에 match하며, 어느 cmap에도 없는 기호는 바로 platform fallback으로 간다.
- residual range 적용 후 guest 고정 UI는 v1 range와 겹치지 않아 full request 0건 계약을 유지한다. 반면 회원의 inventory 밖 지원 한글은 인증 뒤 늦게 나타날 수 있으므로, residual v1 400/700/800/900만 `font-display: swap`으로 설정해 다운로드된 exact-weight Gothic A1을 실제 적용한다. 격리 실험에서 full fallback swap의 CLS는 0.01294로 기준 0.1 미만이었지만 줄바꿈 변화 가능성이 있으므로, 최종 member cold 상태에서 긴 nickname·recent title의 geometry와 CLS ≤ 0.1을 반드시 재검증한다. Critical faces의 `optional`은 유지한다.

## 1단계: 요구사항과 사용자 상태

### 긍정적 요구사항

- Gothic A1의 기존 400/700/800/900 weight, glyph 모양과 CSS 변수 계약을 유지한다. Critical face는 `font-display: optional`, disjoint residual v1 face는 동적 glyph 적용을 위해 `font-display: swap`을 사용한다.
- `Gothic A1 Critical` 400/700/800/900은 동일한 home fixed-text inventory를 물리적으로 포함하고 동일한 `unicode-range`를 갖는다.
- RootLayout은 critical 700/800/900을 preload한다. 800 preload는 non-preloaded optional face가 v1 full 800과 병행 probe된 브라우저 검증 결과에 따른 F1 보정이며, 400은 실제 사용 시에만 요청한다.
- guest 홈의 고정 문구는 v2 critical family만으로 표시되어야 하며 v1 full Gothic A1 400/700/800/900을 요청하지 않아야 한다.
- member의 닉네임, DB 분석명처럼 inventory에 의도적으로 없는 문자는 동일 weight의 기존 `Gothic A1` v1 face로 glyph fallback할 수 있다. 고정 문자와 동적 문자가 섞인 한 text run에서도 누락이나 tofu가 없어야 한다.
- 홈 외 모든 route에서도 fixed/dynamic 한국어, 라틴, 숫자, 기호가 현재와 같은 weight로 읽혀야 한다. critical inventory에 있는 glyph는 v2에서, 없는 glyph는 v1 또는 metric fallback에서 제공한다.
- `/fonts/v2/*`는 1년 immutable 캐시를 사용한다. 바이트나 inventory가 바뀌면 v2 파일을 덮어쓰지 않고 v3로 올린다.

### 부정적 요구사항과 경계

- 800 UI를 700으로 바꾸는 시각적 변경은 기본안에 포함하지 않는다. weight 통합은 F1 결과 뒤 별도 F2 실험으로만 다룬다.
- 동적 nickname, 사용자 입력, DB/API 응답의 전체 문자를 critical inventory에 추측해 넣지 않는다. 이들은 full family fallback 대상이다.
- LCP를 위해 고정 문구를 삭제·축약·숨김 처리하거나 font face를 data URL로 inline하지 않는다.
- v1 full fonts, Nunito, OG/Satori용 `src/app/fonts/gothic-a1-800.ttf`, 인증·React Query·Zustand·Supabase 계약은 변경하지 않는다.
- runtime에 Google Fonts CSS/API 의존성을 추가하지 않으며, 297-face 공식 sharding을 기본안과 동시에 넣지 않는다.

### 상태와 엣지 케이스

```text
문자별 font selection
├─ inventory codepoint + requested weight 존재
│  └─ Gothic A1 Critical v2
├─ inventory 밖의 동적 codepoint
│  └─ Gothic A1 residual v1의 동일 weight (`font-display: swap`)
└─ v2 critical optional 기간 초과 또는 v1 residual 로드 전/실패
   └─ Gothic A1 Fallback → system-ui → sans-serif; residual 성공 시 swap
```

- guest cold: static home/BottomNav 문구만 보이는 상태에서 full v1 요청 0건을 기대한다.
- member cold: nickname 또는 recent title이 inventory 밖 glyph를 포함하면 필요한 exact weight의 v1만 후속 요청될 수 있다. 이를 실패나 중복으로 판정하지 않는다.
- emoji, 결합 문자, 자모, 공백, 화살표와 punctuation은 inventory 생성기가 codepoint 단위로 보존한다. emoji는 현재 platform fallback 동작을 유지한다.
- JS disabled, font 404, offline, cache hit, 느린 4G에서도 콘텐츠와 CTA는 즉시 읽고 사용할 수 있어야 한다.
- 문구 변경으로 새 고정 문자가 생기면 inventory coverage test가 실패해야 하며, 생성 script 실행과 v3 version bump 없이는 ship할 수 없다.

## 2단계: 아키텍처와 생성 흐름

### 선택 구조

```text
고정된 home source allowlist
  -> inventory extractor
  -> 정렬·중복 제거된 home-critical-codepoints.txt
  -> pinned fonttools + canonical v1 WOFF2 4개
  -> /fonts/v2/gothic-a1-critical-{400,700,800,900}.woff2

fonts.css
  -> Gothic A1 Critical 4 faces + 같은 unicode-range
  -> 기존 Gothic A1 v1 4 files + weight별 canonical-minus-critical residual unicode-range
  -> --font-gothic-a1:
     Critical, Gothic A1, Gothic A1 Fallback, system-ui, sans-serif

RootLayout head
  -> v1 full 700/900 preload 제거
  -> 정확히 일치하는 v2 critical 700/800/900 preload
```

inventory source allowlist는 홈의 initial guest/member 고정 UI와 sibling layout UI만 포함한다. 최소 대상은 `home-header`, header fallback, `hero-card`, `seo-intro`, recent tests와 그 fallback/error, `HomeView`의 분석 링크, `BottomNav` label이다. 소스 파일 전체에서 한글·기본 라틴·숫자·표시 기호 codepoint를 추출하되, class/import identifier 때문에 생기는 ASCII 변동을 줄이기 위해 기본 ASCII set은 명시적으로 고정하고 사용자/DB fixture 값은 allowlist에서 제외한다.

생성기는 다음을 한 번에 검증한다.

1. allowlist 파일이 존재하고 inventory가 codepoint 순으로 canonical하게 정렬됐는가.
2. 네 canonical input의 SHA-256이 승인된 manifest와 일치하는가.
3. 네 output 모두 inventory glyph를 실제로 포함하고 inventory 밖 CJK glyph는 포함하지 않는가.
4. CSS에 기록할 critical `unicode-range`와 네 output cmap이 일치하는가.
5. 각 v1 residual range와 critical cmap의 교집합이 비어 있고, residual과 critical의 합집합이 canonical v1 cmap을 복원하는가.
6. inventory 밖 동적 한글 probe는 residual에 남고 고정 문자 probe와 platform fallback 문자는 residual에서 제외되는가.
7. 동일 input/tool/options로 두 번 생성한 output SHA-256이 동일한가.

공식 Google 99-shard 파일은 재다운로드·재패키징하지 않는다. critical 방식이 glyph 정확성, 요청 수, 유지보수 또는 실제 성능 기준을 충족하지 못할 때만 fallback plan으로 다시 평가한다. 그때도 297-face 700/800/900 sharding을 별도 variant로 만들고 F1과 같은 commit/build에 섞지 않는다.

### SSR/CSR와 J1 후속 경계

- 폰트 CSS, preload, static assets만 바뀌므로 Server/Client boundary, hydration, request-time API와 render classification은 변하지 않는다.
- `HomeResetEffect`가 broad `@/features/test-flow` barrel에서 store를 import하는 J1은 초기 JS 진단을 위한 독립 후속이다. F1 측정이 끝난 뒤 bundle/module graph에서 실제 불필요 모듈 포함이 증명될 때만 `@/features/test-flow/model/store` direct import variant를 만든다.
- J1은 font assets/CSS/preload/weight와 같은 variant에 처음부터 섞지 않는다. direct import가 프로젝트 public API 원칙과 충돌하는지 Review 역할이 확인하고, 불필요 JS 감소가 없으면 채택하지 않는다.

## 3단계: 데이터와 정적 계약

서버·클라이언트 데이터 상태는 추가하지 않는다. Phase 2의 관리 데이터는 아래 정적 manifest뿐이다.

| 계약                      | source of truth                                                          | 불변 조건                                                                                |
| ------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| full font input           | `public/fonts/v1/gothic-a1-{weight}.woff2`                               | 기존 바이트와 URL을 수정하지 않음                                                        |
| critical source inventory | allowlist + canonical codepoint manifest                                 | 고정 UI 문자가 모두 포함되고 동적 fixture는 제외됨                                       |
| subset build              | pinned fonttools/Brotli + 고정 옵션                                      | clean environment에서 같은 SHA 생성                                                      |
| critical asset identity   | `/fonts/v2/gothic-a1-critical-{weight}.woff2`                            | 배포 후 덮어쓰기 금지                                                                    |
| CSS selection             | critical optional range + weight별 v1 residual swap range + family stack | 고정 glyph는 Critical에만 match하고 inventory 밖 지원 glyph는 동일 weight v1로 late swap |
| preload                   | critical 700/800/900 세 URL                                              | CSS `src`와 byte-for-byte 같은 URL                                                       |

React Query cache, auth state, API payload에는 font selection 정보를 저장하지 않는다. member 동적 문자열은 sanitize하거나 inventory에 기록하지 않으며 개인정보가 build artifact로 유입되지 않아야 한다.

## 4단계: UI, 접근성, 시각 검증

- markup, 문구, heading hierarchy, 색상, spacing, animation, focus order는 변경하지 않는다. UI 역할은 새 디자인을 만드는 대신 weight 400/700/800/900의 visual parity와 mixed-font glyph fallback을 검수한다.
- 대표 fixed text는 홈 header, Hero H1/설명/CTA, 분석 링크, SeoIntro 제목·문단·목록, recent loading/empty/error/data labels, BottomNav 네 label이다.
- 대표 dynamic text는 inventory에 없는 한글을 의도적으로 쓴 긴 nickname과 recent analysis title이다. 동일 node에서 fixed suffix `님`과 dynamic nickname이 섞여도 글자 누락, tofu, 잘못된 weight, 비정상 줄바꿈이 없어야 한다.
- 390×844와 412×823에서 guest/member, 0/1/3 recent items, auth delay/error를 캡처한다. 기존 full-font baseline과 pixel-level 차이는 anti-aliasing 허용 범위만 인정하며 line box, wrapping, element geometry와 CLS는 같아야 한다.
- font failure 상태에서도 text가 invisible하지 않아야 하고 CTA/BottomNav touch target, keyboard focus, screen reader name을 유지해야 한다.
- 800→700은 브랜드 굵기와 폭을 바꾸므로 별도 F2에서만 UI 승인을 받는다. F1의 visual diff에는 이 변화를 허용하지 않는다.

## 5단계: 성능, 운영, A/B와 배포

### A/B 순서와 중단 규칙

각 variant는 같은 B1 DOM 순서, production build, Chrome/Lighthouse 버전, viewport, throttling, GA 조건, guest/member fixture를 사용한다. variant 전환 시 사용자의 dirty worktree를 stash/reset/checkout하지 않고 isolated worktree 또는 `git archive`에 명시적 patch를 적용한다.

| 순서  | variant                                                   | 유일한 독립 변수             | 다음 단계 조건                                                        |
| ----- | --------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| P2-A0 | B1 + 기존 v1 full 700/900 preload                         | Phase 2 baseline 재측정      | artifact와 network waterfall 확보                                     |
| P2-F1 | critical 4 weights + v2 700/800/900 preload               | font delivery만 변경         | simulate/devtools와 glyph/network 기준 모두 충족하면 채택             |
| P2-F2 | F1 + 선택된 800 UI를 700으로 변경                         | weight consolidation만 변경  | F1이 부족하고 UI parity 승인 및 추가 유의 개선이 있을 때만 별도 승인  |
| P2-J1 | 채택된 font variant + HomeResetEffect store direct import | module graph/초기 JS만 변경  | F1 판정 완료 후, 실제 JS byte/module 감소와 LCP 개선이 있을 때만 채택 |
| P2-S1 | 공식 full-coverage sharding                               | font strategy만 F1 대신 교체 | F1이 유지보수/coverage/성능에서 실패한 경우에만 fallback 평가         |

F2와 J1을 동시에 실행하지 않는다. 각 실험은 직전 채택 baseline으로 돌아온 뒤 하나의 변수만 바꾸며, 단일 좋은 run이나 Lighthouse score만으로 채택하지 않는다.

### 모든 route의 glyph와 font network 검증

- route manifest의 모든 user-facing page를 guest 가능한 상태와 member 전용 상태로 순회한다. 최소 `/`, `/analysis`, `/group-type`, member setup, analysis result, `/history`, `/mypage`, auth routes, compatibility routes와 error/not-found UI를 포함한다.
- 각 route에서 `document.fonts.check()`와 computed `font-family/font-weight`를 수집하고, DOM의 visible text codepoint가 critical cmap, full v1 cmap 또는 platform fallback 중 어디에서 해결되는지 coverage report로 남긴다.
- Chrome Network에서 font URL, initiator, priority, encoded/decoded/transfer bytes, cache status를 보존한다. 동일 URL 중복 200, 404, MIME/CORS 오류, `?dpl=`, `/_next/static/media/*.woff2`, 외부 Google font 요청은 0건이어야 한다.
- guest 홈 cold는 v2 critical 요청만 허용하고 v1 Gothic A1은 0건이어야 한다. member/다른 route의 v1 request는 inventory 밖 실제 glyph와 exact weight로 설명 가능해야 하며, 필요하지 않은 네 weight 전부의 eager request는 실패다.
- CSS coverage로 네 critical face가 선언만으로 모두 요청되지 않는지 확인한다. preload는 700/800/900 정확히 3개이며, 400은 실제 usage가 있을 때만 요청돼야 한다.

### 측정 artifact 보존

`docs/performance/home-lcp/lighthouse/phase-2/<variant>/<mode>/<audience>/run-{1..5}.json`에 원본 Lighthouse JSON을 보존하고, 대응 trace/HAR 또는 DevTools export, screenshot, font coverage/network CSV, build/module graph, font input/output checksum manifest와 생성 command/tool version을 같은 Phase 2 artifact tree에 둔다. 대용량 trace가 저장소 정책상 commit 불가하면 checksum과 접근 가능한 영구 artifact URL을 measurements 문서에 기록하고 `/private/tmp` 경로만을 최종 근거로 남기지 않는다.

`docs/performance/home-lcp/measurements.md`에는 모든 run, 중앙값과 min/max, LCP node, FCP/TBT/CLS, total/font/JS transferred bytes, full v1 fallback 이유를 기록한다. `simulate`와 `devtools`, guest와 member, cold와 warm을 합산하지 않는다.

### acceptance criteria

- 핵심 목표: production build의 mobile cold Lighthouse `simulate` guest와 member 각각 5회 중앙값 LCP ≤ 2.5초.
- 현실 브라우저 보호 기준: 동일 build의 mobile cold Lighthouse `devtools` guest와 member 각각 5회 중앙값 LCP ≤ 2.5초이고, B1 baseline 대비 FCP/LCP가 10% 초과 악화되지 않는다.
- CLS ≤ 0.1, TBT ≤ 200ms이며 auth skeleton 완료나 font fallback 때문에 새로운 늦은 LCP candidate가 생기지 않는다.
- guest 홈 initial Gothic A1 transfer는 critical 700/800/900 preload 약 56KB와 실제 필요한 critical 400뿐이며 v1 full Gothic A1은 0B다. 실제 critical output은 각 weight 40KB 이하를 목표로 하되, byte 목표만으로 glyph/network 실패를 면제하지 않는다.
- member 홈과 전 route에서 visible glyph 누락/tofu 0, 잘못된 weight 0, unexpected wrap/geometry shift 0, font console error 0이다.
- inventory coverage test, deterministic regeneration/checksum test, 관련 UI/unit test, 전체 `npm test`, `npm run lint`, `npm run build`가 통과한다. 기존 dirty 변경에서 독립적으로 존재하는 실패는 격리된 approved-base build로 분리 기록한다.
- 배포 후 Speed Insights Production/Mobile P75 LCP ≤ 2.5초, CLS ≤ 0.1을 최소 7일 또는 충분한 표본까지 관찰한다. field와 synthetic 결과를 직접 합산하지 않는다.

### 장애와 rollback

1. F1에서 glyph, license, visual, build 또는 network 문제가 생기면 stack 선두의 `Gothic A1 Critical` faces와 v2 preload만 제거하고 v1 full 700/900 preload를 복원한다. v1 assets/fallback metrics는 계속 존재하므로 rollback이 단일 CSS/head 전환으로 가능하다.
2. 잘못 배포된 immutable v2 asset은 덮어쓰지 않는다. F1을 원복하거나 수정 asset을 v3 URL로 생성하고 CSS/preload/cache 규칙을 한 커밋에서 전환한다.
3. v2 orphan files는 즉시 삭제할 필요가 없으며, 참조 제거 후 별도 정리한다. 삭제가 필요해도 사용자 dirty 파일이나 v1 canonical input을 건드리지 않는다.
4. F2/J1 회귀는 해당 독립 hunk만 되돌린다. F1까지 함께 원복하지 않는다.
5. rollback 뒤 동일 guest/member `simulate`와 `devtools` 5회, route glyph sweep, Network 검사를 다시 수행해 baseline 복귀를 확인한다.

## Phase 2 파일별 구현 계획과 역할

| 파일                                                                       | 계획                                                                                                                  | 역할                |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `public/fonts/v2/gothic-a1-critical-{400,700,800,900}.woff2`               | v1 canonical inputs에서 동일 inventory로 만든 immutable physical subsets                                              | Frontend            |
| `scripts/fonts/home-critical-sources.txt`                                  | static home/layout UI의 명시적 source allowlist; 동적 fixture 제외                                                    | Frontend, Test 검토 |
| `scripts/fonts/home-critical-codepoints.txt`                               | 정렬된 canonical glyph/codepoint manifest                                                                             | Frontend, UI 검토   |
| `scripts/generate-home-critical-fonts.py`와 pinned tooling manifest        | inventory 추출, fonttools subset, cmap/range/checksum 검증을 재현 가능하게 자동화                                     | Frontend, Test      |
| `public/fonts/OFL-Gothic-A1.txt` 또는 저장소 표준 third-party license 위치 | Gothic A1 배포 라이선스와 source/version 출처 보존                                                                    | Frontend, Review    |
| `src/shared/styles/fonts.css`                                              | critical 4 faces의 동일 range와 v1 4 faces의 weight별 residual range, critical→full→metric stack; v1 파일/Nunito 보존 | Frontend, UI 검토   |
| `src/app/layout.tsx`                                                       | v1 700/900 preload를 동일 URL의 v2 critical 700/800/900 세 개로 교체                                                  | Frontend            |
| `next.config.ts`                                                           | `/fonts/v2/:path*`에 v1과 동일한 1년 immutable cache header 추가                                                      | Frontend            |
| `src/shared/styles/fonts.test.ts` 또는 동등한 font contract test           | source 문구 coverage, 네 cmap, CSS range/URL, preload/weight 계약, deterministic manifest 검사                        | Test                |
| route/browser font coverage harness                                        | guest/member 전 route visible glyph와 font request를 수집                                                             | Test                |
| `docs/performance/home-lcp/measurements.md`와 Phase 2 artifact tree        | A0/F1 및 승인된 후속 variant의 원본·요약·network 증거 기록                                                            | Test                |
| `src/views/home/home-reset-effect.tsx`                                     | 기본 F1은 무변경. J1에서만 store direct import를 독립 실험                                                            | Frontend, Review    |

Backend 작업은 없다. UI 역할은 typography visual parity를 승인하고, Frontend 역할은 font asset/CSS/head/cache와 생성 도구를 구현하며, Test 역할은 inventory·network·route·Lighthouse 검증과 artifact 보존을 담당한다. 구현 완료 뒤 `/review → /test → /ship` 순서를 유지한다.

## Phase 2 승인 게이트

승인이 필요한 핵심 결정은 다음 세 가지다.

1. 공식 297-face full sharding이 아니라, v1을 canonical input으로 한 4-weight `Gothic A1 Critical`을 `/fonts/v2`에 추가하는 F1을 먼저 구현한다.
2. 전역 stack을 `Critical → 기존 full Gothic A1 → metric fallback`으로 바꾸고 critical 700/800/900을 preload한다. 동적 문자는 v1 exact-weight fallback을 허용한다.
3. 800→700과 HomeResetEffect direct import는 F1에 섞지 않고, F1 결과가 나온 뒤 각각 독립 A/B와 별도 채택 판단을 거친다.

이 Phase 2 계획 승인 전에는 font asset, CSS, layout, cache config, 생성 script 또는 테스트 코드를 수정하지 않는다.

---

# Phase 3 — production CSS inline 단일 변경 설계

2026-09-16 · Phase 2 F1은 guest mobile cold `devtools` LCP와 CLS를 통과했지만 핵심 `simulate` 중앙값이 3.112초로 남았다. 아래 Phase 3는 승인된 B1/F1 상태를 고정하고 `next.config.ts`의 `experimental.inlineCss: true`만 추가하는 단일 변경 설계다. GA, J1 direct import, font asset/CSS/preload/weight 변경을 포함하지 않는다.

## Research 결론과 결정 근거

- F1 production trace에서 외부 CSS 응답 완료는 1511ms, `SeoIntro` LCP는 1627ms였다. 이 시간적 근접성과 CSS가 render-blocking resource라는 사실은 CSS request waterfall이 잔여 render delay의 유력 원인임을 지지한다. 시간 순서만으로 단독 인과를 확정하지 않고 격리 A/B 결과와 함께 판단한다.
- 동일 F1 후보에서 `experimental.inlineCss: true`만 적용한 production A/B는 guest cold Lighthouse `simulate` 5회 중앙값 LCP 1862ms, `devtools` 5회 중앙값 862ms, CLS 0을 기록했다. 두 mode 모두 2.5초 목표를 통과했고 외부 CSS 요청은 1건에서 0건으로 줄었다.
- 대신 CSS 약 32.4KB가 초기 HTML의 `<style>`과 RSC payload에 중복되어 document, RSC, 전체 전송량이 각각 약 32.4KB 증가했다. 외부 stylesheet의 독립 캐시 이점도 초기 문서에서는 사라진다. 따라서 이 변경은 무비용 최적화가 아니라 첫 방문의 round trip을 전송량과 재방문 cache 효율로 교환하는 선택이다.
- 설치된 Next.js 16.3.1 문서는 이 옵션을 `experimental`로 분류한다. 모든 기존 `<link>` 생성 위치를 초기 HTML의 `<style>`로 바꾸며, route별 설정은 불가능한 전역 옵션이다. CSS는 SSR `<style>`과 RSC payload에 중복되고, 프리렌더된 페이지로 client navigation할 때는 중복 방지를 위해 다시 `<link>`를 사용한다. 개발 모드에서는 동작하지 않고 production build에서만 동작한다.
- 이 프로젝트는 Tailwind CSS v4 기반 atomic CSS를 사용해 문서가 제시하는 적합 조건과 맞는다. 하지만 공통 CSS를 여러 route가 공유하고 반복 방문이 있는 서비스이므로, 홈 cold 수치뿐 아니라 full-route initial navigation, client navigation, 홈 복귀, HTTP cache 상태를 함께 검증해야 한다.
- 위 A/B는 구현을 진행할 충분한 근거지만 guest localhost 표본이다. 실제 회원 fixture, 모든 route, return navigation, 배포 후 field data가 아직 없으므로 `/ship` 합격을 미리 선언하지 않는다.

## 1단계: 요구사항과 사용자 상태

### 목표와 사용자 행동

- 신규 guest와 member의 production mobile cold `/` 진입에서 render-blocking 외부 CSS waterfall을 제거해 LCP 2.5초 이하를 유지한다.
- guest의 새 테스트 시작과 분석 링크, member의 최근 기록, 인증 전환, BottomNav, 모든 폼과 CTA가 기존과 동일하게 보여야 하고 동작해야 한다.
- 직접 URL 진입, 다른 route로의 client navigation, 브라우저 뒤로가기 또는 BottomNav로 홈 복귀, hard reload, warm reload를 모두 지원한다.
- 로그인·회원가입·그룹 유형·멤버 설정·분석·결과·기록·마이페이지·설정·오류/not-found 등 전 route의 CSS가 누락되거나 늦게 적용되지 않아야 한다.

### 상태와 엣지 케이스

```text
production navigation
├─ cold direct document
│  └─ route CSS가 document <style>과 RSC payload에 포함
├─ warm direct document
│  └─ CSS bytes를 document와 함께 다시 수신; 별도 stylesheet cache 이점 없음
├─ client navigation → prerendered route
│  └─ Next.js가 <link> stylesheet 사용; load/error/FOUC 검증
└─ return navigation → /
   ├─ router cache hit
   └─ router cache miss 또는 refresh
      둘 다 style 누락·중복 적용·layout shift 없이 동일 UI
```

- 느린 4G, high latency, document/RSC cache HIT/MISS, JavaScript disabled, CSS asset 404를 포함한다. 초기 document의 inline CSS가 있으므로 JS disabled에서도 direct route의 의미 있는 콘텐츠와 스타일은 유지돼야 한다.
- member 0/1/3 recent items, 긴 nickname과 dynamic font residual, auth pending/error/logout/account switch를 포함한다. Phase 3는 인증·React Query·Zustand·Supabase 상태를 바꾸지 않는다.
- 부정적 요구사항: GA 제거/지연, J1 direct import, 800→700, font preload/subset/range, UI 문구·DOM 순서, critical CSS 수작업 분리, route별 비공식 patch를 이번 variant에 섞지 않는다.

## 2단계: 아키텍처와 런타임 흐름

### 선택 구조

```text
next.config.ts
└─ experimental.inlineCss: true
   ├─ production initial document: CSS <link> → inline <style>
   ├─ RSC payload: 동일 CSS 포함(약 32.4KB 중복 비용)
   └─ prerendered client navigation: Next.js 관리 <link> 유지

Home/App/FSD source
└─ 변경 없음
   ├─ B1 DOM order 유지
   ├─ F1 font contract 유지
   ├─ Server/Client boundary 유지
   └─ auth/query/navigation lifecycle 유지
```

독립 변수는 `next.config.ts`의 `experimental.inlineCss: true` 한 줄뿐이다. 프레임워크가 build manifest와 RSC에서 CSS delivery를 관리하게 두며, layout에 수동 `<style>` 또는 stylesheet preload를 추가하지 않는다. 전역 옵션이므로 홈 최적화라 해도 모든 route의 initial HTML과 navigation path에 영향을 준다.

### A/B와 캐시 경계

- P3-A0는 현재 B1+F1 production build, P3-I1은 동일 source에 `experimental.inlineCss: true`만 추가한 build다. Node/Next/Chrome/Lighthouse 버전, GA 상태, font assets, URL, viewport, throttle, audience fixture를 고정한다.
- direct cold/warm navigation과 client navigation을 분리해 기록한다. cold 합격 수치와 warm/cache 수치를 합산하지 않는다.
- `/ → route → /` 복귀는 첫 document가 `/`인 경우와 다른 route인 경우를 모두 본다. 프리렌더 route의 `<link>` fallback, router cache hit/miss, `router.refresh()` 후에도 스타일 ownership이 깨지지 않아야 한다.
- Next.js minor/patch upgrade 시 실험 옵션의 schema, known limitation, generated HTML/RSC behavior를 설치 문서와 production smoke test로 다시 승인한다. 실험 API를 안정 API처럼 영구 가정하지 않는다.

## 3단계: 데이터, 캐시와 오류 계약

- 서버·클라이언트 데이터 모델, API, query key, auth session, React Query cache, Zustand store를 변경하지 않는다. CSS delivery는 UI data lifecycle의 성공/실패를 바꾸면 안 된다.
- HTTP cache 검증은 document, RSC/Flight, stylesheet를 분리한다. `Cache-Control`, transfer size, memory/disk cache 여부를 수집하고 inline variant에서 document/RSC가 약 32.4KB 증가하는지 확인한다.
- 동일 CSS가 `<style>`과 RSC에 들어가는 것은 문서화된 제한으로 허용하되, 예상한 1회분을 넘는 중복, client navigation마다 누적되는 style node, 같은 외부 stylesheet의 중복 200은 실패다.
- return navigation에서 cache된 RSC가 사용돼도 이전 route의 style이 잘못 남거나 목적 route의 style이 빠지면 안 된다. 브라우저 reload, back/forward cache 사용 여부와 router cache 경로를 결과에 기록한다.
- CSS/RSC/document 요청 실패는 기존 route error handling과 브라우저 기본 동작을 유지한다. Phase 3를 위해 새 retry state나 전역 client wrapper를 만들지 않는다.

## 4단계: UI, 접근성과 전 route 회귀

- markup, heading hierarchy, visible text, font family/weight, 색상, spacing, animation, responsive layout, focus order, accessible name은 변경하지 않는다. UI 역할은 코드 작성 대상이 아니라 rendering parity 검수 역할이다.
- mobile 390×844와 Lighthouse 412×823에서 guest/member 홈을 비교하고, desktop 대표 viewport에서도 mobile-only frame과 background가 깨지지 않는지 확인한다.
- route manifest의 모든 user-facing route를 direct load와 client navigation으로 순회한다. 각 route에서 unstyled flash, missing class, stale previous-route style, duplicate style, hydration mismatch, console error, invisible focus indicator를 검사한다.
- `/ → /group-type → /members → /`, `/ → /analysis → /`, `/login ↔ /signup`, member `/ → /history → /mypage → /`를 최소 navigation chain으로 삼는다. compatibility redirect, error boundary, not-found도 direct load로 확인한다.
- 홈에서는 단일 H1, CTA 44px target, BottomNav, SeoIntro, recent loading/empty/data/error의 geometry와 CLS를 유지한다. F1의 dynamic residual font probe도 재실행해 inline CSS가 `@font-face` 선택과 font network를 바꾸지 않는지 확인한다.

## 5단계: 성능, 장애와 운영

### 검증 순서

1. P3-A0와 P3-I1을 사용자 worktree 밖의 격리된 production build로 만들고 build ID, source SHA, 유일한 config diff를 기록한다. dev server는 합격 근거로 사용하지 않는다.
2. guest와 member 각각 cold `simulate`/`devtools` 5회를 측정한다. 동일 테스트 계정과 recent 0개 또는 고정 3개 fixture를 사용하고, 인증 fixture가 없으면 member 미검증을 명시해 ship을 보류한다.
3. 각 mode에서 LCP node/timestamp, FCP, CLS, TBT, TTFB, document/RSC/CSS/JS/font/total bytes, request count와 waterfall을 추출한다. `simulate`와 `devtools`, guest와 member를 합산하지 않는다.
4. 모든 route의 cold direct 1회 이상과 핵심 route 3회, warm reload, client navigation/return chain을 실행한다. 외부 CSS 수, style/link node, cache status, screenshot, console/hydration error를 수집한다.
5. 배포 preview에서 같은 smoke/performance subset을 재실행하고, production 배포 뒤 Speed Insights mobile field data를 최소 7일 또는 충분한 표본까지 관찰한다.

### acceptance criteria

- production mobile cold Lighthouse `simulate` guest와 member 각각 5회 중앙값 LCP ≤ 2.5초. `devtools`도 각각 5회 중앙값 ≤ 2.5초다.
- P3-I1의 CLS ≤ 0.1, TBT ≤ 200ms이며 P3-A0 대비 TTFB/FCP/LCP 중 어느 것도 반복 series 중앙값 기준 10% 초과 악화되지 않는다.
- guest preliminary 재현 목표는 `simulate` 중앙값 약 1862ms, `devtools` 약 862ms, CLS 0이다. 이 숫자는 환경 변동을 허용하는 참고치이며 위 절대 기준과 A0 회귀 기준이 최종 판정이다.
- initial direct navigation에서 render-blocking 외부 app CSS는 1→0이어야 한다. 프리렌더 client navigation의 framework-managed `<link>`는 문서화된 정상 동작이므로 실패로 세지 않는다.
- document/RSC/total의 약 32.4KB 증가는 조사치 범위의 의도된 비용이다. 실제 증가가 build CSS 크기와 설명되지 않거나 중복이 누적되면 실패다. warm/return path가 A0보다 10% 초과 반복 악화되거나 사용자 체감 FOUC가 있으면 cold 통과와 무관하게 미채택한다.
- 전 route direct/client/return 검증에서 style 누락·오염·FOUC·hydration/console error 0, 홈/핵심 route CLS ≤ 0.1, 접근성/기능 회귀 0이다.
- 관련 테스트, 전체 `npm test`, `npm run lint`, `npm run build -- --webpack`이 통과한다. Next build output에서 `/`의 rendering classification이 의도치 않게 변하지 않아야 한다.
- 배포 후 Speed Insights Production/Mobile P75 LCP ≤ 2.5초, CLS ≤ 0.1을 관찰한다. synthetic와 field 수치는 합산하지 않는다.

### artifact 보존

- `docs/performance/home-lcp/lighthouse/phase-3/{a0,i1}/{simulate,devtools}/{guest,member}/run-{1..5}.json`에 LHR을 보존하고 trace/DevTools log 또는 checksum과 영구 artifact 위치를 함께 남긴다.
- `phase-3/{a0,i1}/network/`에 initial/warm/return route별 HAR 또는 request summary, document/RSC/CSS bytes, cache status, style/link node count를 저장한다. route matrix, navigation chain, screenshots, console 결과도 같은 tree에 보존한다.
- `docs/performance/home-lcp/measurements.md`에는 build SHA/ID, 환경, 모든 run, 중앙값과 min/max, LCP node, external CSS 1→0, 약 32.4KB 전송량 trade-off, guest/member 미검증 여부와 최종 채택 판정을 추가한다.
- 원본이 저장소 용량 정책을 넘으면 삭제하지 말고 SHA-256과 접근 가능한 영구 artifact URL을 남긴다. `/private/tmp` 경로만을 최종 근거로 사용하지 않는다.

### 장애와 rollback

1. build 실패, 전 route style 회귀, warm/return 성능 악화, experimental 동작 변경, acceptance 실패가 발생하면 `next.config.ts`의 `experimental.inlineCss`만 제거한다.
2. rollback은 B1 DOM과 F1 font 변경을 보존하며 GA/J1/font 설정을 함께 되돌리지 않는다. 이 구분을 위해 Phase 3는 독립 commit/hunk로 유지한다.
3. rollback production build에서 외부 CSS 요청이 1건으로 복귀하고 A0의 direct/client/return style, guest/member 성능, cache 동작이 재현되는지 확인한다.
4. Next.js upgrade가 원인이면 옵션을 꺼 둔 상태로 ship하고, 새 버전 설치 문서와 isolated A/B가 확보된 뒤 별도 Phase로 재평가한다.

## Phase 3 파일별 구현 계획과 역할

| 파일/산출물 | 계획 | 역할 |
|---|---|---|
| `next.config.ts` | 기존 `experimental` 객체에 `inlineCss: true`만 추가. 다른 option/header 변경 없음 | Frontend |
| `docs/performance/home-lcp/measurements.md` | P3-A0/I1 수치, bytes/cache/navigation 회귀와 최종 판정 기록 | Test |
| `docs/performance/home-lcp/lighthouse/phase-3/` | LHR, trace/checksum, network/cache, route matrix, screenshot 보존 | Test |
| 전 route production browser harness 또는 기존 검증 절차 | direct/warm/client/return, guest/member, style/link/console/CLS 회귀 검증 | Test |

UI, Backend, Supabase 구현 파일은 변경하지 않는다. UI 역할은 전 route visual/accessibility parity를 검수하고, Frontend 역할은 승인 뒤 단일 config 변경만 구현한다. Test 역할은 production-only 동작, full-route/return navigation/cache/member 회귀와 artifact를 담당한다. 이후 `/review → /test → /ship` 순서를 유지한다.

## Phase 3 승인 판정

**구현 진행 승인 권고**. 격리 guest A/B에서 유일한 독립 변수로 핵심 `simulate`와 `devtools` 목표를 모두 통과했고, trace의 외부 CSS 완료 시점 및 요청 1→0이 동작 원리와 일치한다. 다만 전역 experimental 옵션과 약 32.4KB 중복 전송 비용 때문에, 승인 범위는 `next.config.ts` 단일 변경과 위 회귀 검증까지다. member 또는 full-route/return/cache 기준이 하나라도 실패하면 채택·ship하지 않고 즉시 단일 옵션을 rollback한다.
