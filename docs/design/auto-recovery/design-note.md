# MIXTI 자동 오류 복구 아키텍처

- 최종 갱신: 2026-09-16
- 상태: Stage 1~5 완료
- 요구사항: [requirements.md](./requirements.md)
- Drain 서브시스템: [ingest-setup.md](./ingest-setup.md)

## 1. 실행 흐름

```text
[Drain 수신기]          [Collector]           [Orchestrator]
Vercel Drain ──→ 서명검증·PII제거 ──→ Supabase 영속화 ──→ 폴링·잠금 획득
                                      중복 제거                │
                                                               ▼
[Fix Executor]          [CI/CD]              [Merge Gate]
격리 worktree ──→ 재현·수정 ──→ push ──→ 8개 검사+Review ──→ 정책 판정
                                                               │
                                                               ▼
[Deploy]                [Monitor]            [결과]
Vercel Production ──→ 5분 관찰·오류율 ──→ resolved / rollback / stop
```

### 동시성

- **오류별 잠금**: 동일 지문의 인시던트는 하나의 워커만 작업. `FOR UPDATE SKIP LOCKED`로 획득.
- **저장소 단위 직렬화**: 병합과 운영 확인은 직렬화해 어느 수정의 결과인지 식별.
- **동시 워커**: 초기 1개로 제한. Cron Job이 잠금 경합으로 자연스럽게 직렬화.

### 브랜치 전략

- `fix/agent-<incident-id>` 형태. 사용자 작업 디렉터리를 재사용하지 않음.
- main이 변경되면 최신 기준으로 재검증. 브랜치 보호와 병합 큐로 검사-병합 사이의 경쟁 방지.

## 2. Stage 1 — 정책 엔진 (완료)

위치: `src/shared/lib/auto-recovery/policy.ts`

4개의 순수 함수로 구성. 외부 서비스 의존 없음. Fail-closed 설계: `!== false` 패턴으로 누락/undefined 증거가 차단으로 작동.

| 함수 | 역할 |
| --- | --- |
| `createIncidentIdentity` | SHA-256 지문 생성. 배포 독립적 fingerprint + 릴리스별 deduplicationKey |
| `evaluateRecoveryEligibility` | repair / ignore / report / stop 결정 |
| `evaluateMergeEvidence` | 8개 검사 + 재현 증거 + 독립 리뷰 기반 병합 승인 |
| `evaluateProductionMonitoring` | observe / resolved / rollback / stop 판정 |

상수: `MAX_REPAIR_ATTEMPTS=2`, `MIN_OBSERVATION_MS=300000` (5분).

`isPreviousProductionRepairFailed`는 이전 자동 수정의 운영 배포가 실패했는지를 뜻한다. 최초 오류가 Production에서 발생했다는 이유로 수정을 막는 조건이 아니다.

## 3. Stage 2 — 수집과 영속 처리 (부분 완료)

### 3-1. Drain 수신기 (완료)

위치: `src/features/auto-recovery-ingest/api/drain.ts`, `src/app/api/auto-recovery/drain/route.ts`

- HMAC-SHA1 서명 검증, JSON/NDJSON 파싱, 1MiB/500이벤트 제한
- PII 제거: 허용 필드만 추출 (id, projectId, deploymentId, timestamp, source, level, statusCode)
- 배치 SHA-256 기반 중복 식별, Idempotency-Key 헤더 전달
- Drain 경로는 Supabase 인증 proxy에서 제외 (`src/proxy.ts`)

설정과 전달 계약은 [ingest-setup.md](./ingest-setup.md) 참조.

### 3-2. Collector — 내부 모듈 (완료)

위치: `src/features/auto-recovery-ingest/api/collector.ts`

`createCollectorEnqueue()`가 `DrainEnqueue` 콜백을 반환한다. Supabase service role client로 `auto_recovery_events`에 직접 upsert하며, `batch_id` 기반 `ignoreDuplicates`로 재전송에 안전하다. `DrainEnqueue` 타입 추상화가 유지되므로 향후 분리가 필요하면 콜백만 교체하면 된다.

### 3-3. 인시던트 영속 스키마 (완료)

Supabase (Postgres)에 3개 테이블을 추가한다.

```
auto_recovery_events
├── batch_id        TEXT PRIMARY KEY  -- SHA-256 of raw batch
├── project_id      TEXT NOT NULL
├── events          JSONB NOT NULL    -- sanitized event array
├── received_at     TIMESTAMPTZ DEFAULT now()

auto_recovery_incidents
├── fingerprint     TEXT PRIMARY KEY  -- from createIncidentIdentity
├── category        TEXT NOT NULL
├── project_id      TEXT NOT NULL
├── environment     TEXT NOT NULL
├── first_seen_at   TIMESTAMPTZ NOT NULL
├── last_seen_at    TIMESTAMPTZ NOT NULL
├── occurrence_count INTEGER DEFAULT 1
├── attempt_count   INTEGER DEFAULT 0
├── status          TEXT DEFAULT 'detected'
│                   -- detected → repairing → verifying → deploying
│                   --   → monitoring → resolved / stopped
├── locked_by       TEXT             -- worker ID, null = unlocked
├── locked_at       TIMESTAMPTZ

auto_recovery_attempts
├── id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── fingerprint     TEXT REFERENCES auto_recovery_incidents
├── attempt_number  INTEGER NOT NULL
├── branch_name     TEXT
├── base_sha        TEXT             -- 40-char commit SHA
├── candidate_sha   TEXT
├── reproduction    JSONB            -- before/after test results
├── checks          JSONB            -- 8 check evidences
├── review          JSONB            -- independent review result
├── deploy_id       TEXT
├── monitoring      JSONB            -- observation evidence
├── result          TEXT             -- resolved / stopped / rollback
├── created_at      TIMESTAMPTZ DEFAULT now()
├── completed_at    TIMESTAMPTZ
```

RLS: 모든 테이블에서 클라이언트 접근 차단. Service role 전용. 잠금: `SELECT ... FOR UPDATE SKIP LOCKED`으로 워커가 인시던트를 독점 획득. 트랜잭션 내에서 `locked_by`와 `status`를 함께 갱신한다.

## 4. Stage 3 — 수정 실행기 (완료)

### 4-1. Orchestrator (완료)

위치: `src/features/auto-recovery-orchestrate/api/orchestrator.ts`, `src/app/api/auto-recovery/orchestrate/route.ts`

트리거: Vercel Cron Job (`vercel.json`, `*/5 * * * *`)이 `GET /api/auto-recovery/orchestrate`를 호출한다. `CRON_SECRET` 헤더와 `AUTO_RECOVERY_ENABLED` 환경변수로 이중 인증.

```
Cron 실행 → 이벤트 분류 → status='detected' 행 조회 (FOR UPDATE SKIP LOCKED)
  → 잠금 획득 시: status='repairing'으로 갱신
  → Fix Executor 호출
  → 결과에 따라 status를 verifying/stopped으로 갱신
  → auto_recovery_attempts 기록
  → 잠금 해제
```

사전 필터: `attempt_count < MAX_REPAIR_ATTEMPTS`, 이전 프로덕션 수리 실패(rollback 기록) 없음. 인시던트 잠금은 `acquire_incident_for_repair` RPC 함수(`FOR UPDATE SKIP LOCKED`)로 구현.

### 4-1a. 이벤트 분류기 (완료)

위치: `src/features/auto-recovery-orchestrate/api/classifier.ts`

미분류 이벤트 배치(`classified_at IS NULL`)를 조회해 error/fatal 이벤트를 인시던트로 변환한다. `source→category` 매핑(lambda/edge→server, build→build, static→client, external/firewall→network), `signatureId`는 `${source}-${level}-${statusCode}` 형태의 coarse 시그니처. `createIncidentIdentity()`로 SHA-256 fingerprint를 생성하고 `auto_recovery_incidents`에 upsert한다.

### 4-2. Fix Executor (완료)

위치: `src/features/auto-recovery-orchestrate/api/fix-executor.ts`

서버리스 환경(Vercel Function, 300s timeout)에서 단일 invocation으로 실행. git worktree 대신 GitHub API(`octokit`)로 코드 읽기/쓰기를 수행한다.

**실행 흐름**:
1. Vercel REST API로 런타임 에러 상세 조회 (VERCEL_TOKEN 없으면 메타데이터만 사용)
2. 스택 트레이스 파싱 → 관련 파일 경로 추출 (실패 시 코드 검색으로 폴백)
3. GitHub API로 관련 소스 코드 읽기
4. Claude API(`@anthropic-ai/sdk`, Sonnet)로 에러 분석 + 수정 생성 (structured JSON output)
5. `evaluateRecoveryEligibility(AI 분석 결과 + DB 컨텍스트)` — repair가 아니면 중단
6. GitHub API로 `fix/agent-<fingerprint>` 브랜치 생성 + 파일 커밋 + 푸시

**비용 제한**: `AUTO_RECOVERY_MAX_TOKENS` (기본 4096) 시도당 최대 토큰.

**재현 프로토콜**: Stage 3에서는 AI 분석 기반 판단. 테스트 전후 비교(재현 증명)는 Stage 4 CI 연동에서 수행.

### 4-3. 재현 실패·보호 영역·불확실 시 처리

AI 분석에서 `isExpected=true`(예상 동작), `isExternalFailure=true`(외부 장애), `changeScope='protected'`(보호 영역), `isReproducible=false`(재현 불가)로 판단되면 `evaluateRecoveryEligibility`가 ignore/report/stop을 반환하고 수정을 시도하지 않는다. 분석 결과는 `auto_recovery_attempts`에 기록.

## 5. Stage 4 — 검증과 병합 (완료)

### 5-1. 재개 가능 Phase 기반 상태 머신

위치: `src/features/auto-recovery-orchestrate/api/verifier.ts`

트리거: Vercel Cron Job (`vercel.json`, `*/3 * * * *`)이 `GET /api/auto-recovery/verify`를 호출한다. Vercel Function 300s 제한 내에서 전체 검증을 완료할 수 없으므로, `auto_recovery_attempts.checks` JSON 컬럼에 현재 phase를 저장하는 재개 가능 상태 머신을 사용한다.

```
ci_pending → ci_checking → review_pending → preview_pending → merge_ready → merged
                                                                     ↓ (any phase)
                                                                   stopped
```

인시던트 잠금은 `acquire_incident_for_verify` RPC 함수(`FOR UPDATE SKIP LOCKED`)로 구현. 최대 검증 시간 30분 초과 시 자동 stop.

### 5-2. CI/CD 연동

위치: `.github/workflows/auto-recovery-verify.yml`

`fix/agent-*` 브랜치 push가 GitHub Actions CI를 트리거한다.

| 검사 | 실행 주체 |
| --- | --- |
| lint, typeCheck, test, build | GitHub Actions (`auto-recovery-verify.yml`) |
| scope | Verifier가 `getCompareCommits`로 변경 파일 경로 분석 (`scope-checker.ts`) |
| review | 별도 Claude API 호출 — Fix Executor와 다른 프롬프트 (`review.ts`) |
| preview | Vercel Preview 배포 상태 조회 (`vercel-api.ts`) |
| e2e | Preview URL 대상 HTTP 헬스체크 (`preview-health.ts`) |

**재현 증명**: Fix Executor가 `.auto-recovery-meta.json`을 브랜치에 커밋. GitHub Actions reproduction job이 baseSha에서 테스트 실행(실패 기대) → candidateSha에서 동일 테스트 실행(성공 기대)을 수행하고 결과를 Actions artifact로 발행.

### 5-3. 독립 Review

위치: `src/features/auto-recovery-orchestrate/api/review.ts`

별도 Claude API 호출로 수정을 검토한다. Fix Executor와 다른 시스템 프롬프트를 사용한다. 보안 영향, 검증 무력화, 인시던트 경로 커버리지, 회귀 테스트 존재 여부를 평가. Fail-closed: 파싱 불가 시 `isValidationWeakened=true`로 처리.

### 5-4. 병합 통제

`evaluateMergeEvidence`가 8개 검사 + 재현 증거 + 독립 리뷰를 종합 판정한다. baseSha가 currentMainSha와 일치해야 하므로 main이 변경되면 재검증이 필요하다. 병합은 GitHub API를 통해 squash merge로 수행하고, 브랜치를 자동 삭제한다.

## 6. Stage 5 — 운영 복구 (완료)

### 6-1. 재개 가능 Phase 기반 모니터 상태 머신

위치: `src/features/auto-recovery-orchestrate/api/monitor.ts`

트리거: Vercel Cron Job (`vercel.json`, `*/1 * * * *`)이 `GET /api/auto-recovery/monitor`를 호출한다. Stage 4 병합 후 인시던트 status가 `deploying`으로 전이된 시점부터 모니터가 작동한다.

```
deploy_pending → observing → resolved
                     ↓           ↓
              rollback_pending  stopped
                     ↓
              rollback_complete
```

인시던트 잠금은 `acquire_incident_for_monitor` RPC 함수로 구현. `deploying` 또는 `monitoring` 상태의 인시던트를 대상으로 한다.

### 6-2. Post-Deploy 모니터링

Production 병합 후 Vercel이 자동 배포한다. 모니터는 배포 완료를 감지하고 관찰 루프를 시작한다.

**deploy_pending 단계:**
- Vercel Production Deployments API로 merge commit SHA에 해당하는 배포 조회
- READY 상태 배포 발견 시 `observing`으로 전이, 이전 배포 ID도 기록 (롤백용)
- 10분 내 배포 미출현 시 `stopped`

**observing 단계:**
- Synthetic probe: `GET /`, `GET /api/health` → 200 확인
- Vercel Runtime Logs API로 해당 배포의 에러 수집
- 인시던트 카테고리 기반 재발 감지 (recurrenceCount)
- 스냅샷 누적 후 `evaluateProductionMonitoring` 정책 함수 호출
- 판정: observe → 계속 관찰, resolved → 성공 종료, rollback → 롤백 시작, stop → 중단
- 배포가 다른 배포로 교체된 경우 `stopped` (deployment-superseded)

### 6-3. 롤백 메커니즘

**rollback_pending 단계:**

1. 현재 프로덕션 배포가 여전히 자동 수정 배포인지 확인 (다른 사람의 배포를 덮어쓰지 않음)
2. Vercel Promote API(`POST /v10/projects/{id}/promote/{deploymentId}`)로 이전 정상 배포를 프로덕션으로 승격
3. GitHub API로 병합 커밋 revert: 병합 커밋의 부모 트리로 새 커밋 생성 → main ref 갱신
4. 두 작업 모두 성공 시 `rollback_complete`, 실패 시 `stopped`
5. Git revert는 main이 병합 커밋 이후 변경되지 않은 경우에만 수행 (안전 장치)

롤백 완료된 인시던트의 attempt `result`는 `'rollback'`으로 기록된다. 이후 동일 fingerprint에 대한 자동 수리 시도는 `isPreviousProductionRepairFailed` 조건에 의해 차단된다.

### 6-4. Kill Switch

- `AUTO_RECOVERY_ENABLED` 환경변수: `true`가 아니면 모든 cron 엔드포인트(orchestrate, verify, monitor)가 진입 차단
- Vercel 대시보드에서 환경변수 토글 → 다음 Cron 주기(≤1분) 내 정지
- 즉시 정지가 필요하면: Vercel 대시보드에서 Cron Job 자체를 비활성화

## 7. 구현 현황

| 단계 | 산출물 | 상태 |
| --- | --- | --- |
| 1. 정책 기반 | 정책 함수 4개 + 테스트 110개 | 완료 |
| 2. 수집·영속 | Drain 수신기, Collector, 스키마 3개 테이블 | 완료 |
| 3. 수정 실행기 | Orchestrator, 이벤트 분류기, Fix Executor, GitHub/Vercel API 클라이언트 | 완료 |
| 4. 검증·병합 | Verifier 상태 머신, CI Actions, 독립 Review, Scope/Preview 검사, 병합 통제 | 완료 |
| 5. 운영 복구 | Monitor 상태 머신, Synthetic Probe, Vercel Rollback, Git Revert, Kill Switch | 완료 |

## 8. 외부 연동 체크리스트

- Vercel: 프로젝트 설정, Log Drain 구성, 배포 API 접근, Instant Rollback 권한
- GitHub: App 또는 연동 계정, PR·병합 권한, 브랜치 보호·필수 검사
- Claude API: tool use 모델 접근, 비용 상한 설정
- 격리 실행 환경: git worktree, 제한된 환경변수, 테스트 전용 계정·데이터
- 관찰 임계값: 최소 요청 수, 오류율 허용치, 최대 관찰 시간
- 중단 스위치: `AUTO_RECOVERY_ENABLED` 환경변수, Cron 비활성화 경로

비밀 값은 문서·코드·PR·로그에 기록하지 않는다. 실제 공급자 API와 요금제 조건은 해당 단계 구현 시 공식 문서와 계정 설정으로 확인한다.
