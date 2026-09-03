# 안정적인 웹폰트 로딩 설계

## 배경과 목표

Next.js 16.3.1의 `next/font/local`이 생성한 CSS 모듈에는 Vercel `deploymentId`가 붙은 폰트 URL이 포함된다. Vercel의 webpack 캐시가 이전 배포 CSS를 재사용하면 HTML preload는 현재 배포의 `?dpl=...` URL을, CSS의 `@font-face`는 이전 배포의 `?dpl=...` URL을 가리킨다. 브라우저는 내용이 같은 파일도 URL이 다르면 별도 리소스로 취급하므로 Gothic A1 약 994KB가 중복 다운로드된다.

이번 변경의 목표는 다음과 같다.

- 브라우저용 폰트를 `next/font` 빌드 산출물에서 분리한다.
- CSS와 HTML preload가 배포와 무관한 동일한 버전 URL을 참조하게 한다.
- 현재 family별 `font-display` 동작(Gothic A1 `optional`, Nunito `swap`)과 fallback 글꼴 메트릭 보정을 유지한다.
- 홈의 알려진 텍스트 LCP 후보인 SeoIntro 본문(`font-bold` 700)과 Hero/title(`font-black` 900)에 필요한 Gothic A1 700, 900만 preload하고 나머지 weight는 실제 사용 시 로드한다.
- OG 이미지와 앱 아이콘 생성에 필요한 TTF는 현재 서버 전용 경로에 그대로 둔다.

성공 기준은 단일 배포의 우연한 캐시 정합성이 아니라 **서로 다른 deployment ID를 가진 두 번의 연속 프로덕션 배포**에서 동일하게 충족되어야 한다.

## 1단계: 요구사항 정리

### 사용자 행동과 상태

이 변경은 UI 기능이나 인터랙션을 추가하지 않는다. 사용자는 기존과 동일하게 모든 페이지를 탐색하고 입력·제출할 수 있어야 하며, 폰트 로딩 상태 때문에 콘텐츠 표시나 인터랙션이 차단되어서는 안 된다.

런타임 상태는 다음 세 가지다.

1. Gothic A1이 optional block period 안에 준비됨: 지정 웹폰트로 첫 렌더링한다.
2. Gothic A1이 늦거나 네트워크가 느림: 보정된 시스템 fallback으로 즉시 렌더링하고 해당 navigation에서는 늦은 swap을 하지 않는다.
3. Nunito가 늦게 준비됨: 현재와 동일한 `swap` 정책에 따라 보정된 fallback에서 Nunito로 전환한다.
4. 폰트 요청 실패 또는 오프라인: fallback을 유지하며 화면과 기능은 정상 동작한다.

### 긍정적 요구사항

- Gothic A1 400/700/800/900과 Nunito 800/900의 기존 weight 매핑을 보존한다.
- Gothic A1의 `@font-face`는 현재와 동일하게 `font-display: optional`, Nunito의 `@font-face`는 현재와 동일하게 `font-display: swap`을 사용한다.
- Gothic A1 fallback은 현재 `next/font/local`이 생성한 Arial 보정값을 보존한다.
  - `ascent-override: 78.69%`
  - `descent-override: 19.94%`
  - `line-gap-override: 24.66%`
  - `size-adjust: 101.39%`
- Nunito fallback도 현재 생성값을 보존한다.
  - `ascent-override: 93.65%`
  - `descent-override: 32.70%`
  - `line-gap-override: 0%`
  - `size-adjust: 107.95%`
- 기존 `--font-gothic-a1`, `--font-nunito`, `--font-family-gothic`, `--font-family-nunito` 계약과 Tailwind `font-nunito` 사용처는 변경하지 않는다.
- preload와 `@font-face src`는 정확히 같은 `/fonts/v1/...` URL을 사용한다.
- 폰트 URL에는 `?dpl=` 또는 `/_next/static/media/`가 포함되지 않아야 한다.
- `/fonts/v1/*`는 1년 immutable 캐시를 사용한다. 폰트 바이트를 변경할 때는 기존 파일을 덮어쓰지 않고 `/fonts/v2/`로 올린다.

### 부정적 요구사항과 경계

- React 상태, Zustand, React Query, API, 인증, DB는 변경하지 않는다.
- 화면 마크업, 타이포그래피 크기, weight 클래스, 색상, 라우팅은 변경하지 않는다.
- Gothic A1 400/800과 Nunito는 preload하지 않는다.
- `src/app/fonts/gothic-a1-800.ttf`는 삭제·이동하지 않는다. `opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx`의 Satori 입력으로 계속 사용한다.
- CDN 캐시 purge나 Vercel 빌드 캐시 비활성화를 상시 해결책으로 삼지 않는다.
- 사용자가 폰트 로딩 실패를 별도 UI로 처리할 필요는 없다. fallback이 graceful degradation이다.

### 엣지 케이스

| 상황 | 기대 동작 |
|---|---|
| 느린 모바일 네트워크 | Gothic A1은 fallback 콘텐츠를 즉시 표시하고 늦은 swap을 하지 않는다. Nunito는 기존 `swap` 동작을 유지한다. |
| 재방문 | versioned public URL의 immutable 캐시를 재사용한다. |
| 배포 직후 이전 HTML/CSS 캐시 혼재 | 양쪽 모두 동일한 `/fonts/v1/...`를 가리켜 중복 요청이 없다. |
| 특정 weight 미사용 | 해당 파일은 CSS에 선언되어도 네트워크 요청되지 않는다. |
| 폰트 404 | 시스템 fallback으로 기능과 레이아웃을 유지한다. |
| 다음 폰트 파일 개정 | `/fonts/v2/`와 CSS/preload를 한 커밋에서 함께 전환한다. |

## 2단계: 아키텍처 흐름 설계

### 빌드와 요청 흐름

```text
소스 WOFF2
  -> public/fonts/v1/* (파일명과 URL 고정)
  -> Vercel 정적 파일 제공 (immutable)

globals.css
  -> shared/styles/fonts.css
  -> @font-face src: /fonts/v1/*
  -> :root의 기존 폰트 변수 계약 제공

RootLayout <head>
  -> Gothic A1 700/900 preload
  -> @font-face와 정확히 같은 /fonts/v1/* 요청을 재사용
```

`next/font/local` import와 호출을 제거하면 Next.js가 font CSS module, 해시 media 파일, 자동 RSC font hint를 만들지 않는다. 따라서 deployment ID가 폰트 식별자에 들어갈 경로 자체가 사라진다.

### SSR/CSR 및 이벤트 체인

- 폰트 선언과 preload는 루트 Server Component 및 전역 CSS에서만 처리한다.
- Client Component 또는 hydration 범위는 늘어나지 않는다.
- 브라우저는 HTML을 파싱하며 Gothic A1 700/900 요청을 시작한다. 700은 알려진 홈 LCP 후보인 SeoIntro 본문에, 900은 Hero/title에 사용되며, CSS 파싱 후 같은 URL을 발견하면 기존 요청을 재사용한다.
- 다른 weight는 실제 computed style에서 필요할 때만 요청한다.
- 네트워크나 애플리케이션 상태 전이는 없으며 navigation 간 별도 JS side effect도 없다.

### 캐시 버전 규칙

- URL 버전을 폴더 단위로 관리한다: `/fonts/v1/<family>-<weight>.woff2`.
- `next.config.ts`의 좁은 source 패턴 `/fonts/v1/:path*`에만 `Cache-Control: public, max-age=31536000, immutable`을 적용한다.
- v1 파일은 배포 후 바이트 불변이다. 변경이 필요하면 v2 파일 추가 → CSS와 preload 동시 전환 → 충분한 기간 후 사용하지 않는 구버전 정리 순서를 따른다.

## 3단계: 데이터와 상태 관리 설계

이 변경에는 서버 데이터와 클라이언트 상태가 없다. React Query key, mutation, invalidation, Zustand store, Zod 스키마를 추가하지 않는다.

관리 대상은 다음의 정적 계약뿐이다.

| 계약 | 단일 원칙 |
|---|---|
| asset identity | `/fonts/v1/<family>-<weight>.woff2` |
| family variable | `--font-gothic-a1`, `--font-nunito` |
| fallback | Arial 기반 metric-adjusted face |
| preload | Gothic A1 700, 900만 허용 |
| cache invalidation | 파일 덮어쓰기 대신 URL version 증가 |

CSS와 layout에 URL 문자열이 각각 존재하므로 구현·리뷰 단계에서 두 위치의 정확한 일치를 검사한다. 런타임에서 URL을 조합하거나 환경변수로 deployment ID를 넣지 않는다.

## 4단계: UI 컴포넌트와 접근성

### 컴포넌트 변경

새 UI 컴포넌트는 없다. `RootLayout`은 기존 `<html lang="ko">`, `<head>`, Provider, Speed Insights, Google Analytics 구조를 유지하고 폰트 className만 제거한다. UI 에이전트에 위임할 마크업·스타일 컴포넌트 작업이 없으므로 구현 단계에서는 Frontend 에이전트가 CSS 인프라와 layout 연결만 담당한다.

### 접근성 및 시각적 회귀

- 폰트가 실패해도 텍스트는 숨겨지지 않고 읽을 수 있어야 한다.
- fallback stack은 Arial 보정 face 다음에 `system-ui`, `sans-serif`를 유지한다.
- 보정값으로 fallback과 웹폰트의 line box 차이를 줄여 CLS를 억제한다.
- 한국어, 영문, 숫자, MBTI 배지, 굵기 400/700/800/900의 대표 화면을 모바일 폭에서 비교한다.
- 키보드 포커스, 탭 순서, ARIA, 터치 타겟은 마크업 무변경이므로 영향이 없어야 한다.
- visual QA 대상은 홈, 로그인, 멤버 설정, 결과, 마이페이지다. 특히 줄바꿈이 민감한 Hero 제목, SEO 소개 문단, 결과 카드, 숫자 게이지를 확인한다.

## 5단계: 성능, 장애, 운영

### 성능 예측

| 항목 | 현재 | 변경 후 목표 |
|---|---|---|
| Gothic A1 중복 | 다른 `?dpl=` URL로 약 994KB 중복 가능 | 0KB |
| 초기 preload | Gothic A1 네 weight가 자동 preload될 수 있음 | 홈 LCP 후보에 필요한 700/900 두 파일만 |
| 폰트 URL | 배포 ID와 Next 빌드 산출물에 결합 | 배포 독립 `/fonts/v1/*` |
| 늦은 swap | Gothic A1은 optional, Nunito는 swap | 현재 family별 동작을 그대로 유지 |
| CLS | RUM P75 0, DevTools 측정 0.084 변동 관찰 | RUM 회귀 없음, cold DevTools CLS 0.1 이하 |
| JS/hydration | 추가 없음 | 추가 없음 |

### 장애 매트릭스

| 실패 | 탐지 | 대응 |
|---|---|---|
| public 폰트 누락/404 | 빌드 후 URL HEAD/GET, 브라우저 Network | 배포 중단 또는 즉시 롤백 |
| preload/CSS URL 불일치 | HTML/CSS 문자열 검사, Network initiator | 동일 v1 URL로 수정 후 재배포 |
| MIME 또는 CORS 문제 | Network response headers, 콘솔 | `font/woff2`와 same-origin 요청 확인 |
| 과도한 preload | HTML의 font preload 개수 검사 | Gothic A1 700/900 외 preload 제거 |
| fallback CLS 회귀 | cold mobile Lighthouse, 화면 비교, Speed Insights | metric override 재검증 또는 롤백 |
| immutable URL에 바이트 변경 | checksum 비교 | 덮어쓰지 않고 v2 발행 |

### 로깅과 관측

- 브라우저 Network에서 URL, initiator, transfer size, status, cache 여부를 기록한다.
- Lighthouse는 Mobile + DevTools throttling으로 5회 실행하고 중앙값을 사용한다.
- Simulated throttling은 PageSpeed 점수 추적용 보조 지표로 별도 기록하되 DevTools 결과와 직접 비교하지 않는다.
- Vercel Speed Insights Production / Mobile / P75의 LCP, FCP, CLS를 배포 전 기준선과 비교한다.
- 코드에 사용자 행동 로그나 폰트 전용 런타임 로깅은 추가하지 않는다.

## 정확한 마이그레이션 계획

### 변경 파일

| 파일 | 작업 |
|---|---|
| `public/fonts/v1/gothic-a1-400.woff2` | `src/app/fonts`의 동일 WOFF2를 바이트 변경 없이 이동한다. |
| `public/fonts/v1/gothic-a1-700.woff2` | 동일 |
| `public/fonts/v1/gothic-a1-800.woff2` | 동일 |
| `public/fonts/v1/gothic-a1-900.woff2` | 동일 |
| `public/fonts/v1/nunito-800.woff2` | 동일 |
| `public/fonts/v1/nunito-900.woff2` | 동일 |
| `src/shared/styles/fonts.css` | 여섯 개 `@font-face`, 두 fallback face, 기존 이름의 CSS 변수 두 개를 선언한다. Gothic A1은 `font-display: optional`, Nunito는 `font-display: swap`과 정확한 v1 URL을 사용한다. |
| `src/app/globals.css` | Tailwind import 다음, tokens/theme보다 앞에 `fonts.css`를 import한다. |
| `src/app/layout.tsx` | `next/font/local` import와 두 loader 호출, `<html>`의 generated variable className을 제거한다. `<head>`에 Gothic A1 700/900용 font preload 두 개를 `as="font"`, `type="font/woff2"`, `crossOrigin="anonymous"`로 추가한다. 700은 SeoIntro 본문 LCP 후보, 900은 Hero/title을 위한 preload다. |
| `next.config.ts` | `/fonts/v1/:path*`에만 1년 immutable 응답 헤더를 추가한다. 기존 React Compiler와 Cache Components 설정을 보존한다. |
| `src/app/fonts/*.woff2` | public v1으로 이동 완료 후 여섯 파일을 제거하여 브라우저 폰트 source of truth를 하나로 만든다. |
| `src/app/fonts/gothic-a1-800.ttf` | 변경하지 않는다. OG 이미지·icon·apple-icon 전용으로 유지한다. |
| `docs/performance/optimization-log.md` | 구현과 두 배포 검증이 끝난 뒤 실제 요청 수, 전송량, Lighthouse 중앙값, RUM 결과를 기록한다. |

### 구현 순서

1. Test 에이전트가 현재 WOFF2 체크섬과 파일 크기를 기준선으로 기록한다.
2. Frontend 에이전트가 WOFF2 여섯 개를 `public/fonts/v1`로 이동하고 `fonts.css`를 작성한다.
3. Frontend 에이전트가 globals/layout의 `next/font` 연결을 수동 CSS/preload로 교체한다.
4. Frontend 에이전트가 versioned 폰트 캐시 헤더를 추가한다.
5. Test 에이전트가 lint, unit test, production build와 로컬 브라우저 검증을 실행한다.
6. Review 에이전트가 URL 일치, fallback 보정, OG TTF 보존, FSD/import 규칙, 불필요한 변경 여부를 검토한다.
7. 사용자 승인 범위에 배포가 포함된 경우에만 첫 번째 production 배포와 두 번째 no-op 또는 후속 production 배포를 수행해 CDN/webpack 캐시 혼재 조건을 검증한다.

## 검증 계획

### 로컬 정적·빌드 검증

- 이동 전후 각 WOFF2의 SHA-256이 동일한지 확인한다.
- `rg "next/font|localFont" src/app/layout.tsx` 결과가 없어야 한다.
- `rg "_next/static/media|\\?dpl=" src/shared/styles/fonts.css src/app/layout.tsx` 결과가 없어야 한다.
- CSS의 URL 여섯 개가 실제 public 파일과 1:1 대응해야 한다.
- layout의 preload는 정확히 두 개이고 CSS의 Gothic A1 700/900 URL과 byte-for-byte 동일해야 한다.
- `rg "gothic-a1-800.ttf" src/app`에서 OG 이미지, icon, apple-icon의 세 참조가 유지되어야 한다.
- `npm run lint`, `npm test`, `npm run build`가 통과해야 한다.
- production build 산출 CSS/HTML에 `next/font`가 만든 폰트 media URL과 자동 font preload가 없어야 한다.

### 로컬 브라우저 검증

- production server의 `/fonts/v1/*`가 200, `Content-Type: font/woff2`, 의도한 Cache-Control을 반환하는지 확인한다.
- 새 incognito context와 cache disabled 상태에서 홈을 연다.
- 동일 font URL이 두 번 전송되지 않고 preload 요청이 CSS에서 재사용되는지 initiator로 확인한다.
- Mobile + DevTools throttling Lighthouse를 5회 측정해 score, FCP, LCP, TBT, CLS, Speed Index 중앙값을 기록한다.
- 기존 중앙값(score 93, FCP/LCP 2.223s, TBT 146ms, CLS 0.084, SI 2.274s) 대비 LCP 악화가 10%를 넘거나 CLS가 0.1을 넘으면 원인을 해결하기 전 배포하지 않는다.

### 연속 프로덕션 배포 검증

각 배포마다 완전히 새로운 incognito context와 cold navigation을 사용한다.

1. **배포 A**
   - HTML과 연결 CSS를 저장한다.
   - font preload와 `@font-face`가 `/fonts/v1/*`만 참조하고 `?dpl=`이 없는지 확인한다.
   - WOFF2 요청별 URL, initiator, transferred bytes를 기록한다.
   - 동일 URL의 중복 HTTP 200 전송이 0인지 확인한다.
   - Mobile DevTools Lighthouse 5회 중앙값을 기록한다.
2. **배포 B**
   - 폰트 source를 변경하지 않은 별도 deployment ID로 연속 배포한다.
   - A와 동일한 절차를 반복한다.
   - HTML이 B, CSS 일부가 캐시된 A에서 왔다고 가정해도 두 문서의 font URL이 모두 동일한 `/fonts/v1/*`인지 비교한다.
   - 과거 배포의 `?dpl=` 폰트 요청, `/_next/static/media/*woff2`, 약 994KB Gothic A1 중복이 다시 나타나지 않아야 한다.
3. **RUM 확인**
   - 충분한 표본이 쌓인 뒤 Production / Mobile / P75를 기준선(LCP 1.83s, FCP 1.78s, CLS 0, RES 99)과 비교한다.
   - 표본이 적으면 성급히 성공/실패를 단정하지 않고 DevTools 측정과 Network 사실을 우선 기록한다.

최종 완료 조건은 배포 A와 B 모두에서 폰트 중복 전송 0, deployment ID 결합 URL 0, font 404 0이며, Lighthouse와 RUM에 유의한 회귀가 없는 것이다.

## 위험과 완화책

| 위험 | 완화 |
|---|---|
| `next/font` 자동 최적화 상실 | 현재 자동 생성된 fallback 메트릭을 명시적으로 보존하고, 수동 preload를 필요한 두 weight로 제한한다. |
| CSS 변수 누락으로 전체 fallback | 기존 변수 이름을 그대로 정의하고 computed `font-family`를 브라우저에서 확인한다. |
| 수동 CSS 이전 중 family별 display 정책이 달라짐 | Gothic A1 `optional`, Nunito `swap`을 정적 검사하고 느린 네트워크에서 각각의 기존 동작을 확인한다. |
| immutable 캐시에 잘못된 파일 고착 | v1 파일을 절대 덮어쓰지 않고 모든 수정은 v2 URL로 발행한다. |
| preload가 실제 above-the-fold 사용과 어긋남 | 알려진 홈 LCP 후보에 직접 쓰이는 700/900 두 개로 제한하고 Coverage/Network에서 장기적으로 재평가한다. |
| OG 이미지 폰트 손상 | TTF와 세 server-side 참조를 변경 대상에서 명시적으로 제외하고 OG/icon URL을 smoke test한다. |

## 롤백 계획

문제 발생 시 변경 커밋 전체를 revert하여 `src/app/fonts/*.woff2`, `next/font/local`, generated CSS variables와 자동 preload를 복원한다. `src/app/fonts/gothic-a1-800.ttf`는 애초에 변경하지 않으므로 OG 경로에는 별도 복구가 필요 없다.

`public/fonts/v1` 파일은 롤백 직후 삭제할 필요가 없다. 참조가 끊긴 정적 파일은 사용자 동작에 영향을 주지 않으며, 삭제는 후속 정리 커밋에서 수행한다. immutable 캐시 때문에 v1 파일 자체가 잘못된 경우에도 같은 URL을 덮어쓰지 않고 롤백하거나 v2로 전환한다.

롤백 후에는 Network에서 기존 `next/font` 요청이 정상 복구됐는지와 Speed Insights의 LCP/CLS가 기준선으로 돌아왔는지 확인한다. 다만 기존 방식의 deployment ID 혼재 및 약 994KB 중복 위험도 함께 돌아오므로 롤백은 단기 장애 대응으로만 사용한다.

## 승인 게이트

이 문서는 설계만 확정한다. 사용자 승인 전에는 폰트 파일 이동, CSS/layout/config 변경, 테스트 코드 작성, 배포를 수행하지 않는다.
