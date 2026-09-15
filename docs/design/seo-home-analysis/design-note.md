# 홈·분석 허브 SEO 강화 설계

2026-09-15 · Plan 단계 문서. 이 문서는 사용자 승인 전 구현 범위와 검증 기준을 고정하기 위한 설계이며, 현재 제품 코드는 변경하지 않는다.

## 배경과 감사 근거

MIXTI의 공개 검색 진입점은 홈(`/`)과 분석 허브(`/analysis`) 두 곳이다. 홈은 `MBTI 그룹 궁합 테스트`, 분석 허브는 `MBTI 분석`을 대표 검색 의도로 맡아 서로 다른 검색 요구를 해결한다.

현재 코드는 다음 문제가 있다.

- 홈에는 `HomeHeader`의 인사말 H1 두 개와 `HeroCard`의 서비스 H1 한 개가 함께 있어 문서의 대표 제목이 세 개다.
- `/analysis`는 공개 페이지이지만 `robots.ts`의 `/analysis` prefix 차단에 걸리고 sitemap에도 없다.
- `/analysis` metadata는 짧은 title/description만 제공한다. canonical, 페이지 URL을 반영한 Open Graph, Twitter Card가 없어 루트 metadata의 홈 메시지에 의존한다.
- `/analysis`의 visible content는 `분석` H1과 네 개의 카드 문구가 전부여서 `MBTI 분석` 검색 의도, 제공 분석의 차이, 선택 기준을 충분히 설명하지 못한다.
- 기존 `docs/audit/seo.md`는 색인 대상을 홈 하나로 기록해 현재 공개 분석 허브의 제품 구조와 맞지 않는다.

설계 근거는 설치된 Next.js 16.3.1 문서 `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`다. 정적 페이지 metadata는 Server Component의 `metadata` export로 선언하고, 상대 URL은 루트 `metadataBase`와 결합한다. 하위 페이지에서 중첩 metadata 객체를 선언할 때 부모 객체와의 얕은 병합에 기대지 않고 필요한 Open Graph/Twitter 필드를 완결해서 쓴다.

## 1. 요구사항과 사용자 행동

### 검색 의도와 페이지 역할

| URL | 색인 | 대표 검색 의도 | 사용자가 얻는 답 | 주 CTA |
|---|---|---|---|---|
| `/` | index, follow | `MBTI 그룹 궁합 테스트` | 친구·가족·팀 여러 명의 그룹 분위기, 역할, 1:1 케미를 함께 분석할 수 있는 서비스 | `/group-type`에서 그룹 테스트 시작 |
| `/analysis` | index, follow | `MBTI 분석` | 그룹 케미, 1:1 궁합, 개인 성격, 캐릭터 매칭 중 원하는 분석을 비교하고 선택 | 각 분석 도구로 이동 |
| `/analysis/mbti-profile`, `/analysis/character-match` | noindex, nofollow 유지 | 개인화 도구 실행 | 입력 후 개인 결과 생성 | 기존 흐름 유지 |
| `/result` 및 하위 결과 경로 | noindex 유지 | 개인·공유 결과 열람 | 생성된 결과 확인 | 이번 구현 범위 제외 |

`/compatibility`는 현재 공개 도구지만 이번 작업의 색인 정책 확장 대상에 포함하지 않는다. 별도 검토 없이 sitemap에 추가하거나 키워드를 배정하지 않는다.

### 사용자 행동과 상태

- 검색 사용자는 홈에서 서비스가 여러 명의 그룹 관계를 분석한다는 점을 이해하고 그룹 테스트를 시작하거나 `/analysis`의 다른 분석을 탐색한다.
- 검색 사용자는 `/analysis`에서 네 분석 유형의 대상과 결과 차이를 읽고 적절한 도구를 선택하거나 홈의 그룹 테스트 설명으로 돌아간다.
- 로그인 여부와 관계없이 두 공개 페이지의 제목, 설명, 링크는 초기 서버 HTML에 포함된다.
- metadata와 visible content는 정적이며 새 API 요청, 로딩 상태, 폼 상태, 클라이언트 상태를 만들지 않는다.
- 개인화 헤더, 최근 테스트, 테스트 입력, 분석 결과 저장 흐름은 기존 상태 전이와 권한 경계를 유지한다.

### 엣지 케이스와 부정적 요구사항

- 긴 닉네임이나 게스트 인사말에서도 홈의 H1은 Hero 한 개만 남아야 한다. 인사말은 시각 스타일을 유지하되 `h1`이 아닌 일반 텍스트 컨테이너로 표현한다.
- `/analysis` 계열은 robots에서 모두 crawl을 허용한다. 검색봇이 하위 개인화 도구의 meta robots를 읽을 수 있게 하고, 실제 색인 제외는 각 페이지의 `noindex`로 제어한다.
- robots 차단으로 noindex를 대신하지 않는다. 하위 도구의 기존 metadata robots 선언과 `(test)` layout의 noindex를 유지하고 렌더된 응답에서 확인한다.
- 페이지에 보이지 않는 키워드 나열, 중복 문단, 과장된 AI 효능 표현을 추가하지 않는다.
- 분석 허브 JSON-LD는 이번 범위에 추가하지 않는다. 현재 단계에서는 리치 결과 이득이 제한적이므로 visible content, metadata, crawl/index 정합성을 우선한다.
- `/result`의 개별 결과별 공유 이미지와 동적 metadata는 별도 과제다.

## 2. 아키텍처와 런타임 흐름

```text
검색봇/사용자 요청
├─ /                            index, canonical /
│  └─ HomeView
│     ├─ HomeHeader             인사말은 일반 텍스트
│     ├─ HeroCard               유일한 H1 + /group-type CTA
│     ├─ /analysis 내부 링크    분석 탐색 진입
│     └─ SeoIntro               그룹 궁합 설명
└─ /analysis                    index, canonical /analysis
   └─ AnalysisView
      ├─ H1 + 도입 문단         `MBTI 분석` 검색 의도 명시
      ├─ AnalysisContent        네 분석 유형의 설명형 내부 링크
      └─ 보조 안내/홈 링크      선택 기준과 그룹 테스트 문맥 연결
```

`app` 페이지는 metadata 선언과 `views` 렌더만 담당하는 얇은 껍질을 유지한다. visible content 조합은 `views/analysis`가 맡고, 반복 가능한 소개 UI가 필요하면 `features`가 아닌 분석 view 내부의 서버 컴포넌트로 둔다. 이 콘텐츠는 단일 페이지 조합 책임이고 상태·유스케이스가 없으므로 새 Zustand store, React Query query, Server Action을 만들지 않는다.

### metadata 계약

구현 단계에서 아래 문안을 상수로 분리해 page metadata와 테스트가 같은 계약을 사용하도록 한다. 홈의 기존 상수 이름은 필요하면 의미가 분명한 `HOME_SEO_*`로 바꾸고 모든 소비자를 함께 갱신한다.

| 필드 | 홈(`/`) | 분석 허브(`/analysis`) |
|---|---|---|
| primary keyword | MBTI 그룹 궁합 테스트 | MBTI 분석 |
| title | `MBTI 그룹 궁합 테스트 | 친구·가족·팀 케미 분석 MIXTI` | `MBTI 분석 모음 | 궁합·성격·캐릭터 테스트 MIXTI` |
| description | 기존 그룹 중심 문안 유지. 그룹 궁합·대화 케미·역할·분위기·갈등 포인트를 설명 | `그룹 케미, 1:1 MBTI 궁합, 나의 성격 프로필, 닮은 캐릭터 찾기를 한곳에서 만나보세요. 원하는 무료 MBTI 분석을 골라 AI 결과를 확인할 수 있어요.` |
| canonical | `/` | `/analysis` |
| Open Graph | website, `ko_KR`, `/`, siteName, 홈 title/description, 1200×630 image + alt | website, `ko_KR`, `/analysis`, siteName, 분석 title/description, 1200×630 image + 분석 허브 alt |
| Twitter | summary_large_image, 홈 title/description/image + alt | summary_large_image, 분석 title/description/image + alt |

분석 허브의 공유 문맥이 홈 전용 이미지 문구(`우리 그룹 케미`)와 어긋나므로 `src/app/(main)/analysis/opengraph-image.tsx`와 `twitter-image.tsx`에서 분석 선택지를 나타내는 전용 1200×630 이미지를 생성한다. 기존 브랜드 토큰과 Gothic A1 폰트를 재사용하고 각 파일에서 `alt`, `size`, `contentType`을 함께 export한다. Next.js 16이 파일 기반 metadata를 해시가 포함된 실제 이미지 URL로 자동 주입하므로 page metadata에는 `images`를 수동 선언하지 않는다.

### robots와 sitemap 계약

- robots에서 기존 `disallow: '/analysis'`를 제거하고 `/analysis`와 모든 하위 경로의 crawl을 허용한다. 그래야 검색봇이 하위 페이지 응답의 `noindex`를 읽고 색인 제외를 적용할 수 있다.
- `/analysis` 허브만 `index, follow` 대상으로 삼고 `/analysis/mbti-profile`, `/analysis/character-match`는 각 page metadata의 `noindex, nofollow`를 유지한다.
- `/api/`, `/history`, `/mypage` 차단은 유지한다. 결과 경로는 기존 방침대로 공유 미리보기 접근을 위해 crawl 차단하지 않고 `(test)` layout metadata의 noindex를 유지한다.
- sitemap은 `/`와 `/analysis` 두 canonical URL만 포함한다. 우선순위는 홈 1.0, 분석 허브 0.8로 구분하고 둘 다 현재 정적 콘텐츠의 변경 주기에 맞춰 `monthly`를 사용한다.
- `lastModified: new Date()`는 빌드할 때마다 내용 변경처럼 보이는 부정확한 신호다. 실제 수정일을 자동으로 신뢰할 소스가 없으므로 이번 구현에서 제거하는 것을 기본안으로 한다.
- proxy는 기존 `/analysis` public prefix 덕분에 허브와 Next.js가 생성한 해시 기반 OG/Twitter 이미지 route에 인증 redirect를 적용하지 않는다. 테스트에서 렌더된 metadata의 실제 URL로 이 계약을 확인한다.

## 3. 데이터와 콘텐츠 설계

### visible content 구조

홈은 Hero의 H1과 `SeoIntro`의 그룹 중심 설명을 유지한다. `/analysis` 링크의 anchor는 `더 많은 MBTI 분석 보기`처럼 목적지를 설명하는 현재 문구를 유지하거나 `MBTI 분석 종류 더 보기`로 명확하게 다듬는다. 개인화 인사말은 `div` 안의 `p` 또는 `span`으로 묶어 스크린리더가 하나의 자연스러운 문장으로 읽게 한다.

분석 허브는 다음 구조를 사용한다.

1. H1: `나에게 맞는 MBTI 분석 찾기`
2. 도입 문단: 그룹 관계, 두 사람 궁합, 개인 성격, 캐릭터 매칭을 한곳에서 선택할 수 있음을 첫 화면에 설명한다.
3. 네 카드: 기존 링크 목적지는 유지하고, 각 제목과 설명에 분석 대상과 결과를 구체적으로 표시한다.
   - `MBTI 그룹 궁합 테스트`: 친구·가족·팀 여러 명의 분위기와 역할, 멤버별 케미
   - `1:1 MBTI 궁합 분석`: 두 사람의 잘 맞는 점, 대화 방식, 주의할 갈등 포인트
   - `나의 MBTI 성격 분석`: 자신의 MBTI 성향과 강점, 관계에서의 특징
   - `MBTI 캐릭터 매칭`: 입력한 성향과 닮은 애니메이션·영화 캐릭터
4. 선택 안내: 여러 명이면 그룹 궁합, 두 명이면 1:1 궁합처럼 사용자가 분석을 고를 기준을 짧게 제공한다.
5. 홈 내부 링크: `MBTI 그룹 궁합 테스트 자세히 보기` anchor로 `/`를 연결해 두 공개 랜딩 페이지가 상호 연결되게 한다.
6. 책임 안내: MBTI 분석은 관계나 성격을 단정하는 진단이 아니라 대화를 돕는 참고 정보임을 밝힌다.

카드 전체를 Link로 유지하되 카드 안에 별도의 중첩 링크나 버튼을 넣지 않는다. 제목은 H2로 유지해 H1 → H2 구조를 만들고, 도입·선택·책임 안내는 문단 또는 의미 있는 section으로 구성한다. 정보는 CSS로 숨기지 않고 모바일 화면에서 읽을 수 있게 표시한다.

### 상태·캐시·오류

- SEO 콘텐츠는 서버 컴포넌트의 정적 데이터이므로 서버/클라이언트 상태가 없다.
- 신규 네트워크 요청, query key, cache invalidation, optimistic update, 재시도 정책은 없다.
- 개인화 홈 query가 실패해도 Hero와 SEO 소개가 계속 보이는 기존 graceful degradation을 유지한다.
- OG 이미지 생성이 실패하면 이미지 route만 실패할 수 있다. 기존 로컬 폰트 읽기 방식과 브랜드 상수를 재사용하고 production build에서 route 생성을 검증한다.

## 4. UI 컴포넌트와 접근성

### 역할별 구현 책임

| 대상 | 변경 | 역할 |
|---|---|---|
| `src/views/home/home-header.tsx` | 인사말 H1 두 개를 하나의 일반 텍스트 문장으로 변경 | UI |
| `src/features/home/ui/hero-card/hero-card.tsx` | 홈의 유일한 H1 유지, 문안 회귀 확인 | UI |
| `src/views/home/home-view.tsx` | 분석 허브 anchor 문안 및 공개 콘텐츠 순서 확인 | UI |
| `src/views/analysis/analysis-view.tsx` | 검색 의도를 설명하는 H1·도입·선택/책임 안내·홈 링크 조합 | UI |
| `src/views/analysis/analysis-content.tsx` | 네 카드의 H2, 설명형 anchor, 기존 목적지 유지 | UI |
| `src/app/(main)/analysis/opengraph-image.tsx`, `twitter-image.tsx` | 분석 허브 전용 공유 이미지와 파일 기반 metadata | UI |
| app metadata, SEO 상수, robots, sitemap | 페이지별 metadata와 crawl/index 계약 구현 | Frontend |
| 테스트 작성·실행과 브라우저 검증 | 의미 구조, metadata, route 응답 회귀 검증 | Test |
| `docs/audit/seo.md` | 실제 구현 결과와 남은 운영 확인 항목 갱신 | Frontend |

구현은 사용자 승인 후 UI 역할 에이전트가 markup·문안·OG 이미지 작업을 먼저 수행하고, Frontend 역할 에이전트가 metadata와 route 계약을 연결한다. Test 역할 에이전트의 검증 뒤 Review 역할 에이전트가 FSD, metadata 완결성, 회귀를 점검한다.

### 접근성 계약

- 각 페이지에는 visible H1이 정확히 하나 있어야 한다.
- 분석 카드 제목은 H2이며 DOM 순서와 시각 순서를 일치시킨다. 장식 도형과 이모지는 `aria-hidden`을 유지한다.
- 각 링크의 accessible name만 읽어도 목적과 이동 결과를 알 수 있어야 한다. 현재 `aria-label`과 visible text가 다른 경우 같은 검색 의도를 표현하도록 맞춘다.
- 카드 전체 링크는 기존 focus-visible 표현을 보존하거나 Hero와 같은 명확한 focus ring을 적용한다.
- CTA와 링크의 최소 터치 영역 44×44px를 유지한다.
- 추가 문단 때문에 하단 탐색이 가리지 않도록 모바일 frame의 기존 bottom padding과 실제 390px viewport에서 마지막 콘텐츠 접근성을 확인한다.
- 상태를 토글하거나 보존하는 UI가 없으므로 `Activity`, client component, Suspense, Error Boundary를 추가하지 않는다.

## 5. 성능, 장애, 운영, 검증

### 성능과 장애

- visible content는 Server Component에 유지해 추가 hydration JavaScript를 만들지 않는다.
- 전용 OG/Twitter 이미지는 검색/공유 봇이 Next.js가 metadata에 주입한 해시 기반 이미지 route를 요청할 때 생성되며 일반 페이지 LCP 자원으로 로드하지 않는다.
- 새 이미지, 아이콘, 외부 폰트, 라이브러리를 추가하지 않는다. 기존 CSS 토큰과 로컬 Gothic A1을 재사용한다.
- 콘텐츠 증가로 페이지 높이는 늘어나지만 첫 화면의 카드 구조와 CTA 위치가 불필요하게 밀리지 않도록 도입부 간격을 모바일에서 확인한다.
- metadata/OG image route 오류는 production build와 직접 HTTP 응답 검증으로 배포 전에 차단한다.

### 테스트 계획

Test 역할 에이전트는 구현 세부를 그대로 복제하는 snapshot 대신 아래 공개 계약을 검증한다.

1. `src/views/home/home-view.test.tsx` 또는 관련 컴포넌트 테스트
   - 홈에 H1이 정확히 하나이고 이름에 `MBTI`와 `그룹 케미`가 포함된다.
   - 인사말은 H1으로 노출되지 않는다.
   - `/group-type`, `/analysis` 설명형 링크가 유지된다.
2. 분석 view 컴포넌트 테스트 신규/갱신
   - H1 하나, 네 개의 H2, 도입·선택 안내·책임 문구가 visible content로 렌더링된다.
   - 네 카드와 홈 링크의 href/accessibility name이 계약과 일치한다.
3. `src/app/seo-routes.test.ts`
   - robots의 disallow 목록에 `/analysis` 또는 `/analysis/`가 없고 허브와 하위 경로 모두 crawl 가능한지 확인한다.
   - `/analysis` 허브는 `index, follow`, `/analysis/mbti-profile`과 `/analysis/character-match`는 렌더된 meta robots에서 `noindex, nofollow`인지 확인한다.
   - 기존 개인·API 경로의 robots 차단은 유지한다.
   - sitemap은 canonical `/`, `/analysis`만 포함하고 중복·noindex URL이 없다.
   - 분석 page metadata의 absolute title, description, canonical, Open Graph 전체 필드, Twitter 전체 필드와 이미지 alt를 확인한다.
   - `(test)` layout 및 분석 하위 페이지의 noindex 계약은 유지된다.
4. 정적 검사와 빌드
   - 관련 Vitest → 전체 `npm test` → `npm run lint` → `npm run build` 순으로 실행한다.
   - build 산출물에서 `/`, `/analysis`, `/robots.txt`, `/sitemap.xml`과 분석 허브의 파일 기반 OG/Twitter 이미지 route가 오류 없이 생성되는지 확인한다.
5. 브라우저 검증
   - production build 또는 동일 렌더 경계의 dev server에서 `/`와 `/analysis`를 모바일 viewport로 연다.
   - 각 페이지의 visible H1 개수, heading outline, 링크 이동, 하단 콘텐츠 접근, console error를 확인한다.
   - 렌더된 DOM에서 canonical, robots, `og:type`, `og:locale`, `og:url`, `og:site_name`, `og:title`, `og:description`, `og:image`, `og:image:alt`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`를 확인한다.
   - `/robots.txt`와 `/sitemap.xml`의 실제 응답을 열어 metadata 함수 단위 테스트와 동일한지 확인한다.
   - JSON-LD는 정적 fetch 결과만으로 부재를 단정하지 않는다. 기존 홈 WebApplication JSON-LD는 렌더된 `script[type="application/ld+json"]`로 회귀 확인한다.

배포 후에는 Google Search Console과 Bing Webmaster Tools에 갱신된 sitemap을 다시 제출하고 `/analysis` 색인 상태를 관찰한다. Rich Results Test로 기존 홈 JSON-LD를 확인하고, PageSpeed Insights/Search Console 실제 사용자 데이터에서 LCP ≤ 2.5초, INP ≤ 200ms, CLS ≤ 0.1을 추적한다. title/description 노출 문구는 검색엔진이 재작성할 수 있으므로 실제 검색어와 CTR 데이터가 쌓인 뒤 문안을 조정한다.

## 변경 대상과 의존 관계

### 구현 대상

- `src/shared/config/seo.ts`: 홈/분석 허브별 metadata 문안과 홈 이미지 경로/alt 상수.
- `src/app/(main)/page.tsx`: 홈 metadata가 홈 전용 계약을 명시하는지 보완.
- `src/app/(main)/analysis/page.tsx`: canonical, full Open Graph/Twitter를 포함한 분석 metadata.
- `src/app/(main)/analysis/opengraph-image.tsx`, `twitter-image.tsx` (신규): Next.js가 해시 URL로 metadata에 자동 주입하는 분석 허브 전용 1200×630 공유 이미지.
- `src/app/robots.ts`: `/analysis` 관련 disallow를 전부 제거해 허브와 하위 페이지의 meta robots를 검색봇이 읽을 수 있게 변경.
- `src/app/sitemap.ts`: `/analysis` canonical 추가, 부정확한 `lastModified` 제거.
- `src/app/seo-routes.test.ts`: robots, sitemap, metadata, noindex 경계 테스트.
- `src/views/home/home-header.tsx`: 중복 H1 제거.
- `src/views/home/home-view.tsx`: 분석 허브 내부 링크 문안 확인/보완.
- `src/views/home/home-view.test.tsx`, `src/views/home/home-cache.test.tsx`: heading/개인화 회귀 테스트 조정.
- `src/views/analysis/analysis-view.tsx`, `analysis-content.tsx`: visible SEO content, heading outline, 내부 링크.
- `src/views/analysis/analysis-view.test.tsx` (신규): 분석 허브의 의미 구조와 링크 계약.
- `docs/audit/seo.md`: 색인 대상 2개, 검색 의도 분리, 구현 결과, 배포 후 측정 항목 기록.

### 명시적 제외

- `/result` 및 하위 결과 페이지의 metadata, canonical, 공유 OG 이미지
- `/analysis/mbti-profile`, `/analysis/character-match`의 색인 허용
- `/compatibility`의 sitemap 추가 또는 독립 키워드 전략
- 새 schema/JSON-LD, Supabase/API/상태 관리 변경
- Search Console 제출과 실제 배포 작업

## 진행 게이트

이 문서가 Plan 단계 산출물이다. 사용자 승인 전에는 Implement 단계로 넘어가지 않는다. 승인 후 `UI → Frontend → Test → /review → /test → /ship` 순서와 역할별 agent 지침을 적용한다. `/ship`은 review와 test가 통과한 뒤에만 수행한다.

## 기존 WIP 보존·복원 계획

사용자 요청에 따라 SEO 작업 전부터 존재한 auto-recovery/plan2 변경을 보호한다. 현재 diff는 SEO 변경과 기존 WIP가 파일 단위로 분리되어 있고, SEO 작업이 기존 WIP 파일의 내용을 덮어쓴 증거는 없다. 따라서 승인 후 기본 구현은 소스 원복 명령을 실행하지 않는 **무변경 복원(no-op)** 이다. `git checkout`, `git restore`, `git reset`처럼 현재 WIP를 `HEAD` 기준으로 되돌리는 명령은 사용하지 않는다.

### 1. 요구사항과 경계

- SEO tracked 17개(`docs/audit/seo.md`, `src/app/(main)/analysis/page.tsx`, `src/app/(main)/page.tsx`, `src/app/layout.tsx`, `src/app/manifest.ts`, `src/app/robots.ts`, `src/app/seo-routes.test.ts`, `src/app/sitemap.ts`, `src/features/home/ui/recent-tests/recent-tests.tsx`, `src/shared/config/seo.test.ts`, `src/shared/config/seo.ts`, `src/views/analysis/analysis-content.tsx`, `src/views/analysis/analysis-view.tsx`, `src/views/home/home-cache.test.tsx`, `src/views/home/home-header.tsx`, `src/views/home/home-view.test.tsx`, `src/views/home/recent-tests-section.tsx`)와 SEO untracked 7개(`docs/design/seo-home-analysis/design-note.md`, 분석 허브의 `analysis-social-image.tsx`·`opengraph-image.tsx`·`twitter-image.tsx`, 분석 view의 `analysis-card-decoration.tsx`·`analysis-card.tsx`·`analysis-view.test.tsx`)를 모두 보존한다.
- 기존 tracked WIP 4개인 `package.json`, `package-lock.json`, `src/proxy.ts`, `src/shared/types/database.ts`, 기존 untracked auto-recovery WIP 27개(`docs/design/auto-recovery/`, `src/app/api/auto-recovery/`, `src/features/auto-recovery-ingest/`, `src/features/auto-recovery-orchestrate/`, `src/shared/lib/auto-recovery/`, `src/proxy-auto-recovery.test.ts`, `vercel.json`), 그리고 별도 기존 작업인 `docs/design/plan2.md`는 수정하거나 삭제하지 않는다.
- 홈 heading 계약에 직접 연결된 `src/views/home/home-cache.test.tsx`, `src/views/home/recent-tests-section.tsx`의 변경은 SEO 회귀 대응이므로 보존한다. 파일명만으로 비SEO 변경으로 오인해 되돌리지 않는다.

### 2. 복원 흐름

승인 후 Implement 역할 에이전트는 먼저 현재 `git status --short`와 파일별 diff를 다시 대조한다. 위 경계가 유지되면 실행할 소스 변경은 없다. 새 증거로 SEO 작업이 기존 WIP 파일의 특정 hunk를 바꾼 것이 확인될 때만, 그 hunk를 SEO 시작 직전 내용으로 좁게 되돌린다. 파일 전체를 `HEAD`로 복원하거나 미추적 WIP를 삭제하지 않는다.

### 3. 상태·데이터 보존

복원 작업은 런타임 상태, API, Supabase, React Query, Zustand, 스키마에 변경을 만들지 않는다. 특히 auto-recovery 의존성, DB 생성 타입, proxy 공개 경로는 기존 WIP의 데이터·라우팅 계약이므로 그대로 둔다. 별도 기준 스냅샷이 없는 파일은 추정으로 재작성하지 않는다.

### 4. UI와 접근성 보존

홈의 단일 H1, 분석 허브의 H1→H2 구조, 설명형 내부 링크와 기존 접근성 테스트는 SEO 산출물로 유지한다. 복원 때문에 화면 markup, 문안, 포커스, 터치 영역을 바꾸지 않는다. 따라서 UI 에이전트가 수행할 복원 구현도 기본안에서는 없다.

### 5. 검증과 승인 체크포인트

무변경 복원 후의 검증 기준은 현재 변경 목록이 그대로이고, SEO 파일과 기존 WIP 파일 양쪽 모두 diff가 손실되지 않는 것이다. 구현 전후 `git diff --name-status`와 핵심 파일의 diff를 비교하고, 삭제·전체 파일 원복이 0건인지 확인한다. **정확한 제안 조치는 현재 소스에 아무 원복도 적용하지 않고 두 작업 묶음을 모두 보존하는 것**이다. 이 Plan에 대한 사용자 승인 전에는 복원 Implement 단계, 테스트, review, ship으로 넘어가지 않는다.
