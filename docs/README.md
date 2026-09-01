# MIXTI 문서 인덱스

---

## 1. 설계 (`design/`)

| 문서 | 내용 |
|------|------|
| [plan.md](./design/plan.md) | 최초 개발 계획서 — FSD 폴더 구조, 라우팅, 기능별 구현 범위 |
| [design-system.md](./design/design-system.md) | 디자인 시스템 — 토큰, 컴포넌트 스펙, 레이아웃 기준 |
| [requirements.md](./design/requirements.md) | 기능 요구사항 — 핵심 유저 시나리오, 화면별 상세 |
| [openai-requirements.md](./design/openai-requirements.md) | OpenAI 분석 요구사항 — 프롬프트 설계, 응답 스키마 |

## 2. 가이드 (`guides/`)

| 문서 | 내용 |
|------|------|
| [supabase.md](./guides/supabase.md) | Supabase 작업 가이드 — DB 스키마, RLS, Auth, 마이그레이션 |
| [playwright.md](./guides/playwright.md) | Playwright MCP 테스트 가이드 |

## 3. 성능 최적화 (`performance/`)

| 문서 | 내용 |
|------|------|
| [optimization-log.md](./performance/optimization-log.md) | 전체 성능 최적화 기록 (§1-§13) — 폰트, FCP, INP, SSR, PPR, font-display |
| [home-ssr.md](./performance/home-ssr.md) | 홈 SSR 리팩토링 — queryOptions + HydrationBoundary |

## 4. 품질 검증 (`audit/`)

| 문서 | 내용 |
|------|------|
| [full-2026-08-26.md](./audit/full-2026-08-26.md) | 전체 검증 감사 — ESLint, TS, 테스트 187개, SEO, 코드 리뷰, E2E |
| [seo.md](./audit/seo.md) | SEO 감사 및 최적화 기록 |

## 5. 트러블슈팅 (`troubleshooting/`)

| 문서 | 내용 |
|------|------|
| [splash-overlay-migration.md](./troubleshooting/splash-overlay-migration.md) | Splash 독립 페이지 → 오버레이 위젯 전환 |
| [openai-result.md](./troubleshooting/openai-result.md) | OpenAI 연동, 결과 화면, Supabase 관련 트러블슈팅 |
