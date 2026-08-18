# MINGLE 서비스 요구사항 정의서

## 1. 서비스 개요

> "MBTI로 알아보는 우리 사이의 케미"

MINGLE은 일반적인 MBTI 성격 테스트 앱이 아니다.
사용자가 자신의 MBTI와 주변 사람들의 MBTI를 입력하면, 개인 간 궁합뿐 아니라 여러 명이 함께 있을 때의 관계, 분위기, 역할, 대화 스타일, 팀워크 등을 시뮬레이션하는 서비스이다.

---

## 2. 사용자 흐름

```
Splash → Login / Sign Up → Home → Group Type 선택 → Member 추가 → 분석 시작 → 분석 결과 → 결과 저장 → My Page
```

사용자가 앱을 처음 실행했을 때 기능을 쉽게 이해하고, 최대한 적은 단계로 테스트를 시작할 수 있도록 구성한다.

---

## 3. 화면 목록

| # | 화면 | 설명 |
|---|------|------|
| 1 | Splash | 앱 진입 화면 |
| 2 | Login | 로그인 |
| 3 | Sign Up | 회원가입 |
| 4 | Home | 메인 홈 |
| 5 | Group Type Selection | 관계 유형 선택 |
| 6 | Member Setup · MBTI Picker | 멤버 추가 및 MBTI 선택 |
| 7 | Analysis Loading | 분석 로딩 |
| 8 | Analysis Result | 분석 결과 |
| 9 | Group Atmosphere Detail | 그룹 분위기 상세 |
| 10 | Pair Detail | 1:1 케미 상세 |
| 11 | Test History | 테스트 기록 |
| 12 | My Page | 마이페이지 |

---

## 4. 화면별 기능 요구사항

### 4.1 Login

- 입력 필드: ID, Password
- 유효성 검사: 아이디와 비밀번호가 DB 정보와 일치하는지 확인
- 검사 시점: 로그인 submit 시

### 4.2 Sign Up

- 입력 필드: Nickname, ID, Password, Password Confirm
- 유효성 검사 (submit 시 발생):
  - Nickname: 8글자 이하
  - ID: 영어, 숫자만 가능
  - Password: 영어 + 숫자 + 특수문자 조합, 6자 이상
  - Password Confirm: 비밀번호와 일치 여부 확인

### 4.3 Home

- 헤더: 사용자 닉네임 패칭
- 메인 Hero 섹션: 클릭 시 새로운 케미 테스트로 라우팅
- 하단 최근 테스트: 테스트 결과 카드 일부 노출, 전체 보기 클릭 시 Test History 화면으로 라우팅

### 4.4 Group Type Selection

- 관계 유형을 카드 형태로 제공: 친구 / 회사·팀 / 가족 / 기타
  - 기타: 사용자가 직접 그룹 이름을 입력하여 관리
- 각 카드는 심플한 아이콘 또는 일러스트로 구분
- 카드는 단일 선택만 가능 (복수 선택 불가)
- 선택 후 다음 버튼 클릭 시 Member Setup 화면으로 라우팅

### 4.5 Member Setup & MBTI Picker

- 나의 MBTI는 기본으로 데이터 패칭하여 화면에 표시
- 인원 추가 가능, 최소 자신 포함 2명 이상
- 인원 목록은 카드 형태이며 다음 정보를 입력:
  - 닉네임: 영어와 한글만 가능, 8글자 이하 (실제 회원 아님)
  - 성별: 남 / 여 / 그 외
  - MBTI: 직접 입력이 아닌 Bottom Sheet로 16개 MBTI를 Grid 형태로 배치하여 선택
- 인원 카드 아이콘:
  - 선택한 MBTI의 색상 적용
  - 아이콘 안에 닉네임 두 글자 표시 (외자인 경우 제외)
- 설정 완료 후 "우리 케미 분석하기" CTA 클릭 → 외부 API로 요청

### 4.6 Analysis Loading

- MBTI 카드가 뒤섞이는 이미지 애니메이션 + 안내 문구
- Progress bar로 진행률 표시
- 하단 Loading Message: 진행률에 따라 텍스트 색상과 아이콘이 변함

### 4.7 Analysis Result

- **케미 점수**: 그룹의 케미 정도를 그래프와 퍼센트 숫자로 표현 (Radial Progress / Gauge / Score Card 활용)
- **케미 지표**: 5개 지표를 Progress로 표시
  - 대화 케미
  - 우정 / 관계 깊이
  - 팀워크
  - 분위기
  - 갈등 가능성
- **Group Atmosphere (우리 모임 특징)**: 카드 형태로 노출, 클릭 시 상세 페이지로 라우팅
- **Member Roles (우리 안에서의 역할)**: 각 멤버별 팀 내 역할 표시 (예: 분위기메이커, 참여 유도자 등)
- **Pair Chemistry (둘 사이의 케미)**: 구성원 각각과의 케미를 Progress 수치로 표시, 상세 페이지로 라우팅 가능
- **Result Actions** (하단 CTA):
  - 결과 저장
  - 다시 테스트하기
  - 멤버 추가 분석
  - 결과 공유

### 4.8 Group Atmosphere Detail

Group Atmosphere 카드 클릭 시 진입하는 상세 페이지로, 다음 항목을 통합하여 보여준다:

- **Group Atmosphere**: 여러 명이 같이 있을 때 어떤 모임인지 텍스트 설명
- **Decision Making**: 그룹 전체가 결정을 내려야 할 때 어떤 모습을 보이는지 분석
- **Conflict**: 갈등이 있는 상황 표시
- **Best Moment**: 이 조합이 가장 강한 순간

### 4.9 Test History

- 테스트 결과를 카드 리스트로 조회
- 필터링: 전체 / 친구 / 회사 / 가족

### 4.10 My Page

- 헤더: 닉네임, MBTI, 테스트 횟수 패칭하여 표시
- 통계: 테스트 횟수, 내 그룹 수, 평균 케미
- 하단 메뉴:
  - 테스트 기록
  - 내 그룹
  - 계정 설정

### 4.11 계정 설정

- 닉네임 재설정
- 비밀번호 재설정
- MBTI 재설정
