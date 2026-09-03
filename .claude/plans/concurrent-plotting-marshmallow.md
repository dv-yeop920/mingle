# Prompt & Logging Hook 구축

## Context

에이전트 기반 워크플로우(Research → Plan → Implement → Review)가 구성된 상태.
에이전트 작업의 **재현성**과 **오류 원인 추적**을 위해, 에이전트 활동을 자동으로 기록하는 hook 시스템을 구축한다.

---

## 구현 범위

### 기록 대상 이벤트

| Hook 이벤트 | 기록 내용 | 용도 |
|---|---|---|
| `SubagentStop` | 에이전트 타입, 결과 요약 | 어떤 에이전트가 무슨 작업을 했는지 추적 |
| `PostToolUse` (Edit\|Write) | 수정된 파일 경로 | 어떤 파일이 변경됐는지 추적 |
| `UserPromptSubmit` | 사용자 입력 | 어떤 지시가 내려졌는지 (재현성) |
| `Stop` | 세션 종료 시점 | 작업 단위 구분 |

### 기록하지 않는 것

- `Read`, `Bash(grep/find/ls)` 등 읽기 전용 도구 — 노이즈
- `PreToolUse` — 실행 전 데이터는 PostToolUse와 중복

---

## 변경 파일 목록

| 파일 | 작업 | 목적 |
|---|---|---|
| `.claude/hooks/log-activity.sh` | 신규 | 로깅 스크립트 — stdin JSON 파싱 → JSONL 출력 |
| `.claude/settings.json` | 신규 | 프로젝트 hooks 설정 |
| `.gitignore` | 수정 | `logs/` 디렉토리 제외 |
| `AGENTS.md` | 수정 | §9 참조 문서에 로그 시스템 안내 추가 |
| `docs/guides/workflow.md` | 수정 | 로깅 hook 섹션 추가 |

---

## 1. `.claude/hooks/log-activity.sh` — 로깅 스크립트

stdin으로 들어오는 JSON을 파싱해 `logs/agent-activity.jsonl`에 한 줄씩 추가.

```bash
#!/bin/bash
# stdin에서 hook JSON 읽기
input=$(cat)

# 프로젝트 루트의 logs/ 디렉토리
LOG_DIR="$(cd "$(dirname "$0")/../.." && pwd)/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/agent-activity.jsonl"

# 필요한 필드 추출 + 타임스탬프 추가 → JSONL 한 줄로 기록
echo "$input" | jq -c '{
  timestamp: now | strftime("%Y-%m-%dT%H:%M:%S%z"),
  event: .hook_event_name,
  session_id: .session_id,
  tool_name: (.tool_name // null),
  agent_type: (.agent_type // null),
  file_path: (.tool_input.file_path // null),
  prompt: (.user_prompt // null)
}' >> "$LOG_FILE"
```

**요구사항:** `jq` 설치 필요 (macOS: `brew install jq`)

---

## 2. `.claude/settings.json` — hooks 설정

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-activity.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-activity.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-activity.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-activity.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

---

## 3. `.gitignore` 수정

`logs/` 디렉토리 추가 — 세션별 로그는 로컬 전용.

---

## 4. `AGENTS.md` §9 수정

참조 문서에 추가:
```markdown
- 에이전트 활동 로그: `logs/agent-activity.jsonl` (자동 생성, `.gitignore` 대상)
```

---

## 5. `docs/guides/workflow.md` 수정

로깅 섹션 추가:
```markdown
## 활동 로그

에이전트 작업은 `logs/agent-activity.jsonl`에 자동 기록된다.

### 기록 이벤트
- 에이전트 완료 (SubagentStop)
- 파일 수정 (Edit/Write)
- 사용자 입력 (UserPromptSubmit)
- 세션 종료 (Stop)

### 로그 조회
최근 10건: `tail -10 logs/agent-activity.jsonl | jq .`
특정 에이전트: `grep '"agent_type":"Frontend"' logs/agent-activity.jsonl | jq .`
특정 파일 변경: `grep '"file_path"' logs/agent-activity.jsonl | jq .`
```

---

## Verification

1. `jq --version` 확인 (없으면 설치 안내)
2. `.claude/settings.json` 로드 확인 — `/hooks` 명령으로 등록 상태 확인
3. 간단한 Edit 실행 후 `logs/agent-activity.jsonl` 생성 및 내용 확인
4. `tail -1 logs/agent-activity.jsonl | jq .` 로 JSON 형식 검증
