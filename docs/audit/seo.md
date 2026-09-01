# MINGLE SEO 감사 및 최적화 기록

## 요약

MINGLE은 친구·가족·회사·팀 구성원의 MBTI를 조합해 그룹 분위기와 역할, 1:1 케미를 분석하는 모바일 웹 애플리케이션이다. 검색 유입의 대표 페이지는 홈(`/`) 하나로 집중하고, 로그인·테스트 진행·개인 기록·저장 결과는 색인하지 않는 구조가 적합하다.

## 감사 결과와 반영 내용

### 높은 우선순위

1. **대표 검색 정보 부족**
   - 기존 title은 `MINGLE`, description은 한 문장뿐이었다.
   - `MBTI 궁합 테스트`, `친구·가족·팀 케미` 검색 의도를 반영한 title, description, keywords, Open Graph, Twitter Card를 추가했다.

2. **크롤링 경계 부재**
   - robots.txt와 sitemap.xml이 없어 공개 홈과 개인화 화면의 우선순위가 구분되지 않았다.
   - sitemap에는 canonical 홈만 포함하고 API, 기록, 마이페이지 경로는 robots에서 제외했다.
   - 인증과 테스트·결과 플로우에는 `noindex, nofollow`를 적용했다. 결과 URL은 공유 미리보기 봇이 메타데이터를 읽을 수 있도록 크롤링 자체는 허용했다.

3. **대표 제목 구조 부족**
   - 홈에 H1이 없고 Hero 제목이 H2였다.
   - 모바일 레이아웃을 유지하면서 MBTI 그룹 케미를 설명하는 visible H1과 보조 콘텐츠를 추가했다.

### 중간 우선순위

4. **공유 미리보기 부재**
   - 1200×630 Open Graph 이미지를 코드로 생성하고 한국어 제목과 서비스 가치를 표시했다.

5. **서비스 유형 설명 부족**
   - 무료 한국어 `WebApplication` JSON-LD를 홈에 추가했다.
   - manifest에 앱 이름, 설명, 언어, 테마 정보를 추가했다.

6. **모바일 접근성 제한**
   - 기존 viewport가 확대를 막고 있어 `maximumScale`과 `userScalable=false`를 제거했다.

## 배포 후 확인할 항목

1. 커스텀 도메인을 사용하면 `NEXT_PUBLIC_SITE_URL=https://도메인`을 설정한다. 설정이 없으면 Vercel의 `VERCEL_PROJECT_PRODUCTION_URL`을 사용한다.
2. Google Search Console과 Bing Webmaster Tools에 `/sitemap.xml`을 제출한다.
3. Rich Results Test에서 홈의 `WebApplication` JSON-LD를 렌더링 기준으로 확인한다.
4. PageSpeed Insights와 실제 사용자 데이터로 LCP, INP, CLS를 측정한다.
5. 개인정보처리방침, 이용약관, 문의 채널을 추가해 신뢰 신호를 보강한다.

## 측정 기준

- 색인 대상 URL: `/`
- 대표 검색 의도: MBTI 궁합 테스트, MBTI 그룹 케미, 친구 궁합, 팀 궁합
- Core Web Vitals 목표: LCP 2.5초 이하, INP 200ms 이하, CLS 0.1 이하
