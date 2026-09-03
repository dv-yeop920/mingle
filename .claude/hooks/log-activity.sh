#!/bin/bash
input=$(cat)

LOG_DIR="$(cd "$(dirname "$0")/../.." && pwd)/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/agent-activity.jsonl"

echo "$input" | jq -c '{
  timestamp: (now | strftime("%Y-%m-%dT%H:%M:%S%z")),
  event: .hook_event_name,
  session_id: .session_id,
  tool_name: (.tool_name // null),
  agent_type: (.agent_type // null),
  file_path: (.tool_input.file_path // null),
  prompt: (.user_prompt // null)
}' >> "$LOG_FILE"
