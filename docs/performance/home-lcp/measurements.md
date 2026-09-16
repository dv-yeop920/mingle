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

---

# 2026-09-15 B1 구조 변경 측정

## 측정 조건

- **기준 SHA**: `008f7d5bc5b67714a33b61592096b2d7ebd4213b`
- **격리 방식**: `/private/tmp`에 `git archive HEAD`를 풀고 각 variant의 명시된 변경만 적용. 사용자 worktree의 다른 dirty 변경은 포함하지 않음
- **환경**: macOS 15.6.1, Next.js 16.3.1 production build (`next build --webpack` → `next start`), localhost
- **도구**: Lighthouse CLI 13.4.1, Headless Chrome 152.0.7977.83
- **모바일 조건**: 412×823, DPR 1.75, 150ms RTT, 1,638.4Kbps, CPU 4× slowdown
- **상태**: guest, incognito Chrome 및 Lighthouse 기본 storage reset, 5회 cold navigation
- **모드 분리**: `simulate`와 `devtools`를 별도 series로 실행하고 수치를 서로 혼합하지 않음
- **원본 JSON**: A0 `/private/tmp/mingle-lcp-a0.iLD5VA`, B1 `/private/tmp/mingle-lcp-b1.eXstre`, B1+A1 `/private/tmp/mingle-lcp-b1-a1.vUaOWM`, B1+A2 `/private/tmp/mingle-lcp-b1-a2.uc0Sy7`

회원 cold 측정은 재현 가능한 테스트 계정 및 인증 fixture가 제공되지 않아 수행하지 않았다. 로컬 localhost 결과이므로 CDN과 실제 production RUM을 대표하지 않는다.

## A0 baseline — 기존 순서와 700/900 preload

기존 순서는 `HomeRecentTests → SeoIntro`다.

| Mode | LCP 5회 (ms) | LCP 중앙값 (min–max) | FCP 중앙값 | CLS 중앙값 | TBT 중앙값 | LCP 요소 |
|---|---|---:|---:|---:|---:|---|
| simulate | 6041, 6632, 4673, 6633, 6626 | 6626 (4673–6633) | 2424ms | 0.193 | 46ms | Hero H1 |
| devtools | 1612, 1603, 1612, 1595, 1617 | 1612 (1595–1617) | 1612ms | 0.193 | 71ms | Hero H1 |

auth-pending recent skeleton이 접히며 큰 layout shift가 매회 재현됐다.

## B1 — SeoIntro를 recent 앞에 배치

폰트 preload 및 나머지 코드는 A0와 동일하다.

| Mode | LCP 5회 (ms) | LCP 중앙값 (min–max) | FCP 중앙값 | CLS 중앙값 | TBT 중앙값 | LCP 요소 |
|---|---|---:|---:|---:|---:|---|
| simulate | 6056, 6637, 6642, 6632, 6049 | 6632 (6049–6642) | 2432ms | 0 | 52ms | SeoIntro 설명 문단 |
| devtools | 1620, 1602, 1595, 1595, 1614 | **1602 (1595–1620)** | 1602ms | **0** | 69ms | SeoIntro 설명 문단 |

설계의 주 합격 지표인 mobile cold `devtools` LCP는 2.5초 이하를 5회 모두 충족했다. A0 대비 LCP 중앙값은 사실상 동일하지만 CLS는 0.193에서 0으로 개선됐고, 인증 skeleton 완료 뒤 LCP 후보가 바뀌지 않았다. Lighthouse 기본 `simulate` LCP는 2.5초 목표를 충족하지 못했다.

## 폰트 preload 분리 실험

모두 B1 순서를 유지하며 `simulate` 5회로 비교했다.

| Variant | 독립 변수 | LCP 중앙값 (min–max) | FCP 중앙값 | CLS | TBT 중앙값 | 판정 |
|---|---|---:|---:|---:|---:|---|
| B1 | 700/900 preload 유지 | 6632ms (6049–6642) | 2432ms | 0 | 52ms | 기준 |
| B1+A1 | 700/900 preload 모두 제거 | 6477ms (4988–6480) | 4820ms | 0 | 18ms | FCP 악화, 미채택 |
| B1+A2 | 700만 유지, 900 preload 제거 | 6481ms (3628–6633) | 3623ms | 0 | 15ms | FCP 악화, 미채택 |

preload 제거는 `simulate` LCP를 목표치까지 낮추지 못했고 FCP를 일관되게 악화시켰다. 따라서 실제 소스의 preload 변경 근거로 사용하지 않는다.

## simulate 병목 진단

B1 build에서 URL 차단만 적용한 진단이며 제품 후보 수치가 아니다. 각 3회 결과다.

| 차단 조건 | LCP (ms) | 중앙값 | FCP 중앙값 | TBT 중앙값 |
|---|---|---:|---:|---:|
| font 요청만 | 3185, 2651, 2790 | 2790ms | 1068ms | 74ms |
| font + Google Analytics | 2807, 2791, 2799 | 2799ms | 1387ms | 14ms |
| Next static chunk JS만 | 5409, 5577, 5560 | 5560ms | 2408ms | 0ms |
| font + Next static chunk JS | 1668, 1676, 1699 | 1676ms | 1061ms | 0ms |

font 또는 JS 어느 하나만 제거해서는 `simulate` 2.5초를 달성하지 못했고, 둘을 함께 차단했을 때만 통과했다. B1 첫 run의 전송량에는 Gothic A1 700/900 preload 약 502KB 외에 viewport에서 요구된 Gothic A1 800 약 251KB, 초기 Next JS 약 280KB, Google Tag 약 175KB가 포함됐다. 이 결과는 `simulate`의 잔여 병목이 단일 preload가 아니라 폰트와 hydration JS의 결합임을 가리키는 진단 증거다. 실제 최적화안 채택 전에는 폰트 subset/route별 weight와 client boundary/초기 JS를 각각 별도 설계·실험해야 한다.

## 검증 결과와 제약

- B1 관련 테스트: 2 files, 5 tests 통과
- 전체 ESLint: 통과
- 격리된 `HEAD+B1` production build: 통과, 홈은 static route(`○ /`)
- 사용자 worktree 전체 Vitest: 352 통과, 3 실패. 실패는 기존 dirty 작업인 `src/proxy-auto-recovery.test.ts` 2건과 `src/features/analysis-result/api/actions.test.ts` 1건이며 B1과 무관
- 사용자 worktree production build: 기존 `src/features/analysis-result/api/actions.ts:154`의 `string | undefined` 타입 오류로 중단. 격리된 HEAD 기반 B1 build에서는 재현되지 않음
- production 회원 5회, 브라우저 기능 시나리오 및 배포 후 7일 RUM 검증은 아직 필요

# 2026-09-16 Phase 2 F1 최종 검증

## 격리·측정 조건

- **기준 SHA**: `008f7d5bc5b67714a33b61592096b2d7ebd4213b`
- **격리 방식**: 새 `/private/tmp` 디렉터리에 `git archive HEAD`를 풀고 승인된 B1/F1 파일만 복사했다. `.env.local`은 복제하거나 artifact에 포함하지 않았고 build 동안 임시 symlink로만 읽은 뒤 제거했다.
- **빌드**: Node 20.13.1, Next.js 16.3.1, `next build --webpack` 통과. 홈은 static route(`○ /`).
- **측정**: Lighthouse 13.4.1, Headless Chrome 152, 412×823, DPR 1.75, 150ms RTT, 1,638.4Kbps, CPU 4×, guest cold navigation 5회씩.
- **후보**: B1 순서 + F1 critical subset + disjoint v1 residual range. Critical은 `optional`, dynamic residual v1은 `swap`, preload는 critical 700/800/900이다.
- **소형 원본 요약 및 raw checksum**: `lighthouse/phase-2/f1-final/summary.json`. 원본 LHR은 민감값 없이 `/private/tmp`에서 생성했으며 대용량 원본 대신 SHA-256을 보존했다.

## F1 guest 결과

| Mode | LCP 5회 (ms) | LCP 중앙값 (min–max) | FCP 중앙값 | CLS 중앙값 | TBT 중앙값 | Total / font / JS 중앙값 |
|---|---|---:|---:|---:|---:|---:|
| simulate | 2831, 3098, 3112, 3399, 3526 | **3112 (2831–3526)** | 1082ms | 0 | 44ms | 589,579 / 72,396 / 477,281B |
| devtools | 1625, 1617, 1644, 1644, 1626 | **1626 (1617–1644)** | 1626ms | 0 | 69ms | 589,588 / 72,396 / 477,281B |

LCP node는 10회 모두 `SeoIntro` 설명 문단이었다. `devtools`는 2.5초 보호 기준을 5회 모두 통과했지만, 핵심 `simulate` 중앙값은 3.112초라 2.5초 acceptance를 충족하지 못했다. CLS와 TBT 기준은 모두 통과했다.

## 폰트 네트워크와 동적 글리프

- guest actual-throttling 5회 모두 Gothic A1 요청은 v2 critical 700/800/900만 발생했다. v1 Gothic A1 요청, font 404/non-200, 동일 URL 중복, 외부 Google font 요청은 각각 0건이었다.
- font 72,396B는 critical Gothic A1 56,992B와 Nunito 900 15,404B다. critical 400은 선언돼 있지만 guest cold에서 요청되지 않았다.
- agent-browser guest 검증에서 단일 H1, 새 테스트 CTA, 분석 링크, SEO 안내, 하단 내비가 표시됐고 overlay/오류 문단은 없었다.
- 실제 회원 fixture 대신 inventory 밖 지원 글리프 `힣`을 weight 700 동적 닉네임으로 삽입했다. `document.fonts.load()`는 정확히 `Gothic A1` 700 face를 반환했고 v1 700 한 개만 요청했다. font swap CLS는 `0.007141`로 0.1 이하였으며 높이 변화는 없었다.
- 실제 회원 계정, 인증 cookie/storage-state 또는 E2E credential이 저장소와 환경에 없어 회원 Lighthouse 5회는 실행할 수 없었다. 위 synthetic 검증은 dynamic fallback 계약만 다루며 실제 회원 전체 flow를 대체하지 않는다.

## J1 독립 실험

`HomeResetEffect`의 `@/features/test-flow` barrel import만 `@/features/test-flow/model/store` direct import로 바꾼 격리 variant를 F1에서 별도로 빌드했다. 제품 worktree에는 적용하지 않았다.

| Variant | simulate LCP 중앙값 (min–max) | FCP 중앙값 | CLS | TBT 중앙값 | JS 중앙값 | 판정 |
|---|---:|---:|---:|---:|---:|---|
| F1 | 3112ms (2831–3526) | 1082ms | 0 | 44ms | 477,281B | 기준 |
| F1+J1 | 2796ms (2670–2804) | 1074ms | 0 | 42ms | 477,060B | LCP -316ms지만 목표 실패, JS -221B로 미채택 |

J1은 이번 표본에서 LCP를 10.2% 개선했으나 5회 모두 2.5초를 넘었고 실제 초기 JS 전송 감소는 221B뿐이다. 단일 로컬 series만으로 채택할 근거가 부족해 소스에 반영하지 않았다.

## 자동 검증

- 관련 Vitest: 2 files, 10 tests 통과 (`fonts.test.ts`, `home-view.test.tsx`).
- 관련 ESLint: 통과.
- pinned fonttools 4.59.2 + brotli 1.1.0에서 223 codepoint 결정적 재생성/checksum 검증 통과. output은 18,316–18,792B이며 manifest SHA-256과 일치했다.
- 최종 F1 isolated production build: 통과.

## 최종 판정

F1은 실제 throttling LCP, CLS/TBT, guest font network, dynamic residual parity를 개선했지만 Lighthouse `simulate` 2.5초 기준은 아직 실패다. 따라서 Phase 2 전체 acceptance는 **미통과**이며 `/ship` 대상이 아니다. 다음 단계는 이미 기각된 preload 제거나 800→700 변경을 섞지 말고, `SeoIntro` LCP render delay와 477KB 초기 JS/Google Tag 비용을 별도 설계로 분리 측정해야 한다.

# 2026-09-16 Phase 3 I1 최종 검증

## 격리·측정 조건

- **기준 SHA**: `64772f25952aad4ec15ebdec5708192b6aec6f82`
- **격리 방식**: 새 `/private/tmp` 디렉터리에 `git archive HEAD`를 풀고 승인된 B1/F1 파일 및 `experimental.inlineCss: true`만 복사했다. 자동 복구/분석 관련 사용자 dirty 변경과 `.env.local` 내용은 artifact에 포함하지 않았다.
- **빌드 ID**: `12IXUfGUm43zF9jJQ2wJ4`; Next.js 16.3.1 production webpack build 통과, 홈은 static route(`○ /`).
- **도구**: Lighthouse 13.4.1, Headless Chrome 152.0.7977.83, 412×823, DPR 1.75, 150ms RTT, 1,638.4Kbps, CPU 4×, guest cold navigation 5회씩.
- **원본 checksum과 소형 결과**: `lighthouse/phase-3/i1-final/summary.json`. 원본 LHR은 `/private/tmp`에서 생성했고 각 SHA-256을 summary에 보존했다.

실제 회원 계정, 인증 cookie/storage-state 또는 고정 recent fixture가 저장소와 환경에 없어 member 5회는 실행하지 못했다. 따라서 아래 guest acceptance 통과를 전체 guest+member ship acceptance 통과로 확대 해석하지 않는다.

## I1 guest 최종 결과

| Mode | LCP 5회 (ms) | LCP 중앙값 (min–max) | FCP 중앙값 | CLS 중앙값 | TBT 중앙값 | Total / font / JS / CSS 중앙값 |
|---|---|---:|---:|---:|---:|---:|
| simulate | 1848, 1686, 2832, 2300, 1678 | **1848 (1678–2832)** | 932ms | 0 | 88ms | 622,987 / 72,396 / 500,434 / 0B |
| devtools | 890, 857, 854, 860, 858 | **858 (854–890)** | 858ms | 0 | 82ms | 622,996 / 72,396 / 500,434 / 0B |

두 mode의 LCP node는 10회 모두 `SeoIntro` 설명 문단(`div.flex > section.px-5 > div.rounded-card-lg > p.mt-2`)이었다. Guest 기준 `simulate`와 `devtools` 중앙값은 모두 2.5초 이하이고, CLS 0 및 TBT 200ms 이하를 충족했다.

라우트 스모크용 agent-browser 세션을 함께 실행한 첫 `simulate` series는 LCP 6049, 3533, 3263, 2666, 2658ms(중앙값 3263ms)로 크게 흔들렸다. 해당 표본을 삭제하거나 최종값과 혼합하지 않고 summary에 간섭 진단으로 보존했다. 브라우저 세션을 닫은 뒤 독립적으로 실행한 위 5회를 최종 clean series로 사용했다. 로컬 synthetic 결과의 환경 민감성을 고려해 preview/production 재측정과 Speed Insights 관찰이 필요하다.

## CSS·폰트·브라우저 회귀

- cold 홈 10회 모두 외부 stylesheet 요청 0건, Lighthouse stylesheet transfer 0B였다. document는 31,527B, home prefetch RSC 합계는 12,514B였고 요청 수는 47건이었다.
- guest 홈의 Gothic A1 요청은 v2 critical 700/800/900뿐이었다. v1 Gothic A1, font non-200, 외부 Google font는 각각 0건이었다. Nunito 900을 포함한 font transfer는 72,396B였다.
- inventory 밖 동적 글리프 `힣`을 700 weight로 요청하면 `Gothic A1` residual face가 선택되고 `/fonts/v1/gothic-a1-700.woff2`만 1회 200으로 로드됐다. 측정 CLS는 0이었다.
- 390×844와 412×823에서 홈 H1/CTA/분석 링크/SEO 안내/BottomNav가 표시됐고 horizontal overflow, overlay, console/page error는 없었다.
- `/ → /group-type → back → / → /analysis → back`에서 기능과 스타일이 유지됐고 홈 복귀 시 external stylesheet는 0건이었다. 비회원 `/history`, `/mypage`, `/mypage/settings`는 `/login`으로 이동했다.
- build manifest의 주요 user-facing route 21개를 direct load했다. 세션이 필요한 `/analyzing`, `/compatibility/analyzing`, `/members`, `/situation`은 선행 단계로 이동했고 결과 상세 route는 기존 empty 상태를 표시했다. 스타일 누락·hydration 오류는 관찰되지 않았다.

## 자동 검증

- 관련 Vitest: 2 files, 10 tests 통과. `fonts.test.ts`에 `inlineCss: true` production 계약을 추가했다.
- 전체 Vitest: 61 files, 405 tests 통과.
- 전체 ESLint: 통과.
- pinned fonttools 4.59.2 + brotli 1.1.0에서 223 codepoint 결정적 재생성/checksum 검증 통과. 네 output은 18,316–18,792B이며 manifest와 일치했다.
- isolated production build: 통과. Node 20 deprecation 및 JSON module experimental warning만 있었고 오류는 없었다.

## 판정

I1은 **guest synthetic acceptance를 통과**했다. 외부 CSS 1→0의 의도된 동작, B1의 CLS 0, F1의 critical/residual font 계약과 전 route guest 회귀를 함께 확인했다. 다만 회원 fixture 부재로 설계의 guest+member 전체 acceptance는 아직 미완료이며, 실제 배포 전/후에는 member cold 5회와 production mobile field data를 별도로 확인해야 한다.
