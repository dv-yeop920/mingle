# Test Flow Profile Prefill

## 요구사항

- 비로그인 사용자는 기존처럼 MBTI 테스트를 수동 입력으로 이용할 수 있다.
- 로그인 사용자는 프로필의 닉네임, MBTI, 성별이 모두 있으면 첫 멤버를 "나"로 자동 초기화한다.
- 로그인 사용자에게 MBTI 또는 성별이 없으면 테스트 진입 전에 설정 화면으로 보내 보완시킨다.

## 흐름

- `/group-type`와 `/members` 라우트 컨테이너에서 서버 `fetchProfile()`을 호출한다.
- 프로필이 없으면 게스트로 간주하고 테스트 플로우를 차단하지 않는다.
- 프로필이 있지만 불완전하면 `/mypage/settings?required=profile&redirect=/group-type`로 redirect한다.
- 프로필이 완전하면 `convertProfileToSelfMemberSeed()`로 Zustand 초기화에 필요한 스냅샷만 만든다.
- 인원수 확정 시 `initializeMembers(count, selfMemberSeed)`를 호출하고 첫 멤버만 self seed로 채운다.

## 상태

- React Query와 서버 쿼리는 프로필 원본을 소유한다.
- Zustand는 테스트 중 사용할 멤버 스냅샷만 소유한다.
- 테스트 도중 프로필이 바뀌어도 이미 생성된 members는 유지하고, 다음 테스트부터 새 프로필을 반영한다.

## 예외

- 프로필의 MBTI 또는 성별이 허용된 union 값이 아니면 미설정으로 간주한다.
- 게스트 분석 결과를 로그인 후 저장할 수 있도록 guest result members에도 gender를 보존한다.
