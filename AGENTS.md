<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## 0. 개발 워크플로우 (필수)

모든 작업은 아래 4단계를 순서대로 따른다. 직접 코딩 금지 — 반드시 에이전트를 통해 작업한다.

| 단계                 | 목적                            | 에이전트/도구                  | 산출물                         |
| -------------------- | ------------------------------- | ------------------------------ | ------------------------------ |
| **1. Research**      | 코드베이스 탐색, 영향 범위 파악 | Explore (grep, find, Read)     | 변경 대상 파일 목록, 의존 관계 |
| **2. Plan**          | 설계 + 구현 계획 수립           | Frontend §0 5단계 설계         | 설계 문서 (design-note.md)     |
| **3. Implement**     | 코드 작성                       | Frontend / Backend / UI / Test | 구현 코드 + 테스트             |
| **4. Review & Ship** | 품질 점검 + 배포                | `/review` → `/test` → `/ship`  | 커밋 + 푸시                    |

### 규칙

- **Plan 후 승인 대기**: 2단계 설계 완료 후 사용자 승인 없이 3단계로 넘어가지 않는다
- **에이전트 위임**: 구현은 반드시 해당 역할 에이전트를 호출하여 수행한다
- **Review 필수**: `/ship` 전에 `/review`로 점검을 완료해야 한다
- **에이전트 선택**: 마크업/스타일링 → **UI** · 상태/React Query/Zod/폼 → **Frontend** · Server Action/Supabase → **Backend** · 테스트 → **Test** · 코드 점검 → **Review**

---

## 1. FSD 레이어 규칙

```
shared → entities → features → widgets → views → app
```

- 의존 방향: 하위 → 상위만 허용
- **같은 레이어 내 cross-import 금지** (`features/auth` → `features/test-flow` 불가)

| 레이어      | 책임                                                          |
| ----------- | ------------------------------------------------------------- |
| `shared/`   | 도메인 무관 공통 (UI, lib, config, styles, types)             |
| `entities/` | 도메인 데이터 모델 + 읽기(queries, hooks) + 단위 UI           |
| `features/` | 유스케이스 (Server Actions, Zustand store, 폼, mutation)      |
| `widgets/`  | 여러 페이지 공유 레이아웃 블록 (BottomNav, StepHeader)        |
| `views/`    | 페이지 뷰 조합 (하위 레이어 조합)                             |
| `app/`      | 라우팅 전용 (page에서 views import, layout에서 Provider 배치) |

---

## 2. 네이밍 컨벤션

### 파일/폴더

- 모든 파일·폴더: `kebab-case` (`member-card.tsx`, `test-flow/`)
- barrel export: 도메인별 `index.ts`

### Export 규칙

- 같은 파일에 정의된 값+타입은 **단일 라인 export** (`export { loginSchema, type LoginFormValues }`) — 2줄 분리 금지
- barrel(`index.ts`)은 소스 파일별로 한 줄씩 export
- 다른 파일에서 import한 타입을 re-export하지 않음

### 함수 선언

- **`const` 화살표 함수만 사용** — `function` 키워드 금지 (page, layout 포함)

### 코드

| 대상            | 규칙                          | 예시                                       |
| --------------- | ----------------------------- | ------------------------------------------ |
| 컴포넌트        | `PascalCase`                  | `MemberCard`                               |
| 타입/인터페이스 | `PascalCase`, `I` 접두사 금지 | `Profile`, `GroupType`                     |
| 상수            | `UPPER_SNAKE_CASE`            | `PUBLIC_ROUTES`                            |
| 불리언          | `is` 접두사                   | `isSelf`, `isLoading`                      |
| 훅              | `use` 접두사                  | `useProfile`                               |
| 값 변환 함수    | `convert` 접두사              | `convertMbtiToColor`                       |
| API 호출 함수   | HTTP 메서드 접두사            | `fetchProfile`, `postAnalysis`             |
| Server Action   | 동사형                        | `login`, `signup`, `saveAnalysis`          |

---

## 3. Import 규칙

- 절대경로 `@/` 사용 (`@/shared/...`, `@/entities/...`)
- 같은 도메인 내부만 상대경로 허용 (`./model/types`)
- ESLint import-x가 레이어 순서 강제: builtin → external → shared → entities → features → widgets → views → app → parent → sibling

---

## 4. 컴포넌트 작성 규칙

- **Server Component가 기본** — `'use client'`는 useState / useEffect / 이벤트 핸들러 / 브라우저 API 사용 시만
- `app/` page.tsx는 **얇은 껍질** — views import하여 렌더링만
- props 타입은 컴포넌트 파일 내 정의
- 상태 유지 필요한 UI 토글 → `<Activity mode={visible ? 'visible' : 'hidden'}>` (탭, 바텀시트)
- 상태 보존 불필요 → `{condition && <Component />}` (로딩 스피너, 에러 메시지)

---

## 5. 상태 관리 규칙

| 상태 종류       | 도구                           | 위치                                                           |
| --------------- | ------------------------------ | -------------------------------------------------------------- |
| 서버 상태       | React Query                    | `entities/*/api/hooks.ts`, key는 `shared/config/query-keys.ts` |
| 클라이언트 전용 | Zustand                        | `features/*/model/store.ts`                                    |
| 폼 상태         | React Hook Form + Zod resolver | 스키마는 `*/model/schemas.ts`                                  |

---

## 6. 스타일링 규칙

- Tailwind CSS v4 CSS-first (`tailwind.config.*` 없음)
- 원시 토큰: `shared/styles/tokens.css` (`@theme {}`) · 시맨틱 토큰: `shared/styles/theme.css`
- 색상은 시맨틱 토큰 사용 (`bg-primary`, `text-muted`), 원시값 직접 사용 금지
- 폰트: Gothic A1 (본문), Nunito (숫자/강조)

---

## 7. 에러 핸들링 규칙

| 상황 | 패턴 |
|---|---|
| Server Action | `{ error: string } \| { data: T }` 반환, throw 대신 결과 객체 |
| React Query | `error` 상태 활용 UI 표시, 전역 핸들러는 QueryClient에 설정 |
| 폼 유효성 | React Hook Form + Zod resolver, 필드별 에러 메시지 |
| 라우트 에러 | `error.tsx` (라우트별) + `global-error.tsx` (루트) |
| 로딩/Not Found | `loading.tsx` + Suspense · `not-found.tsx` + `notFound()` |
| API Route | try-catch + `NextResponse.json({ error }, { status })` |

---

## 8. 보안 규칙

- `SUPABASE_SERVICE_ROLE_KEY`에 `NEXT_PUBLIC_` 절대 금지
- 모든 Server Action 시작에 `getUser()` 인증 확인
- `dangerouslySetInnerHTML` 사용 금지
- `.env`, `.env.local` 커밋 금지
- 상세 Supabase 보안 → Supabase skill 참조

---

## 9. 참조 문서

- Supabase 작업 가이드: `docs/guides/supabase.md`
- 디자인 요구사항: `docs/design/requirements.md`
- 개발 워크플로우: `docs/guides/workflow.md`
- 에이전트 활동 로그: `logs/agent-activity.jsonl` (자동 생성, `.gitignore` 대상)

### 스킬 자동 참조

해당 작업 시작 전에 스킬 파일을 먼저 읽고 가이드를 따를 것.

| 트리거 | 스킬 |
|---|---|
| Supabase 관련 작업 (DB, Auth, RLS, Edge Functions, 마이그레이션 등) | `.agents/skills/supabase/SKILL.md` |
| Postgres 스키마/마이그레이션/쿼리 최적화 작업 | `.agents/skills/supabase-postgres-best-practices/SKILL.md` |
| SEO 감사/진단/개선 요청 | `.agents/skills/seo-audit/SKILL.md` |
| 계획/설계 검증 요청 ("이거 괜찮아?", "허점 없어?" 등) | `.agents/skills/grill-me/SKILL.md` |
| 코드 리뷰 (표준 준수 + 스펙 일치 2축) | `.agents/skills/code-review/SKILL.md` |
| TDD (테스트 주도 개발, red-green-refactor) | `.agents/skills/tdd/SKILL.md` |
| PR 본문 작성 | `.agents/skills/pr/SKILL.md` |
| 주제 리서치 (1차 소스 기반 조사) | `.agents/skills/research/SKILL.md` |
| 에이전트 문서 작성 (AGENTS.md, 스킬 작성/수정) | `.agents/skills/writing-for-agents/SKILL.md` |
| merge/rebase 충돌 해결 | `.agents/skills/resolving-merge-conflicts/SKILL.md` |
| 대화 핸드오프 (다른 에이전트에 작업 인계) | `.agents/skills/handoff/SKILL.md` |
| 프로토타입 (설계 검증용 일회용 빌드) | `.agents/skills/prototype/SKILL.md` |
| 날카로운 인터뷰로 계획/아이디어 스트레스 테스트 | `.agents/skills/grilling/SKILL.md` |

---

## 10. 역할별 Agent & 커맨드 지침

Claude agent/command 지침을 source of truth로 둔다. 역할별 작업·커맨드 실행 시 해당 파일을 먼저 읽고 따른다.

| 역할/커맨드 | 지침 |
|---|---|
| Backend | `.claude/agents/backend.md` |
| Frontend | `.claude/agents/frontend.md` |
| Review | `.claude/agents/review.md` |
| Test | `.claude/agents/test.md` |
| UI | `.claude/agents/ui.md` |
| `/ship` | `.claude/commands/ship.md` |
| `/review` | `.claude/commands/review.md` |
| `/test` | `.claude/commands/test.md` |
