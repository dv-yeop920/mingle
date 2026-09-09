# JavaScript 번들 미사용 코드 트러블슈팅 기록

2026-09-09

## 문제

Lighthouse 성능 측정에서 "사용하지 않는 JavaScript"과 "레거시 코드 줄이기"가 지적됨. 두 항목의 실제 원인과 조치 가능 여부를 분석.

## 원인 분석

### 1. 레거시 코드 — 초기 런타임에서 경고 유지

초기 정적 검토에서는 별도 polyfills 청크의 `nomodule` 속성을 근거로 문제가 아니라고 판단했지만, 실제 Lighthouse 재측정으로 이 판단을 정정한다. 변경 전후 각 3회 모두 `legacy-javascript-insight`는 **12,096 B** 절감을 표시했다. 대상은 `polyfills-42372ed130431b0a.js`가 아니라 실제 로드된 `/_next/static/chunks/6334-b0c8359bc31877a5.js`다.

보고서 신호는 `Array.prototype.at`, `flat`, `flatMap`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimEnd`, `trimStart`다. 현대 문법 사용 여부와 불필요한 폴리필 포함 여부는 별개다. 이번 import 변경으로 경고는 해소되지 않았다. browserslist·폴리필·target 변경의 필요성은 호환성 조건과 함께 별도 검토해야 하며, 이번에는 변경하지 않았다. [변경 전 보고서](./lighthouse/before-run-1.json), [변경 후 보고서](./lighthouse/after-run-1.json).

### 2. 소스 정리와 실제 미사용 JavaScript 감사의 구분

아래는 소스에서 확인한 정리 대상이다. 파일이 사용되지 않는다는 사실만으로 해당 코드가 최적화된 클라이언트 번들에 포함됐거나 Lighthouse 경고의 원인이었다고 단정할 수 없다.

**2-1. 완전한 데드 코드 (import 0개)**

grep으로 프로젝트 전체 import를 검색한 결과, 테스트 파일 외 소비자가 0개인 코드:

| 파일 | 내용 | 확인 방법 |
|------|------|-----------|
| `shared/lib/debounce.ts` + 테스트 | debounce 유틸 | `useDebouncedValue` 훅이 별도 존재, 이 파일은 미사용 |
| `shared/lib/throttle.ts` + 테스트 | throttle 유틸 | 프로젝트 전체 import 0개 |
| `shared/ui/progress-bar/` (3파일) | ProgressBar 컴포넌트 | barrel에서 export되지만 소비자 0개 |
| `entities/member/ui/member-card/` (3파일) | MemberCard 컴포넌트 | barrel에서 export되지만 소비자 0개 (`EditableMemberCard`는 별개) |
| `entities/group/api/hooks.ts` | useGroups 훅 | barrel에서 export되지만 소비자 0개 |

**2-2. 불필요한 서버 전용 barrel export**

`entities/analysis/index.ts`에서 `ANALYSIS_INSTRUCTIONS`, `GROUP_ANALYSIS_RULES`, `buildAnalysisInput` 등 서버 전용 prompt 함수를 re-export하고 있었다. API 라우트(`app/api/analyze/route.ts`)는 deep import(`@/entities/analysis/api/prompt`)를 사용하므로 불필요한 barrel export를 제거했다. 이 사실만으로 한국어 prompt가 실제 브라우저 번들로 유출됐다고 확인한 것은 아니다.

**2-3. 외부 라이브러리 barrel 비효율**

`@supabase/supabase-js`, `@tanstack/react-query`, `zod`, `zustand`를 `optimizePackageImports` 대상으로 추가했다. 이 패키지들이 모두 tree-shaking을 방해한다는 주장은 검증하지 않았다. 동일 삭제 상태에서 설정 유무를 분리한 빌드 결과, 설정 추가는 전체 gzip 2,134 B와 홈 초기 gzip 488 B를 줄였다. 패키지별 기여도는 분리 측정하지 않았다.

**2-4. 실제 초기 감사에 남은 항목**

최종 Lighthouse에서 자체 호스팅 청크 `3967-8c127dc465373f92.js`, `292f05bb-5ed211a4f2180538.js`, `6334-b0c8359bc31877a5.js`의 미사용 절감 추정은 전후 각각 **47,373 B / 25,746 B / 22,794 B**로 동일했다. 외부 Google Analytics `https://www.googletagmanager.com/gtag/js?id=G-392PDK5N3R`도 약 74 KB의 항목으로 남았다. 소스 정리만으로 이 경고를 해결했다고 볼 수 없다.

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

**4. ToastProvider 직접 import**

`src/app/providers.tsx`의 ToastProvider를 `@/shared/ui/toast/toast-provider`에서 직접 가져오도록 변경했다. 기존 컴포넌트 구조와 상태는 유지했다. 루트 레이아웃에 중복 포함된 BottomSheet·TextField·Button 구현이 제거돼 홈 초기 gzip이 279,235 B에서 275,903 B로 **3,332 B 감소**했다.

### 미적용 및 판단 범위

| 항목 | 이유 |
|------|------|
| 별도 nomodule polyfills 청크 | 이번 legacy 보고서의 대상이 아님. 로드된 6334 청크에는 경고가 남음 |
| tsconfig target / browserslist 변경 | 이번 import 최적화 범위 밖. 지원 브라우저와 호환성 검증 없이 변경하지 않음 |
| openai SDK | 서버용 의존성의 설치 크기와 클라이언트 전송 크기는 다르므로 설치 용량을 절감량으로 계산하지 않음 |
| features/test-flow barrel | 현재 optimizePackageImports 목록은 외부 4개 패키지이며, 이 로컬 barrel까지 처리한다고 확인한 바 없음 |

## 검증 결과

- `npm run build` 성공
- `npx eslint src/` 에러 없음
- 최종 import 변경 후 전체 정적 JS gzip 493,466→490,102 B, 홈 초기 gzip 279,235→275,903 B
- 삭제된 코드의 소비자가 0개임을 모두 grep으로 사전 확인
- Lighthouse 모바일 전후 각 3회: 성능 점수 중앙값 **71→70**, unused 추정 **170,544→170,448 B**, legacy 추정 **12,096→12,096 B**
- unused의 작은 차이는 외부 Analytics 변동이며 감사에 표시된 자체 호스팅 3개 항목은 동일. 점수는 실행별 변동이 있어 import 변경의 인과 효과로 단정하지 않음
- 개별 실행 수치·조건·원본 보고서는 [measurements.md](./measurements.md)에 기록

## 후속 작업

- 공통 UI 중복 최적화는 완료했다. Lighthouse unused/legacy 경고는 남아 있으므로 각각 감사 URL과 초기·상호작용 후 사용률, Next 런타임 및 지원 브라우저 조건을 기준으로 후속 범위를 정한다. 이번 측정에서는 추가 소스 변경을 하지 않았다.
