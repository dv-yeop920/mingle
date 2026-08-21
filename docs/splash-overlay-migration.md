# Splash 오버레이 마이그레이션

## 배경

기존에는 Splash 화면이 `(auth)` route group의 `/` 경로에 **독립 페이지**로 존재했다. 사용자가 앱에 진입하면 splash 페이지가 렌더링되고, 이후 `/home`으로 라우팅되면서 `(main)` layout tree가 처음부터 마운트되는 구조였다.

이 구조의 문제:

- `(auth)`와 `(main)`은 별도의 layout tree를 가진다. splash → home 전환 시 **full unmount/remount**가 발생한다.
- Home 화면의 data fetch(React Query)가 전환 후에야 시작되므로, splash가 끝나면 로딩 상태가 먼저 보인다.
- 사용자 경험: splash → 빈 화면 → 홈 콘텐츠 (이중 로딩감)

## 해결 방향

Splash를 별도 페이지가 아닌 **오버레이 위젯**으로 전환한다. HomeView와 SplashOverlay를 같은 페이지에서 동시에 마운트하면, splash가 화면을 덮고 있는 동안 HomeView가 백그라운드에서 렌더링과 data fetch를 완료할 수 있다.

```
변경 전: / (splash page) → navigate → /home (home page, 이 시점에 fetch 시작)
변경 후: / (home page + splash overlay, 동시 마운트 → fetch 즉시 시작)
```

## 주요 변경사항

### 라우트 이동

| 변경 전 | 변경 후 |
|---------|---------|
| `/` → SplashView (auth group) | `/` → HomeView + SplashOverlay (main group) |
| `/home` → HomeView (main group) | `/home` → `redirect('/')` (하위 호환) |

### SplashOverlay 위젯 구현

`src/widgets/splash-overlay/splash-overlay.tsx`

핵심 설계:

1. **동시 마운트**: HomeView와 SplashOverlay가 Fragment로 나란히 렌더링된다. Overlay는 `fixed inset-0 z-50`으로 전체 화면을 덮는다.
2. **세션 당 1회**: `sessionStorage`로 표시 여부를 관리한다. 같은 탭 세션 내에서는 한 번만 노출된다.
3. **Phase 기반 애니메이션**: `visible` → (2초) → `fading` → (transition 500ms) → `done` → DOM 제거

### BottomNav 수정

홈 경로가 `/home` → `/`로 변경되면서, 기존의 `pathname.startsWith(item.href)` 로직에 문제가 생겼다. `/`는 모든 경로에 매치되기 때문이다.

```tsx
// 변경 전: 모든 경로에서 홈이 active
const isActive = pathname.startsWith(item.href);

// 변경 후: / 는 exact match, 나머지는 prefix match
const isActive = item.href === '/'
  ? pathname === '/'
  : pathname.startsWith(item.href);
```

## 성능 개선

### 1. 라우트 전환 제거 → 레이아웃 리마운트 방지

**Before**: `(auth)/` → `(main)/home` 이동 시 두 route group의 layout tree가 다르므로 MobileFrame, BottomNav 등이 전부 unmount → remount된다. 이 과정에서 React tree 전체가 재구성되고, 모든 client component의 state가 초기화된다.

**After**: 홈이 처음부터 `(main)` group 안에 있으므로 layout 리마운트가 없다. BottomNav, MobileFrame 등은 이미 마운트된 상태로 유지된다.

### 2. Data fetch 선행 (Perceived Performance)

**Before**: splash 페이지에서 2초 대기 → home으로 라우팅 → React Query `useAnalyses()` fetch 시작 → 로딩 UI → 데이터 표시. 사용자는 splash 2초 + fetch 지연을 순차적으로 경험한다.

**After**: HomeView가 splash와 동시에 마운트되므로 `useAnalyses()`가 즉시 실행된다. Splash가 2초간 화면을 덮고 있는 동안 data fetch가 병렬로 완료된다. Splash가 사라지면 홈 콘텐츠가 이미 렌더링된 상태로 노출된다.

```
Before: |--splash 2s--|--navigate--|--fetch ~500ms--|--render--|
After:  |--splash 2s (fetch 병렬)--|--fade 500ms--|--즉시 노출--|
```

### 3. Hydration 안전한 sessionStorage 접근

SSR 환경에서 `sessionStorage`는 서버에 존재하지 않는다. 단순히 `typeof window` 체크로 분기하면 서버와 클라이언트의 초기 HTML이 달라져 **hydration mismatch**가 발생한다.

`useSyncExternalStore`를 사용해 이를 해결했다:

```tsx
const shouldShow = useSyncExternalStore(
  emptySubscribe,     // sessionStorage는 구독 불필요
  getClientSnapshot,  // client: sessionStorage 체크
  getServerSnapshot,  // server: 항상 true (오버레이 렌더)
);
```

**동작 흐름**:
- 서버: `getServerSnapshot()` → `true` → 오버레이 HTML 포함하여 전송
- 클라이언트 hydration: 서버 snapshot(`true`)으로 시작 → 서버 HTML과 일치 → hydration 성공
- hydration 직후: client snapshot 확인 → 재방문이면 `false` → 동기 re-render로 오버레이 즉시 제거 (flash 없음)

### 4. sessionStorage 기록 시점 최적화

sessionStorage 기록을 애니메이션 시작 시점이 아닌 **완료 시점**으로 지연시켰다:

```tsx
// 기록은 phase가 'done'이 된 후
useEffect(() => {
  if (phase !== 'done') return;
  sessionStorage.setItem(STORAGE_KEY, '1');
}, [phase]);
```

이유: `useSyncExternalStore`는 매 렌더마다 `getClientSnapshot()`을 호출한다. 만약 fading 전에 sessionStorage를 기록하면, `setPhase('fading')` 트리거된 re-render에서 `shouldShow`가 `false`로 바뀌어 fade 애니메이션 없이 즉시 사라진다.

기록을 `done` 시점으로 미루면 애니메이션이 진행되는 동안 `shouldShow`는 계속 `true`를 유지하여 정상적으로 fade-out이 완료된다.

### 5. React Compiler 호환

React 19 + React Compiler 환경에서는 useEffect 내 **동기 setState가 lint 에러**를 발생시킨다:

```
Error: Calling setState synchronously within an effect can trigger cascading renders
```

이 규칙에 맞추기 위해:
- 재방문 판별: `useSyncExternalStore`로 렌더 시점에 계산 (effect 내 setState 불필요)
- 타이머 콜백: `setTimeout` 내부의 `setPhase('fading')`는 비동기이므로 규칙에 해당하지 않음
- 트랜지션 완료: `onTransitionEnd` 이벤트 핸들러에서 `setPhase('done')` → effect가 아닌 이벤트 핸들러이므로 허용

## 파일 변경 목록

### 신규
- `src/widgets/splash-overlay/splash-overlay.tsx` — 오버레이 위젯
- `src/widgets/splash-overlay/types.ts` — Props 타입
- `src/widgets/splash-overlay/index.ts` — barrel export
- `src/widgets/splash-overlay/splash-overlay.test.tsx` — 테스트 (4 cases)
- `src/app/(main)/page.tsx` — `/` 라우트 (HomeView + SplashOverlay)

### 삭제
- `src/app/(auth)/page.tsx` — 구 splash 페이지
- `src/views/splash/splash-view.tsx` — 구 splash 뷰
- `src/views/splash/types.ts`
- `src/views/splash/index.ts`

### 수정
- `src/app/(main)/home/page.tsx` — `redirect('/')` 하위 호환
- `src/widgets/bottom-nav/constants.ts` — home href `/home` → `/`
- `src/widgets/bottom-nav/bottom-nav.tsx` — NAV_ICONS 키 변경 + exact match 로직
- `src/features/auth/api/actions.ts` — redirect 경로 변경
- `src/features/auth/api/actions.test.ts` — 테스트 assertion 경로 변경
- `src/app/not-found.tsx` — 홈 링크 경로 변경
