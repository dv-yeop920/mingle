# /ship — 테스트 → 커밋 → 푸시

## 워크플로우

### Step 1: 변경사항 파악
- `git status`와 `git diff --stat`으로 변경된 파일 목록 확인
- 변경사항이 없으면 중단

### Step 2: 테스트
- `npm run lint` (ESLint)
- `npx tsc --noEmit` (TypeScript 타입체크)
- `npm run build` (Next.js 빌드)
- 변경된 파일에 대응하는 테스트 파일이 있으면 `npm test` 실행
- **하나라도 실패 시**: 커밋하지 않고 실패 내용을 보고 후 중단

### Step 3: 커밋
1. `git add <변경된 파일명>` (파일 명시 지정)
2. `git diff --staged`로 변경 내용 분석
3. 분석 기반으로 커밋 메시지 자동 작성
4. `git commit` (HEREDOC으로 메시지 전달)

### Step 4: 푸시
- `git push origin <현재 브랜치>`

### Step 5: 결과 요약
- 커밋 해시, 메시지, 변경된 파일 수, 브랜치명을 요약 보고

## 커밋 컨벤션

### 메시지 형식
```
<type>: <설명>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Type
| Type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 전용 변경 |
| `chore` | 그 외 모든 변경 |

### 규칙
- 50자 이내, 마침표 없음
- `git add -A` 금지 — 파일을 명시적으로 지정
- `.env`, `.env.local`, 시크릿 파일 커밋 금지
- 빈 커밋 금지
- Co-Authored-By 트레일러 필수
