# Profile Settings Feedback

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
