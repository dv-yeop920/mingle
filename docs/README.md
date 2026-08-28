# MIXTI 문서 인덱스

문서를 작업 흐름 순서로 정리한다.

---

## 1. 설계

| 문서 | 내용 |
|------|------|
| [plan.md](./plan.md) | 최초 개발 계획서 — FSD 폴더 구조, 라우팅, 기능별 구현 범위 |
| [Design.md](./Design.md) | 디자인 시스템 — 토큰, 컴포넌트 스펙, 레이아웃 기준 |
| [requirements.md](./requirements.md) | 기능 요구사항 — 핵심 유저 시나리오, 화면별 상세 |
| [open-ai-requirements.md](./open-ai-requirements.md) | OpenAI 분석 요구사항 — 프롬프트 설계, 응답 스키마 |

## 2. 인프라 가이드

| 문서 | 내용 |
|------|------|
| [supabase-guide.md](./supabase-guide.md) | Supabase 작업 가이드 — DB 스키마, RLS, Auth, 마이그레이션 |
| [playwright-guide.md](./playwright-guide.md) | Playwright MCP 테스트 가이드 |

## 3. 마이그레이션

| 문서 | 내용 |
|------|------|
| [splash-overlay-migration.md](./splash-overlay-migration.md) | Splash 독립 페이지 → 오버레이 위젯 전환 |

## 4. 성능 최적화 (시간순)

| 문서 | 시점 | 내용 |
|------|------|------|
| [performance.md](./performance.md) §1 | 08-20 | 폰트 TTF → woff2 변환 (11MB → 1.2MB) |
| [performance.md](./performance.md) §3 | 08-27 | FCP 최적화 + 애니메이션 jank 수정 (7건) |
| [performance.md](./performance.md) §4 | 08-27 | 분석 프로그레스 바 실시간 SSE 연동 |
| [performance.md](./performance.md) §5 | 08-28 | 첫 화면 INP 최적화 (456ms → 목표 200ms 이하) |
| [performance-home-ssr.md](./performance-home-ssr.md) | 08-28 | 홈 SSR 리팩토링 — queryOptions + HydrationBoundary |

## 5. 품질 검증

| 문서 | 내용 |
|------|------|
| [audit-2026-08-26.md](./audit-2026-08-26.md) | 전체 검증 감사 — ESLint, TS, 테스트 187개, SEO, 코드 리뷰, E2E |
| [seo-audit.md](./seo-audit.md) | SEO 감사 및 최적화 기록 |

## 6. 트러블슈팅

| 문서 | 내용 |
|------|------|
| [troubleshooting.md](./troubleshooting.md) | OpenAI 연동, 결과 화면, Supabase 관련 트러블슈팅 |

## 7. 기타

| 문서 | 내용 |
|------|------|
| [MIXTI_Mobile_App.dc.html](./MIXTI_Mobile_App.dc.html) | 디자인 컴프 (HTML export) |

## 8. 측정 자료

| 파일 | 내용 |
|------|------|
| [perf-report.png](./perf-report.png) | 홈 SSR 리팩토링 성능 리포트 (Performance API 수치) |
| [home-after-hydration-boundary.png](./home-after-hydration-boundary.png) | 홈 페이지 풀페이지 스크린샷 (HydrationBoundary 적용 후) |
| lighthouse-home.report.html | Lighthouse dev 서버 측정 (참고용) |
| lighthouse-home-prod.report.html | Lighthouse 프로덕션 빌드 측정 |
