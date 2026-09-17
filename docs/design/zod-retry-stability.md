# Zod 스키마 파싱 실패 자동 재시도 + 안정성 개선

## Context

MBTI 그룹 케미 분석 시 LLM 출력이 Zod 스키마의 글자수 제약(min/max)을 초과하면 `output_parsed`가 null이 되어 간헐적 에러가 발생한다. 멤버가 많을수록(최대 15명 = 105쌍) 실패 확률이 높아진다. 현재는 재시도 없이 즉시 에러를 반환하므로, 서버 측 자동 재시도 + 스키마 완화 + 프롬프트 글자수 가이드 보강으로 안정성을 확보한다.

---

## 변경 파일 및 내용

### 1. `src/app/api/analyze/route.ts` — 서버 측 재시도 로직

- `export const maxDuration = 120` 추가 (Vercel 함수 타임아웃)
- `MAX_ATTEMPTS = 3` 상수 정의 (최초 1회 + 재시도 2회)
- `ReadableStream.start()` 내부에서 재시도 루프 구현:
  - `attemptAnalysis()` 헬퍼 추출 — OpenAI 스트림 생성 → `finalResponse()` → completeness 검증
  - `output_parsed === null` 또는 completeness 실패 시 다음 시도로 진입
  - 재시도 시 progress를 되돌리지 않음 (마지막 전송값 유지, 새 시도에서 더 큰 값만 전송)
  - 비재시도 에러(quota/rate-limit)는 즉시 에러 이벤트 전송 후 종료
  - 모든 시도 소진 시 최종 에러 이벤트 전송
- 재시도 로그: `console.warn('[api/analyze] attempt N failed, retrying...')`

**재시도 횟수 근거**: 1회 실패율 ~20% 가정 시 3회 시도의 전체 실패율 = 0.2³ = 0.8% → 99.2% 성공률. 4회 이상은 120s 타임아웃 내 수용 어려움.

### 2. `src/entities/analysis/model/schemas.ts` — 스키마 글자수 완화

| 필드 | 현재 | 변경 |
|------|------|------|
| `groupAtmosphere.description` | min 80, max 320 | min 60, max 400 |
| `decisionMaking.description` | min 80, max 320 | min 60, max 400 |
| `bestMoment.description` | min 80, max 320 | min 60, max 400 |
| `cautionPoint.description` | min 60, max 280 | min 40, max 360 |
| `memberRoles[].description` | min 40, max 220 | min 30, max 280 |
| `pairChemistry[].description` | min 60, max 320 | min 40, max 400 |
| `pairChemistry[].summary` | min 1, max 40 | min 1, max 50 |
| `summary` | min 1, max 120 | min 1, max 150 |

### 3. `src/entities/analysis/api/prompt.ts` — 프롬프트 글자수 가이드 보강

현재 `groupAtmosphere`, `decisionMaking`, `bestMoment`에만 "100~260자" 가이드가 있음. 누락된 필드에 가이드 추가:

- `pairChemistry[].description`: "80~350자 분량을 목표로 한다"
- `memberRoles[].description`: "50~240자 분량을 목표로 한다"
- `cautionPoint.description`: "60~300자 분량을 목표로 한다"

### 4. `src/features/test-flow/api/actions.ts` — 클라이언트 타임아웃 증가

- `ANALYSIS_TIMEOUT_MS`: `60_000` → `120_000`
- 서버 재시도(최대 ~90초)를 수용할 수 있도록 여유 확보

### 5. `src/app/api/analyze/route.test.ts` — 테스트 추가

- Zod 파싱 실패 후 재시도 성공 케이스
- 3회 모두 실패 시 에러 반환 케이스
- quota/rate-limit 에러는 재시도 없이 즉시 실패 케이스
- progress가 재시도 시 뒤로 가지 않는 것 검증

---

## 검증

1. `npx eslint src/app/api/analyze/route.ts src/entities/analysis/model/schemas.ts src/entities/analysis/api/prompt.ts src/features/test-flow/api/actions.ts`
2. `npx vitest run src/app/api/analyze/route.test.ts`
3. 로컬에서 4명 그룹 분석 실행하여 SSE 스트림 정상 수신 확인
4. 15명 그룹 시나리오로 타임아웃/재시도 동작 확인 (dev 환경)
