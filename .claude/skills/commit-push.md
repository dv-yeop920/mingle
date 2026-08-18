---
name: commit-push
description: 변경사항을 주제별로 커밋하고 사용자 확인 후 푸시
disable-model-invocation: true
allowed-tools: Bash(git *)
---

## 동작 흐름

1. `git status`와 `git diff --stat`으로 변경사항을 파악한다
2. `git log --oneline -5`로 기존 커밋 메시지 스타일을 확인한다
3. 변경사항을 주제별로 그룹핑한다
4. 각 그룹마다 `git add <파일들>` → `git commit` 순차 실행한다
5. 커밋 완료 후 `git log origin/HEAD..HEAD --oneline`으로 커밋 목록을 보여준다
6. 사용자에게 푸시 여부를 확인한다 (AskUserQuestion 사용)
7. 승인 시 `git push origin HEAD`를 실행한다

## 커밋 컨벤션

### 메시지 형식

```
<type>: <한국어 설명>

<본문 (선택)>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Type 목록

| Type | 용도 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `chore` | 설정, 패키지, 빌드 등 코드 외 변경 |
| `docs` | 문서 추가·수정 |
| `style` | 코드 포맷팅, 세미콜론 등 (로직 변경 없음) |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `test` | 테스트 추가·수정 |
| `perf` | 성능 개선 |

### 규칙
- 반드시 한글로 작성하며 작업의 요점을 메세지로 작성한다
- 제목은 50자 이내, 마침표 없이 끝낸다
- 본문이 필요하면 제목과 한 줄 비운 뒤 작성한다
- HEREDOC으로 커밋 메시지를 전달한다
- `git add -A` 대신 파일을 명시적으로 지정한다
- `.env`, `.env.local`, 시크릿 파일은 절대 커밋하지 않는다
- 변경사항이 없으면 빈 커밋을 생성하지 않는다
- 모든 커밋에 `Co-Authored-By` 트레일러를 포함한다