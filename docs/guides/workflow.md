# 에이전트 기반 개발 워크플로우

모든 작업은 아래 4단계를 순서대로 따른다. 직접 코딩 금지 — 반드시 에이전트를 통해 작업한다.

## 워크플로우

| 단계 | 목적 | 에이전트/도구 | 산출물 |
|---|---|---|---|
| **1. Research** | 코드베이스 탐색, 영향 범위 파악 | Explore (grep, find, Read) | 변경 대상 파일 목록, 의존 관계 |
| **2. Plan** | 설계 + 구현 계획 수립 | Frontend §0 5단계 설계 | 설계 문서 (design-note.md) |
| **3. Implement** | 코드 작성 | Frontend / Backend / UI / Test | 구현 코드 + 테스트 |
| **4. Review & Ship** | 품질 점검 + 배포 | `/review` → `/test` → `/ship` | 커밋 + 푸시 |

## 규칙

- **Plan 후 승인 대기**: 2단계 설계 완료 후 사용자 승인 없이 3단계로 넘어가지 않는다
- **에이전트 위임**: 구현은 반드시 해당 역할 에이전트를 호출하여 수행한다
- **Review 필수**: `/ship` 전에 `/review`로 점검을 완료해야 한다

## 에이전트 선택 기준

| 작업 내용 | 에이전트 |
|---|---|
| 마크업, 스타일링, 컴포넌트 퍼블리싱 | **UI** (`.claude/agents/ui.md`) |
| 상태 관리, React Query, Zod, 폼, 클라이언트 로직 | **Frontend** (`.claude/agents/frontend.md`) |
| Server Action, Supabase, Route Handler | **Backend** (`.claude/agents/backend.md`) |
| 테스트 작성 + 실행 | **Test** (`.claude/agents/test.md`) |
| 코드 품질 점검 | **Review** (`.claude/agents/review.md`) |

## 커맨드

| 커맨드 | 용도 | 사용 시점 |
|---|---|---|
| `/review` | Review 에이전트로 코드 품질 점검 | 구현 완료 후 |
| `/test` | Test 에이전트로 테스트 실행 | 리뷰 통과 후 |
| `/ship` | 테스트 → 커밋 → 푸시 | 최종 배포 |

## 전체 흐름 요약

```
작업 요청
  ↓
1. Research — Explore로 코드베이스 탐색
  ↓
2. Plan — 설계 문서 작성 → 사용자 승인 대기
  ↓ (승인)
3. Implement — 역할별 에이전트 호출하여 구현
  ↓
4. /review → /test → /ship
```

## 활동 로그

에이전트 작업은 `logs/agent-activity.jsonl`에 자동 기록된다.

### 기록 이벤트

| 이벤트 | Hook | 기록 내용 |
|---|---|---|
| 에이전트 완료 | `SubagentStop` | 에이전트 타입, 세션 ID |
| 파일 수정 | `PostToolUse` (Edit/Write) | 수정된 파일 경로 |
| 사용자 입력 | `UserPromptSubmit` | 사용자 프롬프트 |
| 세션 종료 | `Stop` | 종료 시점 |

### 로그 조회

```bash
# 최근 10건
tail -10 logs/agent-activity.jsonl | jq .

# 특정 에이전트 활동
grep '"agent_type":"Frontend"' logs/agent-activity.jsonl | jq .

# 파일 변경 이력
grep '"file_path"' logs/agent-activity.jsonl | jq .
```

### 설정

- Hook 스크립트: `.claude/hooks/log-activity.sh`
- Hook 설정: `.claude/settings.json`
- 로그 위치: `logs/agent-activity.jsonl` (`.gitignore` 대상)
