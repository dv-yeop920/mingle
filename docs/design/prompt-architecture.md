# 프롬프트 아키텍처 결정 기록

## 결론: OpenAI Stored Prompts 사용하지 않음

2026-09-08 기준, OpenAI 대시보드의 Stored Prompts 기능으로 시스템 프롬프트를 옮기는 방안을 검토했으나 **불필요**하다고 판단.

## 현재 구조

| 구성요소 | 위치 | 크기 |
|---------|------|------|
| 시스템 프롬프트 (`ANALYSIS_INSTRUCTIONS`) | `src/entities/analysis/api/prompt.ts` | ~10KB (정적) |
| 동적 분석 입력 (멤버, 페어, 상황) | `buildAnalysisInput()` 으로 조립 | 2~25KB (가변) |
| API 호출 | `src/app/api/analyze/route.ts` | `openai.responses.stream()` |

## 불필요한 이유

### 1. 번들 크기 영향 없음

프롬프트는 서버 사이드 코드(`route.ts`)에서만 사용. 클라이언트 브라우저 번들에 포함되지 않음.

### 2. 프롬프트 캐싱 이미 적용 중

```ts
openai.responses.stream({
  instructions: ANALYSIS_INSTRUCTIONS,
  prompt_cache_key: 'mingle-analysis-v3', // ← OpenAI 서버에서 정적 프롬프트 캐싱
  // ...
});
```

`prompt_cache_key` 설정으로 OpenAI가 시스템 프롬프트를 서버에 캐싱. 매 요청마다 전체를 재처리하지 않음.

### 3. 네트워크 비용 무시 가능

10KB 텍스트는 서버→OpenAI 서버 간 전송으로, LLM 추론 시간(수초~수십초)에 비해 무시 가능.

### 4. Stored Prompts 사용 시 단점

- 프롬프트가 git 버전 관리에서 분리됨
- 로컬 개발/테스트 시 OpenAI 대시보드에 의존
- 동적 부분(멤버, 페어, 상황)은 어차피 코드에서 전송해야 함
- Responses API와의 호환성 미확인

## 기술 스택 참고

- OpenAI SDK: `openai@^7.5.0`
- API: Responses API (`openai.responses.stream`)
- 모델: `gpt-5.6-luna`
- 출력: `zodTextFormat` 구조화 출력 + SSE 스트리밍
- 추론: `reasoning.effort: 'low'`
