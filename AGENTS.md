<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# MINGLE 코드 컨벤션

MBTI 그룹 케미 시뮬레이터 모바일 웹 서비스.
Next.js 16.3.1 / React 19 / Tailwind CSS v4 / Supabase / React Query / Zustand / Zod v4 / React Hook Form

---

## 1. FSD 레이어 규칙

```
shared → entities → features → widgets → views → app
```

- 의존 방향: 하위 → 상위만 허용
- **같은 레이어 내 cross-import 금지** (`features/auth` → `features/test-flow` 불가)

| 레이어 | 책임 |
|---|---|
| `shared/` | 도메인 무관 공통 (UI, lib, config, styles, types) |
| `entities/` | 도메인 데이터 모델 + 읽기(queries, hooks) + 단위 UI |
| `features/` | 유스케이스 (Server Actions, Zustand store, 폼, mutation) |
| `widgets/` | 여러 페이지 공유 레이아웃 블록 (BottomNav, StepHeader) |
| `views/` | 페이지 뷰 조합 (하위 레이어 조합) |
| `app/` | 라우팅 전용 (page에서 views import, layout에서 Provider 배치) |

---

## 2. 네이밍 컨벤션

### 파일/폴더

- 모든 파일: `kebab-case` (`member-card.tsx`, `query-keys.ts`)
- 폴더: `kebab-case` (`test-flow`, `bottom-nav`)
- barrel export: 도메인별 `index.ts`

### Export 규칙

- **같은 파일 안에 정의된 값과 타입은 단일 라인 export** — 2줄 분리 금지
- 다른 파일에서 import한 타입을 re-export하지 않음
- barrel(`index.ts`)은 소스 파일별로 한 줄씩 export
  ```ts
  // ✅ 같은 파일에 정의된 값 + 타입 → 단일 라인
  export { loginSchema, type LoginFormValues };

  // ✅ barrel: 소스별 한 줄
  export { MemberCard } from './member-card';
  export type { MemberCardProps } from './types';

  // ❌ 같은 파일인데 2줄 분리
  export { loginSchema };
  export type { LoginFormValues };
  ```

### 함수 선언

- **`const` 화살표 함수만 사용** — `function` 키워드 금지
- page, layout, proxy 등 Next.js 컨벤션 파일도 동일 적용
  ```tsx
  // ✅
  const Home = () => { ... };
  export default Home;

  // ❌
  export default function Home() { ... }
  ```

### 코드

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 | `PascalCase` | `MemberCard` |
| 타입/인터페이스 | `PascalCase`, `I` 접두사 금지 | `Profile`, `GroupType` |
| 상수 | `UPPER_SNAKE_CASE` | `PUBLIC_ROUTES` |
| 불리언 | `is` 접두사 | `isSelf`, `isLoading` |
| 훅 | `use` 접두사 | `useProfile` |
| 값 변환 함수 | `convert` 접두사 | `convertMbtiToColor` |
| API 호출 함수 | HTTP 메서드 접두사 | `fetchProfile`, `postAnalysis`, `putNickname`, `deleteGroup` |
| Server Action | 동사형 | `login`, `signup`, `saveAnalysis` |

---

## 3. Import 규칙

- 절대경로 `@/` 사용 (`@/shared/...`, `@/entities/...`)
- 같은 도메인 내부만 상대경로 허용 (`./model/types`)
- ESLint import-x가 레이어 순서 강제: builtin → external → shared → entities → features → widgets → views → app → parent → sibling

---

## 4. 컴포넌트 작성 규칙

- **Server Component가 기본** — `'use client'`는 인터랙션 필요 시만
- `'use client'` 기준: useState / useEffect / 이벤트 핸들러 / 브라우저 API 사용 시
- `app/` page.tsx는 **얇은 껍질** — views import하여 렌더링만
- props 타입은 컴포넌트 파일 내 정의

### 조건부 렌더링

- 상태 유지 필요한 UI 토글 → `<Activity mode={visible ? 'visible' : 'hidden'}>` 사용
  - 탭 전환, 바텀시트, 패널 등
- 상태 보존 불필요 → `{condition && <Component />}` OK
  - 로딩 스피너, 에러 메시지 등

---

## 5. 상태 관리 규칙

| 상태 종류 | 도구 | 위치 |
|---|---|---|
| 서버 상태 | React Query | `entities/*/api/hooks.ts`, key는 `shared/config/query-keys.ts` |
| 클라이언트 전용 | Zustand | `features/*/model/store.ts` |
| 폼 상태 | React Hook Form + Zod resolver | 스키마는 `*/model/schemas.ts` |

---

## 6. 스타일링 규칙

- Tailwind CSS v4 CSS-first (`tailwind.config.*` 없음)
- 원시 토큰: `shared/styles/tokens.css` (`@theme {}`)
- 시맨틱 토큰: `shared/styles/theme.css` (CSS 변수 → Tailwind 브릿지)
- 색상은 시맨틱 토큰 사용 (`bg-primary`, `text-muted`), 원시값 직접 사용 금지
- 폰트: Gothic A1 (본문), Nunito (숫자/강조)

---

## 7. 에러 핸들링 규칙

| 상황 | 패턴 |
|---|---|
| Server Action 에러 | `{ error: string } \| { data: T }` 반환, throw 대신 결과 객체 |
| React Query 에러 | `error` 상태 활용 UI 표시, 전역 핸들러는 QueryClient에 설정 |
| 폼 유효성 에러 | React Hook Form + Zod resolver, 필드별 에러 메시지 |
| 라우트 에러 | `error.tsx` (라우트별) + `global-error.tsx` (루트) |
| 로딩 상태 | `loading.tsx` (라우트별) + Suspense (컴포넌트별) |
| Not Found | `not-found.tsx` + `notFound()` 호출 |
| API Route 에러 | try-catch + `NextResponse.json({ error }, { status })` |

---

## 8. 보안 규칙

- `SUPABASE_SERVICE_ROLE_KEY`에 `NEXT_PUBLIC_` 절대 금지
- 모든 Server Action 시작에 `getUser()` 인증 확인
- `dangerouslySetInnerHTML` 사용 금지
- `.env`, `.env.local` 커밋 금지
- 상세 Supabase 보안 → Supabase skill 참조

---

## 9. 참조 문서

- 구현 계획: `docs/plan.md`
- Supabase 작업 가이드: `docs/supabase-guide.md`
- 디자인 요구사항: `docs/requirements.md`
