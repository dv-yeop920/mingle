# JavaScript 번들 최적화 측정 결과

측정일: 2026-09-09

## 변경과 측정 기준

사용자가 리팩토링한 작업 트리를 변경 전 기준으로 삼아 최적화 후 프로덕션 빌드와 비교했다. `npm run build`의 Webpack 빌드를 사용했으며, 수치는 정적 JavaScript 파일을 파일별 gzip으로 압축한 로컬 합계이다. 초기 JavaScript는 라우트 HTML의 스크립트 기준으로, 실제 CDN 전송량이나 상호작용 이후 누적 요청량을 의미하지 않는다.

채택한 소스 변경은 `src/app/providers.tsx`의 ToastProvider import를 `@/shared/ui`에서 `@/shared/ui/toast/toast-provider`로 좁힌 한 줄이다. 사용자가 요청한 기존 컴포넌트 구조, JSX, 상태 및 Provider 순서를 유지했다. `optimizePackageImports`와 다른 기존 사용자 변경도 유지했다.

## gzip 크기 비교

| 측정 대상 | 변경 전 (B) | 변경 후 (B) | 차이 (B) |
| --- | ---: | ---: | ---: |
| 전체 정적 JS | 493,466 | 490,102 | −3,364 |
| 홈 초기 JS | 279,235 | 275,903 | −3,332 |
| `/login` 초기 JS | 278,514 | 275,184 | −3,330 |
| `/members` 초기 JS | 280,874 | 277,545 | −3,329 |
| `/result` 요청 HTML의 JS | 278,514 | 275,184 | −3,330 |
| `/mypage/settings` 요청 HTML의 JS | 279,235 | 275,903 | −3,332 |

홈은 리팩토링 전 HEAD 기준 277,079 B보다도 1,176 B 작아 계획의 1차 목표를 달성했다. 최소 변경으로 목표를 달성해 PageSpinner import 확대 변경은 진행하지 않았다.

루트 레이아웃 청크에 중복 포함됐던 BottomSheet·TextField·Button 구현이 제거됐다. `global-error`의 기존 Button 포함은 남아 있으며, 모든 청크에서 모든 중복을 제거했다는 의미는 아니다.

## 검증

- 프로덕션 빌드 통과.
- `src/app/providers.tsx` ESLint 통과.
- 기존 BottomSheet·TextField 테스트 2개 파일, 11개 테스트 통과.
- 브라우저에서 홈 → 관계 유형 다이얼로그 → 멤버 입력 이동 확인.
- 멤버 입력, MBTI 바텀시트 열기·선택·재열기·Escape 닫기 확인.

## 검증 범위의 한계

2026-09-09 Lighthouse 모바일 홈 재측정을 완료했다. 초기 탐색 감사이며 상호작용 전후 Coverage 비교는 수행하지 않았다. 인증된 설정 화면, 유효한 결과 fixture, 토스트의 전체 표시 시나리오 및 상호작용 후 누적 네트워크 전송량도 이 결과에서 검증 완료로 간주하지 않는다. 특히 `/result`와 `/mypage/settings`의 HTML 수치만으로 인증된 실제 화면의 번들·동작을 판정할 수 없다.

비용 절감액은 실제 CDN 압축·캐시·요청 수·과금 조건으로 별도 계산해야 한다. 위 표는 동일 로컬 기준에서의 JavaScript 크기 감소를 보여준다. 이번 측정 작업에서 커밋·푸시는 수행하지 않았다.

## Lighthouse 모바일 재측정

### 조건과 재현 방법

- 날짜: 2026-09-09. Lighthouse 13.4.1, HeadlessChrome 152.0.0.0, Node 20.13.1, npm 10.5.2.
- URL: `http://127.0.0.1:3200/`. 동일 포트에서 변경 전 3회 후 변경 후 3회를 순차 실행했다. 양쪽 모두 기존 `next build --webpack` 결과를 `next start`로 실행했다.
- 변경 전: 사용자 리팩토링과 `optimizePackageImports`가 반영됐지만 ToastProvider 직접 import는 적용 전인 보존 스냅샷 `after`. 변경 후: 직접 import가 적용된 `optimized`. 변경 후 스냅샷의 문서 외 tracked 파일은 현재 커밋 `ada6037`과 바이트 단위로 동일함을 확인했다. 두 스냅샷의 앱 소스 차이는 Providers import 한 줄이다.
- 매번 Lighthouse가 새 headless Chrome 프로필을 생성하며 로그인 없이 측정했다. 기존 사용자 브라우저 세션을 사용하지 않았다. storage reset 기본값을 유지했고 외부 스크립트 차단은 하지 않았다. Google Analytics 요청도 포함된다.
- 모바일 기본 화면 412×823, DPR 1.75, simulated throttling: RTT 150 ms, throughput 1,638.4 Kbps, CPU slowdown 4배. 전체 성능 카테고리만 실행했다. 6회 모두 `runWarnings`가 비어 있고 런타임 오류가 없었다.
- 명령 형태: `lighthouse http://127.0.0.1:3200/ --only-categories=performance --form-factor=mobile --throttling-method=simulate --chrome-flags='--headless --no-first-run' --output=json --output-path=<보고서 경로> --quiet`. 캐시된 CLI를 사용해 프로젝트 의존성을 추가하지 않았다.

원본 보고서: [변경 전 1](./lighthouse/before-run-1.json), [2](./lighthouse/before-run-2.json), [3](./lighthouse/before-run-3.json), [변경 후 1](./lighthouse/after-run-1.json), [2](./lighthouse/after-run-2.json), [3](./lighthouse/after-run-3.json).

### 개별 실행과 중앙값

시간 지표는 ms이며 소수 첫째 자리로 반올림했다. 중앙값은 반올림 전 원본 값으로 계산했다.

| 실행 | Performance | FCP | LCP | TBT | Speed Index | CLS | unused 추정 절감 (B) | legacy 추정 절감 (B) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 변경 전 1 | 71 | 2,465.5 | 6,387.3 | 188.5 | 2,465.5 | 0 | 170,574 | 12,096 |
| 변경 전 2 | 70 | 2,445.5 | 6,645.5 | 205.5 | 2,445.5 | 0 | 170,544 | 12,096 |
| 변경 전 3 | 72 | 2,435.3 | 6,647.1 | 158.5 | 2,435.3 | 0 | 170,490 | 12,096 |
| 변경 전 중앙값 | **71** | **2,445.5** | **6,645.5** | **188.5** | **2,445.5** | **0** | **170,544** | **12,096** |
| 변경 후 1 | 72 | 2,459.3 | 6,229.1 | 178.5 | 2,459.3 | 0 | 170,448 | 12,096 |
| 변경 후 2 | 70 | 2,438.5 | 6,651.3 | 206.0 | 2,438.5 | 0 | 169,999 | 12,096 |
| 변경 후 3 | 67 | 2,442.9 | 6,492.9 | 305.6 | 2,442.9 | 0 | 170,490 | 12,096 |
| 변경 후 중앙값 | **70** | **2,442.9** | **6,492.9** | **206.0** | **2,442.9** | **0** | **170,448** | **12,096** |

성능 점수는 71→70으로 상승하지 않았다. 실행 간 변동이 있고 외부 Analytics도 포함돼 있으므로 이 차이를 import 한 줄의 인과 효과로 단정하지 않는다. 로컬 gzip 감소는 확인했지만 Lighthouse 점수 개선이나 두 경고 해소는 확인되지 않았다.

### unused JavaScript

`unused-javascript.displayValue`는 변경 전 1·2회에서 `Est savings of 167 KiB`, 변경 전 3회와 변경 후 3회 모두에서 `Est savings of 166 KiB`다. `numericValue`는 **300 ms**로 바이트 값이 아니다. 위 표는 `details.overallSavingsBytes`를 사용했다. 감사에 표시된 항목별 절감 추정치는 다음과 같다.

| URL 또는 청크 | 변경 전 1 / 2 / 3 (B) | 변경 후 1 / 2 / 3 (B) |
| --- | ---: | ---: |
| `https://www.googletagmanager.com/gtag/js?id=G-392PDK5N3R` | 74,661 / 74,631 / 74,577 | 74,535 / 74,086 / 74,577 |
| `/_next/static/chunks/3967-8c127dc465373f92.js` | 47,373 / 47,373 / 47,373 | 47,373 / 47,373 / 47,373 |
| `/_next/static/chunks/292f05bb-5ed211a4f2180538.js` | 25,746 / 25,746 / 25,746 | 25,746 / 25,746 / 25,746 |
| `/_next/static/chunks/6334-b0c8359bc31877a5.js` | 22,794 / 22,794 / 22,794 | 22,794 / 22,794 / 22,794 |

표시된 자체 호스팅 3개 항목은 모든 실행에서 그대로다. 전체 중앙값의 96 B 차이는 외부 Analytics 항목 변동에서 발생했다. 홈 초기 gzip 3,332 B 감소와 unused 절감 추정은 서로 다른 측정값이다. 이번 import로 바뀐 청크들은 위 감사 항목에 없으므로, 전체 다운로드 감소가 감사의 절감 추정치 감소로 이어졌다는 근거는 없다. 제거된 개별 코드의 실행 여부까지 이 보고서만으로 단정하지 않는다.

### legacy JavaScript

Lighthouse 13.4.1의 감사 ID는 `legacy-javascript-insight`다. 6회 모두 `displayValue`는 `Est savings of 12 KiB`, `details.debugData.wastedBytes`는 **12,096 B**이며 `numericValue`는 없다. `metricSavings.LCP`는 변경 전과 변경 후 각각 150 / 150 / 0 ms이며, 중앙값은 양쪽 모두 150 ms다.

대상은 실제 로드된 `http://127.0.0.1:3200/_next/static/chunks/6334-b0c8359bc31877a5.js`다. 발견 신호는 `Array.prototype.at`, `Array.prototype.flat`, `Array.prototype.flatMap`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimEnd`, `String.prototype.trimStart`다. 이 청크는 전후 동일하며 설치된 Next의 `dist/client/app-globals.js`가 불러오는 `dist/build/polyfills/polyfill-module`과 관련된 초기 런타임이다.

별도 `polyfills-42372ed130431b0a.js`의 `nomodule` 속성을 근거로 이번 경고를 무시할 수 없다. 보고서는 그 파일이 아닌 위의 현대 브라우저용 초기 청크를 지목했다. 이번 import 변경은 이 런타임과 지원 브라우저 정책을 수정하지 않으므로 경고가 그대로 남았다. 폴리필 삭제나 브라우저 타깃 축소를 정당화하는 호환성 검증까지 수행한 것은 아니다.
