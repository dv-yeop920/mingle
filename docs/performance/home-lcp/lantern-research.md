# Lighthouse Lantern `simulate` LCP 조사

조사일: 2026-09-24  
대상: Lighthouse 13.4.1, Next.js 16.3.1, 보존된 홈 production LHR  
범위: 원인 조사만 수행. 제품 소스와 테스트는 변경하지 않음.

소스 경로 alias:

- `<lighthouse-install-root>`: 실행에 사용된 npx Lighthouse 13.4.1 package의 resolved root
- `<trace-engine-install-root>`: 같은 npx 설치에서 Lighthouse가 resolve한 `@paulirish/trace_engine` 0.0.65 package root

## 결론

현재 증거로는 `simulate` 약 3.26초와 `devtools` 약 0.84초의 차이를 특정 제품 코드 결함으로 단정할 수 없다. 두 값은 같은 시간을 서로 다른 방식으로 읽은 값이 아니다.

- `simulate`는 빠른 **비스로틀 관측 load**에서 네트워크 요청과 CPU task의 의존 그래프를 만든 뒤, 그 그래프를 150ms RTT·1.6384Mbps·CPU 4배 조건으로 다시 계산한 Lantern 추정값이다.
- `devtools`는 Chrome에 request-level 네트워크 throttling과 CPU throttling을 실제로 적용한 뒤 브라우저가 보고한 LCP다.
- 보존된 guest LHR에서 `simulate` 최종 LCP는 2,979–3,262ms이지만, 그 계산의 입력이 된 브라우저 관측 LCP는 69–102ms다. 반면 `devtools` LCP는 브라우저 관측값과 동일한 836–885ms다.
- 이 페이지의 LCP는 서버 HTML에 이미 있는 텍스트다. 실제 브라우저는 `font-display: optional` 규칙에 따라 폰트가 첫 paint에 즉시 준비되지 않으면 fallback으로 그릴 수 있다. 그러나 Lighthouse 13.4.1의 Lantern LCP 모델은 텍스트와 특정 폰트 파일 사이의 CSS font-display 결정을 직접 재현하지 않는다. 관측 LCP cutoff 전에 끝난 거의 모든 네트워크 node와 관련 CPU/layout node를 LCP 그래프에 포함해 완료 시각을 추정한다.

따라서 약 3.26초는 “브라우저가 이 문단을 실제로 3.26초에 그렸다”는 trace 사실이 아니라, **관측된 빠른 실행의 자원 순서가 느린 조건에서도 같은 의존 경로를 만든다는 가정 아래 나온 모델 값**이다. 현재 LHR은 실제 paint가 빠르다는 증거와 모델이 보수적으로 긴 critical graph를 잡았다는 증거를 동시에 제공하지만, 어느 폰트나 JS 한 개를 제거하면 제품에서 반드시 2.5초 이하가 된다는 증거는 제공하지 않는다.

## 1. `simulate`와 `devtools`는 무엇을 측정하는가

Lighthouse 공식 문서는 simulated throttling이 최초 비스로틀 load에서 관측한 데이터를 바탕으로 page load를 시뮬레이션하며 기본값이라고 설명한다. 이 방식은 빠르고 대체로 안정적이지만 다른 실행 경로를 예측하는 데 본질적인 오차가 있다. 같은 문서는 DevTools throttling이 Chrome DevTools를 통해 request 단위 throttling을 실제 적용하는 근사 방식이라고 구분한다. 깊은 성능 조사에는 두 방식 모두보다 packet-level throttling이 더 충실하다고 권고한다. 특히 simulated mode에서 “View Original Trace”의 trace 값과 Lighthouse metric이 일치하지 않는 것이 정상이라고 명시한다. ([Lighthouse throttling 공식 문서](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md))

설치된 13.4.1의 기본 설정도 mobile `simulate`, 150ms RTT, 약 1.6384Mbps, CPU 4배 slowdown을 사용한다. (설치 소스: `<lighthouse-install-root>/core/config/constants.js:51-65`) Lighthouse metric dispatcher는 `simulate`일 때 simulated 구현을, `devtools`/`provided`일 때 observed 구현을 선택한다. (설치 소스: `<lighthouse-install-root>/core/computed/metrics/metric.js:43-96`)

Simulator는 `simulate`에서 지정된 RTT, throughput, CPU slowdown을 사용하고, 네트워크 분석에서 관측한 origin별 추가 RTT와 server response time도 입력으로 받는다. precomputed Lantern data가 없으면 이 관측 분석값이 run마다 다시 만들어진다. (설치 소스: `<trace-engine-install-root>/models/trace/lantern/simulation/Simulator.js:32-73`)

## 2. 보존 LHR이 보여주는 실제 차이

민감 URL과 query는 기록하지 않고 `logs/performance/home-lcp/phase-4/guest/raw/`의 Lighthouse 13.4.1 LHR만 집계했다. 다섯 회 모두 같은 build에서 같은 텍스트 문단이 LCP였고, 총 전송량은 619,298B, font는 72,740B, script는 500,824B로 사실상 고정됐다.

| mode | 최종 LCP | LHR 내부 `observedLargestContentfulPaint` | FCP | 의미 |
|---|---:|---:|---:|---|
| simulate, run 1–5 | 2,979–3,262ms (중앙값 3,257ms) | 69–102ms | 910–917ms (simulated) | 빠른 관측 trace를 Lantern이 재계산 |
| devtools, run 1–5 | 836–885ms (중앙값 848ms) | 836–885ms | 836–885ms | throttled Chrome 관측값 |

대표 `simulate` run 3의 LCP breakdown insight는 TTFB 11.25ms + element render delay 57.27ms, 즉 관측 LCP 약 69ms를 보여 주지만, top-level LCP audit은 3,261.52ms다. 이는 보고서 내부에서도 breakdown trace와 simulated top-level metric의 clock이 다르다는 직접 증거다. Lighthouse 공식 문서의 “original trace 값은 simulation metric과 일치하지 않는다”는 설명과 일치한다.

그러므로 `simulate` 3.26초와 `devtools` 0.84초를 “동일 trace에 대한 두 관측값”처럼 빼서 약 2.42초짜리 제품 render delay로 해석하면 안 된다.

## 3. Lantern이 이 텍스트 LCP를 추정하는 방식

설치된 `@paulirish/trace_engine`의 LCP 모델은 다음 순서로 계산한다.

1. 브라우저가 실제 관측한 LCP timestamp를 cutoff로 사용한다.
2. optimistic graph에서는 low/very-low priority image만 제외하고, 나머지 network node를 render-blocking 후보로 취급한다.
3. pessimistic graph에는 모든 network node와 모든 layout CPU node를 더 폭넓게 포함한다.
4. 각 simulation에서 포함 node 중 완료가 가장 늦은 시각을 estimate로 삼는다.
5. optimistic/pessimistic을 각각 0.5 비율로 합치고, simulated FCP보다 작지 않게 보정한다.

근거는 설치된 Lighthouse 13.4.1 의존 소스의 `<trace-engine-install-root>/models/trace/lantern/metrics/LargestContentfulPaint.js:7-65`와 `<trace-engine-install-root>/models/trace/lantern/metrics/Metric.js:43-65`다. First Paint 기반 graph builder는 관측 cutoff 뒤 끝난 요청을 제외하고, cutoff 전 실행된 script/parse/layout/paint CPU node를 관계 그래프에 남긴다. (설치 소스: `<trace-engine-install-root>/models/trace/lantern/metrics/FirstContentfulPaint.js:20-134`)

이 규칙에는 “현재 LCP element가 텍스트이므로 오직 해당 weight의 font만 기다린다”는 후보별 연결이 없다. low-priority **image**만 특별히 제외하므로, 관측 cutoff 전에 완료된 low-priority Next script도 LCP graph에 들어갈 수 있다. 반대로 cutoff 직후 완료됐으면 같은 파일이 graph에서 빠질 수 있다.

### 현재 폰트 동작과 모델의 차이

현재 LCP 문단은 `Gothic A1 Critical` 700을 사용하고, 해당 face는 `font-display: optional`이다. 700/800/900 font는 `<link rel="preload">`로 모두 일찍 요청된다. ([`src/shared/styles/fonts.css`](../../../src/shared/styles/fonts.css#L26-L46), [`src/app/layout.tsx`](../../../src/app/layout.tsx#L84-L108))

CSS Fonts Level 4에 따르면 `optional` face는 첫 text paint에 즉시 사용할 수 있을 때만 web font를 쓰고, 그렇지 않으면 block/swap 기간이 이미 끝난 것처럼 fallback을 사용한다. fallback으로 한 번 그린 뒤에는 그 페이지 생애 동안 optional font로 다시 바꾸지 않아야 한다. ([CSS Fonts Module Level 4 §4.9](https://www.w3.org/TR/css-fonts-4/#font-display-desc)) LCP 표준도 text candidate는 blocking font가 충분히 준비돼 contentful/paintable해진 첫 paint를 보고한다고 정의한다. ([Largest Contentful Paint 표준](https://www.w3.org/TR/largest-contentful-paint/))

실제 브라우저와 달리 Lantern의 위 graph 규칙은 CSS `font-display: optional` 상태 전이를 시뮬레이션하지 않는다. 세 critical preload font가 관측 cutoff 전에 완료되면 해당 network node들은 graph 후보가 된다. 이것은 “폰트가 반드시 3.26초의 원인”이라는 뜻이 아니라, 실제 text paint와 Lantern 자원 graph가 서로 다른 추상화라는 뜻이다.

### JS scheduling

LHR에서 초기 Next script 다수가 비스로틀 관측 LCP 전에 완료됐다. Lantern은 cutoff 전 완료된 script request와 cutoff 전 시작된 관련 EvaluateScript/CPU task를 graph에 포함할 수 있고, CPU duration에는 4배 slowdown을 적용한다. CPU task는 하나씩만 실행하며 network request는 connection/우선순위/throughput 제약 아래 재스케줄한다. (설치 소스: `<trace-engine-install-root>/models/trace/lantern/metrics/FirstContentfulPaint.js:20-88`, `<trace-engine-install-root>/models/trace/lantern/simulation/Simulator.js:187-243`)

다만 현재 raw LHR에서 Google Analytics 본 script(약 175.8KB)는 관측 LCP 뒤에 완료돼 LCP cutoff graph에서 제외된다. 따라서 과거 URL 차단 실험만으로 GA가 현재 3.26초의 직접 critical node라고 결론 내릴 수 없다. Next 16 설치 문서는 기본 `afterInteractive` script가 hydration 일부 이후 로드된다고 설명하며 analytics를 그 용례로 든다. ([설치된 Next 16 문서](../../../node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md#L163-L188))

## 4. 왜 `simulate` 자체도 약 0.3초 흔들렸는가

공식 Lighthouse variability 문서는 simulated throttling도 browser nondeterminism과 server variability를 완전히 제거하지 못하며, 관측 task 실행 시간을 재사용한다고 설명한다. ([Lighthouse metric variability 공식 문서](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md))

현재 다섯 LHR에는 더 구체적인 cutoff 경계 증거가 있다.

- run 2의 관측 LCP cutoff는 84ms였다.
- `4304-…js` 6,182B, 홈 `page-…js` 4,823B, route `layout-…js` 1,418B가 각각 관측 89–90ms에 완료됐다. 합계 12,423B라서 run 2의 LCP graph에서 제외된다.
- 나머지 네 run에서는 같은 세 script가 관측 LCP cutoff 전에 완료되어 graph에 포함된다.
- run 2 simulated LCP는 2,979ms이고 나머지는 3,205ms, 3,262ms, 3,262ms, 3,257ms다.

소스의 cutoff 규칙과 이 관측을 합치면, **빠른 비스로틀 실행에서 수 ms 차이로 cutoff 안팎이 된 자원이 느린 재생 graph의 구성 자체를 바꾼 것**이 약 0.3초 분산의 유력한 설명이다. 이는 source + LHR에 기반한 inference이며, Lantern debug node-timing artifact가 보존되지 않았으므로 세 파일 각각의 정확한 기여 ms까지 확정할 수는 없다.

또한 `precomputedLanternData`가 없는 run은 관측 origin별 RTT/server response 분석을 매번 다시 입력한다. 보존 LHR의 observed LCP, task time, localhost request ordering도 run마다 조금 달랐다. 총 bytes가 동일하더라도 graph topology와 task cutoff가 동일하다는 뜻은 아니다.

## 5. 제품 코드 변경을 추론할 수 있는가

현재 자료만으로는 **아니다**.

- LHR의 observed LCP와 actual-throttled `devtools` LCP는 모두 2.5초 아래다.
- `simulate` LCP graph는 실제 text/font paint 계약보다 넓은 자원을 포함하며 cutoff에 민감하다.
- 동일 전송량에서도 graph 포함 여부가 달라졌고, 기존 font/preload/JS 차단 실험은 한 자원군의 독립적이고 반복 가능한 2.5초 통과를 입증하지 못했다.
- Lighthouse 자체도 alternate execution path 예측의 edge case와 deep investigation에서의 한계를 명시한다.

그러므로 “텍스트 LCP니까 폰트를 더 없앤다”, “500KB JS니까 Provider를 제거한다”, “GA를 지연한다” 중 어느 것도 이 조사만으로 승인 가능한 수정안이 아니다. 그런 변경은 별도 기능/보안 비용이 있으며, Lantern 숫자만 낮추고 실제 브라우저 경험은 바꾸지 않을 수도 있다.

근거 있는 다음 진단은 제품 변경이 아니라 다음 두 가지다.

1. 같은 build에서 `--save-assets`로 Lantern optimistic/pessimistic node timing과 trace를 보존하여 3.26초를 결정한 마지막 node를 식별한다.
2. Lighthouse가 권고하는 packet-level slow-4G 측정 또는 실제 저사양 모바일/field data로 `devtools` 0.84초가 사용자 조건에서도 재현되는지 교차 검증한다.

특정 node가 반복해서 확인된 뒤에만 한 변수 A/B를 설계해야 한다. 현재 결론은 **실제 Chrome LCP는 목표 이내, Lantern synthetic gate는 실패, 그러나 실패값만으로 특정 제품 코드 변경은 추론 불가**다.

## 조사 자료

- 로컬 LHR: `logs/performance/home-lcp/phase-4/guest/raw/{simulate,devtools}-run-{1..5}.json` (gitignored; URL/query는 본 문서에 기록하지 않음)
- 요약: `logs/performance/home-lcp/phase-4/summary.json`
- Lighthouse 13.4.1 설치본: `<lighthouse-install-root>`
- Trace Engine 0.0.65 설치본: `<trace-engine-install-root>`
- [Lighthouse throttling 공식 문서](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- [Lighthouse variability 공식 문서](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
- [CSS Fonts Module Level 4](https://www.w3.org/TR/css-fonts-4/)
- [Largest Contentful Paint 표준](https://www.w3.org/TR/largest-contentful-paint/)
