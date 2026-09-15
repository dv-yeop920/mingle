# MIXTI SEO 감사 및 최적화 기록

## 요약

MIXTI는 친구·가족·회사·팀 구성원의 MBTI를 조합해 그룹 분위기와 역할, 1:1 케미를 분석하는 모바일 웹 애플리케이션이다. 공개 검색 진입점은 홈(`/`)과 분석 허브(`/analysis`) 두 곳이다. 로그인·테스트 진행·개인 기록·저장 결과와 개인화 분석 도구는 색인하지 않는다.

## 감사 결과와 반영 내용

### 높은 우선순위

1. **대표 검색 정보 부족**
   - 기존 title은 `MINGLE`, description은 한 문장뿐이었다.
   - 홈은 `MBTI 그룹 궁합 테스트`, 분석 허브는 `MBTI 분석`을 대표 검색 의도로 분리했다.
   - 두 페이지에 고유한 title, description, self canonical, 완결된 Open Graph와 Twitter Card를 적용했다.

2. **크롤링 경계 부재**
   - robots.txt와 sitemap.xml이 없어 공개 홈과 개인화 화면의 우선순위가 구분되지 않았다.
   - sitemap에는 canonical 홈과 분석 허브만 포함하고 API, 기록, 마이페이지 경로는 robots에서 제외했다.
   - `/analysis`의 robots 차단을 제거해 허브와 하위 도구의 meta robots를 검색봇이 읽을 수 있게 했다. 개인화 분석 도구, 인증, 테스트·결과 플로우의 `noindex, nofollow`는 유지했다.
   - 실제 변경일 근거 없이 빌드 시각을 내보내던 sitemap의 `lastModified`를 제거했다.

3. **대표 제목 구조 부족**
   - 홈의 인사말 H1 두 개를 일반 텍스트로 바꿔 Hero의 `MBTI 그룹 궁합 테스트`만 H1으로 유지했다.
   - 분석 허브에는 분석 유형과 선택 기준을 설명하는 H1, 도입 문단, 네 개의 H2 카드, 홈 내부 링크와 책임 안내를 추가했다.

### 중간 우선순위

4. **페이지별 공유 문맥 부족**
   - 홈과 분석 허브에 각각 1200×630 공유 이미지를 연결했다. 분석 허브는 Open Graph와 Twitter 전용 파일을 두고, Next.js가 생성한 해시 URL을 metadata에 자동 주입한다. 이미지는 그룹 케미, 1:1 궁합, 성격 분석, 캐릭터 매칭 선택지를 별도 문맥으로 보여준다.

5. **서비스 유형 설명 부족**
   - 무료 한국어 `WebApplication` JSON-LD를 홈에 추가했다.
   - manifest에 앱 이름, 설명, 언어, 테마 정보를 추가했다.

6. **모바일 접근성 제한**
   - 기존 viewport가 확대를 막고 있어 `maximumScale`과 `userScalable=false`를 제거했다.

## 배포 후 확인할 항목

1. 커스텀 도메인을 사용하면 `NEXT_PUBLIC_SITE_URL=https://도메인`을 설정한다. 설정이 없으면 Vercel의 `VERCEL_PROJECT_PRODUCTION_URL`을 사용한다.
2. Google Search Console과 Bing Webmaster Tools에 `/sitemap.xml`을 제출한다.
3. Search Console URL 검사에서 `/`와 `/analysis`의 canonical 및 색인 상태를 확인하고, 하위 개인화 분석 페이지는 `noindex`가 적용되는지 확인한다.
4. Rich Results Test에서 홈의 `WebApplication` JSON-LD를 렌더링 기준으로 확인한다.
5. PageSpeed Insights와 실제 사용자 데이터로 LCP, INP, CLS를 측정한다.
6. 검색어와 CTR 데이터가 쌓이면 페이지별 title과 description 문안을 조정한다.
7. 개인정보처리방침, 이용약관, 문의 채널을 추가해 신뢰 신호를 보강한다.

## 측정 기준

- 색인 대상 URL: `/`, `/analysis`
- 홈 대표 검색 의도: MBTI 그룹 궁합 테스트, MBTI 그룹 케미, 친구 궁합, 팀 궁합
- 분석 허브 대표 검색 의도: MBTI 분석, MBTI 궁합 분석, MBTI 성격 분석, MBTI 캐릭터 매칭
- Core Web Vitals 목표: LCP 2.5초 이하, INP 200ms 이하, CLS 0.1 이하
