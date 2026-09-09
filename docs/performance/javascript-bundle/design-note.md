# JavaScript 번들 중복 최적화 설계

작성일: 2026-09-09 · 상태: 구현 및 검증 완료

앱 전반의 성능 작업이므로 기존 `docs/performance/*/design-note.md` 관례를 따른다. 사용자는 2026-09-09 구현을 승인하면서 현재 수정한 파일의 컴포넌트 구조를 유지하도록 요청했다. 이에 Providers의 ToastProvider import 한 줄만 변경했으며 JSX·컴포넌트 구조·상태·Provider 순서를 유지했다. 이후 측정 시 현재 커밋은 `ada6037`이며 이번 재측정에서는 커밋·푸시를 수행하지 않았다.

최소 import 변경으로 홈 초기 gzip 목표를 달성하여 조건부 PageSpinner 변경은 생략했다. 빌드·관련 기존 테스트·변경 파일 ESLint 및 홈에서 멤버 입력까지의 브라우저 검증을 완료했다. Lighthouse 모바일도 전후 각 3회 실행했다. 성능 점수 중앙값은 71→70이며 unused/legacy 경고는 해소되지 않았다. 측정 결과와 검증 범위는 [measurements.md](./measurements.md)에 기록한다. 인증된 라우트의 실제 동작과 상호작용 전후 Coverage 비교는 별도 미검증 범위이다.

## 1. 요구사항 정리

목표는 미사용 소스 줄 수가 아니라 브라우저가 초기 다운로드하는 JavaScript를 줄이는 것이다. 우선 홈에서 확인된 공통 UI 중복을 해소하고, 같은 측정 조건에서 리팩토링 전 HEAD 수준 이하로 초기 gzip 합계를 낮추는 것을 목표로 한다. 절감량은 구현 후 빌드로 판정한다.

이전 검토에서 전달받은 비교값은 아래와 같다. 이번 계획 작성 중 재측정한 값은 아니며, 구현 시작 시 커밋·작업 트리 스냅샷 및 측정 방법과 함께 재현한다.

| 구성 | 전체 JS gzip 합계 | 홈 초기 JS gzip 합계 |
| --- | ---: | ---: |
| 리팩토링 전 HEAD | 492,627 B | 277,079 B |
| 미사용 코드 삭제·export 정리만 | 495,600 B | 279,723 B |
| 현재 작업 트리: 삭제 + optimizePackageImports | 493,466 B | 279,235 B |

현재 홈 증가는 HEAD 대비 2,156 B이다. `optimizePackageImports`는 삭제만 적용한 구성보다 홈을 488 B 줄였으므로 첫 실험에서는 유지한다. 이전 검토의 청크 분석에서는 `BottomSheet`, `TextField`, `Button`이 루트 레이아웃과 공통 청크에 중복 포함됐다. 청크 분할 기준의 정확한 원인이나 직접 import의 효과까지 확정한 것은 아니다.

사용자 행동과 상태에 대한 보존 조건:

- 홈 진입, 테스트 시작, 로그인 이동과 클라이언트 라우팅이 유지된다.
- 입력 → 검증 오류 → 수정 → 제출 흐름, 버튼의 비활성화·로딩 표시가 유지된다.
- 바텀시트 최초 열기·닫기·재열기 시 기존 Activity 상태 보존과 포커스 복귀가 유지된다.
- 토스트 성공·오류·안내 표시, 자동 닫힘, 페이지 이동 후 표시가 유지된다.
- 로그인·비로그인 및 빈 데이터·요청 실패 상태에서 기존 화면과 인증 경계가 유지된다.

새 기능, UI 디자인, 입력 제약, API 동작, 지원 브라우저 범위 변경은 요구사항에 포함되지 않는다.

## 2. 아키텍처 흐름 설계

현재 확인한 진입 경로:

```text
app/layout → app/providers ('use client')
  → shared/ui/index.ts → toast/index.ts → toast-provider.tsx
                                              → toast-item.tsx → shared/lib/utils
```

`shared/ui/index.ts`는 Toast 외에 BottomSheet·Button·TextField 등을 함께 export한다. ToastProvider 자체는 ToastItem과 타입을 상대경로로 가져오며 루트 UI barrel을 다시 import하지 않는다. 여러 page/loading 파일도 루트 UI barrel에서 PageSpinner를 가져온다. 이는 검사 대상 경로이며, barrel 사용 자체가 항상 중복을 발생시킨다는 의미는 아니다.

첫 변경 후보는 `src/app/providers.tsx`의 ToastProvider import를 `@/shared/ui/toast/toast-provider`로 좁히는 한 가지 실험이다. 동일한 export와 컨텍스트를 사용하고 Provider 배치·QueryClient 생성·인증 캐시 동기화 순서는 유지한다. `useToast` 소비자가 다른 경로로 가져오더라도 동일 모듈로 해석되는지 빌드 및 실제 토스트 동작으로 확인한다.

효과가 부족하면 생성 청크의 모듈 포함 경로를 다시 확인하여 PageSpinner 등 다른 루트 barrel 진입점을 필요한 범위만 좁힌다. 전체 import 일괄 교체나 Next 내부 splitChunks 설정 변경으로 확대하지 않는다. 클라이언트 경계나 지연 로딩 변경이 필요하면 별도 설계를 제시한다.

## 3. 데이터와 상태 설계

데이터 모델·API·Query Key·React Query 캐시 정책·Zustand·폼 스키마는 변경하지 않는다. `src/shared/config/query-keys.ts`와 Providers의 `staleTime: Infinity`, `retry: 1`을 확인했다. 번들 경로 변경이 Provider 재마운트나 컨텍스트 이중 생성을 유발하지 않는지 검증한다.

분석 결과·인증 데이터가 필요한 브라우저 검증은 기존 테스트 fixture 또는 승인된 테스트 세션을 사용한다. 번들 검증을 위해 유료 AI 호출이나 운영 데이터 변경을 새로 발생시키지 않는다. 인증 상태별 검증이 불가능한 경우 해당 범위를 미검증으로 기록한다.

## 4. UI 및 접근성 검증

주요 회귀 시나리오는 홈 → 관계 유형 → 멤버 입력·MBTI 시트 → 기존 결과 fixture → 저장 시트, 로그인 폼 오류, 설정의 MBTI 시트, 토스트 표시이다. 최초 열기뿐 아니라 재열기와 뒤로가기를 확인한다. 현재의 loading/Suspense 및 Error Boundary 동작, 모바일 입력·포커스·스크롤 잠금, Toast의 `aria-live`와 오류 `role`을 유지한다.

단순 import 교체를 그대로 따라 쓰는 신규 단위 테스트는 추가하지 않는다. 기존 관련 테스트 및 브라우저 시나리오를 실행하고, 동작 변경이 필요한 범위로 커질 때만 의미 있는 회귀 테스트를 설계한다.

## 5. 성능·장애·운영 및 실행 계획

### 측정 계약

1. HEAD와 현재 사용자 작업 트리를 별도 복사본으로 보존한다. 사용자 변경을 덮어쓰거나 되돌리지 않는다. Node·패키지 매니저 버전, lockfile, 환경 구성, 소스 스냅샷과 측정 스크립트 버전을 기록한다. 환경변수 값은 보고서에 노출하지 않는다.
2. 모든 비교는 현행 `npm run build` (`next build --webpack`) 및 같은 프로덕션 실행 조건으로 한다. `.next` 잔여물이 없는 독립 빌드로 비교한다. 과거 `bundle-optimization.md`의 Turbopack·브라우저 네트워크 KB 값은 방법이 다르므로 직접 비교하지 않는다.
3. 전체 JS는 `.next/static`의 JS 파일을 파일별 동일 gzip 설정으로 압축한 합계로 정의한다. 초기 HTML 지표는 완료된 HTML의 동일 출처 JS script URL을 중복 제거하여 합산한다. 이전 값의 정확한 포함 규칙을 재현할 수 없으면 새 기준선을 만들고 기존 숫자와 구분한다.
4. `nomodule` 스크립트는 목록과 크기를 별도 표시하고 포함/제외를 모든 구성에서 통일한다. HTML 지표는 외부 스크립트·상호작용 후 import·prefetch·PPR 스트리밍 이후 브라우저가 추가 요청하는 JS 전체를 대변하지 않는다.
5. 별도로 새 브라우저 컨텍스트·동일 쿠키 상태·동일 대기 시간에서 네트워크를 기록한다. 최초 진입과 상호작용 후 누적 JS, 내부·외부 스크립트를 구분하고 Content-Encoding 및 캐시 사용 여부를 기록한다. 로컬 gzip 합계와 실제 CDN 전송 바이트를 혼용하지 않는다.
6. 모듈 중복은 파일명·숫자 모듈 ID만 비교하지 않고 소스 대응과 포함 경로로 확인한다. 최종적으로 홈에서 실제 함께 내려받는 청크의 동일 구현 중복 여부를 판정한다.

### 승인 후 단계

| 단계 | 담당 | 작업 및 산출물 |
| --- | --- | --- |
| A. 기준선 확정 | Test / Frontend | HEAD·현재 스냅샷, 재현 가능한 빌드·HTML·브라우저 측정표, 중복 모듈 경로 |
| B. 최소 실험 | Frontend | Providers의 ToastProvider 직접 import만 변경 → 빌드 및 초기 청크 비교 |
| C. 조건부 확대 | Frontend | B에서 중복이 남으면 관련 PageSpinner 진입점·하위 re-export 경로를 추적해 작은 변경별 재측정 |
| D. 검증 | Review → Test | `/review` 지침으로 품질 검토 후 `/test` 지침, lint·타입 검사·기존 테스트·프로덕션 빌드 및 브라우저 회귀 확인 |
| E. 결과 보고 | Frontend | 채택한 변경, 라우트별 before/after, 중복 해소 근거, Lighthouse 결과와 검증 제한 기록 |
| F. Ship | 승인된 범위에서 담당 에이전트 | 이후 구현·배포 요청 범위 확인 후 `/ship` 지침 적용. 계획 요청만으로 커밋·푸시하지 않음 |

변경 후보 파일:

- 우선 수정: `src/app/providers.tsx`.
- 분석 대상: `src/shared/ui/index.ts`, `src/shared/ui/toast/index.ts`, `src/shared/ui/toast/toast-provider.tsx`, `src/shared/ui/toast/toast-item.tsx`.
- 조건부 수정: `src/app/**/page.tsx`, `src/app/**/loading.tsx` 중 `@/shared/ui`의 PageSpinner 소비자. 실제 청크 분석으로 관련성이 확인된 파일만 선택한다.
- 설정 비교 대상: `next.config.ts`는 우선 그대로 유지한다.
- 결과 문서: `docs/performance/javascript-bundle/measurements.md`에 방법·구성별 수치·Lighthouse 보고서 위치를 기록한다.

### 통과·중단 기준

- 1차 목표: 홈의 확인된 UI 중복 해소 및 같은 조건의 초기 JS gzip이 HEAD 기준 277,079 B 이하. 현재 대비 최소 2,156 B 절감은 목표이며 보장값이 아니다. 기준선 재정의 시 동일 구성에서 재측정한 HEAD 값으로 대체한다.
- `/login`, `/members`, 유효한 fixture의 `/result`, 인증된 `/mypage/settings`에서도 초기 JS와 상호작용 후 누적 JS를 비교한다. HTML 검사만 로그인 리다이렉트를 측정한 경우 해당 라우트를 검증했다고 처리하지 않는다.
- 홈 감소가 재현되지 않거나 기능·접근성 회귀가 생기면 해당 실험 변경을 채택하지 않는다. 새로 만든 실험 변경만 되돌린다.
- 다른 대표 라우트에서 초기 또는 시나리오 누적 gzip이 현재 기준보다 1 KiB 이상 늘면 자동 채택을 중단하고 원인과 절충안을 보고한다. 전체 정적 JS gzip도 증가 여부를 보고하며 홈만 좋아진 결과를 전체 개선으로 표현하지 않는다.
- 효과가 작거나 재빌드 편차와 구별되지 않으면 같은 구성의 재빌드로 확인한다. 최소 import 실험과 관련 barrel 정리로 목표를 못 맞추면 대규모 리팩토링으로 확장하지 않고 남은 원인과 다음 제안을 보고한다.

### Lighthouse 및 레거시 JavaScript: 별도 판정

동일 Chrome/Lighthouse 버전·모바일 조건·URL·인증 상태에서 전후 각 3회 실행하고 중앙값과 개별 결과를 보관한다. unused JavaScript는 Coverage와 상호작용 전후 사용률을 함께 확인한다. 초기에는 미사용이더라도 이후 시트·폼에서 사용하는 코드를 삭제 대상으로 단정하지 않는다.

레거시 JavaScript는 보고서의 URL·폴리필·문법 변환 항목을 앱, 의존성, Next 런타임, 외부 스크립트로 귀속시킨다. 현재까지는 관련 초기 런타임 청크가 전후 동일하다는 검토 결과만 있다. 중복 제거가 레거시 경고를 해소한다고 약속하지 않는다. 지원 브라우저 합의와 호환성 검증 없이 폴리필 제거·브라우저 타깃 축소·프레임워크 내부 패치를 하지 않는다. 원인별 수정이 필요하면 근거를 갖춘 후속 계획으로 분리한다.

실제 비용 효과는 최종 전송량 감소와 캐시·과금 조건으로 별도 계산한다. 이 계획의 완료 기준은 비용 추정이나 Lighthouse 총점 상승이 아니라 재현 가능한 JS 감소와 기능 회귀 없음이다.

## 참조

- `AGENTS.md`, `.claude/agents/frontend.md`, `docs/guides/workflow.md`
- `docs/design/plan.md`, `docs/design/requirements.md`, `docs/performance/bundle-optimization.md`
- 설치된 Next 가이드: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- 설치된 Next 가이드: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/optimizePackageImports.md` (experimental)
- 설치된 Next 가이드: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (Server Component에서 Client Component 동적 import 시 분할 제한 확인)

AGENTS.md §0의 승인 조건은 2026-09-09 사용자 승인으로 충족했다. 승인 시 추가된 컴포넌트 구조 보존 조건을 지켜 최소 import 변경만 채택했다.
