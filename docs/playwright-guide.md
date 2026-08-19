# MINGLE — Playwright MCP 테스트 가이드

## 1. 개요

Playwright MCP를 통해 브라우저를 직접 제어하여 UI를 검증한다. 스크린샷보다 **접근성 스냅샷(`browser_snapshot`)** 기반으로 요소를 탐색하고 상호작용하는 것이 핵심.

### 주요 도구

| 도구 | 용도 |
|---|---|
| `browser_navigate` | URL 이동 |
| `browser_snapshot` | 접근성 트리 캡처 (요소 ref 획득) |
| `browser_find` | 스냅샷에서 텍스트/정규식 검색 |
| `browser_click` | 요소 클릭 |
| `browser_type` | 텍스트 입력 |
| `browser_fill_form` | 여러 폼 필드 일괄 입력 |
| `browser_take_screenshot` | 스크린샷 저장 |
| `browser_resize` | 뷰포트 크기 변경 |
| `browser_wait_for` | 텍스트 출현/소멸/시간 대기 |
| `browser_console_messages` | 콘솔 로그 확인 |
| `browser_network_requests` | 네트워크 요청 목록 |
| `browser_press_key` | 키보드 입력 |
| `browser_tabs` | 탭 관리 (생성/닫기/전환) |

---

## 2. 모바일 테스트 워크플로우

MINGLE은 모바일 웹(390×844) 타깃이므로, 테스트 시작 시 반드시 뷰포트를 설정한다.

### 기본 흐름

```
1. browser_resize → { width: 390, height: 844 }
2. browser_navigate → http://localhost:3000
3. browser_snapshot → 페이지 구조 확인, 요소 ref 획득
4. browser_click / browser_type → 상호작용
5. browser_snapshot → 결과 확인
6. browser_take_screenshot → 시각적 기록 (필요 시)
```

### 원칙

- **snapshot 우선**: 스크린샷이 아닌 `browser_snapshot`으로 요소를 찾고 ref를 얻는다
- **ref 기반 상호작용**: snapshot에서 얻은 `ref` 값을 `target`으로 전달한다
- **대기 후 확인**: 페이지 전환이나 API 호출 후 `browser_wait_for`로 결과를 기다린다

---

## 3. 주요 도구 사용법

### 3-1. 페이지 탐색

```
browser_navigate → { url: "http://localhost:3000/login" }
browser_snapshot → {}  // 전체 페이지 구조
browser_find → { text: "로그인" }  // 특정 텍스트 검색
```

### 3-2. 폼 입력

단일 필드:
```
browser_type → { target: "[ref=12]", text: "testuser" }
```

여러 필드 일괄:
```
browser_fill_form → {
  fields: [
    { target: "[ref=12]", name: "아이디", type: "textbox", value: "testuser" },
    { target: "[ref=14]", name: "비밀번호", type: "textbox", value: "pass1234!" }
  ]
}
```

### 3-3. 클릭

```
browser_click → { target: "[ref=16]", element: "로그인 버튼" }
```

### 3-4. 대기

```
browser_wait_for → { text: "홈" }          // 텍스트 출현 대기
browser_wait_for → { textGone: "로딩 중" } // 텍스트 소멸 대기
browser_wait_for → { time: 2 }             // 2초 대기
```

### 3-5. 스크린샷

```
browser_take_screenshot → { scale: "css" }                          // 현재 뷰포트
browser_take_screenshot → { scale: "css", fullPage: true }          // 전체 페이지
browser_take_screenshot → { scale: "css", target: "[ref=20]" }      // 특정 요소
```

### 3-6. 디버깅

```
browser_console_messages → { level: "error" }                       // 에러 로그
browser_network_requests → { static: false, filter: "/api/" }       // API 요청만
browser_network_request → { index: 1, part: "response-body" }       // 응답 본문
```

---

## 4. MINGLE 테스트 시나리오

### 4-1. 인증 플로우

```
1. browser_resize(390, 844)
2. browser_navigate("/signup")
3. browser_fill_form → 닉네임, 아이디, 비밀번호, 비밀번호 확인
4. browser_click → 회원가입 버튼
5. browser_wait_for → "홈" 또는 에러 메시지
6. browser_snapshot → 결과 확인
```

### 4-2. 테스트 플로우 (그룹 유형 → 멤버 설정 → 분석)

```
1. browser_navigate("/group-type")
2. browser_snapshot → 4종 카드 확인
3. browser_click → 그룹 유형 선택
4. browser_wait_for → "멤버" 페이지 전환
5. browser_snapshot → MemberSetupForm 확인
6. browser_fill_form → 멤버 닉네임, 성별
7. browser_click → MBTI 선택 (바텀시트)
8. browser_snapshot → 바텀시트 내 16타입 확인
9. browser_click → MBTI 타입 선택
10. browser_click → 분석 시작 버튼
11. browser_wait_for → 분석 완료 (textGone: "분석 중")
12. browser_snapshot → 결과 화면 확인
```

### 4-3. 결과 화면 검증

```
1. browser_navigate("/result")
2. browser_snapshot → 케미 점수, 지표, 역할, Pair 카드 존재 확인
3. browser_take_screenshot → { scale: "css", fullPage: true }
4. browser_click → Pair 카드 → 상세 페이지 전환
5. browser_snapshot → PairDetail 내용 확인
6. browser_navigate_back → 결과 목록 복귀
```

### 4-4. 네비게이션 검증

```
1. browser_navigate("/home")
2. browser_find → { text: "History" }  // BottomNav 탭 확인
3. browser_click → History 탭
4. browser_wait_for → 히스토리 페이지 전환
5. browser_snapshot → 필터 칩 + 카드 리스트 확인
```
