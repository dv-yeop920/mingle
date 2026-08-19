---
model: sonnet
---

# Test 에이전트 — 테스트 작성 + 실행

Vitest + React Testing Library로 기능 테스트를 작성하고 실행하는 에이전트.

> 공통 코드 컨벤션(네이밍, 함수 선언, import 순서)은 `AGENTS.md` 참조. 이 문서는 **테스트 고유 지침만** 기술한다.

---

## 작업 전 필수 확인

1. 테스트 환경이 설정되어 있는지 확인 (`vitest.config.ts` 존재 여부)
2. 미설정 시 아래 초기 세팅 수행
3. `AGENTS.md` — 공통 코드 컨벤션

---

## 초기 세팅 (최초 1회)

테스트 환경이 없으면 다음을 설치하고 설정한다:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

`vitest.config.ts` 생성:

```typescript
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`src/test/setup.ts` 생성:

```typescript
import '@testing-library/jest-dom/vitest';
```

`package.json`에 스크립트 추가:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 테스트 파일 위치

- 테스트 대상 파일과 **같은 디렉토리**에 배치
- 네이밍: `{대상파일명}.test.ts` 또는 `{대상파일명}.test.tsx`

```
src/shared/ui/button.tsx
src/shared/ui/button.test.tsx    ← 같은 위치

src/features/auth/api/actions.ts
src/features/auth/api/actions.test.ts
```

---

## 테스트 전략

### 컴포넌트 테스트 (React Testing Library)

- 사용자 관점에서 테스트 (구현 세부사항이 아닌 행동)
- `render` → `screen.getByRole/getByText` → `userEvent` → `expect`
- `'use client'` 컴포넌트 대상

### 훅 테스트

- `renderHook`으로 커스텀 훅 테스트
- Zustand store: `act` + 상태 변경 검증
- React Query 훅: MSW 또는 Supabase mock으로 API 응답 시뮬레이션

### Server Action 테스트

- Supabase 클라이언트를 mock하여 격리 테스트
- 인증 검증, 입력 검증, 에러 반환 패턴 확인

### 유틸 함수 테스트

- 순수 함수 단위 테스트
- 입출력 기반 검증

---

## Test 고유 판단 기준

### 테스트 우선순위

1. **Server Action** — 보안(인증) + 데이터 무결성이 핵심
2. **Zustand store / 커스텀 훅** — 상태 전이 로직
3. **유틸 함수** — 변환/계산 로직
4. **컴포넌트** — 조건부 렌더링, 사용자 인터랙션

### 테스트 제외 대상

- `app/` page.tsx, layout.tsx — 얇은 껍질이므로 테스트 불필요
- schemas.ts — Zod 자체가 검증이므로 별도 테스트 불필요
- 타입 파일 (types.ts) — 런타임 코드 없음
- 자동 생성 파일 (database.ts)

### Mock 전략

| 대상 | Mock 방법 |
|---|---|
| Supabase 클라이언트 | `vi.mock('@/shared/lib/supabase/server')` |
| `getUser()` 응답 | 인증됨/미인증 두 케이스 |
| React Query | `QueryClientProvider` 래핑 + mock queryFn |
| Next.js `redirect`/`cookies` | `vi.mock('next/navigation')` |

### 테스트 네이밍

```typescript
describe('MemberCard', () => {
  it('닉네임과 MBTI를 표시한다', () => { ... });
  it('is_self가 true이면 "나" 배지를 표시한다', () => { ... });
});
```
