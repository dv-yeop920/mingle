# MINGLE — Supabase 작업 가이드

## 1. 작업 흐름

### 개발 환경

| 도구 | 용도 |
|---|---|
| **Supabase MCP** | DB 스키마 조회, SQL 실행(`execute_sql`), RLS 디버깅, 어드바이저 |
| **Supabase 대시보드** | Auth 설정, Email Confirmation 비활성화, 프로젝트 관리 |
| **`@supabase/supabase-js`** | 앱 코드에서 DB/Auth 접근 |
| **`@supabase/ssr`** | Next.js SSR 환경 쿠키 기반 세션 |

### 마이그레이션 워크플로 (Imperative)

`supabase/` 디렉토리 미사용 — MCP `execute_sql`로 직접 DB 변경 후, 안정화되면 마이그레이션 파일 생성.

```
1. MCP execute_sql로 테이블/RLS/트리거 생성·수정 (반복 가능)
2. 안정화 후 → supabase db pull <name> --local --yes (마이그레이션 파일 생성)
3. supabase db advisors (또는 MCP get_advisors)로 보안·성능 검증
4. supabase migration list --local 로 확인
```

> `apply_migration`은 사용 금지 — 매 호출마다 히스토리가 남아 반복 수정 불가.

---

## 2. DB 스키마

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

### 테이블 DDL

```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  nickname text not null check (char_length(nickname) <= 8),
  mbti text check (mbti is null or char_length(mbti) = 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friends', 'company', 'family', 'custom')),
  custom_name text check (
    (type = 'custom' and custom_name is not null) or
    (type != 'custom' and custom_name is null)
  ),
  created_at timestamptz not null default now()
);

-- members
create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  nickname text not null check (char_length(nickname) <= 8),
  gender text not null check (gender in ('male', 'female', 'other')),
  mbti text not null check (char_length(mbti) = 4),
  is_self boolean not null default false,
  "order" int2 not null,
  unique (group_id, "order")
);

-- analyses
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  chemistry_score int2 not null check (chemistry_score between 0 and 100),
  metrics jsonb not null,
  group_atmosphere jsonb not null,
  member_roles jsonb not null,
  pair_chemistry jsonb not null,
  summary text not null,
  created_at timestamptz not null default now()
);
```

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

### 인덱스

```sql
create index idx_groups_user_id on public.groups(user_id);
create index idx_analyses_user_id on public.analyses(user_id);
create index idx_analyses_group_id on public.analyses(group_id);
create index idx_members_group_id on public.members(group_id);
```

### Auth Trigger (회원가입 시 profiles 자동 생성)

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, nickname)
  values (
    new.id,
    split_part(new.email, '@', 1),
    new.raw_user_meta_data->>'nickname'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> `security definer` + `set search_path = ''`로 검색 경로 주입 방지.
> 이 함수는 auth 트리거 전용이므로 외부 호출 불가 — 추가 `auth.uid()` 검사 불필요.

### updated_at 자동 갱신

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
```

---

## 3. 운영 정책 (RLS)

### 원칙

- 모든 테이블 RLS 활성화
- `auth.role()` 사용 금지 → `TO authenticated` 사용
- UPDATE 정책에는 반드시 `USING` + `WITH CHECK` 모두 작성
- `(select auth.uid())` 서브쿼리 래핑 (Postgres 플래너 최적화)

### RLS 정책

```sql
-- ═══ profiles ═══
alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_update" on public.profiles
  for update to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- ═══ groups ═══
alter table public.groups enable row level security;

create policy "groups_select" on public.groups
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "groups_insert" on public.groups
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "groups_delete" on public.groups
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ═══ members ═══
alter table public.members enable row level security;

create policy "members_select" on public.members
  for select to authenticated
  using (
    exists (
      select 1 from public.groups
      where id = group_id and user_id = (select auth.uid())
    )
  );

create policy "members_insert" on public.members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.groups
      where id = group_id and user_id = (select auth.uid())
    )
  );

-- ═══ analyses ═══
alter table public.analyses enable row level security;

create policy "analyses_select" on public.analyses
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "analyses_insert" on public.analyses
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "analyses_delete" on public.analyses
  for delete to authenticated
  using ( (select auth.uid()) = user_id );
```

### Auth 설정 (대시보드)

- **Email Confirmation 비활성화** 필수 — `{id}@mingle.local` 가상 이메일 사용
- JWT expiry: 기본값(3600초) 유지
- 비밀번호 최소 길이: Supabase 기본값(6자) + 앱 레벨 Zod 검증 강화

---

## 4. 코드 작성 기법

### 4-1. Supabase 클라이언트 3종 (`shared/lib/supabase/`)

```typescript
// client.ts — 브라우저 전용
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```typescript
// server.ts — Server Component / Server Action / Route Handler
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    },
  );
}
```

```typescript
// admin.ts — 서버 전용, RLS 우회 (관리 작업만)
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

### 4-2. 인증 가드 (`src/proxy.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export function proxy(request: Request) {
  const { pathname } = new URL(request.url);
  if (PUBLIC_ROUTES.includes(pathname)) return;

  // 쿠키에서 세션 확인 → 미인증 시 /login 리다이렉트
}
```

### 4-3. Server Action 패턴 (`features/*/api/actions.ts`)

```typescript
'use server';

import { createClient } from '@/shared/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: `${formData.get('id')}@mingle.local`,
    password: formData.get('password') as string,
  });

  if (error) return { error: error.message };
  redirect('/home');
}
```

### 4-4. React Query 훅 패턴 (`entities/*/api/hooks.ts`)

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

export function useProfile() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
```

### 4-5. 보안 규칙

| 규칙 | 설명 |
|---|---|
| `getUser()` 필수 | 모든 Server Action 시작 시 인증 확인 |
| `service_role` 서버 전용 | `NEXT_PUBLIC_` 접두사 절대 금지 |
| `user_metadata` 권한 판단 금지 | 사용자가 수정 가능 → `app_metadata` 사용 |
| `dangerouslySetInnerHTML` 금지 | AI 응답에 XSS 방지 |
| 입력 검증 이중화 | 클라이언트 Zod + DB CHECK 제약 조건 |

### 4-6. 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL      → 클라이언트 OK (RLS 보호)
NEXT_PUBLIC_SUPABASE_ANON_KEY → 클라이언트 OK (RLS 보호)
SUPABASE_SERVICE_ROLE_KEY     → 서버 전용 (절대 NEXT_PUBLIC_ 금지)
OPENAI_API_KEY                → 서버 전용 (Route Handler에서만)
```
