# MINGLE 개발 계획서 — Next.js 16 + Supabase

## Context

MINGLE은 MBTI 그룹 케미 시뮬레이터로, 여러 명의 MBTI를 입력하면 AI가 그룹의 관계·분위기·역할·대화 스타일을 분석해주는 모바일 웹 서비스이다.

현재 프로젝트 상태:

- **Next.js 16.3.1** + React 19 + Tailwind CSS v4 (CSS-first `@theme`)
- React Compiler 활성화, 폰트(Gothic A1 + Nunito) 설정 완료
- **디자인 토큰 완성**: `src/styles/tokens.css`(원시값) + `src/styles/theme.css`(시맨틱 + Tailwind 브릿지)
- **Phase 3 완료**: 전체 UI 구현 완료 (shared/ui → entities → features → widgets → views → app 라우팅)
- 13개 라우트 + 3개 route group 레이아웃 연결, 목업 데이터 기반 전체 네비게이션 동작
- Supabase 미설치, 비즈니스 로직·API·인증 미구현

Next.js 16 주요 변경: `middleware.ts` → **`proxy.ts`** (export `proxy`), `LayoutProps<"/">` 타입 라우트.

---

## 1. 폴더 구조 (FSD 응용 — 도메인 응집 + UI/로직 분리)

설계 원칙:

- **레이어 규칙**: `shared` → `entities` → `features` → `widgets` → `app` (하위 → 상위 방향만 의존)
- **도메인 응집**: 같은 도메인의 타입, API, UI가 한 폴더에 모여 있다
- **UI/비즈니스 분리**: 각 도메인 내 `model/`(타입·상수·스키마), `api/`(서버 액션·쿼리), `ui/`(컴포넌트) 서브폴더로 책임 분리
- `app/`은 **라우팅 전용** — 비즈니스 로직과 UI를 직접 두지 않고, features/entities에서 조합만 한다

```
src/
├── proxy.ts                              # 인증 가드 (Next.js 16, 구 middleware)
│
├── app/                                  # 🔷 라우팅 + Provider 레이어
│   ├── globals.css
│   ├── layout.tsx                        # 루트 레이아웃 (폰트, viewport)
│   ├── providers.tsx                     # 루트 Provider 조합 (QueryProvider 등)
│   ├── not-found.tsx
│   │
│   ├── (auth)/                           # ✅ 구현 완료
│   │   ├── layout.tsx                    # MobileFrame 래퍼
│   │   ├── login/
│   │   │   └── page.tsx                  # → views/login/LoginView
│   │   └── signup/
│   │       └── page.tsx                  # → views/signup/SignupView
│   │
│   ├── (main)/                           # ✅ 구현 완료
│   │   ├── layout.tsx                    # MobileFrame + BottomNav 레이아웃
│   │   ├── page.tsx                      # "/" → HomeView + SplashOverlay
│   │   ├── home/
│   │   │   └── page.tsx                  # redirect('/') 하위 호환
│   │   ├── history/
│   │   │   └── page.tsx                  # → views/history/HistoryView
│   │   └── mypage/
│   │       ├── page.tsx                  # → views/mypage/MyPageContainerView
│   │       └── settings/
│   │           └── page.tsx              # → views/mypage/SettingsView
│   │
│   ├── (test)/                           # ✅ 구현 완료
│   │   ├── layout.tsx                    # MobileFrame 래퍼
│   │   ├── group-type/
│   │   │   └── page.tsx                  # → views/group-type/GroupTypeView
│   │   ├── members/
│   │   │   └── page.tsx                  # → views/members/MemberSetupView
│   │   ├── analyzing/
│   │   │   └── page.tsx                  # → views/analyzing/AnalyzingView
│   │   └── result/
│   │       ├── page.tsx                  # → views/result/ResultView
│   │       ├── atmosphere/
│   │       │   └── page.tsx              # → views/result/AtmosphereView
│   │       └── pair-detail/
│   │           └── page.tsx              # → views/result/PairDetailView
│   │
│   └── api/                              # Phase 5에서 구현
│       └── analyze/
│           └── route.ts                  # → entities/analysis/api 호출
│
│
├── shared/                               # 🟢 공유 레이어 (의존 없음, 도메인 무관)
│   ├── ui/                               # 순수 UI 프리미티브 (도메인 지식 없음)
│   │   ├── Button.tsx
│   │   ├── TextField.tsx
│   │   ├── Chip.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── ProgressBar.tsx
│   │   └── index.ts                      # barrel export
│   ├── lib/                              # 인프라 유틸리티
│   │   ├── supabase/
│   │   │   ├── client.ts                 # createBrowserClient
│   │   │   ├── server.ts                 # createServerClient (cookies)
│   │   │   └── admin.ts                  # Service Role
│   │   └── utils.ts                      # cn() 등
│   ├── config/                           # 공통 설정
│   │   └── query-keys.ts                # React Query key factory (전역 key 관리)
│   ├── styles/                           # 디자인 토큰 + 테마
│   │   ├── tokens.css                    # 원시 토큰 (기존)
│   │   ├── theme.css                     # 시맨틱 토큰 + Tailwind 브릿지 (기존)
│   │   └── animations.css                # @keyframes (float, pulse, dot)
│   └── types/
│       └── database.ts                   # Supabase 자동 생성 타입
│
│
├── entities/                             # 🟡 도메인 엔티티 (데이터 모델 + 기본 UI)
│   │                                     #    비즈니스 유스케이스 없이 "이것이 무엇인가"만 정의
│   │
│   ├── user/
│   │   ├── model/
│   │   │   ├── types.ts                  # User, Profile 타입
│   │   │   └── schemas.ts               # Zod 스키마 (nickname, password 등)
│   │   ├── api/
│   │   │   ├── queries.ts               # getProfile(), getStats() 서버 쿼리
│   │   │   └── hooks.ts                 # useProfile(), useStats() React Query 훅
│   │   └── ui/
│   │       └── Avatar.tsx                # MBTI 기질 색상 아바타
│   │
│   ├── mbti/
│   │   ├── model/
│   │   │   ├── types.ts                  # MBTIType, TemperamentGroup
│   │   │   └── constants.ts              # 16타입 목록, 기질군 매핑, 색상
│   │   ├── lib/
│   │   │   └── utils.ts                  # getTemperament(), getColors()
│   │   └── ui/
│   │       └── Badge.tsx                 # MBTI 배지, "나" 배지
│   │
│   ├── group/
│   │   ├── model/
│   │   │   ├── types.ts                  # Group, GroupType
│   │   │   └── constants.ts              # 그룹 유형 목록, 아이콘 매핑
│   │   ├── api/
│   │   │   ├── queries.ts               # getGroups(), getGroupById()
│   │   │   └── hooks.ts                 # useGroups() React Query 훅
│   │   └── ui/
│   │       └── GroupTypeCard.tsx          # 그룹 유형 카드
│   │
│   ├── member/
│   │   ├── model/
│   │   │   ├── types.ts                  # Member 타입
│   │   │   └── schemas.ts               # Zod (닉네임, 성별, MBTI)
│   │   └── ui/
│   │       └── MemberCard.tsx            # 멤버 카드 (아바타+닉네임+MBTI+성별)
│   │
│   └── analysis/
│       ├── model/
│       │   └── types.ts                  # AnalysisResult, Metrics, PairChemistry 등
│       ├── api/
│       │   ├── queries.ts               # getAnalyses(), getAnalysisById() 서버 쿼리 함수
│       │   ├── hooks.ts                 # useAnalyses(), useAnalysis() React Query 훅
│       │   └── prompt.ts                # AI 프롬프트 템플릿 (읽기 전용 설정)
│       └── ui/                           # 읽기 전용 표시 UI
│           ├── ScoreGauge.tsx            # 케미 점수 게이지 (conic-gradient)
│           ├── MetricBar.tsx             # 지표 진행 바
│           ├── RoleCard.tsx              # 역할 카드
│           ├── PairCard.tsx              # Pair 케미 카드
│           ├── InsightCard.tsx           # 분위기/의사결정/Best moment
│           ├── WarningCard.tsx           # 갈등 가능성 카드
│           └── ResultSummaryCard.tsx     # 테스트 결과 요약 카드
│
│
├── features/                             # 🟠 비즈니스 기능 (유스케이스 단위)
│   │                                     #    "사용자가 무엇을 하는가"를 구현
│   │
│   ├── auth/
│   │   ├── model/
│   │   │   └── schemas.ts               # 로그인/회원가입 폼 Zod 스키마
│   │   ├── api/
│   │   │   └── actions.ts               # login(), signup(), logout() Server Actions
│   │   └── ui/
│   │       ├── LoginForm.tsx             # 로그인 폼 (Client Component)
│   │       └── SignupForm.tsx            # 회원가입 폼 (Client Component)
│   │
│   ├── test-flow/
│   │   ├── model/
│   │   │   ├── store.ts                 # Zustand store (groupType, members[], 분석 상태)
│   │   │   └── types.ts                 # TestFlowState, Member
│   │   ├── api/
│   │   │   └── actions.ts              # requestAnalysis() — /api/analyze 호출
│   │   └── ui/
│   │       ├── GroupTypeSelector.tsx     # 4종 카드 그리드 + 기타 입력
│   │       ├── MemberSetupForm.tsx       # 멤버 추가/편집/삭제 폼
│   │       ├── MBTIPicker.tsx            # 16타입 4×4 그리드 바텀시트
│   │       └── AnalysisAnimation.tsx     # 로딩 애니메이션 + 진행률
│   │
│   ├── analysis-result/
│   │   ├── model/
│   │   │   └── hooks.ts                 # useAnalysisResult() — Zustand/React Query 분기
│   │   ├── api/
│   │   │   └── actions.ts              # saveAnalysis(), deleteAnalysis() Server Actions (mutation)
│   │   └── ui/
│   │       ├── ResultReport.tsx          # 전체 결과 리포트 (스크롤)
│   │       ├── AtmosphereDetail.tsx      # 분위기 상세
│   │       ├── PairDetail.tsx            # Pair 상세
│   │       └── ShareButton.tsx           # 결과 공유
│   │
│   ├── history/
│   │   ├── model/
│   │   │   └── hooks.ts                 # 필터 상태 관리
│   │   └── ui/
│   │       ├── HistoryList.tsx           # 필터 칩 + 카드 리스트
│   │       └── HistoryFilter.tsx         # 필터 칩 바
│   │
│   ├── profile/
│   │   ├── api/
│   │   │   └── actions.ts              # updateNickname, updateMBTI, updatePassword
│   │   └── ui/
│   │       ├── MyPageView.tsx            # 프로필 + 통계 + 메뉴
│   │       ├── SettingsForm.tsx          # 계정 설정 폼
│   │       └── StatRow.tsx               # 통계 행
│   │
│   └── home/
│       └── ui/
│           ├── HeroCard.tsx              # 메인 Hero CTA 카드
│           └── RecentTests.tsx           # 최근 테스트 섹션
│
│
├── widgets/                              # 🔵 페이지 공용 조합 블록
│   ├── bottom-nav/
│   │   └── BottomNav.tsx                 # Home/History/My 3탭
│   ├── splash-overlay/
│   │   └── SplashOverlay.tsx             # 세션 1회 스플래시 오버레이
│   ├── step-header/
│   │   └── StepHeader.tsx                # 뒤로가기 + 진행 인디케이터
│   └── mobile-frame/
│       └── MobileFrame.tsx               # max-w-[390px] 래퍼
│
│
├── views/                                # 🟣 페이지 뷰 조합 레이어
│   │                                     #    entities + features + widgets를 조합하여
│   │                                     #    하나의 완성된 페이지 뷰를 구성
│   │
│   ├── login/
│   │   └── LoginView.tsx                 # features/auth/ui/LoginForm 조합
│   ├── signup/
│   │   └── SignupView.tsx                # features/auth/ui/SignupForm 조합
│   ├── home/
│   │   └── HomeView.tsx                  # features/home/ui + entities/analysis/ui 조합
│   ├── group-type/
│   │   └── GroupTypeView.tsx             # features/test-flow/ui/GroupTypeSelector 조합
│   ├── members/
│   │   └── MemberSetupView.tsx           # features/test-flow/ui/MemberSetupForm + MBTIPicker 조합
│   ├── analyzing/
│   │   └── AnalyzingView.tsx             # features/test-flow/ui/AnalysisAnimation 조합
│   ├── result/
│   │   ├── ResultView.tsx                # features/analysis-result/ui/ResultReport 조합
│   │   ├── AtmosphereView.tsx            # features/analysis-result/ui/AtmosphereDetail 조합
│   │   └── PairDetailView.tsx            # features/analysis-result/ui/PairDetail 조합
│   ├── history/
│   │   └── HistoryView.tsx               # features/history/ui/HistoryList 조합
│   └── mypage/
│       ├── MyPageView.tsx                # features/profile/ui/MyPageView 조합
│       └── SettingsView.tsx              # features/profile/ui/SettingsForm 조합
```

### 레이어 의존 규칙

```
app ──→ views ──→ widgets ──→ features ──→ entities ──→ shared
 │        │          │           │            │
 │        │          │           │            └── shared/* 만 사용
 │        │          │           └── entities/* + shared/* 사용
 │        │          └── features/* + entities/* + shared/* 사용
 │        └── widgets + features + entities + shared 조합
 └── views import + Provider 배치
```

- **같은 레이어 내 cross-import 금지**: `features/auth`가 `features/test-flow`를 import하지 않는다
- **상위 → 하위 의존만**: `features/`가 `entities/`를 사용할 수 있지만 반대는 불가
- **`views/`가 페이지 조합**: widgets + features + entities를 조합하여 완성된 페이지 뷰 구성
- **`app/` page는 얇은 껍질**: views를 import하여 렌더링 + Provider 배치

## 1-1. 아키텍처

### 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Browser)                      │
│                                                          │
│  app/(auth)        app/(main)         app/(test)         │
│  ┌──────────┐     ┌──────────┐     ┌───────────────┐    │
│  │ page     │     │ page     │     │ page          │    │
│  │ (조합만)  │     │ (조합만)  │     │ (조합만)       │    │
│  └────┬─────┘     └────┬─────┘     └──────┬────────┘    │
│       │                │                   │             │
│  features/auth    features/home      features/test-flow  │
│  features/profile features/history   features/analysis   │
│       │                │                   │             │
│  ─── React Query (서버 상태) ── Zustand (클라이언트 상태) ──│
│       │                │                   │             │
│  entities/user    entities/analysis   entities/member     │
│  entities/mbti    entities/group      entities/mbti       │
│       │                │                   │             │
│  shared/ui        shared/ui           shared/ui          │
│  shared/lib       shared/lib          shared/lib         │
└───────┼────────────────┼───────────────────┼─────────────┘
        │                │                   │
   Server Actions    서버 쿼리         /api/analyze (POST)
        │                │                   │
┌───────▼────────────────▼───────────────────▼─────────┐
│              Next.js Server (Node.js)                 │
│  ┌─────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │proxy.ts │  │ entities/*/api/  │  │app/api/     │  │
│  │(Auth    │  │ features/*/api/  │  │analyze/     │  │
│  │ Guard)  │  │ (Server Actions) │  │route.ts     │  │
│  └────┬────┘  └────────┬─────────┘  └──────┬──────┘  │
└───────┼────────────────┼────────────────────┼─────────┘
        │                │                    │
┌───────▼────────────────▼──────┐     ┌───────▼───────┐
│         Supabase              │     │   OpenAI      │
│   ┌──────┐    ┌─────────┐    │     │   GPT API     │
│   │ Auth │    │ DB+RLS  │    │     │               │
│   └──────┘    └─────────┘    │     └───────────────┘
└───────────────────────────────┘
```

### 레이어별 책임

| 레이어      | 핵심 역할                              | 포함하는 것                                             | 포함하지 않는 것                   |
| ----------- | -------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| `app/`      | **라우팅 + Provider**                  | page.tsx, layout.tsx, route.ts, providers.tsx           | UI 정의, 비즈니스 로직             |
| `views/`    | **페이지 뷰 조합**                     | 하위 레이어들을 조합한 완성된 페이지 뷰                 | 비즈니스 로직 직접 구현            |
| `widgets/`  | 여러 페이지에서 공유되는 레이아웃 블록 | BottomNav, StepHeader, MobileFrame                      | 도메인 로직                        |
| `features/` | **Mutation (쓰기)** + UI               | Server Actions, Zustand store, 폼, mutation 훅, 복합 UI | data fetching, 다른 feature import |
| `entities/` | **Data Fetching (읽기)** + UI          | React Query 훅, 서버 쿼리 함수, 타입, 스키마, 단위 UI   | mutation 로직, 유스케이스 로직     |
| `shared/`   | **공통 인프라**                        | 공통 UI(Button 등), Supabase 클라이언트, config, cn()   | 도메인 지식                        |

### 핵심 결정

| 항목                 | 선택                                            | 이유                                       |
| -------------------- | ----------------------------------------------- | ------------------------------------------ |
| 폴더 구조            | FSD 응용 (shared→entities→features→widgets→app) | 도메인 응집, 의존 방향 단방향              |
| 렌더링               | Server Component 기본, Client는 인터랙티브 UI만 | RSC 데이터 패칭 + 번들 최소화              |
| 서버 상태            | **React Query** (`@tanstack/react-query`)       | 캐싱, 자동 갱신, 낙관적 업데이트           |
| 클라이언트 전역 상태 | **Zustand**                                     | 테스트 플로우 등 클라이언트 전용 상태 관리 |
| 인증                 | Supabase Auth (ID → `{id}@mingle.local` 매핑)   | Supabase RLS/JWT 통합 활용                 |
| 세션                 | `@supabase/ssr` 쿠키 기반                       | SSR 호환                                   |
| 인증 가드            | `src/proxy.ts`                                  | Next.js 16 컨벤션 (구 middleware)          |
| 분석 AI              | OpenAI GPT + Route Handler `/api/analyze`       | 스트리밍 가능, Action 순차 제약 회피       |
| 유효성 검사          | Zod (entities/model + features/model에 배치)    | 클라이언트 + 서버 공유 스키마              |
| 바텀 시트            | 직접 구현 → `shared/ui/BottomSheet.tsx`         | 외부 UI 라이브러리 없이 유지               |
| 결과 공유            | Web Share API + 클립보드 폴백                   | 네이티브 공유, 추가 의존 없음              |

---

## 2. 페이지 / 라우트 목록

| #   | 라우트                  | 화면                       | RSC/CC               | 설명                                                     |
| --- | ----------------------- | -------------------------- | -------------------- | -------------------------------------------------------- |
| 1   | `/`                     | Home + SplashOverlay       | Client               | HomeView + SplashOverlay 동시 마운트 (splash는 세션 1회) |
| 2   | `/login`                | Login                      | Client Form          | ID/PW 입력, Server Action 인증                           |
| 3   | `/signup`               | Sign Up                    | Client Form          | 닉네임/ID/PW/PW확인, Zod 검증                            |
| 4   | `/home`                 | (리다이렉트)               | Server               | `redirect('/')` 하위 호환                                |
| 5   | `/history`              | Test History               | Server + Client 필터 | 카드 리스트, 필터 칩 (searchParams)                      |
| 6   | `/mypage`               | My Page                    | Server               | 프로필, 통계, 메뉴                                       |
| 7   | `/mypage/settings`      | Account Settings           | Client Form          | 닉네임/PW/MBTI 재설정                                    |
| 8   | `/group-type`           | Group Type Selection       | Client               | 4종 카드 단일 선택, Step 1/3                             |
| 9   | `/members`              | Member Setup + MBTI Picker | Client               | 멤버 추가, 바텀시트 MBTI, Step 2/3                       |
| 10  | `/analyzing`            | Analysis Loading           | Client               | AI API 호출 + 애니메이션, Step 3/3                       |
| 11  | `/result`               | Analysis Result            | Client               | 스크롤 리포트 (게이지, 지표, 역할, Pair)                 |
| 12  | `/result/atmosphere`    | Group Atmosphere Detail    | Client               | 분위기/의사결정/갈등/Best moment                         |
| 13  | `/result/pair-detail`   | Pair Detail                | Client               | 두 명 케미 상세                                          |
| —   | `/api/analyze`          | —                          | Server               | POST, AI 분석 + DB 저장                                  |

**Route Group 레이아웃:**

| Group    | 포함 요소                                      |
| -------- | ---------------------------------------------- |
| `(auth)` | 로고 + 중앙 정렬, Bottom Nav 없음              |
| `(main)` | BottomNav (Home / History / My)                |
| `(test)` | StepHeader + TestFlowProvider, Bottom Nav 없음 |

---

## 3. DB 테이블 개요

### ERD

```
auth.users (Supabase 관리)
    │
    └── 1:1 ── profiles
                   │
                   ├── 1:N ── groups
                   │             │
                   │             └── 1:N ── members
                   │
                   └── 1:N ── analyses ── N:1 ── groups
```

### profiles (사용자 프로필)

| 컬럼         | 타입                      | 설명                      |
| ------------ | ------------------------- | ------------------------- |
| `id`         | uuid PK, FK→auth.users.id | Supabase Auth ID          |
| `username`   | text UNIQUE NOT NULL      | 로그인 ID (영어+숫자)     |
| `nickname`   | text NOT NULL             | 표시 닉네임 (≤8자)        |
| `mbti`       | text NULL                 | 사용자 MBTI (미설정 가능) |
| `gender`     | text NULL                 | 사용자 성별 (미설정 가능) |
| `created_at` | timestamptz               | 가입 일시                 |
| `updated_at` | timestamptz               | 수정 일시                 |

### groups (테스트 그룹)

| 컬럼          | 타입                                      | 설명           |
| ------------- | ----------------------------------------- | -------------- |
| `id`          | uuid PK                                   | 그룹 ID        |
| `user_id`     | uuid FK→profiles.id NOT NULL              | 생성자         |
| `type`        | text CHECK(friends/company/family/custom) | 관계 유형      |
| `custom_name` | text NULL                                 | 기타 유형 이름 |
| `created_at`  | timestamptz                               | 생성 일시      |

### members (그룹 멤버)

| 컬럼       | 타입                          | 설명               |
| ---------- | ----------------------------- | ------------------ |
| `id`       | uuid PK                       | 멤버 ID            |
| `group_id` | uuid FK→groups.id CASCADE     | 소속 그룹          |
| `nickname` | text NOT NULL                 | 멤버 닉네임 (≤8자) |
| `gender`   | text CHECK(male/female/other) | 성별               |
| `mbti`     | text NOT NULL                 | MBTI 타입          |
| `is_self`  | boolean DEFAULT false         | 본인 여부          |
| `order`    | int2 NOT NULL                 | 표시 순서          |

### analyses (분석 결과)

| 컬럼               | 타입                         | 설명                 |
| ------------------ | ---------------------------- | -------------------- |
| `id`               | uuid PK                      | 분석 ID              |
| `user_id`          | uuid FK→profiles.id NOT NULL | 요청자               |
| `group_id`         | uuid FK→groups.id CASCADE    | 대상 그룹            |
| `chemistry_score`  | int2 (0-100)                 | 전체 케미 점수       |
| `metrics`          | jsonb                        | 5개 지표 (아래 참조) |
| `group_atmosphere` | jsonb                        | 분위기 분석          |
| `member_roles`     | jsonb                        | 멤버별 역할          |
| `pair_chemistry`   | jsonb                        | 쌍별 케미            |
| `summary`          | text                         | 한 줄 요약 인용문    |
| `created_at`       | timestamptz                  | 분석 일시            |

### JSONB 구조

```typescript
// metrics
{ conversation: number, friendship: number, teamwork: number,
  atmosphere: number, conflict: number }  // 각 0-100

// group_atmosphere
{ description: string, decision_making: string,
  conflict: string, best_moment: string }

// member_roles
Array<{ nickname: string, mbti: string, role: string, description: string }>

// pair_chemistry
Array<{ pair_id: string, member_a: string, member_b: string,
        score: number, summary: string, detail: string }>
```

### Auth Trigger (회원가입 시 profiles 자동 생성)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),  -- {id}@mingle.local에서 id 추출
    NEW.raw_user_meta_data->>'nickname'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 4. 구현 순서

### Phase 0~3: 완료 ✅

규칙/환경 설정 → 패키지/MCP/Lint → 라이브러리 세팅(Supabase 클라이언트, React Query, proxy.ts) → 전체 UI 구현(shared/ui → entities → features → widgets → views → app 라우팅). 13개 라우트 + 3개 route group 레이아웃, 목업 데이터 기반 빌드 통과.

### Phase 4: 비즈니스 로직 구현 ✅

**UI가 완성된 상태에서 실제 로직을 연결한다.**

- `features/auth/api/actions.ts`: login, signup, logout Server Actions
- `features/auth/model/schemas.ts`: Zod 유효성 검사
- `features/test-flow/model/store.ts`: Zustand store (groupType, members[], 분석 상태)
- `features/analysis-result/api/actions.ts`: saveAnalysis, deleteAnalysis
- `features/profile/api/actions.ts`: updateNickname, updateMBTI, updatePassword
- `entities/mbti/lib/utils.ts`: getTemperament(), getColors()
- 목업 데이터 → Zustand/React Query 연결로 전환
- `shared/styles/animations.css` + 모션 적용

### Phase 5: API & DB 구현 ✅

- Supabase DB 테이블 생성 (profiles, groups, members, analyses)
- RLS 정책 설정 (섹션 5 참조)
- Auth Trigger (회원가입 시 profiles 자동 생성)
- `entities/*/api/queries.ts`: 서버 쿼리 함수 구현
- `entities/*/api/hooks.ts`: React Query 훅 연결
- `app/api/analyze/route.ts`: OpenAI GPT 호출 + DB 저장
- `entities/analysis/api/prompt.ts`: AI 프롬프트 템플릿
- 전체 E2E 흐름 검증 (회원가입 → 로그인 → 테스트 → 결과 → 히스토리)

### Phase 6: 폴리싱 ✅

- Error/Loading/NotFound 바운더리 (global-error, not-found, 3개 route group loading)
- 결과 공유 (Web Share API + 클립보드 폴백)
- "멤버 추가 분석" / "다시 테스트하기" 플로우 (ResultActions 컴포넌트)
- 접근성 (44px 터치, aria-label, 포커스)
- 최종 모바일 뷰포트(390×844) UI 검증

### Phase 6.5: Splash 오버레이 마이그레이션 ✅

Splash를 독립 페이지(`(auth)/page.tsx`)에서 **오버레이 위젯**으로 전환.
HomeView와 SplashOverlay를 `(main)/page.tsx`에서 동시 마운트하여 데이터 프리패치 병렬화.

- `src/views/splash/` 삭제 → `src/widgets/splash-overlay/` 신규
- `(auth)/page.tsx` 삭제 → `(main)/page.tsx`에서 `<HomeView /> + <SplashOverlay />` 렌더링
- BottomNav 홈 경로 `/home` → `/` 변경 + exact match 로직
- `useSyncExternalStore`로 hydration-safe sessionStorage 접근
- 상세: `docs/splash-overlay-migration.md`

---

## 4-1. 마이그레이션 계획 (퍼블리싱 · 라우팅 · 디자인 정합)

비즈니스 로직과 API는 완성되었으나, 뷰 → 피처 간 콜백 연결, 라우트 네비게이션, 디자인 파일과의 UI 정합이 미완성.
비로그인 테스트 플로우를 위한 auth 구조 변경도 필요.

**기획 플로우 변경:**
```
비로그인 사용자:  홈(/) → 테스트(group-type → members → analyzing → result) → "저장" 시 회원가입 유도
로그인 사용자:    홈(/) → 테스트 → 결과 저장 → 히스토리·마이페이지
```

### Phase 7: 네비게이션 연결 ✅

전체 테스트 플로우의 뷰 → 피처 간 콜백 연결과 라우트 네비게이션 완성.

- `home-view.tsx` — `'use client'` 추가, HeroCard에 `onClick → /group-type` 전달
- `group-type-view.tsx` — StepHeader `onBack → /`, GroupTypeSelector `onNext → /members`
- `member-setup-view.tsx` — StepHeader `onBack → /group-type`, MemberSetupForm `onStartAnalysis → /analyzing`
- `analyzing-view.tsx` — mount 시 `requestAnalysis()` 호출, 성공 시 `/result?id=...`로 이동, 실패 시 에러+재시도
- `result-view.tsx` — atmosphere/pair 클릭 핸들러 추가, searchParams로 서브 페이지 연결
- `atmosphere-view.tsx`, `pair-detail-view.tsx` — `'use client'` + 뒤로가기 버튼
- 서브 페이지 라우트(`atmosphere/page.tsx`, `pair-detail/page.tsx`) — searchParams에서 id/pair 추출

### Phase 8: Result 상세 데이터 연결 + AI 스키마 변경 ✅

- AI 프롬프트 스키마 확장: `tagline`, `pairChemistry`에 `description`, `conversationScore`, `conflictScore`, `recommendedSituations` 추가
- `AtmosphereDetail` — mock → 실제 데이터 (`useAnalysis(analysisId)`)
- `PairDetail` — mock → 실제 데이터 + 디자인 정합 (♥ 하트, 미니 지표, 서술 카드, 추천 상황)
- `ResultView` — 클릭 핸들러 + 그린 헤더 + 분위기 섹션 4색 카드

### Phase 9: 비로그인 테스트 플로우 + Auth 구조 ✅

- `/api/analyze` — auth 체크를 optional로 변경 (비로그인: OpenAI만 호출, DB 저장 생략)
- Zustand store에 `analysisResult` 임시 저장 필드 추가
- `ResultView` — 이중 데이터 소스 (`analysisId` 있으면 DB, 없으면 store)
- `proxy.ts` — PUBLIC_ROUTES 확장 (테스트 플로우 전체 공개, `/history`·`/mypage`만 보호)
- 가입 후 store의 `analysisResult` 자동 DB 저장 플로우

### Phase 10: 디자인 정합 구현

디자인 파일(`docs/MIXTI_Mobile_App.dc.html`)과 현재 구현 비교 분석 기반으로 전 화면 UI 수정.

- Splash: 배경 그린 계열 + 부제 텍스트 변경
- Login/Signup: 그린 곡면 헤더 + 회원가입/로그인 링크
- Home: 인사 헤더 + MBTI 4×4 그리드
- Analysis Loading: 스피너 → 이모지 + 체크리스트 UI
- Result: 그린 헤더 + 태그라인 + 분위기 4색 카드
- Pair Detail: ♥ 하트 + 미니 지표 + 서술 카드 + 추천 상황
- History: 제목 "테스트 기록" + 건수 표시
- My Page: 프로필 카드 + 메뉴 스타일 매칭

### Phase 11: 코드 정리 ✅

- `GROUP_TYPE_LABELS` 4곳 중복 → `src/shared/config/group-types.ts`에 통합 (`result-view.tsx`의 `company` 키 버그도 수정)
- mock 상수 파일 삭제: `result-report/constants.ts` (미사용), `recent-tests/constants.ts`, `history-list/constants.ts` (통합 후 빈 파일)
  - `atmosphere-detail/constants.ts`, `pair-detail/constants.ts`는 Phase 8 실제 데이터 연결 전까지 유지
- 회원탈퇴 버튼 disabled + "준비 중" 텍스트

### 마이그레이션 실행 순서

| Phase | 내용                          | 의존성                      |
| ----- | ----------------------------- | --------------------------- |
| 7     | 네비게이션 연결               | 없음 (✅ 완료)              |
| 8     | Result 데이터 + 스키마 변경   | Phase 7                     |
| 9     | 비로그인 플로우 + Auth        | Phase 7                     |
| 10    | 디자인 정합                   | Phase 8-9 기능 완성 후      |
| 11    | 코드 정리                     | Phase 8 (mock 제거) + 10    |

---

## 5. 주의점 (RLS, Auth, 보안)

### 5.1 RLS 정책

모든 테이블에 RLS 활성화. 정책 원칙: **본인 데이터만 접근**.

```sql
-- profiles: 본인만 조회/수정
SELECT  → auth.uid() = id
UPDATE  → auth.uid() = id

-- groups: 본인 그룹만 CRUD
SELECT  → auth.uid() = user_id
INSERT  → auth.uid() = user_id
DELETE  → auth.uid() = user_id

-- members: 본인 그룹의 멤버만 (subquery로 groups.user_id 확인)
SELECT  → EXISTS(SELECT 1 FROM groups WHERE id = group_id AND user_id = auth.uid())
INSERT  → EXISTS(SELECT 1 FROM groups WHERE id = group_id AND user_id = auth.uid())

-- analyses: 본인 결과만
SELECT  → auth.uid() = user_id
INSERT  → auth.uid() = user_id
DELETE  → auth.uid() = user_id
```

### 5.2 인증 보안

- **ID→이메일 매핑**: `{id}@mingle.local`은 서버 측에서만 처리. Supabase 대시보드에서 Email Confirmation **반드시 비활성화**
- **모든 Server Action** 시작에 `auth.getUser()` 확인. 미인증 시 redirect 또는 throw
- **proxy.ts**: 공개 경로(`/`, `/login`, `/signup`)만 허용, 나머지는 세션 확인 후 `/login` 리다이렉트
- **비밀번호**: Zod에서 영어+숫자+특수문자, 6자 이상 검증

### 5.3 환경 변수

| 변수                            | 노출 범위     | 비고                     |
| ------------------------------- | ------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | 클라이언트 OK | RLS가 보호               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 OK | RLS가 보호               |
| `SUPABASE_SERVICE_ROLE_KEY`     | **서버 전용** | 절대 노출 금지           |
| `OPENAI_API_KEY`                | **서버 전용** | Route Handler에서만 사용 |

### 5.4 API 보안 (`/api/analyze`)

- 인증 확인 필수
- 입력 검증: 멤버 수 상한 (최대 10명), MBTI 값 유효성
- Rate limiting: 최근 분석 시간 체크 (비용 보호)
- AI 응답을 Zod로 구조 검증 후 DB 저장

### 5.5 일반 보안

- **CSRF**: Server Action은 Next.js가 Origin 자동 검증
- **XSS**: React 기본 이스케이핑 사용, AI 응답에 `dangerouslySetInnerHTML` 금지
- **SQL Injection**: Supabase SDK 파라미터 바인딩으로 방어

---

## 검증 방법

### Phase 0~6 (초기 구현)

1. **Phase 0 검증**: Supabase 대시보드에서 테이블 생성 확인, RLS 정책 테스트 (anon key로 타인 데이터 접근 시 거부 확인)
2. **Phase 1 검증**: 회원가입 → 로그인 → Home 진입 전체 흐름. 미인증 접근 시 `/login` 리다이렉트 확인
3. **Phase 2 검증**: Group Type → Member Setup 플로우에서 Context 상태 유지 확인. MBTI Picker 16타입 선택 동작
4. **Phase 3 검증**: 분석 API 호출 → 로딩 → 결과 표시 E2E. AI 응답 파싱 검증. DB 저장 확인
5. **Phase 4 검증**: History 필터링, MyPage 통계 정확성, 설정 변경 반영
6. **전체**: `npm run build` 성공, 모바일 뷰포트(390×844)에서 UI 확인

### Phase 7~11 (마이그레이션)

각 Phase 완료 후: `npm run lint` + `npx tsc --noEmit` + `npm run build` + `npm test`

- **Phase 7**: 홈 CTA → `/group-type` → `/members` → `/analyzing`(API) → `/result?id=...` 전체 플로우 + 각 뒤로가기
- **Phase 8**: `/result` → atmosphere/pair 카드 클릭 → 실제 데이터 표시 + 뒤로가기
- **Phase 9**: 비로그인 홈→테스트→결과 확인, "저장" → 회원가입 → 가입 후 자동 저장, `/history`·`/mypage` → `/login` 리다이렉트
- **Phase 10**: 각 화면을 디자인 파일과 나란히 비교, 전체 플로우 브라우저 검증
- **Phase 11**: mock 삭제 후 빌드 성공, 중복 상수 통합 확인
