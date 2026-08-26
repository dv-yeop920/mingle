# Profile Settings Feedback

## 첫 로그인 MBTI 설정 안내

### 1. 요구사항과 상태

- 로그인 프로필의 MBTI가 비어 있으면 홈에서 설정 안내를 표시한다.
- 프로필 조회 전, 비로그인, MBTI 설정 완료 상태에서는 안내를 표시하지 않는다.
- 안내는 설정 전까지 닫을 수 없는 단일 CTA 모달이며, 확인하면 프로필 설정 화면으로 이동한다.

### 2. 런타임 흐름

- 홈 진입 → 기존 `useProfile` 조회 → `profile && !profile.mbti` 판별 → 안내 표시 → CTA 선택 → `/mypage/settings` 이동.
- 로그인·회원가입 성공 시 프로필 query를 무효화한 뒤 이동해 게스트 상태에서 캐시된 `null`을 재사용하지 않는다.

### 3. 데이터 경계

- 기존 `profiles.mbti`를 완료 여부의 원본으로 사용하며 별도 DB 필드나 클라이언트 플래그를 만들지 않는다.
- MBTI 저장 성공 시 기존 설정 폼의 profile query 무효화가 홈 상태를 최신 값으로 갱신한다.

### 4. UI와 접근성

- 기존 접근 가능한 `BottomSheet`와 공통 Primary Button을 재사용한다.
- 제목, 본문, 단일 CTA를 제공하고 backdrop·Escape로 닫히지 않게 해 필수 설정임을 명확히 한다.

### 5. 성능과 장애 대응

- 홈에서 이미 사용하는 프로필 요청을 재사용해 네트워크 요청을 추가하지 않는다.
- 조회 중이나 조회 실패로 데이터가 없을 때는 모달을 성급하게 띄우지 않는다.
- 단위 테스트로 미설정·설정 완료·비로그인 분기와 설정 화면 이동을 검증한다.

## 요구사항

- 닉네임 변경, 비밀번호 변경 요청은 성공/실패 결과를 즉시 표시한다.
- 서버 액션이 `{ error }`를 반환하는 실패와 throw되는 요청 실패를 모두 사용자에게 알린다.
- 닉네임 변경 성공 후 마이페이지/홈에서 이전 프로필 캐시가 남지 않도록 갱신한다.
- MBTI 변경 버튼은 공통 MBTI picker를 열고, 선택 즉시 서버에 저장한다.
- 성별은 `male | female | other` 중 하나로 선택 즉시 서버에 저장한다.
- 테스트 진입 중 프로필 보완이 필요한 경우 설정 화면에서 MBTI와 성별이 모두 저장된 뒤 원래 테스트 경로로 복귀한다.

## 흐름

- 사용자 제출 → React Hook Form 검증 → Server Action 호출 → 결과 분기
- 성공: root error 제거, 필요한 폼 reset, profile query invalidation, success toast 표시
- 실패: root error 표시, error toast 표시
- MBTI picker 선택 → `updateMbti` 호출 → 성공 시 현재 화면 값 갱신, sheet 닫기, profile query invalidation, success toast 표시
- MBTI 변경 실패 시 기존 MBTI를 유지하고 error toast 표시
- 성별 선택 → `updateGender` 호출 → 성공 시 현재 화면 값 갱신, profile query invalidation, success toast 표시
- `required=profile` 진입에서는 `currentMbti && currentGender`를 만족한 저장 성공 시 `redirect` 파라미터의 내부 경로로 복귀한다.

## UI

- toast는 도메인 무관 공통 UI라 `shared/ui/toast`에 배치한다.
- MBTI picker는 MBTI 도메인 UI라 `entities/mbti/ui/mbti-picker`에 배치한다.
- 모바일 화면 상단 고정 영역에 최대 3개까지 표시하고 자동 제거한다.
- `role="status"`와 `role="alert"`를 사용해 성공/안내와 오류 피드백을 구분한다.
