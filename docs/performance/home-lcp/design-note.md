# 홈 LCP 개선 설계

2026-09-08 · 사용자 구현 승인 후 홈 렌더링 경계 구현 완료. Review·Test·프로덕션 성능 검증 대기.

## Research: 사실과 한계

- `src/app/(main)/page.tsx`는 인증을 await한 뒤 HomeView와 JSON-LD를 반환한다. 공개 Hero/소개도 페이지의 인증 대기를 받는다.
- HomeView는 Server Component다. HomeHeader/RecentTestsSection은 userId를 받아 클라이언트 React Query로 조회한다.
- `next.config.ts`의 `cacheComponents: true`가 활성화돼 있다. 설치된 Next 문서는 runtime 접근을 Suspense 안으로 내려 정적 shell과 분리하도록 설명한다.
- `src/proxy.ts`의 공개 `/`도 세션 갱신 과정에서 getClaims를 기다린다. 아래 변경은 페이지 인증 경계를 개선하며 proxy/TTFB까지 없애지 않는다.
- 사용자 측정 75점/LCP 6.1초의 보고서·실제 LCP 요소·배포 SHA·측정 mode는 아직 없다. 인증 await가 전체 6.1초를 설명한다고 단정하지 않는다.
- 과거 `docs/design/plan.md`의 홈 prefetch 계획 및 `src/features/home/design-note.md`의 인증 컨테이너/정적 소개 설명은 현재 코드와 다르다. 이번 문서가 홈 렌더링 경계의 새 설계이며 구현 시 기존 문서 해당 부분을 갱신한다.
- 근거: `.claude/agents/frontend.md` §0, `docs/design/requirements.md` §4.3, query-keys.ts, 설치 Next 문서 `01-app/03-api-reference/03-file-conventions/loading.md`, `01-app/01-getting-started/05-server-and-client-components.md`, `06-fetching-data.md`.

## 1. 요구사항과 사용자 행동

공개 Hero·소개는 페이지 인증 및 개인 API 응답 전에 초기 서버 HTML에 포함한다. 로그인/비로그인 모두 테스트 시작 링크와 하단 메뉴를 사용할 수 있어야 한다. 회원의 닉네임, MBTI 설정 안내, 최근 결과 열기, 오류 재시도를 유지한다. 개인 정보는 인증된 사용자에게만 표시한다.

상태는 공개 본문 표시와 별개로 인증 대기 → 비로그인 또는 회원 데이터 조회 → 성공/빈 데이터/실패로 나눈다. 캐시가 있는 백그라운드 조회 중에는 기존 데이터를 유지한다. 새로운 입력·폼·데이터 모델은 없다.

HomeResetEffect는 hydration에서 테스트 store를 초기화한다. 공개 CTA가 빨리 표시되면서 빠른 클릭과 reset이 경쟁할 수 있으므로 홈 재방문, 즉시 CTA 클릭, 뒤로가기, 멤버 draft, 결과 저장 후 홈 복귀를 검증한다. reset 시점을 임의로 바꾸지 않는다.

## 2. 런타임 흐름과 선택

```text
HomePage (동기, metadata/JSON-LD 유지)
└─ HomeView (동기 Server Component)
   ├─ Suspense: 고정 높이 헤더 fallback
   │  └─ HomeHeaderContainer: 서버 인증 await → 기존 HomeHeader
   ├─ HeroCard: 공개 서버 HTML /group-type Link
   ├─ HomeResetEffect: 기존 효과
   ├─ Suspense: 인증 대기 fallback null
   │  └─ RecentTestsContainer: 서버 인증 await → 회원만 RecentTestsSection
   └─ SeoIntro: 공개 서버 HTML
```

컨테이너는 `views/home` 내부에 두고 기존 요청 단위 React cache의 getAuthenticatedClient를 공유한다. page/HomeView에서 인증을 먼저 await하지 않는다. 인증을 공유 전역 캐시에 넣거나 runtime cookies를 `use cache` 안에 넣지 않는다. 개인 데이터의 서버 prefetch/HydrationBoundary를 복원하지 않는다.

| 대안 | 효과와 비용 | 결정 |
|---|---|---|
| 서버 인증을 부분 Suspense로 이동 | 기존 userId/인증 계약 유지. 공개 shell 분리. 개인 데이터는 인증 후 hydration/React Query 대기 | 1차 권장 |
| 클라이언트 auth hook으로 이전 | 홈 runtime 인증 의존 감소 가능. 브라우저 인증 확정 지연과 기존 cache sync 정합성 추가 검토 필요 | 1차 제외 |
| 개인 데이터 서버 prefetch 복구 | 개인 콘텐츠 초기 표시 개선 가능. 캐시가 있어도 서버 요청/복잡도 증가 | 필요성이 실측될 때 별도 비교 |

proxy, 보호된 라우트, 인증 검증, RLS는 유지한다. 컴포넌트의 Suspense는 proxy를 우회하지 않는다. 루트 Client Provider가 children을 받는 것 자체는 모든 자손을 CSR로 바꾸지 않는다.

## 3. 데이터·캐시·오류

- 기존 profile/analyses query options, 사용자 ID별 query key, `staleTime: Infinity`, mutation invalidation, AuthQueryCacheSync를 유지한다. 새 auth store/API/DB 변경은 없다.
- 캐시가 없는 실제 조회 중에만 skeleton을 표시하는 기존 요구사항을 보존한다. 홈 재방문을 무조건 서버 prefetch로 돌리지 않는다.
- 인증 null은 비로그인 정상 상태다. 인증 helper의 오류 계약을 Backend가 확인하고 네트워크 실패와 정상 비로그인을 구분한다. 공용 helper 변경은 별도 영향 검토 대상이다.
- 예상 가능한 인증 실패는 개인 영역의 오류/재시도로 제한한다. Suspense는 오류 경계가 아니므로 서버 컨테이너의 결과 분기와 필요 시 홈 전용 client retry(`router.refresh`)를 사용한다. 프레임워크 redirect까지 무차별 catch하지 않는다.
- 기존 프로필/기록 query 오류는 섹션별 재시도와 캐시 데이터 유지로 처리한다. 개인 API 장애 때문에 공개 본문을 전체 페이지 오류로 대체하지 않는다.

## 4. UI·레이아웃·접근성

헤더 → Hero → 최근 기록 → 소개 순서를 유지한다. 헤더 fallback/성공/오류는 최소 52px 영역을 확보하고 긴 닉네임 줄바꿈을 확인한다. Hero 크기·문구·CSS 도형·링크·focus-visible을 보존한다.

인증 전 최근 기록 fallback은 null로 하고 비로그인 사용자에게 거대한 카드 공간을 예약하지 않는다. 회원 인증 후 skeleton 및 실제 0/1/3개 카드가 들어오면 SeoIntro가 밀릴 수 있다. Hero 위치는 고정하고 회원/비회원 모바일 trace에서 CLS와 LCP 후보 변경을 확인한다. CLS 기준 초과 시 영역 예약/전환 설계를 보완한다. SeoIntro를 최근 기록 위로 이동하는 방안은 별도 UI 승인 대상으로 기본안에 포함하지 않는다.

Skeleton aria-hidden, 조회 영역 aria-busy, 오류 role=alert, 재시도 최소 44px 터치 영역을 유지한다. MBTI 바텀시트 lazy loading·초점·상태 보존 정책은 그대로 둔다. 새 폼/Activity 대상은 없다.

## 5. 성능·장애·운영

### 전후 측정

1. 변경 전 실제 배포와 변경 후 production build 배포의 URL/SHA, Chrome/Lighthouse 버전, 모바일 viewport, CPU/네트워크 설정, throttling mode, 로그인 상태, 확장 프로그램 사용 조건을 기록한다. 각 build의 동일 URL·페이지 상태로 반복한다. dev server 점수는 합격 근거가 아니다.
2. 동일 mode 모바일 cold navigation 각 5회의 중앙값과 범위를 비교한다. 브라우저 캐시/스토리지 초기화 조건 및 CDN HIT/MISS를 기록한다. 회원은 같은 계정·기록 수와 인증 쿠키 조건으로 별도 측정한다.
3. 과거 88점 보고서가 있으면 같은 조건을 재현한다. 없으면 새 baseline을 만들며 88점과 직접 개선율을 계산하지 않는다. Simulated/DevTools 수치를 섞지 않는다.
4. JSON/HTML 및 trace를 저장하고 실제 LCP 요소, TTFB, 적용 가능한 resource load delay/duration, element render delay를 기록한다. 텍스트 LCP에 이미지 단계를 억지로 적용하지 않는다. FCP/TBT/CLS, 폰트·전송량, JS long task도 비교한다.
5. 페이지 인증 지연 시 Hero/소개가 초기 shell에 있는지, Hero가 화면에 먼저 보이는지 검증한다. 완성 응답에 문자열이 있다는 사실만으로 합격시키지 않고 hidden stream 영역과 초기 visible 영역을 구분한다. proxy 지연은 별도 TTFB로 구분한다.

### 목표와 합격 조건

- 구조 필수: 공개 본문이 페이지 인증/개인 조회 완료 전에 초기 shell에 포함되고 Hero가 먼저 표시된다.
- 목표: 동일 조건 5회 중앙값 LCP ≤ 2.5초, CLS ≤ 0.1, Lighthouse 성능 ≥ 88점(과거 보고서 조건 일치 시), 90점 이상은 추가 목표. 과거 보고서가 없으면 새 baseline 대비 개선을 평가한다. 점수는 목표이며 렌더링 변경만으로 달성을 보장하지 않는다.
- FCP/TBT/CLS에 측정 변동 범위를 넘는 반복적 악화가 없어야 한다. CLS > 0.1이면 레이아웃 문제를 해결하고 다시 검증한다.
- 비로그인·회원·프로필 없음·기록 0/1/3건·API 실패·유효/만료/없는 세션 쿠키·A 로그아웃 후 B 로그인에서 정보 혼입과 기능 회귀가 없어야 한다.
- 기존 home-view 테스트는 userId prop 가정에서 컨테이너 경계 검증으로 조정한다. 지연 인증 shell 검증 및 빠른 CTA/HomeResetEffect 경쟁은 실제 행동 테스트로 확인한다. 구현을 그대로 복제하는 단순 snapshot 테스트는 추가하지 않는다.
- 홈 재방문 캐시, MBTI 설정 안내, 최근 결과, draft 및 저장 흐름을 검증한다. Lighthouse TBT와 실제 사용자 INP를 동일 지표로 취급하지 않는다.

목표 미달이면 trace가 가리키는 병목만 2차 범위로 잡는다. 폰트 전송/텍스트 지연이면 preload·서브셋, JS long task이면 hydration/analytics, TTFB이면 proxy/인증을 별도로 검토한다. 폰트·계측·인증 구조를 이번 변경에 한꺼번에 묶지 않는다.

## 변경 파일·역할·진행 순서

| 대상 | 예정 작업 | 역할 |
|---|---|---|
| `src/app/(main)/page.tsx` | 상위 await 제거, 동기 view 렌더 | Frontend |
| `src/views/home/home-view.tsx` | 부분 Suspense 조합 | Frontend |
| `src/views/home/home-header-container.tsx` 신규 | 헤더 서버 인증 경계 | Backend |
| `src/views/home/recent-tests-container.tsx` 신규 | 회원 기록 서버 인증 경계 | Backend |
| `src/views/home/types.ts` | userId 계약 제거, 수정 props는 컴포넌트 내 정의 규칙 반영 | Frontend |
| 홈 header fallbacks 및 필요 시 홈 오류 UI | 높이/재시도/접근성 | UI |
| 기존 홈 테스트 및 행동 검증 | 지연·오류·인증·빠른 이동 회귀 검증 | Test |
| `src/features/home/design-note.md`, 본 문서와 측정 산출물 | 오래된 렌더링 설명 갱신 및 결과 기록 | Frontend/Test |

HomeHeader/RecentTestsSection/HeroCard/SeoIntro/HomeResetEffect 및 캐시 인프라는 보존·검증 대상이다. 필요성이 없으면 수정하지 않는다. 현재 proxy 및 분석/멤버/결과의 미커밋 변경을 덮어쓰거나 함께 커밋하지 않는다.

사용자의 실행 승인에 따라 역할 에이전트가 구현했다. Review → Test → Ship 지침에 따라 후속 검증을 진행한다. 성능 목표 달성 여부는 아직 측정하지 않았다. 홈 검증 후 history/mypage/group-type은 보호된 페이지 특성에 맞춰 별도 설계한다.
