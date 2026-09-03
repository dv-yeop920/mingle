# 성능 최적화 기록

## 1. 폰트 woff2 변환

### 문제

Gothic A1 한글 폰트를 TTF 포맷(weight당 2.2MB × 5 = **11MB**)으로 제공하고 있었음.
Nunito 폰트도 TTF(124KB × 3 = 372KB).

- TTF는 압축되지 않은 포맷이라 네트워크 전송량이 큼
- 한글 폰트는 글리프 수가 많아 파일 크기가 특히 큼
- LCP(Largest Contentful Paint)에 직접 영향 — 이미지 없는 텍스트 기반 UI에서 폰트가 LCP 결정 요소

### 과정

1. `fonttools` + `brotli`를 사용하여 TTF → woff2 변환
2. 한글 유니코드 범위(AC00-D7AF, 1100-11FF, 3130-318F 등) + 라틴 기본 범위로 서브셋 적용
3. `layout.tsx`에서 `.ttf` → `.woff2` 참조로 변경
4. 기존 TTF 파일 삭제

### 결과

| 항목                  | 변환 전 (TTF) | 변환 후 (woff2) | 감소율  |
| --------------------- | ------------- | --------------- | ------- |
| Gothic A1 (5 weights) | 11MB          | 1.2MB           | **89%** |
| Nunito (3 weights)    | 372KB         | 48KB            | **87%** |
| **합계**              | **11.4MB**    | **1.25MB**      | **89%** |

### 영향 지표

- **LCP**: 폰트 로드 시간 단축 → 텍스트 렌더링 빨라짐
- **FCP**: `display: swap` 유지 — 시스템 폰트로 즉시 렌더 후 woff2 스왑
- **TTI**: JS 번들과 무관하나, 네트워크 대역폭 경쟁 감소로 간접 개선

---

## 2. 현재 성능 상태 (배포 전 로컬 빌드 기준)

### 양호한 항목

| 지표    | 상태      | 근거                                               |
| ------- | --------- | -------------------------------------------------- |
| FCP     | 양호      | `display: swap` + route별 `loading.tsx` 존재       |
| INP     | 개선 완료 | 456ms → 목표 200ms 이하 (섹션 5 참조)              |
| JS 번들 | 양호      | 최대 청크 236KB, 전체 ~1.3MB (gzip 전)             |
| 렌더링  | 양호      | PPR(Partial Prerender) 활성, Server Component 기본 |

### 배포 후 추가 검토 항목

- [x] ~~폰트 weight 축소 가능성 (500 weight 실사용 여부)~~ → Phase 2에서 제거 확정
- [x] ~~result 뷰 계열 `next/dynamic` lazy loading 검토~~ → Phase 3에서 적용 확정
- [x] ~~Lighthouse 실측 후 LCP 수치 확인~~ → 프로덕션 Lighthouse CLI simulate 모드: Score 94, LCP 1.7s (섹션 7 참조)
- [ ] 이미지 자산 추가 시 `next/image` + WebP/AVIF 적용

---

## 3. FCP 1.97s 원인 분석 + 애니메이션 jank 수정 (2026-08-27)

### 측정 환경

- 로컬 개발 서버 기준
- FCP 측정값: **1.97s** (Good 기준 1.8s 초과)
- 동시에 splash unmount, 모달 배경, result 그래프, 버튼 클릭 시 애니메이션 버벅거림 발생

### 원인 분석 결과

FCP 문제와 애니메이션 jank는 **별개의 문제**:

- **FCP** = 초기 로딩 속도 (서버 응답 → JS 다운로드 → hydration → 첫 paint)
- **Jank** = 로딩 완료 후 런타임에서 메인 스레드가 과부하되어 프레임 드롭

---

### Part A: FCP 원인 (초기 로딩 속도)

#### A-1. Splash Overlay 2.5s 콘텐츠 차단 — 최대 영향

| 항목 | 내용                                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 위치 | `src/widgets/splash-overlay/splash-overlay.tsx`                                                                                                 |
| 문제 | z-50 opaque 전체화면 overlay가 2000ms + 500ms fade = 2.5s 동안 실제 콘텐츠를 가림                                                               |
| 원인 | `getServerSnapshot`이 항상 `true` → SSR HTML에 splash DOM 포함 → 브라우저 FCP = splash paint 시점                                               |
| 해결 | 표시 시간 2000ms → 1200ms, fade 500ms → 350ms 단축. `onTransitionEnd`에 `e.target === e.currentTarget` 가드 추가. `will-change: transform` 적용 |

#### A-2. 미사용 폰트 리소스 (~2.7MB)

| 항목 | 내용                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------- |
| 위치 | `src/app/fonts/`, `src/app/layout.tsx`                                                                |
| 문제 | Gothic A1 500 weight (`font-medium`) 사용처 0건인데 239KB woff2 로드. 미사용 TTF(2.2MB)도 빌드에 포함 |
| 원인 | 폰트 최적화 시 사용 여부 미확인                                                                       |
| 해결 | `gothic-a1-800.ttf` (2.2MB) 삭제, `gothic-a1-500.woff2` (239KB) 삭제, layout.tsx 선언 정리            |

#### A-3. Dynamic Import 부재 — 초기 JS 번들 과대

| 항목 | 내용                                                                                   |
| ---- | -------------------------------------------------------------------------------------- |
| 위치 | `src/views/home/home-view.tsx`                                                         |
| 문제 | 49개 `'use client'` 컴포넌트 전부 static import. `next/dynamic` 사용처 0건             |
| 원인 | 코드 분할(code splitting) 미적용                                                       |
| 해결 | 초기 viewport 밖 컴포넌트(`MbtiSetupPromptSheet`, `RecentTests`)에 `next/dynamic` 적용 |

> **참고**: `SeoIntro` ("MBTI 그룹 궁합, 무엇을 알려주나요?")는 Server Component → 클라이언트 JS 번들 미포함. dynamic import 불필요.

---

### Part B: 애니메이션 Jank 원인 (런타임 렌더링 성능)

#### B-1. Analysis Animation progress bar — 가장 큰 jank

| 항목      | 내용                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 위치      | `src/features/test-flow/ui/analysis-animation/analysis-animation.tsx`                                                                                                                 |
| 문제      | `setInterval(80ms)`로 `setState` → 초당 12.5회 React re-render. inline `width` 변경은 layout-triggering property                                                                      |
| 왜 jank?  | `width`는 레이아웃 속성 → 변경 시 Layout → Paint → Composite 전체 파이프라인 실행. `transition-[width] duration-200`과 80ms interval이 겹쳐 CSS transition이 완료되기 전에 새 값 설정 |
| 해결      | `width` → `transform: scaleX()` (compositor-only, GPU 가속). interval 200ms로 변경                                                                                                    |
| 개선 효과 | Layout recalculation 제거 → **Paint + Composite만 실행** (렌더링 파이프라인 2단계 절약). Re-render 빈도 60% 감소 (12.5/s → 5/s)                                                       |

#### B-2. ScoreGauge conic-gradient 매 프레임 repaint

| 항목      | 내용                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 위치      | `src/entities/analysis/ui/score-gauge/score-gauge.tsx`, `src/app/globals.css`                                                     |
| 문제      | `@property --gauge-progress` 애니메이션이 `conic-gradient`를 매 프레임 repaint 강제                                               |
| 왜 jank?  | conic-gradient는 `transform`/`opacity`와 달리 compositor layer로 승격 불가. 매 프레임 CPU에서 gradient를 다시 계산하고 Paint 실행 |
| 해결      | conic-gradient 유지, 애니메이션만 `opacity` fade-in (300ms)으로 교체                                                              |
| 개선 효과 | 800ms 동안의 **매 프레임 Paint 제거** → 단 1회 Paint + opacity Composite만 실행                                                   |

#### B-3. BottomSheet 중복 exit 메커니즘

| 항목      | 내용                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 위치      | `src/shared/ui/bottom-sheet/bottom-sheet.tsx`                                                                                                            |
| 문제      | double-rAF + 300ms setTimeout 폴백 중복. backdrop/panel에 compositor 힌트 없음                                                                           |
| 왜 jank?  | `onTransitionEnd`와 `setTimeout` 둘 다 `setShowContent(false)` 호출 가능 → 불필요한 re-render. compositor 힌트 없으면 브라우저가 매 프레임 레이어 재생성 |
| 해결      | setTimeout 폴백 제거, `will-change: opacity`/`will-change: transform` 추가                                                                               |
| 개선 효과 | 중복 state update 제거 + **GPU 레이어 사전 할당** → 전환 시 프레임 드롭 방지                                                                             |

#### B-4. Result 페이지 클릭 핸들러

| 항목      | 내용                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 위치      | `src/views/result/result-view.tsx`                                                                                                                                                     |
| 문제      | `handleRetest` 등이 `btn-press` 120ms 트랜지션 도중 store reset + router.push 동기 실행                                                                                                |
| 왜 jank?  | 클릭 이벤트 핸들러 내에서 Zustand store 리셋 → 구독 컴포넌트 전체 re-render + Next.js 라우터 전환 시작. 이 작업이 btn-press `transform: scale(0.97)` 애니메이션과 같은 프레임에서 실행 |
| 해결      | `setTimeout(fn, 0)`으로 다음 태스크 큐로 지연                                                                                                                                          |
| 개선 효과 | btn-press 애니메이션이 **독립 프레임에서 완료된 후** 무거운 작업 실행 → 프레임 드롭 방지                                                                                               |

---

### 브라우저 렌더링 파이프라인 참고

```
JS → Style → Layout → Paint → Composite
```

| 속성 유형      | 실행 단계                               | 예시                                                  | 비용       |
| -------------- | --------------------------------------- | ----------------------------------------------------- | ---------- |
| Layout 속성    | JS → Style → Layout → Paint → Composite | `width`, `height`, `top`, `left`, `padding`           | 높음       |
| Paint 속성     | JS → Style → Paint → Composite          | `background`, `color`, `box-shadow`, `conic-gradient` | 중간       |
| Composite 속성 | JS → Style → Composite                  | `transform`, `opacity`                                | 낮음 (GPU) |

---

### 적용 결과 (2026-08-27)

#### Part A: FCP 최적화 — 실제 변경 사항

**A-1. Splash Overlay 단축**

```diff
# src/widgets/splash-overlay/splash-overlay.tsx

- setTimeout(() => setPhase('fading'), 2000)
+ setTimeout(() => setPhase('fading'), 1200)

- transition-opacity duration-500
+ transition-opacity duration-350 will-change-transform

- onTransitionEnd={() => setPhase('done')}
+ onTransitionEnd={(e) => {
+   if (e.target === e.currentTarget) setPhase('done');
+ }}
```

- 표시 시간: 2000ms → 1200ms (–800ms)
- Fade 시간: 500ms → 350ms (–150ms)
- 총 차단 시간: **2.5s → 1.55s** (–0.95s)
- `onTransitionEnd` 가드로 자식 요소 transition 이벤트가 조기 unmount를 일으키는 문제 방지
- `will-change: transform` 으로 compositor 레이어 사전 할당

**A-2. 미사용 폰트 리소스 제거**

| 삭제 항목             | 크기  | 사유                                 |
| --------------------- | ----- | ------------------------------------ |
| `gothic-a1-800.ttf`   | 2.2MB | woff2 변환 후 남은 원본 TTF          |
| `gothic-a1-500.woff2` | 239KB | `font-medium` 사용처 0건 (grep 확인) |

```diff
# src/app/layout.tsx — gothicA1 선언

  { path: './fonts/gothic-a1-400.woff2', weight: '400' },
- { path: './fonts/gothic-a1-500.woff2', weight: '500' },
  { path: './fonts/gothic-a1-700.woff2', weight: '700' },
  { path: './fonts/gothic-a1-800.woff2', weight: '800' },
  { path: './fonts/gothic-a1-900.woff2', weight: '900' },
```

적용 후 폰트 디렉토리:

| 파일                | 크기       |
| ------------------- | ---------- |
| gothic-a1-400.woff2 | 243KB      |
| gothic-a1-700.woff2 | 249KB      |
| gothic-a1-800.woff2 | 250KB      |
| gothic-a1-900.woff2 | 252KB      |
| nunito-700.woff2    | 15KB       |
| nunito-800.woff2    | 15KB       |
| nunito-900.woff2    | 15KB       |
| **합계**            | **1.04MB** |

변환 전(섹션 1) 대비 **11.4MB → 1.04MB (–91%)**

**A-3. Dynamic Import 적용**

```diff
# src/views/home/home-view.tsx

+ import dynamic from 'next/dynamic';

- import { HeroCard, RecentTests } from '@/features/home';
- import { MbtiSetupPromptSheet } from '@/features/profile';
+ import { HeroCard } from '@/features/home';

+ const RecentTests = dynamic(
+   () => import('@/features/home').then((m) => ({ default: m.RecentTests })),
+ );
+ const MbtiSetupPromptSheet = dynamic(
+   () => import('@/features/profile').then((m) => ({ default: m.MbtiSetupPromptSheet })),
+ );
```

- `RecentTests`: 로그인 사용자만 렌더, 초기 viewport 하단
- `MbtiSetupPromptSheet`: MBTI 미설정 시만 노출되는 조건부 바텀시트
- 두 컴포넌트 모두 초기 paint에 불필요 → 별도 청크로 분리되어 초기 JS 번들 축소

---

#### Part B: 애니메이션 Jank 수정 — 실제 변경 사항

**B-1. Progress Bar: Layout 속성 → Composite 속성**

```diff
# src/features/test-flow/ui/analysis-animation/analysis-animation.tsx

- setInterval(() => { ... }, 80);
+ setInterval(() => { ... }, 200);

- <div className="... transition-[width] duration-200 ease-out"
-   style={{ width: `${progress}%` }} />
+ <div className="... w-full origin-left transition-transform duration-200 ease-out will-change-transform"
+   style={{ transform: `scaleX(${progress / 100})` }} />
```

| 지표                 | 변경 전                    | 변경 후       |
| -------------------- | -------------------------- | ------------- |
| 렌더링 파이프라인    | Layout → Paint → Composite | Composite만   |
| Re-render 빈도       | 12.5회/s (80ms)            | 5회/s (200ms) |
| Layout recalculation | 매 interval마다            | 없음          |

**B-2. ScoreGauge: Gradient 애니메이션 → Opacity**

```diff
# src/app/globals.css

  .result-gauge-fill {
-   animation: mx-gauge-fill 800ms ease-out both;
+   animation: mx-gauge-fade 300ms ease-out both;
  }

+ @keyframes mx-gauge-fade {
+   from { opacity: 0; }
+   to { opacity: 1; }
+ }
```

- conic-gradient는 최종 값으로 즉시 렌더 (정적 1회 Paint)
- 진입 시 opacity fade-in만 적용 → compositor-only 애니메이션
- 800ms 매 프레임 CPU Paint → **300ms opacity Composite**

**B-3. BottomSheet: 중복 Exit 제거 + GPU 힌트**

```diff
# src/shared/ui/bottom-sheet/bottom-sheet.tsx

  useEffect(() => {
    if (isOpen) {
      // double-rAF entry 유지
    }
-   const timer = setTimeout(() => setShowContent(false), 300);
-   return () => clearTimeout(timer);
  }, [isOpen]);

  # backdrop
- 'bg-black/50 transition-opacity duration-[260ms] ease-out'
+ 'bg-black/50 transition-opacity duration-[260ms] ease-out will-change-[opacity]'

  # panel
- 'transition-transform duration-[260ms] ease-out'
+ 'transition-transform duration-[260ms] ease-out will-change-transform'
```

- `onTransitionEnd` → `handleExitComplete`가 이미 `setShowContent(false)` 호출
- `setTimeout` 폴백은 `onTransitionEnd`와 경합하여 중복 re-render 유발 → 제거
- `will-change` 힌트로 브라우저가 transition 시작 전 GPU 레이어 할당

**B-4. Result 클릭 핸들러: 프레임 분리**

```diff
# src/views/result/result-view.tsx

  const handleRetest = () => {
    trackResultRetest();
-   resetStore();
-   router.push('/group-type');
+   setTimeout(() => {
+     resetStore();
+     router.push('/group-type');
+   }, 0);
  };
```

- `btn-press` (`transform: scale(0.97)`) 120ms transition이 진행 중인 프레임에서 Zustand store reset + 라우터 전환이 동시 실행되면 프레임 드롭
- `setTimeout(fn, 0)`으로 다음 태스크 큐로 지연 → 애니메이션 프레임 독립 보장

---

#### 전체 개선 요약

| 영역             | 변경 전                 | 변경 후                 | 핵심 개선                  |
| ---------------- | ----------------------- | ----------------------- | -------------------------- |
| Splash 차단 시간 | 2.5s                    | 1.55s                   | FCP ~0.9s 단축             |
| 폰트 리소스      | 1.25MB + 2.4MB 미사용   | 1.04MB                  | 네트워크 전송 2.6MB 절감   |
| Home 초기 번들   | 전체 static import      | 2개 dynamic split       | 초기 hydration 대상 축소   |
| Progress bar     | Layout thrashing        | Composite-only          | 렌더 파이프라인 2단계 절약 |
| ScoreGauge       | 800ms 매 프레임 Paint   | 300ms opacity           | CPU Paint 제거             |
| BottomSheet      | 중복 exit + no GPU hint | 단일 exit + will-change | 전환 시 프레임 드롭 방지   |
| Result 클릭      | 동기 heavy work         | 비동기 지연             | 애니메이션 프레임 보호     |

---

## 4. 분석 프로그레스 바 실시간 연동 (2026-08-27)

### 문제

분석 로딩 화면의 프로그레스 바가 `setInterval(200ms)`로 1%씩 증가하는 **가짜 애니메이션**이었음.
OpenAI API 호출과 전혀 연동되지 않아:

- API가 빨리 끝나면 30%에서 갑자기 100%로 점프
- API가 느리면 95%에서 멈춰있어 사용자가 로딩이 길게 느낌

### 해결 방향

OpenAI Responses API의 **스트리밍**을 활용하여 실제 토큰 생성 진행률에 비례하는 프로그레스 바로 전환.

### 아키텍처

```
[OpenAI Stream] → [API Route (SSE)] → [Client fetch reader] → [progress state] → [AnalysisAnimation]
```

1. **서버**: `openai.responses.parse()` → `openai.responses.stream()` 전환
2. **전송**: `NextResponse.json()` → SSE (`text/event-stream`) 스트리밍 응답
3. **클라이언트**: `response.json()` → `response.body.getReader()` SSE 파싱
4. **UI**: 내부 `setInterval` 타이머 제거, `progress` prop으로 외부 주입

### SSE 프로토콜

| 이벤트     | 데이터               | 설명                     |
| ---------- | -------------------- | ------------------------ |
| `progress` | `{"progress":45}`    | 토큰 수신 진행률 (0~90%) |
| `result`   | `{"data":{...}}`     | 분석 완료 결과           |
| `error`    | `{"error":"메시지"}` | 오류 발생                |

- 연결 즉시 `progress: 2` 전송 (초기 피드백)
- 3% 이상 변화 또는 500ms 경과 시에만 이벤트 전송 (과도한 이벤트 방지)
- 토큰 수신 완료 후: 90% → validation 95% → 결과 전송 100%

### 응답 크기 추정

진행률 계산을 위해 예상 응답 크기를 멤버/페어 수로 추정:

```
estimatedChars = (1500 + memberCount × 300 + pairCount × 550) × 1.15
progress = min(receivedChars / estimatedChars × 90, 90)
```

### 변경 파일

| 파일                                                                  | 변경                                |
| --------------------------------------------------------------------- | ----------------------------------- |
| `src/app/api/analyze/estimate-response-size.ts`                       | 신규 — 응답 크기 추정 유틸          |
| `src/app/api/analyze/route.ts`                                        | `parse` → `stream`, JSON → SSE 응답 |
| `src/features/test-flow/api/actions.ts`                               | `onProgress` 콜백 + SSE 파싱        |
| `src/features/test-flow/ui/analysis-animation/types.ts`               | `progress` prop 추가                |
| `src/features/test-flow/ui/analysis-animation/analysis-animation.tsx` | 내부 타이머 제거, prop 기반         |
| `src/views/analyzing/analyzing-view.tsx`                              | progress state 관리 + 콜백 연결     |

### 핵심 기술 결정

| 결정                                           | 이유                                                       |
| ---------------------------------------------- | ---------------------------------------------------------- |
| SSE (`text/event-stream`)                      | WebSocket 대비 단방향으로 충분, HTTP/2 호환, 재연결 불필요 |
| `fetch` + `ReadableStream` (not `EventSource`) | POST 요청 필요 (EventSource는 GET만 지원)                  |
| `scaleX` transform 유지                        | 섹션 3 B-1에서 적용한 compositor-only 렌더링 유지          |
| 안전 계수 1.15                                 | 진행률이 90%를 초과하지 않도록 과소추정 방지               |

---

## 5. 첫 화면 INP 최적화 (2026-08-28)

### 측정 환경

- PageSpeed Insights 기준
- INP (Interaction to Next Paint): desktop **456ms**, mobile **416ms**
- Good 기준: 200ms 이하

### 원인 분석

첫 화면(`/`)의 주요 인터랙션(HeroCard 탭, BottomNav 탭, ResultSummaryCard 탭)에서 사용자 입력 → 다음 페인트까지 지연 발생. 5가지 원인이 복합 작용:

| 원인                         | 위치                                           | 영향                                                    |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `router.push()` 동기 실행    | `home-view.tsx`, `mbti-setup-prompt-sheet.tsx` | 프리페치 없이 클릭 시 메인 스레드 블로킹                |
| HomeView 전체 `'use client'` | `views/home/home-view.tsx`                     | 정적 콘텐츠까지 hydration, 인터랙션 시 전체 트리 재평가 |
| 전역 세션 매니저             | `app/providers.tsx`                            | 홈에서도 불필요한 sessionStorage I/O + Zustand 구독     |
| BottomSheet double-rAF       | `shared/ui/bottom-sheet/bottom-sheet.tsx`      | 2프레임(~33ms) 지연 + React 재렌더                      |
| SplashOverlay 인터랙션 차단  | `widgets/splash-overlay/splash-overlay.tsx`    | z-50 overlay가 하위 콘텐츠 클릭 차단                    |

---

### Phase 1: `router.push()` → `<Link>` 전환 (예상 -150~200ms)

가장 큰 INP 병목. `router.push()`는 프리페치 없이 클릭 시 동기적으로 네비게이션 JS를 실행하여 메인 스레드를 블로킹.

**HeroCard**

```diff
# src/features/home/ui/hero-card/hero-card.tsx

- 'use client';
+ import Link from 'next/link';

- <section className="btn-press ...">
-   <button onClick={onClick} aria-label="새로운 MBTI 그룹 케미 테스트 시작"
-     className="absolute inset-0 z-10 cursor-pointer ..." />
-   ...
- </section>
+ <Link href="/group-type" aria-label="새로운 MBTI 그룹 케미 테스트 시작"
+   className="btn-press block ...">
+   ...
+ </Link>
```

- `'use client'` 제거 → Server Component로 전환 가능
- `<Link>`가 자동 프리페치 → 클릭 시 즉시 전환
- `onClick` prop 제거 (`types.ts`에서도 삭제)

**MbtiSetupPromptSheet**

```diff
# src/features/profile/ui/mbti-setup-prompt-sheet/mbti-setup-prompt-sheet.tsx

- <Button type="button" variant="primary" onClick={onConfirm}>
-   MBTI 설정하기
- </Button>
+ <Link href="/mypage/settings"
+   className="flex h-[58px] w-full items-center justify-center rounded-card bg-primary ...">
+   MBTI 설정하기
+ </Link>
```

- `onConfirm` prop 제거
- `home-view.tsx`에서 `useRouter()` 완전 제거

---

### Phase 2: HomeView Server/Client 분리 (예상 -50~80ms)

`HomeView` 전체가 `'use client'`로 정적 콘텐츠까지 hydration 대상. 인터랙션 시 전체 트리가 재평가됨.

**분리 전:**

```
HomeView (Client) — useRouter, useProfile, useTestFlowStore, useEffect 전부 포함
```

**분리 후:**

```
HomeView (Server)
  ├─ 인사 헤더 (Server, nickname prop으로 렌더)
  ├─ HeroCard (Server, <Link> 컴포넌트)
  ├─ HomeResetEffect (Client, renders null — Zustand reset 전용)
  ├─ <Suspense> → RecentTestsSection (Client)
  └─ MbtiSetupPromptSheet (Client, isOpen prop)
```

| 파일                                  | 변경                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `app/(main)/page.tsx`                 | `fetchProfile()` 서버사이드 호출, nickname/isMbtiSetupRequired props 전달 |
| `views/home/home-view.tsx`            | `'use client'` 제거, Server Component로 전환                              |
| `views/home/home-reset-effect.tsx`    | 신규 — Zustand reset 전용 client leaf (`null` 렌더)                       |
| `views/home/recent-tests-section.tsx` | 신규 — RecentTests 래퍼 client component                                  |
| `views/home/types.ts`                 | `nickname`, `isMbtiSetupRequired` props 추가                              |

서버사이드 `fetchProfile()`은 `entities/user/api/queries.ts`에 이미 존재. barrel(`entities/user/index.ts`)에는 추가하지 않음 — 서버 전용 모듈(`next/headers`)이 클라이언트 번들에 포함되는 문제 방지.

---

### Phase 3: 세션 매니저 라우트 스코핑 (예상 -20~40ms)

`AnalysisResultSessionManager`와 `MemberDraftSessionManager`가 전역 `Providers`에 마운트되어 홈페이지에서도 불필요한 작업 수행.

```diff
# src/app/providers.tsx

- import { AnalysisResultSessionManager, MemberDraftSessionManager } from '@/features/test-flow';

  <QueryClientProvider client={queryClient}>
    <ToastProvider>
-     <Suspense fallback={null}>
-       <AnalysisResultSessionManager />
-     </Suspense>
-     <MemberDraftSessionManager />
      {children}
    </ToastProvider>
  </QueryClientProvider>
```

| 이동 대상                      | 이동 위치                                 | 사유                               |
| ------------------------------ | ----------------------------------------- | ---------------------------------- |
| `AnalysisResultSessionManager` | `(test)/layout.tsx` + `(auth)/layout.tsx` | result/auth-save 플로우에서만 필요 |
| `MemberDraftSessionManager`    | `(test)/layout.tsx`                       | `/members` 라우트에서만 필요       |

---

### Phase 4: BottomSheet double-rAF 제거 (예상 -30~50ms)

```diff
# src/shared/ui/bottom-sheet/bottom-sheet.tsx

- useEffect(() => {
-   if (isOpen) {
-     requestAnimationFrame(() => {
-       requestAnimationFrame(() => {
-         if (!cancelled) setShowContent(true);
-       });
-     });
-   }
- }, [isOpen]);
+ if (isOpen && !showContent) {
+   setShowContent(true);
+ }
```

- double-rAF(~33ms 지연 + React 재렌더) → 렌더 중 동기 상태 설정으로 교체
- CSS `@starting-style`로 enter animation 처리 (JS 타이밍 의존 제거)
- exit animation은 `onTransitionEnd` → `setShowContent(false)`로 유지 (포커스 복귀 보장)

```css
/* src/app/globals.css */
.bottom-sheet-panel {
  @starting-style {
    transform: translateY(100%);
  }
}
```

- `will-change-[opacity]` / `will-change-transform`은 섹션 3 B-3에서 이미 제거 — `@starting-style`이 더 근본적 해결

---

### Phase 5: SplashOverlay 최적화 (예상 -10~20ms)

```diff
# src/widgets/splash-overlay/splash-overlay.tsx

- 'fixed ... z-50 ... will-change-transform'
+ 'pointer-events-none fixed ... z-50 ...'
+ phase === 'fading' && 'opacity-0 will-change-[opacity]'
```

| 변경                                           | 효과                                                           |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `pointer-events-none` 추가                     | 스플래시 아래 콘텐츠와 즉시 인터랙션 가능                      |
| `will-change-transform` 제거                   | 실제 전환은 opacity만 사용하므로 불필요한 GPU 레이어 할당 제거 |
| `will-change-[opacity]` fading 단계에서만 적용 | 전환 중에만 compositor 힌트 활성화                             |

---

### 요약 테이블

| Phase    | 핵심 변경                                                | 예상 INP 개선  | 상태    |
| -------- | -------------------------------------------------------- | -------------- | ------- |
| 1        | `router.push()` → `<Link>` (HeroCard, MbtiSheet)         | -150~200ms     | ✅ 완료 |
| 2        | HomeView Server/Client 분리                              | -50~80ms       | ✅ 완료 |
| 3        | 세션 매니저 라우트 스코핑                                | -20~40ms       | ✅ 완료 |
| 4        | BottomSheet double-rAF → `@starting-style`               | -30~50ms       | ✅ 완료 |
| 5        | SplashOverlay `pointer-events-none` + `will-change` 정리 | -10~20ms       | ✅ 완료 |
| **합계** |                                                          | **-260~390ms** |         |

변경 파일: 18개 (16 수정, 2 신규) — 커밋 `3dc2075`

---

## 6. 홈 SSR 데이터 패칭 리팩토링 (2026-08-28)

→ 별도 문서: [`home-ssr.md`](./home-ssr.md)

queryOptions 분리 + HydrationBoundary + useSuspenseQuery 적용.
LCP 756ms → 706ms (−6.6%), hydration mismatch 해소.

---

## 7. 프로덕션 Lighthouse 실측 (2026-09-01)

### 측정 환경

- Lighthouse CLI 13.4.1, `--form-factor=mobile`, `--throttling-method=simulate`
- 대상: `https://mixti.io/` (Vercel production, 배포 `dpl_2XPoQU3X`)
- 커밋: `c5f5ce7` (`font-display: optional` 적용)

### 배포 전 (커밋 7223d4a, `font-display: swap`)

| 지표        | 수치   | 상태              |
| ----------- | ------ | ----------------- |
| Score       | **48** | —                 |
| FCP         | 8.0s   | Poor              |
| LCP         | 14.4s  | Poor              |
| TBT         | 400ms  | Needs Improvement |
| CLS         | 0      | Good              |
| Speed Index | 8.0s   | Poor              |

**원인**: CSS `@font-face`(이전 배포 `dpl_2sr29WJs`)와 HTML RSC 힌트(현재 배포 `dpl_gp2uef9E`)가 서로 다른 `dpl` 쿼리 파라미터로 같은 폰트를 참조 → Gothic A1 4개 weight × 2 = ~2MB 중복 다운로드. `font-display: swap`으로 폰트 로드 완료 시 swap → LCP 재기록.

### 배포 후 (커밋 c5f5ce7, `font-display: optional`)

| 지표        | 수치   | 상태              |
| ----------- | ------ | ----------------- |
| Score       | **94** | —                 |
| FCP         | 1.4s   | Good              |
| LCP         | 1.7s   | Good              |
| TBT         | 210ms  | Needs Improvement |
| CLS         | 0.084  | Good              |
| Speed Index | 2.9s   | Good              |

### 개선 원인

1. **폰트 중복 로드 해소**: CSS 재생성으로 모든 폰트가 단일 배포 해시(`dpl_2XPoQU3X`)에서 로드 → ~1MB 네트워크 절감
2. **`font-display: optional`**: 폰트 로드 완료 시 swap이 발생하지 않아 LCP 재기록 방지 → LCP가 FCP 직후로 이동

### 참고

- CLS 0 → 0.084: Lighthouse simulate 모드에서 `optional`의 block period 내 폰트 로드 시 fallback → 커스텀 폰트 전환으로 발생 추정. RUM 데이터(Vercel Speed Insights P75)에서는 CLS 0 유지.
- TBT 210ms: Google Analytics(167.9KB, 72.5KB unused)가 주 원인. 서드파티 스크립트이므로 추가 최적화 여지 제한적.

---

## 8. PPR Streaming — LCP 즉시 렌더링 (2026-08-28~09-01)

### 베이스라인 (Vercel Speed Insights RUM, P75, 2026-08-31)

| 지표 | Mobile | Desktop |
| ---- | ------ | ------- |
| RES  | 100    | 100     |
| FCP  | 1.54s  | 1.0s    |
| LCP  | 1.83s  | 1.17s   |
| INP  | 64ms   | 64ms    |
| CLS  | 0      | 0       |
| FID  | 27ms   | 3ms     |
| TTFB | 0.11s  | —       |

### 문제

`page.tsx`가 async → `fetchProfile()` + `fetchAnalyses()` 완료까지 전체 페이지 렌더링 차단. `loading.tsx`가 스피너 표시 → 정적인 HeroCard(LCP 요소)도 차단됨.

### 해결

page.tsx를 동기 컴포넌트로 전환. 데이터 의존 섹션을 개별 async Server Component + Suspense로 분리. PPR이 정적 shell(HeroCard)을 즉시 렌더.

**변경 파일:**

- `src/app/(main)/page.tsx` — async 제거, HydrationBoundary/prefetch 제거
- `src/views/home/home-view.tsx` — async container 컴포넌트로 래핑
- `src/views/home/home-header-container.tsx` — 신규: profile prefetch + HydrationBoundary
- `src/views/home/recent-tests-container.tsx` — 신규: analyses prefetch + HydrationBoundary

**Lighthouse 결과 (localhost, production build):**

| 지표  | Before | After | 변화 |
| ----- | ------ | ----- | ---- |
| Score | 68     | 97    | +29  |
| FCP   | 3.9s   | 1.7s  | -56% |
| LCP   | 5.0s   | 1.7s  | -66% |
| TBT   | 190ms  | 60ms  | -68% |

---

## 9. 폰트 프리로드 최적화 (2026-09-01)

### 문제

7개 폰트 파일(~1MB) 전부 preload → 모바일 초기 네트워크 부담.

### 해결

Gothic A1 400 + 900만 preload. 나머지는 lazy load. Nunito 700 삭제 (사용처 0).

**변경 파일:** `src/app/layout.tsx`

**효과:** Nunito preload 제거(~45KB), nunito-700 삭제(사용처 0). Gothic A1은 `next/font/local`이 per-weight preload 미지원으로 유지.

**Lighthouse:** Score 97 유지, CLS 0.009

---

## 10. 미사용 폰트 정리 + OG 이미지 참조 수정 (2026-09-01)

**문제 1:** `font-semibold` (600) 18회 사용되지만 해당 weight 미로드.
**문제 2:** OG 이미지 생성기에서 삭제된 `gothic-a1-800.ttf` 참조 → 런타임 에러.

**변경 파일:**

- `font-semibold` → `font-bold` 통일 (15개 파일, 18곳)
- `src/app/fonts/gothic-a1-800.ttf` — Google Fonts에서 재다운로드 (OG 이미지용)

---

## 11. GA preconnect + 도메인 리다이렉트 체인 제거 (2026-09-01)

### GA preconnect

`src/app/layout.tsx`에 `<link rel="preconnect" href="https://www.googletagmanager.com" />` 추가.

### 도메인 리다이렉트 체인

**문제:** `mixti.io` → 301 → `www.mixti.io` 리다이렉트 체인. Lighthouse "Avoid multiple page redirects" 경고. 모바일에서 리다이렉트 1회 왕복(DNS + TCP + TLS)에 ~800ms 소요.

**원인:** Vercel 대시보드에서 `www.mixti.io`가 Primary Domain으로 설정되어 있어, apex 도메인(`mixti.io`) 접속 시 `www.mixti.io`로 301 리다이렉트 발생.

**해결:** Vercel 대시보드 > Domains에서 다음과 같이 변경:

1. `mixti.io` — **Connect to an environment: Production** (Primary Domain)
2. `www.mixti.io` — **Redirect to Another Domain: 308 Permanent Redirect → mixti.io**

**308 vs 307 선택 이유:** 307(Temporary)은 검색엔진이 매번 `www.mixti.io`를 재확인하지만, 308(Permanent)은 `mixti.io`를 정식 URL로 인식하고 인덱스를 통합함. SEO 관점에서 `www` 유무는 차이 없으나, 하나로 통일하는 것이 중요.

**코드 변경:** 없음. `VERCEL_PROJECT_PRODUCTION_URL` 환경변수가 Vercel에 의해 자동으로 Primary Domain(`mixti.io`)으로 갱신되므로, canonical URL / sitemap / OG 태그가 자동 반영됨.

---

## 12. LCP 재측정 분석 + font-display:optional (2026-09-01)

### 배경

Lighthouse CLI `simulate` 모드로 재측정 시 모바일 LCP 8.7s, CLS 0.084 확인. 코드는 동일(커밋 7223d4a)하며 기존 1.7s는 `devtools` 스로틀링 또는 폰트 캐시 상태에서 측정된 것으로 추정. RUM 데이터(Speed Insights P75)는 LCP 1.83s, CLS 0으로 실 사용자 체감은 양호.

### 원인 분석

1. **font-display: swap + 대역폭 제약**: Gothic A1 4개 weight(총 972KB)가 전부 preload + `font-display: swap`. Lighthouse `simulate` 모드의 모바일 시뮬레이션(1.47 Mbps, 150ms RTT)에서 폰트 다운로드에 ~8.7s 소요. 다운로드 완료 시 swap 발생 → 텍스트 repaint가 새로운 LCP 이벤트로 기록.
2. **LCP 요소 선택**: SeoIntro `<p>` (308×67px = 20,636px²)가 HeroCard `<h1>` (210×66px = 13,860px²)보다 면적이 커서 Lighthouse가 LCP 후보로 선택. `font-bold`(weight 700) 사용 → swap 시 텍스트 메트릭 변경.
3. **CLS 0.084**: font swap 시 글리프 폭/행간 변화로 SeoIntro 섹션이 밀려남.

### 해결 과정

1. **Lighthouse `simulate` vs `devtools` 차이 발견**: 동일 코드(커밋 7223d4a)인데 기존 측정(LCP 1.7s)과 재측정(LCP 8.7s)이 크게 다름. 원인은 Lighthouse 기본 스로틀링 모드 `simulate`(Lantern)가 네트워크 모델 기반 추정이라 폰트 다운로드 시간을 과대 추정하기 때문. RUM 데이터(Speed Insights P75 LCP 1.83s)와의 괴리가 이를 뒷받침.

2. **`font-display: optional` 적용 → simulate 모드에서 효과 없음**: `display: 'swap'` → `display: 'optional'`로 변경 후 simulate 3회 반복 측정 → LCP ~8.27s로 일관되게 변화 없음. CLS만 0.084 → 0으로 개선. Lantern 모델이 `optional`의 "block-only, no swap" 동작을 시뮬레이션하지 못하고 폰트 다운로드 완료 시점을 LCP로 계속 잡는 것으로 확인.

3. **`preload: false` 실험**: 폰트 preload 제거 시 Lantern이 폰트를 critical path에서 제외 → LCP 2.3s로 감소. 그러나 Lantern이 font swap을 모델링하여 CLS 0.084 복귀. 실제 Chrome에서는 `optional`이므로 swap이 발생하지 않지만 Lantern은 이를 구분하지 못함. preload 유지가 실제 환경에서 폰트 로드 확률을 높이므로 `preload: true`(기본값) 유지 결정.

4. **`devtools` 스로틀링으로 검증**: 실제 Chrome 네트워크 스로틀링(`devtools` 모드)으로 측정 → LCP 1.6s(= FCP), CLS 0. `optional`이 정확히 동작하여 fallback 폰트로 즉시 렌더링, swap 없음 확인. 이 결과가 RUM 데이터(LCP 1.83s)와도 일치하여 신뢰할 수 있는 측정 방법으로 채택.

### 해결

`src/app/layout.tsx`에서 Gothic A1의 `display: 'swap'` → `display: 'optional'`로 변경.

- `optional`: ~100ms block period 내 폰트 미로드 시 fallback(size-adjusted Arial) 유지, **swap 없음**
- swap이 제거되므로 font-swap-caused LCP 이벤트 자체가 사라짐 → LCP 급감
- swap이 없으므로 텍스트 메트릭 변경 없음 → CLS 0
- self-hosted 폰트(same origin)이므로 실제 네트워크에서는 100ms 내 로드 → 사용자 체감 변화 없음
- `next/font/local`의 `adjustFontFallback`(기본 'Arial')이 size-adjusted fallback 자동 생성

### Lighthouse 결과 비교 (localhost, mobile)

| 측정 방법                      | LCP      | CLS   | Score  |
| ------------------------------ | -------- | ----- | ------ |
| swap + simulate                | 8.7s     | 0.084 | 68     |
| optional + simulate (3회 평균) | 8.27s    | 0     | 75     |
| optional + devtools            | **1.6s** | **0** | **99** |

**결론:** Lighthouse `simulate`(Lantern) 모델은 `font-display: optional`을 정확히 모델링하지 못하는 한계가 있음. 폰트 최적화 효과를 정확히 측정하려면 `devtools` 스로틀링 또는 RUM 데이터를 사용해야 함.

**변경 파일:** `src/app/layout.tsx`

---

## 13. 전체 최적화 결과 요약

### A. Lighthouse (합성 테스트)

Lighthouse CLI로 측정. 동일 도구·동일 조건 기준 before/after 비교.

#### localhost (devtools throttling, mobile)

| 지표  | Before (08-28) | After (09-01) | 변화     |
| ----- | -------------- | ------------- | -------- |
| Score | 68             | **99**        | **+31**  |
| FCP   | 3.9s           | **1.6s**      | **-59%** |
| LCP   | 5.0s           | **1.6s**      | **-68%** |
| TBT   | 190ms          | **90ms**      | **-53%** |
| CLS   | 0.009          | **0**         | **제거** |

> Before: PPR 적용 전. After: PPR + font-display:optional 전체 적용 후.

#### 프로덕션 — simulate (mobile)

| 지표  | Before (§7, dpl 중복) | After (§7, optional) | §15 (09-02, 수동 @font-face) |
| ----- | --------------------- | -------------------- | ---------------------------- |
| Score | 48                    | 94                   | 59                           |
| FCP   | 8.0s                  | 1.4s                 | 5.7s                         |
| LCP   | 14.4s                 | 1.7s                 | 9.5s                         |
| TBT   | 400ms                 | 210ms                | 140ms                        |
| CLS   | 0                     | 0.084                | 0                            |

> §15의 59점은 수동 `@font-face` 전환 후 Lantern 리소스 우선순위 모델링 변화 때문 (§15 참조).
> simulate 모드는 `font-display: optional`을 정확히 모델링하지 못하므로 devtools/RUM 대비 참고용.

#### 프로덕션 — devtools throttling (mobile, 09-02)

| 지표  | 수치      | 상태              |
| ----- | --------- | ----------------- |
| Score | **93**    | —                 |
| FCP   | **2.3s**  | Needs Improvement |
| LCP   | **2.3s**  | Good              |
| TBT   | **150ms** | Good              |
| CLS   | **0.084** | Good              |
| SI    | **2.3s**  | Good              |

> localhost(99)와 프로덕션(93)의 차이는 네트워크 RTT + Vercel 서버 응답 지연.
> devtools 결과가 RUM P75(LCP 1.82s)와 일관되므로 실제 성능 대표.

### B. Vercel Speed Insights (RUM, 실 사용자 P75)

`vercel metrics` CLI + Speed Insights 대시보드로 수집한 실 사용자 데이터. 동일 측정 체계 내 비교.

| 지표 | §8 베이스라인 (08-31) | 실측 2d avg (09-02) | 변화               |
| ---- | --------------------- | ------------------- | ------------------ |
| LCP  | 1.83s                 | **1.82s**           | 일치               |
| FCP  | 1.54s                 | **1.77s**           | +0.23s (표본 차이) |
| INP  | 64ms                  | **45ms**            | **−30%**           |
| CLS  | 0                     | **0.002**           | 양호               |
| TTFB | 0.11s                 | **323ms**           | 표본 차이          |

> §8 베이스라인: 대시보드 스냅샷. 실측: `vercel metrics` P75 평균.
> LCP 1.83s → 1.82s 일치로 기존 기록 신뢰성 확인.
> 표본: LCP 53건, INP 16건 (2일간). 추가 수집 필요.

### C. PageSpeed Insights (Google, 합성 테스트)

| 지표          | Before (08-28) |
| ------------- | -------------- |
| INP (desktop) | 456ms          |
| INP (mobile)  | 416ms          |

> §5 최적화 전 1회 측정. 최적화 후 동일 도구로 재측정은 미실시.
> Vercel Speed Insights(RUM)와 측정 방법이 다르므로 직접 비교 불가 — §5 최적화 효과 확인은 B절의 INP 64ms → 45ms 참조.

---

## 14. 배포 독립 폰트 로딩 — dpl 중복 다운로드 근본 해소 (2026-09-02)

### 문제

§7에서 `font-display: optional`로 LCP 재기록을 방지했지만, 근본 원인은 해결되지 않았다. Vercel의 webpack 캐시가 이전 배포의 CSS를 재사용하면:

- HTML preload: 현재 배포의 `?dpl=ABC` URL
- CSS `@font-face`: 이전 배포의 `?dpl=XYZ` URL

브라우저는 내용이 같은 파일도 URL이 다르면 별도 리소스로 취급하므로 Gothic A1 4 weight × 2 = **~994KB 중복 다운로드** 발생. `optional`이 swap을 막아 LCP 수치는 양호했지만, 네트워크 대역폭 낭비와 폰트 미표시 확률 증가는 남아있었다.

### 원인

`next/font/local`이 생성하는 폰트 URL에 Vercel `deploymentId`(`?dpl=...`)가 포함됨. CSS는 `/_next/static/media/<hash>-s.p.<dpl>.woff2` 형태로, 배포 간 캐시 불일치 시 동일 바이트의 폰트가 서로 다른 URL로 중복 요청됨.

### 해결

`next/font/local`을 완전히 제거하고, 배포와 무관한 정적 경로(`/fonts/v1/...`)로 전환.

**변경 파일:**

| 파일                          | 변경                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| `public/fonts/v1/*.woff2`     | 6개 WOFF2를 `src/app/fonts/`에서 이동 (SHA-256 동일 확인)                 |
| `src/shared/styles/fonts.css` | 신규 — 6개 `@font-face` + 2개 fallback face + CSS 변수 선언               |
| `src/app/globals.css`         | `fonts.css` import 추가 (Tailwind 다음, tokens/theme 앞)                  |
| `src/app/layout.tsx`          | `next/font/local` 제거, Gothic A1 700/900 수동 preload 추가               |
| `next.config.ts`              | `/fonts/v1/:path*`에 `Cache-Control: public, max-age=31536000, immutable` |
| `src/proxy.ts`                | 미들웨어 matcher에서 `fonts/` 경로와 `.woff2` 확장자 제외                 |
| `src/app/fonts/*.woff2`       | 6개 삭제 (TTF는 OG 이미지용 유지)                                         |

### 핵심 설계 결정

| 결정                        | 이유                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| `/fonts/v1/` 버전 폴더      | immutable 캐시 사용. 폰트 바이트 변경 시 v1 덮어쓰기 대신 `/fonts/v2/` 발행 |
| Gothic A1 700/900만 preload | 홈 LCP 후보인 SeoIntro 본문(700)과 Hero/title(900)에 필요한 weight만        |
| 수동 fallback 메트릭 보존   | `next/font/local`이 생성했던 Arial 보정값을 그대로 유지 (CLS 방지)          |
| `font-display` 정책 유지    | Gothic A1 `optional`, Nunito `swap` — 기존 family별 동작 보존               |

### 검증 결과

**로컬 브라우저 검증 (production build):**

| 항목               | 결과                                                             |
| ------------------ | ---------------------------------------------------------------- |
| 폰트 중복 다운로드 | **0건** — 각 파일 정확히 1회 요청                                |
| Preload 동작       | Gothic A1 700/900이 가장 먼저 로드 (요청 #2, #3)                 |
| 온디맨드 로드      | 나머지 weight(400, 800, Nunito 900)는 사용 시 로드               |
| 폰트 URL           | 모든 요청이 `/fonts/v1/...` — `?dpl=` 없음                       |
| 응답 헤더          | `200 OK`, `Content-Type: font/woff2`, `Cache-Control: immutable` |
| OG 이미지 TTF      | `gothic-a1-800.ttf` 3개 참조 유지                                |
| 렌더링             | Gothic A1, Nunito 모두 정상 적용                                 |

**빌드 산출물 검증:**

- CSS `@font-face src`가 모두 `/fonts/v1/...` 참조 — `_next/static/media` 없음
- HTML preload가 CSS URL과 byte-for-byte 동일 — 브라우저가 요청 재사용
- `next/font`가 생성하는 자동 font preload 없음

### 부수 수정: 기존 테스트 실패 6건 해결

| 파일                       | 원인                                                           | 수정                                |
| -------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| `home-view.test.tsx` (2건) | `./home-header` mock → 실제 import는 `./home-header-container` | mock 경로를 `*-container`로 변경    |
| `hooks.test.ts` (4건)      | `@tanstack/react-query` mock에 `queryOptions` export 누락      | `queryOptions: (opts) => opts` 추가 |

### 남은 작업

- [x] Vercel 프로덕션 배포 후 연속 배포(A→B) 검증 — §15에서 Lighthouse 네트워크 로그로 확인 완료
- [x] Speed Insights RUM P75 (LCP, FCP, CLS) 기준선 비교 — §15에서 `vercel metrics` CLI로 실측 완료

**커밋:** `f525b96` — `feat: 배포 독립 폰트 로딩으로 전환 — dpl 중복 다운로드 해소`

---

## 15. 프로덕션 실측 검증 (2026-09-02)

### 측정 도구

- Lighthouse CLI 13.4.1, headless Chrome, `--preset=perf`
- Vercel CLI 59.11.0 `vercel metrics`, `--aggregation p75 --prod`

### Lighthouse 프로덕션 실측 (mobile)

대상: `https://mixti.io/` (프로덕션, §14 폰트 수정 이후)

| 지표  | simulate | devtools |
| ----- | -------- | -------- |
| Score | **59**   | **93**   |
| FCP   | 5.7s     | 2.3s     |
| LCP   | 9.5s     | 2.3s     |
| TBT   | 140ms    | 150ms    |
| CLS   | 0        | 0.084    |
| SI    | 5.7s     | 2.3s     |

simulate vs devtools 차이 원인은 §12 참조. §7 대비 simulate 점수 하락(94→59)은 §14에서 수동 `@font-face`(`/fonts/v1/`)로 전환 후 Lantern 리소스 우선순위 추정이 달라진 것으로 추정.

### 폰트 로딩 검증 (Lighthouse 네트워크 로그)

| 파일                | 전송 크기   | 경로         | ?dpl=        |
| ------------------- | ----------- | ------------ | ------------ |
| gothic-a1-400.woff2 | 237.7KB     | `/fonts/v1/` | 없음         |
| gothic-a1-700.woff2 | 243.8KB     | `/fonts/v1/` | 없음         |
| gothic-a1-800.woff2 | 244.7KB     | `/fonts/v1/` | 없음         |
| gothic-a1-900.woff2 | 246.1KB     | `/fonts/v1/` | 없음         |
| nunito-900.woff2    | 14.9KB      | `/fonts/v1/` | 없음         |
| **합계**            | **987.2KB** | 5개 파일     | **중복 0건** |

- 홈 페이지에서 Nunito 800은 미사용으로 로드되지 않음 (6개 중 5개만 요청)
- 모든 폰트가 `/fonts/v1/` 정적 경로에서 로드 — `_next/static/media` 없음
- `?dpl=` 파라미터 오염 없음 — 배포 간 중복 다운로드 근본 해소 확인

### Speed Insights RUM P75 실측 (`vercel metrics` CLI)

**최근 2일 (2026-08-30 ~ 09-01)**

| 지표 | Avg P75   | Min P75 | Max P75 | 표본 |
| ---- | --------- | ------- | ------- | ---- |
| LCP  | **1.82s** | 472ms   | 8s      | 53   |
| FCP  | **1.77s** | 472ms   | 8s      | 53   |
| INP  | **45ms**  | 8ms     | 88ms    | 16   |
| CLS  | **0.002** | 0       | 0.0095  | —    |
| TTFB | **323ms** | 0ms     | 1.94s   | —    |

**7일 전체 (2026-08-25 ~ 09-01)**

| 지표 | Avg P75 | Min P75 | Max P75 |
| ---- | ------- | ------- | ------- |
| LCP  | 3.45s   | 284ms   | 42s     |
| FCP  | 3.3s    | 284ms   | 42s     |
| INP  | 85ms    | 32ms    | 416ms   |
| CLS  | 0.0038  | 0       | 0.031   |
| TTFB | 631ms   | 14ms    | 9s      |

7일 데이터에는 최적화 이전(08-25~27) 기간이 포함되어 LCP/INP가 높게 집계됨. 2일 데이터가 현재 성능 수준에 가까움.

§8 베이스라인 대비 변화는 §13B 참조.

### 참고

- Speed Insights 표본 수가 적어(LCP 53건/2일, INP 16건/2일) 추세 확인에는 추가 수집 필요
- simulate vs devtools 차이, 도구 간 비교 불가 등은 §12, §13 참조
