# 홈 LCP 트러블슈팅 기록

2026-09-08

## 문제

사용자 측정 Lighthouse 75점 / LCP 6.1초 보고. 홈 페이지가 `getAuthenticatedClient()`를 상위에서 await한 뒤 전체 렌더링을 시작하여 공개 콘텐츠(HeroCard, SeoIntro)도 인증 완료까지 대기.

## 원인 분석

### 1차 원인: 인증 blocking 렌더

`src/app/(main)/page.tsx`의 `HomePage`가 async로 `getAuthenticatedClient()`를 await → userId를 HomeView에 전달. 인증이 느릴 경우 전체 페이지 HTML 전송이 지연됨.

```text
[Before] 요청 → proxy 세션 갱신 → getUser() await → 전체 HTML 생성 → 전송
```

### 2차 원인 (미해결): proxy 세션 갱신 지연

`src/proxy.ts`의 공개 `/` 라우트도 세션 갱신 과정에서 `getClaims`를 기다림. 이 TTFB는 렌더링 경계 변경으로 제거되지 않음. proxy 자체의 인증 검사는 별도 최적화 대상.

### 3차 원인 (잠재): 폰트 로딩

Gothic A1 / Nunito 웹폰트가 텍스트 LCP 요소의 render delay에 기여할 수 있음. 현재 측정에서는 분리되지 않았으나 프로덕션 trace에서 확인 필요.

## 해결

### 적용된 변경 (b32d8a8)

공개 콘텐츠와 인증 콘텐츠의 Suspense 경계 분리:

```text
[After] 요청 → proxy → initial shell (HeroCard, SeoIntro 포함) 즉시 전송
                        → Suspense: 헤더 인증 (52px fallback)
                        → Suspense: 최근 테스트 인증 (null fallback)
```

- `HomePage`: 동기 렌더, 인증 await 제거
- `HomeView`: 두 개의 독립 Suspense 경계
- `HomeHeaderContainer` / `RecentTestsContainer`: 서버 인증 경계 분리
- `getHomeAuth`: 게스트 세션 vs 인증 장애 구분

### 미적용 (별도 작업 대상)

| 항목 | 상태 | 비고 |
|------|------|------|
| proxy TTFB 개선 | 미착수 | 공개 라우트의 getClaims 제거/지연 검토 |
| 폰트 preload/서브셋 | 미착수 | trace에서 render delay 확인 후 |
| 서버 개인 데이터 prefetch 복원 | 의도적 제외 | 클라이언트 query의 결정적 skeleton이 우선 |

## 검증 결과

- 로컬 production build 5회 측정: FCP/LCP 중앙값 약 10% 개선
- 구조 검증: 인증 대기 전 initial shell에 HeroCard, SeoIntro, CTA 링크 포함 확인
- streaming 테스트: `renderToPipeableStream` onShellReady 시점에 공개 콘텐츠 존재 확인
- 기존 홈 테스트 15건 + 전체 244건 통과
- ESLint / TypeScript 에러 없음

## 후속 측정 필요

1. **프로덕션 Lighthouse**: Vercel 배포 후 동일 조건(모바일, Simulated throttling) 5회 중앙값
2. **실제 네트워크 TTFB**: Supabase 인증 latency가 포함된 환경에서 Before/After 비교
3. **회원 시나리오**: 인증 쿠키 유효 상태에서의 LCP/CLS 측정
4. **CLS 추적**: 회원 최근 테스트 카드 삽입 시 SeoIntro 밀림 정도
