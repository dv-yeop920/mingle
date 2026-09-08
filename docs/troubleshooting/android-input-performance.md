# Android 한글 입력 깨짐 + 성별 선택 불가 + 렌더링 속도 이슈

## 증상

배포 사이트를 Android 기기에서 사용 시 멤버 설정 페이지(`/members`)에서 3가지 이슈 발생. iOS에서는 정상 동작.

| 증상 | 상세 |
|---|---|
| 한글 입력 깨짐 | "준엽" 입력 시 "ㅈㅜㄴㅇㅕㅂ"처럼 자모가 분리되어 표시 |
| 성별 선택 불가 | 성별 Chip 탭해도 선택이 안 되거나 간헐적 실패 |
| 렌더링 속도 저하 | 닉네임 입력 시 전체 화면이 버벅임 |

## 원인 분석

### 1. 한글 IME 조합 파괴 (Critical)

**파일:** `src/features/test-flow/ui/member-setup-form/member-setup-form.tsx:47-49`

```ts
const handleNicknameChange = (id: string, value: string) => {
  const filtered = value.replace(/[^가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ]/g, '').slice(0, 8);
  updateMember(id, { nickname: filtered });
};
```

- controlled input(`value` prop + `onChange`)에서 매 `onChange`마다 regex 필터링 후 Zustand store 업데이트
- Android Chrome은 한글 조합 중(ㅈ→주→준) `onChange`를 계속 발생시킴
- React가 controlled input의 `value`를 매번 덮어씌워서 IME 내부 상태가 파괴됨
- `onCompositionStart`/`onCompositionEnd` 처리가 전혀 없었음

**왜 iOS에서는 정상인가:** iOS Safari는 조합 중 `onChange` 발생 시점이 다르고, IME 상태 관리가 Android Chrome보다 controlled input 간섭에 덜 민감함.

### 2. 성별 Chip 터치 타겟 부족 (High)

**파일:** `src/features/test-flow/ui/editable-member-card/editable-member-card.tsx:99`

```tsx
<Chip className="px-3 py-[3px] text-label-sm" />
```

- `py-[3px]`으로 수직 패딩이 3px → 전체 높이 약 20px
- Android 권장 최소 터치 영역 48dp에 한참 미달
- `overflow-y-auto` 스크롤 컨테이너 내부에서 작은 탭을 스크롤 제스처로 오인하는 경우 발생

### 3. 이중 유효성 검사로 렌더링 병목 (Medium)

**파일:** `src/views/members/member-setup-view.tsx:24`

```ts
const nicknameErrors = convertMembersToNicknameErrors(members); // 매 키입력마다 동기 실행
```

- 부모(`MemberSetupView`)가 매 키입력마다 Zod `.safeParse()` 동기 실행
- 자식(`MemberSetupForm`)도 debounced로 같은 검증 실행
- 키입력당 검증이 2번 → 저사양 Android에서 체감 지연

## 수정 내용

### 수정 1: TextField에 IME composition 보호 추가

**파일:** `src/shared/ui/text-field/text-field.tsx`

- `composingRef`로 조합 상태 추적 (이벤트 핸들러에서 동기 접근)
- `composingValue` state로 조합 중 입력값 관리 (`null`이면 조합 아님)
- 조합 중(`onCompositionStart` ~ `onCompositionEnd`): 로컬 state만 업데이트, 외부 `onChange` 스킵
- 조합 완료(`onCompositionEnd`): 외부 `onChange` 호출하여 최종값 전달
- uncontrolled 모드(react-hook-form `register` 사용)에서는 기존 동작 유지

### 수정 2: 성별 Chip 터치 타겟 확대

**파일:** `src/features/test-flow/ui/editable-member-card/editable-member-card.tsx`

- Gender Chip: `py-[3px]` → `py-[6px]` + `min-h-[36px]`
- MBTI 버튼: 동일하게 `py-[3px]` → `py-[6px]` + `min-h-[36px]`

### 수정 3: 부모 뷰 검증에 debounce 적용

**파일:** `src/views/members/member-setup-view.tsx`

- `convertMembersToNicknameErrors(members)` → `convertMembersToNicknameErrors(debouncedMembers)`
- `useDebouncedValue(members, 300)` 적용으로 동기 검증 제거

## 검증

- ESLint 통과
- 빌드 성공
- 테스트 7개 통과 (기존 2 + IME composition 5)
- Android 실기기 테스트 필요: 한글 조합, 성별 선택, 입력 속도
