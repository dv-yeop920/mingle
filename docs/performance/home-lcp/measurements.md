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

# 2026-09-17 Phase 3 A0/I1 재현 검증

## 격리·측정 조건

- **기준 SHA**: `febbb2df77271343f8064cca5bf569cf415412fb`
- **격리 방식**: 같은 `git archive HEAD`를 두 새 `/private/tmp` 디렉터리에 풀고 A0는 `experimental.inlineCss: false`, I1은 `true`만 유지했다. 두 variant 모두 같은 `node_modules`를 사용했고 `.env.local`은 build 동안 symlink로만 읽은 뒤 제거했다.
- **빌드 ID**: A0 `Wi_qukPr2GbHj0gHjn551`, I1 `RUnmjW-SI8Zn5nDLFbi4W`; 두 production webpack build 모두 통과했고 홈은 static route(`○ /`)였다.
- **도구**: Lighthouse 13.4.1, Headless Chrome 152.0.7977.83, 412×823, DPR 1.75, 150ms RTT, 1,638.4Kbps, CPU 4×, guest cold navigation 5회씩.
- **간섭 통제**: variant와 mode를 순차 실행했고 Lighthouse 측정 중 다른 브라우저 세션은 0개였다.
- **재현 명령·원본 checksum**: `lighthouse/phase-3/a0/summary.json`, `lighthouse/phase-3/i1-final/summary.json`. raw LHR 20개는 localhost를 `local.test`로 치환하고 binary screenshot만 제거해 총 4.2MB로 보존했다.

실제 회원 계정, 인증 cookie/storage-state 또는 고정 recent fixture가 저장소와 환경에 없어 member 5회는 실행하지 않았다. 회원 데이터를 제작하거나 인증을 우회하지 않았다.

## Paired guest cold 결과

| Variant / mode | TTFB 중앙값 | FCP 중앙값 | LCP 5회 (ms) | LCP 중앙값 (min–max) | CLS | TBT 중앙값 | Total / font / JS / CSS 중앙값 |
|---|---:|---:|---|---:|---:|---:|---:|
| A0 simulate | 10ms | 1072ms | 3109, 3108, 2801, 3099, 3099 | **3099 (2801–3109)** | 0 | 51ms | 589,780 / 72,396 / 477,479 / 11,792B |
| I1 simulate | 7ms | 914ms | 3151, 2966, 2976, 3258, 3257 | **3151 (2966–3258)** | 0 | 83ms | 622,997 / 72,396 / 500,443 / 0B |
| A0 devtools | 9ms | 1607ms | 1636, 1617, 1605, 1603, 1607 | **1607 (1603–1636)** | 0 | 63ms | 589,789 / 72,396 / 477,479 / 11,792B |
| I1 devtools | 7ms | 846ms | 865, 840, 846, 841, 846 | **846 (840–865)** | 0 | 61ms | 623,261 / 72,396 / 500,698 / 0B |

I1은 외부 CSS 요청을 1건/11,792B에서 0으로 제거했고 devtools LCP를 761ms(47%) 단축했다. 반면 paired clean `simulate`에서는 FCP만 158ms 개선됐고 LCP는 52ms 느려져 두 variant 모두 2.5초를 넘었다. LCP node는 전 회차 `SeoIntro` 설명 문단이었다. 따라서 이전 1.848초 summary는 이번 재현 표본으로 확인되지 않았으며 guest synthetic 전체 acceptance는 미통과다.

## Warm reload·return 회귀

같은 Chromium context와 cache를 유지해 warm reload 3회 후 `/ → /group-type → back`을 3회 반복했다.

| Variant | Warm TTFB / FCP / LCP 중앙값 | Warm CLS | Warm transfer 중앙값 | 스타일 계약 | Return 3회 CSS 요청 | Overflow |
|---|---:|---:|---:|---|---:|---:|
| A0 | 3.8 / 24 / 24ms | 0 | 21,061B | `<style>` 0, stylesheet link 1 | 0 | 없음 |
| I1 | 4.4 / 36 / 36ms | 0 | 41,755B | `<style>` 1, stylesheet link 0 | 0 | 없음 |

두 variant 모두 console error와 hydration error는 0이었다. 다만 initial load와 warm reload 3회 각각에서 `/login` prefetch HTML(`text/html`)이 Script로 분류되어 `Unexpected token '<'` page error가 1회씩 발생했다. A0/I1에 동일해 `inlineCss` 회귀는 아니지만 별도 기존 이슈로 남는다.

## 자동 검증

- A0/I1 isolated production build: 둘 다 통과.
- raw 20개 및 browser series 2개를 summary SHA-256과 대조했다.
- artifact 외 제품 소스와 설정은 변경하지 않았다.

## 판정

I1은 외부 CSS 제거와 devtools LCP 개선은 재현했지만 **clean `simulate` LCP 2.5초 기준을 재현하지 못했다**. Guest acceptance는 실패이며 member acceptance는 fixture 부재로 미실행이다. 현재 근거만으로 `/ship`하지 않는다.

## S1 격리 진단 — critical `font-display: swap`

I1에서 `Gothic A1 Critical` 400/700/800/900만 `optional`에서 `swap`으로 바꾸고 residual v1과 나머지 소스는 유지했다. 격리 build는 통과했으며 제품 worktree에는 적용하지 않았다.

| Variant / mode | LCP 5회 (ms) | LCP 중앙값 | 표준편차 | CLS | TBT 중앙값 | 판정 |
|---|---|---:|---:|---:|---:|---|
| I1 optional simulate | 3151, 2966, 2976, 3258, 3257 | 3151ms | 129ms | 0 | 83ms | 기준 실패 |
| S1 swap simulate | 2613, 2809, 2824, 3269, 2965 | 2824ms | 218ms | 0 | 68ms | 중앙값 -327ms, 전 회차 2.5초 초과 |
| I1 optional devtools | 865, 840, 846, 841, 846 | 846ms | 9ms | 0 | 61ms | 기준 |
| S1 swap devtools | 858, 881, 838, 830, 834 | 838ms | 19ms | 0.017263 | 60ms | LCP 차이 미미, 분산·CLS 악화 |

- 두 mode 10회 모두 critical 700/800/900과 Nunito 900이 200으로 완료됐다. critical 400은 guest viewport에서 요청되지 않았다.
- LCP node는 모두 같은 `SeoIntro` 문단이었다.
- simulate 최종 geometry는 optional/swap 모두 308×67px이었다. 실제 throttling에서는 optional 308×45px, swap 308×67px였고 swap 때 CLS 0.017263이 매회 발생했다.
- swap simulate 표준편차가 129ms에서 218ms로 커졌고 5회 모두 목표를 넘었다. 따라서 2.5초 이하로 robust해지지 않았으며 S1은 미채택이다.
- LCP 문단 자체가 700 weight라 700/900-only swap도 같은 문단 font swap과 geometry shift를 피하지 못한다. 추가 variant는 실행하지 않았다.

# 2026-09-17 Phase 3 I1 회원 검증

## 조건

- **기준 SHA / build ID**: `693eafee62563386bea6745dc7c26892997cde59` / `-l1fY2_cisVMqYxq88fZ`.
- HEAD를 새 격리 디렉터리에 archive해 `experimental.inlineCss: true` production build를 생성했다. 인증은 정상 로그인 UI로 한 번 수행했다.
- 전용 mode 700 Chrome profile에서 인증 cookie/storage를 유지하고 매 회차 HTTP cache만 삭제했다. Lighthouse 13.4.1, Chrome 152.0.7977.83, 412×823, DPR 1.75 조건으로 `simulate`와 `devtools`를 각각 5회 순차 실행했다.
- fixture는 최근 분석 0건이고 MBTI가 비어 있어 프로필 설정 안내가 표시됐다. fixture 데이터는 변경하지 않았다. 자격증명·token·사용자 식별자·원격 host는 문서와 추적 artifact에 저장하지 않았다.
- 비식별 상세 결과는 `phase-3-member-summary.json`, raw LHR과 전용 browser profile은 gitignore된 mode 700 `logs/performance/home-lcp/phase-3/member/`에 보존했다.

## 회원 cold 결과

| Mode | TTFB 중앙값 | FCP 중앙값 | LCP 5회 (ms) | LCP 중앙값 (min–max) | CLS 중앙값 | TBT 중앙값 | Total / font / JS / CSS 중앙값 |
|---|---:|---:|---|---:|---:|---:|---:|
| simulate | 14ms | 913ms | 3167, 2715, 2863, 2711, 2715 | **2715 (2711–3167)** | 0 | 64ms | 1,427,479 / 843,170 / 497,566 / 0B |
| devtools | 18ms | 877ms | 906, 877, 965, 865, 864 | **877 (864–965)** | 0.019334 | 88ms | 1,428,696 / 843,170 / 498,768 / 0B |

LCP node는 10회 모두 `SeoIntro` 설명 문단이었다. 외부 stylesheet 요청은 0건으로 I1 계약을 유지했다. 회원 동적 글리프로 v1 Gothic A1 700/800/900과 기존 Nunito 900이 요청됐고, v2 critical 4건을 합쳐 font 8건/843,170B가 전송됐다. `simulate` 중앙값은 목표를 215ms 초과했으며 5회 모두 2.5초를 넘었다. `devtools`, CLS, TBT 기준은 통과했다.

로컬 production server에서는 Speed Insights script endpoint가 HTML을 반환해 parse error가 반복됐다. 배포 전용 endpoint가 없는 로컬 환경의 기존 오류이며 회원 기능 실패로 이어지지는 않았지만, production/preview 재측정에서는 실제 script 응답과 LCP 영향을 별도로 확인해야 한다.

## 회원 흐름

- 개인화 헤더, 최근 기록 0건 빈 상태, 마이페이지 프로필과 0건 통계를 확인했다.
- 마이페이지에서 홈으로 client navigation한 뒤 인증 UI와 빈 상태가 유지됐고 busy UI, profile/analysis 재요청은 없었다.
- 로그아웃 후 guest 홈에서 최근 기록 영역이 사라졌고, 동일 fixture 재로그인 후 회원 상태가 복원됐다.
- 최종 로그아웃 후 인증 cookie는 0개였다. fixture가 하나뿐이라 A→B 계정 전환은 실행하지 않았다.

## 판정

회원 기능·CSS·실제 throttling 회귀는 통과했지만 핵심 `simulate` LCP 중앙값 2.715초로 **회원 acceptance는 실패**다. guest 재현 결과와 마찬가지로 I1을 2.5초 목표 달성으로 판정하거나 `/ship`할 수 없다.

# 2026-09-18 Phase 4 v3/prefetch 최종 검증

## 조건

- **기준 SHA / build ID**: `608c46ed40bf6011b56385ae43bbfb4399164269` / `R62ss8IAz_9-vxFLiwWm`.
- 현재 작업 트리의 전체 변경을 새 `/private/tmp` 디렉터리에 복사하고 `node_modules`와 `.env.local`만 symlink한 production webpack build를 사용했다. `logs/**`와 Lighthouse 자격증명 파일은 격리 복사본에 포함하지 않았다.
- Lighthouse 13.4.1, Chrome 152.0.7977.83, 412×823, DPR 1.75에서 guest/member와 `simulate`/`devtools`를 각각 5회 측정했다. 모든 series는 순차 실행했고 동시에 열린 다른 측정 브라우저는 없었다.
- guest는 매회 storage를 초기화했다. member는 정상 로그인 UI로 인증하고 매회 HTTP cache만 삭제했으며, 각 유효 표본에서 profile/analysis 요청을 확인했다.
- member fixture는 최근 분석 0건이고 MBTI가 비어 있어 설정 안내가 표시된다. 자격증명·token·사용자 식별자·원격 host는 추적 문서와 summary에 저장하지 않았다.
- 같은 시간대·동일 전체 소스의 pre-Phase-4 production build가 없어 A→B 비교는 수행하지 않았다. Phase 3 수치를 paired 결과로 취급하지 않는다.

## Cold 결과

| Audience / mode | TTFB 중앙값 | FCP 중앙값 | LCP 5회 (ms) | LCP 중앙값 (min–max) | CLS | TBT 중앙값 (range) | Total / font / JS / CSS 중앙값 |
|---|---:|---:|---|---:|---:|---:|---:|
| guest simulate | 11ms | 913ms | 3205, 2979, 3262, 3262, 3257 | **3257 (2979–3262)** | 0 | 107ms (72–119) | 619,298 / 72,740 / 500,824 / 0B |
| guest devtools | 8ms | 848ms | 882, 848, 885, 836, 845 | **848 (836–885)** | 0 | 59ms (57–80) | 619,307 / 72,740 / 500,824 / 0B |
| member simulate | 17ms | 910ms | 2861, 2711, 2862, 2711, 2714 | **2714 (2711–2862)** | 0 | 66ms (50–88) | 643,194 / 91,396 / 471,373 / 0B |
| member devtools | 6ms | 866ms | 867, 866, 861, 867, 863 | **866 (861–867)** | 0 | 79ms (73–80) | 643,251 / 91,396 / 471,373 / 0B |

- guest는 Gothic A1 critical v3 700/800/900과 Nunito 900만 요청해 font 4건/72,740B였다.
- member는 설정 안내의 고정 글리프를 포함한 critical v3 400/700/800/900과 Nunito 900만 요청해 font 5건/91,396B였다.
- guest/member 20회 모두 Gothic A1 v1 요청과 외부 stylesheet 요청은 0건이었다. `inlineCss` 계약도 browser flow에서 `<style>` 존재, stylesheet link 0건으로 확인했다.
- LCP node는 20회 모두 `SeoIntro` 설명 문단이었다.

## 브라우저·자동 검증

- 회원 개인화 헤더, 최근 기록 0건, MBTI 안내 sheet → 설정 이동, History 이동 → back, MyPage와 Settings의 지연 렌더링을 확인했다.
- 로그아웃 뒤 guest 상태와 동일 fixture 재로그인을 확인했고 마지막 로그아웃 후 인증 cookie는 0개였다. fixture가 하나라 계정 A→B 전환은 실행하지 않았다.
- 화면별 error overlay, hydration error, 가로 overflow는 0건이었다. 로컬 Speed Insights endpoint가 HTML을 반환하는 기존 `Unexpected token '<'` 오류만 재현됐다.
- pinned fonttools 4.59.2 + brotli 1.1.0으로 224 codepoint와 v3 네 weight의 결정적 재생성/checksum 검증을 통과했다.
- 관련 Vitest 2 files/8 tests와 전체 Vitest 64 files/443 tests가 통과했다. 전체 제품 ESLint는 오류 0건이며 기존 unrelated warning 1건이 남았다. 추적 제외 Chrome profile인 `logs/**`는 lint 입력에서 제외했다.
- 최신 전체 작업 소스의 isolated production build가 통과했다.
- 비식별 summary는 `phase-4-final-summary.json`, raw LHR·flow·profile은 gitignore된 mode 700/600 `logs/performance/home-lcp/phase-4/`에 보존했다.

## 판정

실제 Chrome throttling인 `devtools` LCP는 guest **0.848초**, member **0.866초**로 목표를 통과했고 CLS/TBT, CSS, 폰트 전송 및 브라우저 흐름도 통과했다. 그러나 필수 synthetic `simulate` 중앙값은 guest **3.257초**, member **2.714초**로 2.5초를 초과했다. 따라서 Phase 4 전체 acceptance는 **미통과**이며 현재 근거로 `/ship`하지 않는다.

## 2026-09-19 Review 후 후보 상태

- 위 표는 **v3 font + 보호 링크 selective prefetch를 함께 적용한 최종 5회 series**의 역사적 측정값이다. 설계 전 격리 실험에서 관측된 member `simulate` **2.423초** 통과는 별개의 단일 후보 결과이며, 최종 series의 **2.714초** 실패를 대체하지 않는다. guest 최종값도 **3.257초**로 실패했다.
- Review 지적에 따라 `/history`, `/mypage`의 `prefetch={false}`를 제거하고 네 BottomNav 링크를 모두 Next.js 기본 prefetch로 되돌렸다. 따라서 위 최종 표는 **현재 작업 트리와 동일한 후보의 성능 측정이 아니다**. rollback 후 guest/member Lighthouse 5회 series는 아직 없다.
- v3 font와 CSS inline 변경은 유지했다. selective prefetch 재도입이나 Phase 4 통과 판정은 새 동시대 A/B 및 완전한 acceptance 검증 없이는 하지 않는다. 현재 상태는 **LCP 2.5초 목표 미입증, `/ship` 보류**다.
- 비운영 원격 회원 fixture는 여전히 존재한다. 삭제 승인이 거절되어 정리하지 못했으며, 자격증명이나 개인 식별 정보는 이 문서에 기록하지 않는다. 소유자의 승인된 삭제 또는 별도 정리가 필요하다.
- rollback 상태에서 BottomNav 대상 Vitest 1/1, 전체 Vitest 64 files/442 tests, pinned fonttools/brotli 기반 224-codepoint 결정성 검사, 격리 production webpack build, `git diff --check`를 통과했다. `npx eslint . --ignore-pattern 'logs/**'`는 오류 0건과 기존 무관한 경고 1건으로 통과했다. 원시 `npm run lint`는 gitignore된 Chrome profile `logs/**`까지 스캔해 그 내부 외부 스크립트의 80 errors/3273 warnings로 실패한다. 이 프로필을 제품 소스 결함으로 해석하거나 삭제하지 않았다.

# 2026-09-24 Phase 5 교차 trace 진단

## 조건

- **기준 HEAD / build ID**: `cdfddaa6af40a5f3d7678dfb08b8de6cafc86d87` / `6FYWnfIGUhfjC_dLQykYj167M`. 현재 rollback 작업 트리를 새 `/private/tmp` 디렉터리에 복제해 동일 production webpack build와 동일 `next start` 프로세스만 사용했다.
- **도구**: Lighthouse 13.4.1, Headless Chrome 153, 412×823, DPR 1.75, mobile Slow 4G preset(RTT 150ms, 1,638.4Kbps, CPU 4×).
- **상태**: guest cold navigation. 각 Lighthouse CLI 실행이 새 incognito Chrome을 시작했고 기본 storage reset을 유지했다.
- **순서**: `simulate → devtools → devtools → simulate → simulate → devtools → devtools → simulate → simulate → devtools`. 실행 중 소스·서버·설정을 바꾸지 않았다.
- LHR, DevTools log, trace 30개(174,610,434B, 166.52MiB; `du -sh` 167M)는 mode 700의 gitignore 경로 `logs/performance/home-lcp/phase-5/paired-2026-09-24/`에만 보존했다. 제품 소스·설정·테스트는 변경하지 않았다.

## 결과

| Mode | LCP 5회 (ms) | LCP 중앙값 (min–max) | trace observed LCP 중앙값 | FCP 중앙값 | TTFB 중앙값 | CLS | TBT 중앙값 | 전송량 중앙값 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| simulate (Lantern) | 1453, 2421, 1677, 2660, 1668 | **1677 (1453–2660)** | 64ms (55–158) | 914ms | 457ms | 0 | 59ms | 624,103B |
| devtools (actual throttling) | 861, 860, 827, 833, 849 | **849 (827–861)** | 849ms (827–861) | 849ms | 12ms | 0 | 65ms | 624,112B |

- 10회의 LCP node는 모두 동일한 `SeoIntro` 설명 문단이었다. auth/recent 상태 완료 후 다른 LCP candidate로 갱신되지 않았다.
- `simulate`의 55–158ms observed LCP는 로컬 비제한 trace 관측값이고, 1,453–2,660ms는 같은 trace를 Slow 4G/CPU 4×로 재계산한 Lantern 값이다. 두 값을 하나의 series로 평균하지 않았다. `devtools`에서는 reported LCP와 observed LCP가 일치했다.
- 총 전송량은 run 간 624,051–624,123B, JS는 501,087–501,159B, font는 전 회차 72,740B로 안정적이었다. 폰트는 critical Gothic A1 700/800/900과 Nunito 900 네 건이며 non-200과 v1 Gothic A1 요청은 없었다.
- `devtools`의 font 완료 중앙값은 2,188ms였지만 LCP는 849ms였다. `font-display: optional`과 fallback으로 폰트 전송 완료가 현재 observed LCP를 차단하지 않음을 보여준다.
- main-thread work 중앙값은 `simulate` 731ms, `devtools` 1,857ms였다. LHR의 long-task 중앙값은 각각 3개(최대 task 중앙값 94ms), 4개(85ms)였고 TBT는 모두 200ms 이하였다. `simulate` LHR의 long task는 Lantern 모델 결과이며 원 trace diagnostics에서는 50ms 초과 task가 0개였다.

## 판정

현재 guest 제품은 **실제 Chrome actual-throttling LCP 기준으로는 5회 모두 2.5초 이하**이며, CLS 0과 TBT 200ms 이하도 충족했다. 이 진단 round의 `simulate` 중앙값도 1.677초로 통과했지만, 1.453–2.660초로 분산했고 1회는 임계를 넘었다. 또한 같은 rollback 상태의 이전 5회 중앙값 3.259초와 상충하므로 **`simulate ≤ 2.5초`가 재현 가능하게 안정화됐다고 말할 수는 없다**. 전송량·LCP node·FCP가 안정적인데 Lantern LCP만 큰 폭으로 변해, 이 round에서 새로 증명된 단일 제품 병목이나 추가 코드 변경 근거는 없다.

회원 fixture가 삭제된 상태이므로 이 결과는 guest 진단만 다룬다. 회원 acceptance와 원래 `simulate` release gate는 여전히 **미입증/no-ship**이다.

# 2026-09-24 현재 후보 재측정

## 조건

- **기준 HEAD / build ID**: `a0b4c8b186baf390fa56bce8d4392a31a47e5acf` / `UlYl5yOaMB2QN3Wl8Bol_`. 새 `/private/tmp`의 HEAD archive에 LCP 작업 범위인 `inlineCss`와 v3 critical font 파일만 복사했다. 같은 작업 트리의 분석 결과·OG·에이전트 설정 등 무관한 dirty 변경은 포함하지 않았다.
- build 동안만 `.env.local`을 symlink하고 성공 직후 제거했다. 동일 production webpack build와 동일 `next start` 프로세스만 사용했다.
- Lighthouse 13.4.1, Chrome 153.0.8010.53, 412×823, DPR 1.75, RTT 150ms, 1,638.4Kbps, CPU 4× 조건이다. guest cold navigation으로 `simulate` 5회 후 `devtools` 5회를 순차 실행했으며, 각 회차는 새 incognito Chrome과 기본 storage reset을 사용했다.
- raw LHR·DevTools log·trace·화면 31개, 138MiB는 mode 700/600의 gitignore 경로 `logs/performance/home-lcp/phase-5/latest-measurement/`에 보존했다. 원본 JSON 집합 checksum은 `a59b90573cf03a3d8aeb2435d0ed6f0e2044eb071b13773e957dfe1fe223a570`이다.

## 결과

| Mode | LCP 5회 (ms) | LCP 중앙값 (min–max) | FCP 중앙값 (min–max) | TTFB 중앙값 (min–max) | CLS | TBT 중앙값 (min–max) |
|---|---|---:|---:|---:|---:|---:|
| simulate (Lantern) | 3378, 3191, 3027, 3177, 3404 | **3191 (3027–3404)** | 920 (918–934) | 460 (459–467) | 0 | 199 (189–674) |
| devtools (actual throttling) | 1089, 996, 1070, 989, 903 | **996 (903–1089)** | 996 (903–1089) | 19 (14–32) | 0 | 303 (198–437) |

- LCP node는 10회 모두 `SeoIntro`의 “두 사람만 보는 궁합표가 아니라…” 관계 흐름 설명 문단으로 같았다.
- 총 전송량 중앙값은 622,259B, JavaScript 501,472B(25건), font 72,740B(4건), CSS 0B(0건)였다. font는 Gothic A1 critical v3 700/800/900과 Nunito 900이며 non-200 요청은 없었다.
- `simulate` 5회차에는 측정 장치 CPU가 Lighthouse 기대치보다 느리다는 경고가 있었으며 해당 3,404ms 표본을 제외하지 않았다. 나머지 9회에는 runtime error나 run warning이 없었다.
- production 홈은 HTTP 200, 시작 CTA·분석 링크·SEO 제목과 SEO-before-recent 순서, 오류 overlay 없음, 가로 overflow 없음으로 확인했다. `agent-browser`와 Playwright가 없어 Lighthouse 설치본의 Puppeteer와 현재 Chrome으로 대체했다. 로컬 `_vercel/speed-insights/script.js`가 `/login` HTML로 redirect되어 생기는 기존 `Unexpected token '<'` pageerror는 제품 chunk·오류 overlay와 분리 확인했다.

## 판정

실제 Chrome `devtools` LCP는 5회 모두 2.5초 이하이고 CLS는 0이다. 그러나 필수 `simulate` LCP 중앙값은 **3.191초**로 목표 2.5초를 초과해 **실패**다. `devtools` TBT 중앙값도 303ms로 보조 기준 200ms를 초과했다. 회원 fixture가 삭제되어 member acceptance는 측정하지 않았으며, 현재 후보는 여전히 **no-ship**이다.
