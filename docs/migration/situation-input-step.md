# 상황 입력 스텝 추가 마이그레이션

> 작성일: 2026-09-07

## Context

현재 MBTI 분석은 그룹 타입(친구/회사/가족)과 멤버 MBTI만으로 일반적인 케미를 분석한다. 구체적인 상황(여행, 회의 등)에 대한 맥락이 없어 분석 결과가 범용적이고 추상적이다. 유저가 상황을 직접 입력하면 "이 조합이 여행 가면 어떨까?" 같은 구체적 분석이 가능해진다.

## 변경 후 플로우

```
그룹 타입 선택 → 멤버 설정 → 상황 입력(NEW) → 분석 → 결과
```

## 입력 방식: 프리셋 + 자유 입력

- 그룹 타입별 프리셋 5개 제공 (enum 상수, 스키마 검증 확실)
- 자유 입력 옵션 (5~200자 제한)
- 프리셋 선택과 자유 입력은 상호 배타
- "건너뛰기" 옵션으로 기존과 동일한 일반 분석도 가능 (situation: null)

---

## Phase 1 — 데이터 레이어

### 1-1. 상황 프리셋 상수 및 타입 정의

**새 파일: `src/entities/situation/model/constants.ts`**

그룹 타입별 프리셋 정의. 각 프리셋은 `id`(검증용), `label`(UI용), `promptHint`(AI 프롬프트용) 분리:

| 그룹 | 프리셋 |
|------|--------|
| friends | 여행, 카페/술자리, 보드게임/파티, 고민상담, 약속 잡기 |
| company | 프로젝트 킥오프, 회의, 야근/크런치, 회식, 갈등 중재 |
| family | 명절/가족모임, 여행, 집안일 분담, 진로/결혼 상담, 가족회의 |

**새 파일: `src/entities/situation/model/types.ts`**

```ts
type SituationInput =
  | { type: 'preset'; presetId: string }
  | { type: 'freeText'; text: string };
```

**새 파일: `src/entities/situation/index.ts`** — barrel export

### 1-2. Request 스키마 확장

**수정: `src/entities/analysis/model/schemas.ts`**

- `schemaVersion`을 `'2026-09-07'`로 업데이트
- `situation` 필드 추가 (discriminatedUnion, nullable)
- 기존 `AnalyzeRequest` 타입에 situation 포함

### 1-3. Store 확장

**수정: `src/features/test-flow/model/store.ts`**

- `TestFlowState`에 `situation: SituationInput | null` 추가
- `setSituation` 액션 추가
- `restoreMemberDraft`에 situation 복원 포함
- `reset()`에서 situation 초기화
- `INITIAL_STATE`에 `situation: null` 추가

### 1-4. 클라이언트 액션 확장

**수정: `src/features/test-flow/api/actions.ts`**

- `RequestAnalysisInput` 타입에 `situation` 추가
- `requestAnalysis` 함수 — body에 `situation` 포함, `schemaVersion: '2026-09-07'`

### 1-5. 프롬프트 빌더 확장

**수정: `src/entities/analysis/api/prompt.ts`**

- `AnalysisInput` 타입에 `situation` 필드 추가
- `buildAnalysisInput` — request.situation을 받아 프리셋이면 `promptHint` 문자열로 resolve, 자유 입력이면 text 그대로 전달
- `ANALYSIS_INSTRUCTIONS` 시스템 프롬프트에 상황 섹션 추가:
  - situation이 있으면 해당 상황 중심으로 모든 분석 항목 작성
  - pairChemistry.recommendedSituations는 해당 상황 내 세부 장면으로 작성
  - situation이 null이면 기존과 동일하게 일반 분석

### 1-6. API Route

**수정: `src/app/api/analyze/route.ts`**

- `analyzeRequestSchema` 변경이 자동 반영됨 (safeParse)
- `buildAnalysisInput`에 situation이 전달됨
- 프롬프트 캐시 키를 `'mingle-analysis-v3'`로 업데이트

---

## Phase 2 — 영속성 (DB + Session)

### 2-1. Supabase 마이그레이션

**새 마이그레이션:**
```sql
ALTER TABLE analyses ADD COLUMN situation jsonb DEFAULT NULL;
```

**수정: `src/shared/types/database.ts`**
- analyses Row/Insert/Update에 `situation: Json | null` 추가

**수정: `save_guest_analysis` RPC 함수** — `p_situation` 파라미터 추가

### 2-2. 저장 액션 수정

**수정: `src/features/analysis-result/api/actions.ts`**

- `SaveAnalysisParams`와 `SaveGuestAnalysisParams`에 `situation` 필드 추가
- `saveAnalysis` — insert에 `situation` 포함
- `saveGuestAnalysis` — RPC 호출에 `p_situation` 전달

### 2-3. 세션 스키마 확장

**수정: `src/features/test-flow/model/schemas.ts`**

- `memberDraftSchema` — `schemaVersion: 2`로 범프, `situation` 필드 추가 (nullable)
- `analysisResultSessionSchema` — `schemaVersion: 2`로 범프, result에 `situation` 추가
- 기존 v1 데이터 파싱 시 situation을 null로 처리하는 하위 호환 로직

### 2-4. 세션 매니저 수정

`src/features/test-flow/lib/member-draft-session.ts` — FLOW_PATHS에 `/situation` 추가, situation 저장/복원

---

## Phase 3 — UI

### 3-1. 상황 입력 페이지

**새 파일: `src/app/(test)/situation/page.tsx`** — 서버 컴포넌트, SituationView import

**새 파일: `src/views/situation/situation-view.tsx`** — 클라이언트 컴포넌트

레이아웃:
1. 뒤로가기 버튼 (-> `/members`)
2. 헤딩: "어떤 상황에서 분석할까요?" / "상황에 따라 분석이 달라져요"
3. 프리셋 칩 목록 — 그룹 타입에 맞는 5개 프리셋, 라디오 동작 (하나만 선택)
4. 구분선 + "직접 입력" 라벨
5. 자유 텍스트 textarea (5~200자, 글자수 표시)
6. "분석 시작" 버튼 (프리셋 선택 또는 자유 입력 완료 시 활성화)
7. "건너뛰기" 링크 (situation: null로 /analyzing 이동)

프리셋 선택 시 자유 입력 초기화, 자유 입력 시 프리셋 선택 해제.

**새 파일: `src/views/situation/index.ts`** — barrel export

### 3-2. 네비게이션 수정

**수정: `src/views/members/member-setup-view.tsx`**
- 59행: `router.push('/analyzing')` -> `router.push('/situation')`
- 버튼 텍스트: "분석 시작" -> "다음"

### 3-3. 분석 뷰 수정

**수정: `src/views/analyzing/analyzing-view.tsx`**
- store에서 `situation` 읽기
- `requestAnalysis` 호출 시 `situation` 전달

### 3-4. 결과 페이지 — 상황 배지 표시

**수정: `src/views/result/result-view.tsx`** (또는 result-hero 컴포넌트)
- 결과 상단에 분석한 상황 표시 (예: "친구 · 여행")
- situation이 null이면 기존과 동일하게 그룹 타입만 표시

---

## Phase 4 — 폴리싱

### 4-1. 애널리틱스

**수정: `src/shared/lib/analytics.ts`**
- `trackSituationComplete(groupType, situationType: 'preset' | 'freeText' | 'skip')` 이벤트 추가

### 4-2. 하위 호환성

- API: situation이 없는(null) 요청은 기존과 동일하게 일반 분석 수행
- DB: situation 컬럼 DEFAULT NULL -> 기존 행 영향 없음
- Session: v1 스키마 파싱 시 situation을 null로 처리
- 결과 UI: situation이 null이면 배지 미표시

---

## 수정 파일 요약

| 구분 | 파일 |
|------|------|
| 새로 생성 | `src/entities/situation/model/constants.ts`, `types.ts`, `index.ts`, `src/entities/situation/index.ts` |
| 새로 생성 | `src/app/(test)/situation/page.tsx` |
| 새로 생성 | `src/views/situation/situation-view.tsx`, `index.ts` |
| 수정 | `src/entities/analysis/model/schemas.ts` — situation 필드 추가 |
| 수정 | `src/entities/analysis/api/prompt.ts` — 프롬프트 빌더 + 시스템 프롬프트 |
| 수정 | `src/features/test-flow/model/store.ts` — situation 상태 + 액션 |
| 수정 | `src/features/test-flow/model/schemas.ts` — 세션 스키마 v2 |
| 수정 | `src/features/test-flow/api/actions.ts` — requestAnalysis에 situation 포함 |
| 수정 | `src/features/test-flow/lib/member-draft-session.ts` — situation 영속화 |
| 수정 | `src/views/members/member-setup-view.tsx` — 네비게이션 변경 |
| 수정 | `src/views/analyzing/analyzing-view.tsx` — situation 전달 |
| 수정 | `src/views/result/result-view.tsx` — 상황 배지 표시 |
| 수정 | `src/features/analysis-result/api/actions.ts` — 저장 시 situation 포함 |
| 수정 | `src/shared/types/database.ts` — analyses 타입 |
| 수정 | `src/app/api/analyze/route.ts` — 캐시 키 업데이트 |
| DB | Supabase 마이그레이션 + save_guest_analysis RPC 수정 |

---

## 검증 계획

1. **스키마 검증**: 프리셋 선택 / 자유 입력 / null(건너뛰기) 각각 `analyzeRequestSchema.safeParse` 통과 확인
2. **세션 복원**: `/situation` 페이지에서 새로고침 후 선택값 유지 확인
3. **E2E 플로우**: 그룹 타입 선택 -> 멤버 설정 -> 상황 입력 -> 분석 -> 결과 전체 통과
4. **건너뛰기**: 상황 건너뛰기 시 기존과 동일한 일반 분석 결과 확인
5. **결과 표시**: 상황 배지가 올바르게 표시되는지, null일 때 미표시 확인
6. **하위 호환**: 기존 저장된 분석 결과 정상 로딩 확인
7. **프롬프트 품질**: 프리셋/자유 입력 각각으로 분석 실행, 결과가 상황 맥락을 반영하는지 확인
