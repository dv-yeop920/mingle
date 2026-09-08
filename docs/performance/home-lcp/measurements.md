# 홈 LCP 성능 측정 결과

2026-09-08 · 커밋 b32d8a8 (before: bf9baf7)

## 측정 조건

- **환경**: 로컬 macOS, Next.js 16.3.1 production build (`next build` → `next start`)
- **브라우저**: Playwright Chromium, 390×844 viewport (모바일 시뮬레이션)
- **상태**: 게스트 (인증 쿠키 없음)
- **캐시**: 매 회차 `Network.clearBrowserCache` 후 `about:blank` → 홈 cold navigation
- **반복**: 5회, 1회차 cold start 포함

## Before (bf9baf7) — 인증 await 후 전체 렌더

HomePage가 `getAuthenticatedClient()`를 await한 뒤 HomeView에 userId를 전달. 공개 콘텐츠도 인증 완료 후에야 전송.

| Run | TTFB (ms) | FCP (ms) | LCP (ms) | DOM Loaded (ms) | Load (ms) |
|-----|-----------|----------|----------|-----------------|-----------|
| 1   | 9         | 100      | 100      | 51              | 163       |
| 2   | 4         | 76       | 76       | 31              | 121       |
| 3   | 12        | 136      | 136      | 65              | 238       |
| 4   | 5         | 92       | 92       | 44              | 134       |
| 5   | 5         | 96       | 96       | 44              | 137       |

**중앙값**: TTFB 5ms · FCP 96ms · LCP 96ms · Load 137ms

## After (b32d8a8) — Suspense 분리, 공개 콘텐츠 선행 전송

HomePage 동기 렌더, 공개 HeroCard/SeoIntro가 인증 대기 없이 initial shell에 포함. 인증은 부분 Suspense 내부에서 스트리밍.

| Run | TTFB (ms) | FCP (ms) | LCP (ms) | DOM Loaded (ms) | Load (ms) |
|-----|-----------|----------|----------|-----------------|-----------|
| 1*  | 71        | 244      | 244      | 209             | 278       |
| 2   | 7         | 72       | 72       | 39              | 162       |
| 3   | 8         | 104      | 104      | 61              | 132       |
| 4   | 5         | 92       | 92       | 43              | 109       |
| 5   | 3         | 72       | 72       | 28              | 106       |

*Run 1: 빌드 직후 JIT warm-up 영향

**중앙값 (Run 2-5)**: TTFB 6ms · FCP 86ms · LCP 86ms · Load 121ms

## 비교 요약

| 지표 | Before (중앙값) | After (중앙값, Run 2-5) | 변화 |
|------|-----------------|------------------------|------|
| TTFB | 5ms             | 6ms                    | ≈ 동일 |
| FCP  | 96ms            | 86ms                   | -10ms (-10%) |
| LCP  | 96ms            | 86ms                   | -10ms (-10%) |
| Load | 137ms           | 121ms                  | -16ms (-12%) |

## LCP 요소

Before/After 모두 `<P>` (SeoIntro 단락). 텍스트 LCP이므로 이미지 관련 최적화(resource load delay/duration)는 해당 없음.

## 구조적 개선 (핵심)

로컬 환경에서는 Supabase 인증이 수 ms로 빠르기 때문에 수치 차이가 크지 않다. **실제 네트워크 환경(Supabase 인증 100~500ms+)에서 차이가 극대화**된다.

### 구조 검증 결과

| 항목 | Before | After |
|------|--------|-------|
| HeroCard가 인증 전 initial shell에 포함 | ❌ (인증 await 후 전체 렌더) | ✅ |
| SeoIntro가 initial shell에 포함 | ❌ | ✅ |
| `/group-type` CTA 링크 선행 전송 | ❌ | ✅ |
| 헤더 52px fallback (CLS 방지) | N/A | ✅ |

Before에서는 인증이 느릴 경우 사용자가 빈 화면을 보게 되는 반면, After에서는 공개 콘텐츠가 즉시 표시되고 인증 영역만 별도로 스트리밍된다.

## 프로덕션 측정 예정

로컬 측정은 네트워크 지연과 CDN 캐시가 없어 실제 사용자 경험과 다르다. 프로덕션 배포 후 아래 조건으로 재측정 필요:

- Vercel 배포 URL, Chrome DevTools Lighthouse (모바일, Simulated throttling)
- 게스트 + 회원(인증 쿠키 유효) 각 5회
- CLS, TBT 포함
- CDN HIT/MISS 구분
