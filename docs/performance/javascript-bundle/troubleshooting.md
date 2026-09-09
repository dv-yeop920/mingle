# JavaScript 번들 미사용 코드 트러블슈팅 기록

2026-09-09

## 문제

Lighthouse 성능 측정에서 "사용하지 않는 JavaScript"과 "레거시 코드 줄이기"가 지적됨. 두 항목의 실제 원인과 조치 가능 여부를 분석.

## 원인 분석

### 1. 레거시 코드 — 이슈 아님

빌드 출력(`.next/static/chunks/`)을 검사한 결과 이미 modern JS(const, arrow functions, classes, optional chaining). Lighthouse가 가리키는 polyfills 청크(110K)는 `<script nomodule>` 속성으로 현대 브라우저에서 자동 스킵됨. tsconfig `target: ES2017`은 SWC 빌드 출력에 영향 없음.

**결론**: browserslist 변경, 폴리필 제거, tsconfig target 변경 모두 불필요.

### 2. 미사용 JavaScript — 데드 코드 + barrel export 부작용

두 가지 원인으로 분리됨:

**2-1. 완전한 데드 코드 (import 0개)**

grep으로 프로젝트 전체 import를 검색한 결과, 테스트 파일 외 소비자가 0개인 코드:

| 파일 | 내용 | 확인 방법 |
|------|------|-----------|
| `shared/lib/debounce.ts` + 테스트 | debounce 유틸 | `useDebouncedValue` 훅이 별도 존재, 이 파일은 미사용 |
| `shared/lib/throttle.ts` + 테스트 | throttle 유틸 | 프로젝트 전체 import 0개 |
| `shared/ui/progress-bar/` (3파일) | ProgressBar 컴포넌트 | barrel에서 export되지만 소비자 0개 |
| `entities/member/ui/member-card/` (3파일) | MemberCard 컴포넌트 | barrel에서 export되지만 소비자 0개 (`EditableMemberCard`는 별개) |
| `entities/group/api/hooks.ts` | useGroups 훅 | barrel에서 export되지만 소비자 0개 |

**2-2. barrel export의 서버 전용 코드 유출**

`entities/analysis/index.ts`에서 `ANALYSIS_INSTRUCTIONS`, `GROUP_ANALYSIS_RULES`, `buildAnalysisInput` 등 서버 전용 prompt 함수(한국어 분석 지침 ~7.5KB)를 클라이언트 접근 가능 barrel로 re-export. 유일한 소비자인 API 라우트(`app/api/analyze/route.ts`)는 deep import(`@/entities/analysis/api/prompt`) 사용 중이므로 barrel export는 불필요.

**2-3. 외부 라이브러리 barrel 비효율**

`@supabase/supabase-js`, `@tanstack/react-query`, `zod`, `zustand` 등 외부 패키지의 barrel import가 tree-shaking을 방해. Next.js의 `optimizePackageImports`로 빌드 시 직접 파일 import로 변환 가능.

## 해결

### 적용된 변경

**1. 데드 코드 삭제 (13파일, -422줄)**

- `shared/lib/debounce.ts` + `debounce.test.ts` 삭제
- `shared/lib/throttle.ts` + `throttle.test.ts` 삭제
- `shared/ui/progress-bar/` 디렉토리 삭제 + barrel export 제거
- `entities/member/ui/member-card/` 디렉토리 삭제 + barrel export 제거
- `entities/group/api/hooks.ts` + `queries.ts` 삭제 + barrel export 제거

**2. 서버 전용 export 분리**

`entities/analysis/index.ts`에서 prompt 관련 export 전부 제거. API 라우트의 deep import(`@/entities/analysis/api/prompt`)는 영향 없음.

**3. optimizePackageImports 설정 추가**

`next.config.ts`에 `experimental.optimizePackageImports` 추가:

```ts
experimental: {
  optimizePackageImports: [
    '@supabase/supabase-js',
    '@tanstack/react-query',
    'zod',
    'zustand',
  ],
},
```

> 주의: Next.js 16에서는 `experimental` 하위에 위치해야 함. 최상위에 두면 TypeScript 에러 발생 (`'optimizePackageImports' does not exist in type 'NextConfig'`).

### 미적용 (이슈 아님 확인)

| 항목 | 이유 |
|------|------|
| polyfills 청크 (110K) | `noModule` 속성으로 현대 브라우저에서 자동 스킵 |
| tsconfig target ES2017 | SWC가 컴파일 담당, 빌드 출력에 영향 없음 |
| browserslist 변경 | Next.js 기본값이 이미 현대 브라우저 타겟 |
| openai SDK (21MB) | 서버 전용, 클라이언트 번들에 미포함 |
| features/test-flow barrel (76 re-export) | optimizePackageImports로 빌드 레벨에서 처리 |

## 검증 결과

- `npm run build` 성공
- `npx eslint src/` 에러 없음
- 주요 청크 크기 안정 (236K, 202K, 196K, 185K — 프레임워크/라이브러리 내부)
- 삭제된 코드의 소비자가 0개임을 모두 grep으로 사전 확인

## 후속 작업

- `docs/performance/javascript-bundle/design-note.md`에서 계획 중인 공통 UI 중복 최적화(ToastProvider barrel → 직접 import 실험)는 별도 작업
