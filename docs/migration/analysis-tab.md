# 바텀 네비 "분석" 탭 추가 및 기능 분리 마이그레이션

> 작성일: 2026-09-13

## Context

현재 MBTI 프로필 분석(`/mypage/mbti-profile`)과 캐릭터 매칭(`/mypage/mbti-profile/character`)이 마이페이지 하위에 중첩되어 있어 발견하기 어렵다. 1:1 궁합(`/compatibility`)도 홈 카드에서만 접근 가능. 이 3개 분석 기능을 독립시켜 바텀 네비에 새 "분석" 탭으로 통합 노출한다.

### 결정 사항

- 바텀 네비 4번째 탭: **"분석"**, 라우트 `/analysis`
- 홈의 `CompatibilityCard` 제거 → 분석 탭으로 이동
- 라우트 변경:
  - `/mypage/mbti-profile` → `/analysis/mbti-profile`
  - `/mypage/mbti-profile/character` → `/analysis/character-match`
- 캐릭터 매칭은 MBTI 프로필 분석과 논리적으로 독립 (AI 분석 결과가 아닌 `profile.mbti` 설정값만 필요)

---

## 변경 전/후 라우트

| 기능 | Before | After |
|------|--------|-------|
| 1:1 MBTI 궁합 | `/compatibility` (홈 카드에서만 접근) | `/compatibility` (분석 탭에서 접근) |
| MBTI 프로필 분석 | `/mypage/mbti-profile` | `/analysis/mbti-profile` |
| 캐릭터 매칭 | `/mypage/mbti-profile/character` | `/analysis/character-match` |

---

## Step 1: 바텀 네비 수정 (3탭 → 4탭)

### `src/widgets/bottom-nav/constants.ts`

NAV_ITEMS에 4번째 항목 추가. 순서: Home → History → 분석 → My

```ts
// Before
const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'History', href: '/history' },
  { label: 'My', href: '/mypage' },
] as const;

// After
const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'History', href: '/history' },
  { label: '분석', href: '/analysis' },
  { label: 'My', href: '/mypage' },
] as const;
```

### `src/widgets/bottom-nav/bottom-nav.tsx`

1. `grid-cols-3` → `grid-cols-4`
2. `renderIcon` switch에 `/analysis` 케이스 추가 (다이아몬드 형태: `rotate-45 rounded-[5px]`)

---

## Step 2: 분석 페이지 뷰 생성 (FSD: views)

### 새 파일

- `src/views/analysis/index.ts` — barrel export
- `src/views/analysis/analysis-view.tsx` — 헤더 + AnalysisContent
- `src/views/analysis/analysis-content.tsx` — 3개 카드 나열 (Server Component)

### 카드 데이터

| 카드 | 배경 | 텍스트 색상 | href | 이모지 |
|------|------|-------------|------|--------|
| 1:1 MBTI 궁합 | `bg-compat-bg` | `text-compat` | `/compatibility` | 💕 |
| 나의 MBTI 분석 | `bg-primary-tonal` | `text-primary-deep` | `/analysis/mbti-profile` | 🧬 |
| 애니 캐릭터 매칭 | `bg-insight-surface` | `text-insight-foreground` | `/analysis/character-match` | 🎭 |

카드 스타일: 기존 HeroCard/CompatibilityCard 패턴 — `rounded-hero`, `btn-press`, Link 래핑

---

## Step 3: 라우트 페이지 생성 (FSD: app)

### 새 파일

- `src/app/(main)/analysis/page.tsx` — `<AnalysisView />` 렌더링 + metadata
- `src/app/(main)/analysis/mbti-profile/page.tsx` — `<MbtiProfileView />` (기존 뷰 재사용)
- `src/app/(main)/analysis/character-match/page.tsx` — `<CharacterMatchView />` (기존 뷰 재사용)

---

## Step 4: revalidatePath 업데이트

| 파일 | Before | After |
|------|--------|-------|
| `src/features/mbti-profile/api/actions.ts:42` | `revalidatePath('/mypage/mbti-profile')` | `revalidatePath('/analysis/mbti-profile')` |
| `src/features/character-match/api/actions.ts:46` | `revalidatePath('/mypage/mbti-profile/character')` | `revalidatePath('/analysis/character-match')` |

---

## Step 5: 캐릭터 매칭 MBTI 미설정 가드

### `src/views/character-match/character-match-content.tsx`

`isProfileLoading` 체크 후 `!profile?.mbti` 가드 추가. MBTI 프로필 페이지와 동일 패턴: "MBTI를 먼저 설정해주세요" + 설정 버튼. `useRouter` import 추가 필요.

---

## Step 6: 기존 경로 정리

### 삭제

- `src/app/(main)/mypage/mbti-profile/` — 디렉토리 전체 (page.tsx + character/ 서브디렉토리)

### 수정

- `src/features/profile/ui/my-page-view/constants.ts` — MENU_ITEMS에서 '내 MBTI 분석' 항목 제거 (계정 설정만 남김)
- `src/views/mbti-profile/mbti-profile-content.tsx` — "나와 닮은 캐릭터 찾기" Link 블록 제거 (121~134행)

---

## Step 7: 홈 페이지에서 CompatibilityCard 제거

### 수정

- `src/views/home/home-view.tsx` — CompatibilityCard import 및 렌더링 제거
- `src/features/home/index.ts` — CompatibilityCard export 제거

---

## Step 8: SEO/테스트 업데이트

### 수정

- `src/app/robots.ts` — disallow에 `'/analysis'` 추가
- `src/app/seo-routes.test.ts` — 예상 disallow 배열에 `'/analysis'` 추가

---

## 변경 파일 요약

| 구분 | 파일 |
|------|------|
| **신규** | `src/views/analysis/` (3파일), `src/app/(main)/analysis/` (3파일) |
| **수정** | `bottom-nav/constants.ts`, `bottom-nav/bottom-nav.tsx`, `home-view.tsx`, `home/index.ts`, `my-page-view/constants.ts`, `mbti-profile-content.tsx`, `character-match-content.tsx`, `mbti-profile/actions.ts`, `character-match/actions.ts`, `robots.ts`, `seo-routes.test.ts` |
| **삭제** | `src/app/(main)/mypage/mbti-profile/` (디렉토리 전체) |

---

## 검증

1. 바텀 네비 4탭 표시 확인, "분석" 탭 → `/analysis` 이동
2. 3개 카드 CTA → 해당 기능 페이지 정상 진입
3. MBTI 미설정 사용자: 캐릭터 매칭/MBTI 분석에서 설정 유도 화면
4. 홈에서 CompatibilityCard 제거 확인
5. 마이페이지에서 "내 MBTI 분석" 메뉴 제거 확인
6. `pnpm test` — seo-routes 테스트 통과
7. `pnpm lint` — ESLint 에러 없음
