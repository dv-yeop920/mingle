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

| 항목 | 변환 전 (TTF) | 변환 후 (woff2) | 감소율 |
|------|---------------|-----------------|--------|
| Gothic A1 (5 weights) | 11MB | 1.2MB | **89%** |
| Nunito (3 weights) | 372KB | 48KB | **87%** |
| **합계** | **11.4MB** | **1.25MB** | **89%** |

### 영향 지표

- **LCP**: 폰트 로드 시간 단축 → 텍스트 렌더링 빨라짐
- **FCP**: `display: swap` 유지 — 시스템 폰트로 즉시 렌더 후 woff2 스왑
- **TTI**: JS 번들과 무관하나, 네트워크 대역폭 경쟁 감소로 간접 개선

---

## 2. 현재 성능 상태 (배포 전 로컬 빌드 기준)

### 양호한 항목

| 지표 | 상태 | 근거 |
|------|------|------|
| FCP | 양호 | `display: swap` + route별 `loading.tsx` 존재 |
| INP | 양호 | React Compiler 활성, 이벤트 핸들러 경량 |
| JS 번들 | 양호 | 최대 청크 236KB, 전체 ~1.3MB (gzip 전) |
| 렌더링 | 양호 | PPR(Partial Prerender) 활성, Server Component 기본 |

### 배포 후 추가 검토 항목

- [x] ~~폰트 weight 축소 가능성 (500 weight 실사용 여부)~~ → Phase 2에서 제거 확정
- [x] ~~result 뷰 계열 `next/dynamic` lazy loading 검토~~ → Phase 3에서 적용 확정
- [ ] Lighthouse 실측 후 LCP 수치 확인
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

| 항목 | 내용 |
|------|------|
| 위치 | `src/widgets/splash-overlay/splash-overlay.tsx` |
| 문제 | z-50 opaque 전체화면 overlay가 2000ms + 500ms fade = 2.5s 동안 실제 콘텐츠를 가림 |
| 원인 | `getServerSnapshot`이 항상 `true` → SSR HTML에 splash DOM 포함 → 브라우저 FCP = splash paint 시점 |
| 해결 | 표시 시간 2000ms → 1200ms, fade 500ms → 350ms 단축. `onTransitionEnd`에 `e.target === e.currentTarget` 가드 추가. `will-change: transform` 적용 |

#### A-2. 미사용 폰트 리소스 (~2.7MB)

| 항목 | 내용 |
|------|------|
| 위치 | `src/app/fonts/`, `src/app/layout.tsx` |
| 문제 | Gothic A1 500 weight (`font-medium`) 사용처 0건인데 239KB woff2 로드. 미사용 TTF(2.2MB)도 빌드에 포함 |
| 원인 | 폰트 최적화 시 사용 여부 미확인 |
| 해결 | `gothic-a1-800.ttf` (2.2MB) 삭제, `gothic-a1-500.woff2` (239KB) 삭제, layout.tsx 선언 정리 |

#### A-3. Dynamic Import 부재 — 초기 JS 번들 과대

| 항목 | 내용 |
|------|------|
| 위치 | `src/views/home/home-view.tsx` |
| 문제 | 49개 `'use client'` 컴포넌트 전부 static import. `next/dynamic` 사용처 0건 |
| 원인 | 코드 분할(code splitting) 미적용 |
| 해결 | 초기 viewport 밖 컴포넌트(`MbtiSetupPromptSheet`, `RecentTests`)에 `next/dynamic` 적용 |

> **참고**: `SeoIntro` ("MBTI 그룹 궁합, 무엇을 알려주나요?")는 Server Component → 클라이언트 JS 번들 미포함. dynamic import 불필요.

---

### Part B: 애니메이션 Jank 원인 (런타임 렌더링 성능)

#### B-1. Analysis Animation progress bar — 가장 큰 jank

| 항목 | 내용 |
|------|------|
| 위치 | `src/features/test-flow/ui/analysis-animation/analysis-animation.tsx` |
| 문제 | `setInterval(80ms)`로 `setState` → 초당 12.5회 React re-render. inline `width` 변경은 layout-triggering property |
| 왜 jank? | `width`는 레이아웃 속성 → 변경 시 Layout → Paint → Composite 전체 파이프라인 실행. `transition-[width] duration-200`과 80ms interval이 겹쳐 CSS transition이 완료되기 전에 새 값 설정 |
| 해결 | `width` → `transform: scaleX()` (compositor-only, GPU 가속). interval 200ms로 변경 |
| 개선 효과 | Layout recalculation 제거 → **Paint + Composite만 실행** (렌더링 파이프라인 2단계 절약). Re-render 빈도 60% 감소 (12.5/s → 5/s) |

#### B-2. ScoreGauge conic-gradient 매 프레임 repaint

| 항목 | 내용 |
|------|------|
| 위치 | `src/entities/analysis/ui/score-gauge/score-gauge.tsx`, `src/app/globals.css` |
| 문제 | `@property --gauge-progress` 애니메이션이 `conic-gradient`를 매 프레임 repaint 강제 |
| 왜 jank? | conic-gradient는 `transform`/`opacity`와 달리 compositor layer로 승격 불가. 매 프레임 CPU에서 gradient를 다시 계산하고 Paint 실행 |
| 해결 | conic-gradient 유지, 애니메이션만 `opacity` fade-in (300ms)으로 교체 |
| 개선 효과 | 800ms 동안의 **매 프레임 Paint 제거** → 단 1회 Paint + opacity Composite만 실행 |

#### B-3. BottomSheet 중복 exit 메커니즘

| 항목 | 내용 |
|------|------|
| 위치 | `src/shared/ui/bottom-sheet/bottom-sheet.tsx` |
| 문제 | double-rAF + 300ms setTimeout 폴백 중복. backdrop/panel에 compositor 힌트 없음 |
| 왜 jank? | `onTransitionEnd`와 `setTimeout` 둘 다 `setShowContent(false)` 호출 가능 → 불필요한 re-render. compositor 힌트 없으면 브라우저가 매 프레임 레이어 재생성 |
| 해결 | setTimeout 폴백 제거, `will-change: opacity`/`will-change: transform` 추가 |
| 개선 효과 | 중복 state update 제거 + **GPU 레이어 사전 할당** → 전환 시 프레임 드롭 방지 |

#### B-4. Result 페이지 클릭 핸들러

| 항목 | 내용 |
|------|------|
| 위치 | `src/views/result/result-view.tsx` |
| 문제 | `handleRetest` 등이 `btn-press` 120ms 트랜지션 도중 store reset + router.push 동기 실행 |
| 왜 jank? | 클릭 이벤트 핸들러 내에서 Zustand store 리셋 → 구독 컴포넌트 전체 re-render + Next.js 라우터 전환 시작. 이 작업이 btn-press `transform: scale(0.97)` 애니메이션과 같은 프레임에서 실행 |
| 해결 | `setTimeout(fn, 0)`으로 다음 태스크 큐로 지연 |
| 개선 효과 | btn-press 애니메이션이 **독립 프레임에서 완료된 후** 무거운 작업 실행 → 프레임 드롭 방지 |

---

### 브라우저 렌더링 파이프라인 참고

```
JS → Style → Layout → Paint → Composite
```

| 속성 유형 | 실행 단계 | 예시 | 비용 |
|----------|----------|------|------|
| Layout 속성 | JS → Style → Layout → Paint → Composite | `width`, `height`, `top`, `left`, `padding` | 높음 |
| Paint 속성 | JS → Style → Paint → Composite | `background`, `color`, `box-shadow`, `conic-gradient` | 중간 |
| Composite 속성 | JS → Style → Composite | `transform`, `opacity` | 낮음 (GPU) |

- **Phase B-1 (width → scaleX)**: Layout+Paint 단계 제거 → Composite만 실행
- **Phase B-2 (gradient animation → opacity)**: 매 프레임 Paint 제거 → Composite만 실행
- **Phase B-3 (will-change)**: 브라우저에 레이어 사전 할당 힌트 → Composite 최적화
- **Phase B-4 (setTimeout)**: 애니메이션 프레임과 JS 작업을 분리 → 프레임 드롭 방지

---

### 요약 테이블

| Phase | 카테고리 | 핵심 변경 | 예상 효과 | 상태 |
|-------|---------|----------|----------|------|
| A-1 | FCP | Splash 2.5s → 1.55s | FCP ~0.9s 개선 | ✅ 완료 |
| A-2 | FCP | 미사용 폰트 ~2.7MB 제거 | 대역폭 확보, hydration 가속 | ✅ 완료 |
| A-3 | FCP | Dynamic import 2개 컴포넌트 | 초기 JS 번들 축소 | ✅ 완료 |
| B-1 | Jank | Progress bar width → scaleX | layout thrashing 제거 | ✅ 완료 |
| B-2 | Jank | ScoreGauge → opacity fade-in | 매 프레임 repaint 제거 | ✅ 완료 |
| B-3 | Jank | BottomSheet setTimeout 제거 + will-change | 중복 state update 제거 | ✅ 완료 |
| B-4 | Jank | Click handler setTimeout 지연 | press 애니메이션 중 프레임 드롭 방지 | ✅ 완료 |

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

| 삭제 항목 | 크기 | 사유 |
|----------|------|------|
| `gothic-a1-800.ttf` | 2.2MB | woff2 변환 후 남은 원본 TTF |
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

| 파일 | 크기 |
|------|------|
| gothic-a1-400.woff2 | 243KB |
| gothic-a1-700.woff2 | 249KB |
| gothic-a1-800.woff2 | 250KB |
| gothic-a1-900.woff2 | 252KB |
| nunito-700.woff2 | 15KB |
| nunito-800.woff2 | 15KB |
| nunito-900.woff2 | 15KB |
| **합계** | **1.04MB** |

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

| 지표 | 변경 전 | 변경 후 |
|------|---------|---------|
| 렌더링 파이프라인 | Layout → Paint → Composite | Composite만 |
| Re-render 빈도 | 12.5회/s (80ms) | 5회/s (200ms) |
| Layout recalculation | 매 interval마다 | 없음 |

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

| 영역 | 변경 전 | 변경 후 | 핵심 개선 |
|------|---------|---------|----------|
| Splash 차단 시간 | 2.5s | 1.55s | FCP ~0.9s 단축 |
| 폰트 리소스 | 1.25MB + 2.4MB 미사용 | 1.04MB | 네트워크 전송 2.6MB 절감 |
| Home 초기 번들 | 전체 static import | 2개 dynamic split | 초기 hydration 대상 축소 |
| Progress bar | Layout thrashing | Composite-only | 렌더 파이프라인 2단계 절약 |
| ScoreGauge | 800ms 매 프레임 Paint | 300ms opacity | CPU Paint 제거 |
| BottomSheet | 중복 exit + no GPU hint | 단일 exit + will-change | 전환 시 프레임 드롭 방지 |
| Result 클릭 | 동기 heavy work | 비동기 지연 | 애니메이션 프레임 보호 |

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

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `progress` | `{"progress":45}` | 토큰 수신 진행률 (0~90%) |
| `result` | `{"data":{...}}` | 분석 완료 결과 |
| `error` | `{"error":"메시지"}` | 오류 발생 |

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

| 파일 | 변경 |
|------|------|
| `src/app/api/analyze/estimate-response-size.ts` | 신규 — 응답 크기 추정 유틸 |
| `src/app/api/analyze/route.ts` | `parse` → `stream`, JSON → SSE 응답 |
| `src/features/test-flow/api/actions.ts` | `onProgress` 콜백 + SSE 파싱 |
| `src/features/test-flow/ui/analysis-animation/types.ts` | `progress` prop 추가 |
| `src/features/test-flow/ui/analysis-animation/analysis-animation.tsx` | 내부 타이머 제거, prop 기반 |
| `src/views/analyzing/analyzing-view.tsx` | progress state 관리 + 콜백 연결 |

### 핵심 기술 결정

| 결정 | 이유 |
|------|------|
| SSE (`text/event-stream`) | WebSocket 대비 단방향으로 충분, HTTP/2 호환, 재연결 불필요 |
| `fetch` + `ReadableStream` (not `EventSource`) | POST 요청 필요 (EventSource는 GET만 지원) |
| `scaleX` transform 유지 | 섹션 3 B-1에서 적용한 compositor-only 렌더링 유지 |
| 안전 계수 1.15 | 진행률이 90%를 초과하지 않도록 과소추정 방지 |
