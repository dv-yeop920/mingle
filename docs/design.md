# MIXTI Design System

MBTI 그룹 케미 시뮬레이터 모바일 앱. 방향: **Young / Social / Playful / Clean / Modern Mobile App**.
연한 초록 기반의 귀여운(rounded, soft shadow) UI. 캐릭터가 아닌 UI 중심.

Canvas: 390 × 844 (iOS/Android 공통). Mobile first.

---

## 1. Color

### Brand / Primary (light green)

| Token | Hex | 용도 |
|---|---|---|
| `green-100` Hero | `#8FD9A8` | Hero 카드, Splash 배경, Result 헤더 |
| `green-200` Primary | `#3FB273` | Primary CTA, 활성 상태, 게이지 fill, 활성 탭 |
| `green-300` Deep | `#2E7A4E` | 점수 숫자, Tonal 버튼 텍스트 |
| `green-050` Tonal | `#DCF0E1` | Tonal 버튼, 선택 배지, Best moment 카드 |
| `green-border` | `#7FD39B` | 포커스 필드 / 선택 카드 보더 |

### Neutral

| Token | Hex | 용도 |
|---|---|---|
| `bg` | `#F5FAF3` | 앱 기본 배경 |
| `surface` | `#FFFFFF` | 카드, 필드, 바텀 내비 |
| `line` | `#E6EFE6` | 보더 / 구분선 (`#F0F5F0` = 카드 내부 divider) |
| `text` | `#26382C` | 기본 텍스트 |
| `text-sub` | `#6E8375` (또는 `#4E6355`) | 본문 보조 |
| `text-hint` | `#9AAB9F` | 캡션, placeholder |
| `disabled` | `#C3D2C7` / `#DCE8DD` | 비활성 아이콘 / 비활성 버튼 |

### MBTI Accent — 4개 기질군만 사용

16색 원색을 쓰지 않는다. 사람·타입 구분에만 파스텔 4쌍(bg/fg)을 제한적으로 적용.

| 그룹 | 타입 | BG | FG | Border |
|---|---|---|---|---|
| Analysts | INTJ INTP ENTJ ENTP | `#EDE6FF` | `#6B5AA8` | `#E4D9FF` |
| Diplomats | INFJ INFP ENFJ ENFP | `#DFF3E3` | `#3F8B5C` | `#CDEBD4` |
| Sentinels | ISTJ ISFJ ESTJ ESFJ | `#E6EFF8` | `#4A7E9E` | `#D6E6F2` |
| Explorers | ISTP ISFP ESTP ESFP | `#FDEDE0` | `#B5794C` | `#F7E0CD` |

### Semantic

| 의미 | BG | FG | 사용처 |
|---|---|---|---|
| Positive · 높은 케미 | `#DCF0E1` | `#2E7A4E` | 긍정 지표, Best moment |
| Caution · 갈등 / 주의 | `#FFF6E6` | `#E0A24C` (텍스트 `#8A6320`) | 갈등 가능성, Warning 카드 |
| Insight · 분위기 / 해석 | `#F1EDFB` | `#6B5AA8` (텍스트 `#3B3159`) | Group Atmosphere |
| Info · 의사결정 | `#E6EFF8` | `#4A7E9E` (텍스트 `#27455C`) | Decision Making |

### 색 사용 규칙

- 한 화면에 배경색은 최대 2개.
- 강조 카드(분위기 / 의사결정 / 주의 / Best moment)는 각각 화면당 1회만.
- 에러·부정 상태도 붉은색 대신 Caution 톤을 사용한다.
- 그라디언트는 게이지의 `conic-gradient`에만 사용.

---

## 2. Typography

- **Korean / UI 전체**: `Gothic A1` — 400 / 500 / 700 / 800 / 900
- **숫자 · MBTI 4글자 · 날짜**: `Nunito` — 700 / 800 / 900

| Style | Font / Weight / Size | 비고 |
|---|---|---|
| Display | Nunito 900 · 52 / 1.0 | 케미 점수 (`86%`) |
| Title 1 | Gothic A1 900 · 30 / 1.32 | 화면 대표 문장, letter-spacing −0.02em |
| Title 2 | Gothic A1 900 · 23–27 / 1.34 | 스텝 제목 |
| Section | Gothic A1 900 · 16.5 | 섹션 헤더 |
| Quote | Gothic A1 800 · 16 / 1.5 | 결과 문장 (따옴표로 감쌈) |
| Body | Gothic A1 600 · 13.5 / 1.65 | 설명 문단 |
| Caption | Gothic A1 700 · 12 | 메타 정보, hint |
| Label / Data | Nunito 900 · 11–12 | MBTI 배지, 날짜 |

규칙: 본문 최소 12.5px, 터치 대상 44px 이상. 제목 `letter-spacing:-.02em`, 본문 `line-height 1.5–1.68`, 긴 문장에 `text-wrap:pretty`. 결과 문장은 따옴표(“ ”)로 감싸 인용 톤 유지.

---

## 3. Foundation

**Radius** — Field 20 · Card 22–26 · Hero 30 · Bottom sheet 32 · Pill 999 · Device frame 40
**Spacing** — 4 · 8 · 12 · 16 · 20 · 24 · 32 · 44 (화면 좌우 padding 20–24)
**Shadow**
- `sm` `0 5px 14px rgba(76,120,90,.06)` — 리스트 카드
- `md` `0 6px 16px rgba(76,120,90,.07)` — 일반 카드
- `lg` `0 10px 22px rgba(63,178,115,.28)` — Primary CTA
- `hero` `0 14px 30px rgba(90,170,120,.24)` — Hero 카드
- `sheet` `0 -12px 34px rgba(30,70,45,.14)` — 바텀시트

**Motion** — Tap scale .97 / 120ms · 바텀시트 260ms ease-out · 로딩 float·pulse 3–6s 루프 · 게이지 fill 800ms ease-out

---

## 4. Components

### Buttons

| 종류 | 스펙 |
|---|---|
| Primary | h58–60 · radius 22 · bg `green-200` · 흰 텍스트 800/16–17 · shadow lg |
| Secondary | h54–58 · radius 20 · bg white · border 1.5 `#DCE8DD` · 텍스트 `#4E6355` 800 |
| Tonal | h54 · radius 20 · bg `green-050` · 텍스트 `#2E7A4E` 900 |
| Add (dashed) | h58 · radius 22 · border 2 dashed `#CDE0D1` · 텍스트 `#3F9E63` |
| Disabled | bg `#DCE8DD` · 텍스트 `#A9B8AC` |

### Chip · Badge · Field

- Filter chip: padding 9/16 · radius 999 · on = `green-200`+white, off = white+border `#E6EFE6`
- MBTI badge: padding 3–4/9–10 · radius 999 · 기질군 bg/fg · Nunito 900 11–12
- "나" badge: padding 2/8 · bg `#DCF0E1` · 텍스트 `#3F8B5C` 900/10–11
- Text field: h56–58 · radius 20 · bg white · default border `#E6EFE6`, focus border `#7FD39B`(+shadow sm) · 텍스트 700/15–16

### Data / Avatar

- Avatar: rounded square. 66/23, 64/22, 48/17, 44/16, 42/15 (size/radius). bg·fg는 해당 인물 MBTI 기질군 색.
- Score gauge: `conic-gradient(green-200 0% N%, track N% 100%)` 원형. 186px(Result) / 120px(문서·Pair). 내부 흰 원 + Nunito 900 점수.
- Metric bar: track h10 radius 999 bg `#F0F5F0`, fill = `green-200`(긍정) / `#E0A24C`(갈등 지표).
- Progress bar (로딩): track h10 + fill `green-200` + 우측 % 라벨.

### Cards

| 컴포넌트 | 화면 | 내용 | 스펙 |
|---|---|---|---|
| Hero Card | Home | 메인 메시지 + Primary CTA, 배경에 MBTI 카드 장식 | radius 30 · padding 26/24 · bg `green-100` |
| Result Summary Card | Home / History | 그룹명, 유형·인원, 대표 MBTI, 케미 점수, 날짜 | radius 24 · shadow md · 아이콘 48 |
| Group Type Card | Group Type | 아이콘 + 제목 + 설명 + 체크. 선택 시 border 2 `#7FD39B` | radius 26 · icon box 54/19 |
| Member Card | Member Setup | 아바타, 닉네임, MBTI 배지, 성별, "나" 배지, 더보기 | radius 22 · avatar 44 |
| MBTI Picker Sheet | Member Setup | 16타입 4×4 그리드, 직접 입력 없음 | sheet radius 32 · cell h52 radius 16 |
| Role Card | Result | 아바타 + 역할명 + MBTI 배지 + 한 줄 설명 | row gap 13 · avatar 48 |
| Pair Card | Result → Pair Detail | A × B, 케미 %, 바, 한 줄 카피, chevron | radius 24 |
| Insight Card | Result | 분위기(Insight) / 의사결정(Info) / Best moment(Positive) | radius 26 · eyebrow 12/900 대문자 |
| Warning Card | Result | 갈등 가능성. 붉은색 대신 Caution 톤 + 아이콘 박스 | bg `#FFF6E6` · icon 38/13 |
| Stat Row | My Page | 테스트 수 / 내 그룹 / 평균 케미 3분할 | bg `bg` · radius 20 · divider 1px |
| Menu Row | My Page | 아이콘 + 제목 + 설명 + chevron | radius 22 · icon 42/15 |

### Navigation

- **Bottom Navigation** (Home / History / My 3탭): h84 (padding 12/24/28) · bg white · top border `#EEF4EE` · icon 24 · label 11 · 활성 `green-200`, 비활성 `#C3D2C7`. 새로운 테스트는 Home Hero의 Primary CTA가 담당(별도 중앙 FAB 없음).
- **Step Header**: back 38/14(white+border) + 진행 인디케이터 22×5 pill 3개 + `1/3` 텍스트.
- **Status bar**: h46 · Nunito 800/13 · `#5B7062` (Result 헤더에서는 `#2E6644`).

---

## 5. Screens

`MIXTI Mobile App.dc.html` 에 11개 화면이 순서대로 있다.

1. Splash — 그린 배경, 로고 pulse, MBTI 카드 float
2. Login — ID / Password
3. Sign Up — Nickname / ID / Password / Confirm
4. Home — 인사 + Hero + 최근 테스트 카드 + Bottom Nav
5. Group Type Selection — 친구 / 회사·팀 / 가족 / 기타
6. Member Setup — 멤버 카드 리스트 + MBTI Picker Sheet
7. Analysis Loading — 카드 조합 애니메이션 + 단계 메시지
8. Analysis Result — 게이지 → 지표 5개 → 분위기 → 역할 → Pair → 대화 → 의사결정 → 주의 → Best moment → 액션 4종
9. Pair Detail — 두 명 케미 상세
10. Test History — 필터(전체/친구/회사/가족) + 기록 카드
11. My Page — 프로필 + 통계 + 메뉴 3개

**결과 지표 5종**: 대화 케미 · 우정/관계 깊이 · 팀워크 · 분위기 · 갈등 가능성(낮을수록 좋음, Caution 색).

---

## 6. Copy tone

- 짧고 재미있고 공유하고 싶은 문장. 심리 보고서 톤 금지.
- 결과 핵심 문장은 한 줄 인용문 형태: “서로 성격은 다르지만 이상하게 잘 굴러가는 조합이에요.”
- 지표 설명은 1–2문장. 부정 표현은 완화해서 서술.
- 유치하거나 게임 UI 같은 톤은 피한다. 20–30대 실사용 서비스 수준의 완성도.

---

## 7. Implementation notes

- 모든 스타일은 인라인(Design Components 규칙). CSS 클래스·스타일시트 사용하지 않음.
- `@keyframes`(mxFloat, mxFloat2, mxPulse, mxDot)와 `@font-face`/폰트 link만 `<helmet><style>`에 둔다.
- 아이콘은 현재 이모지 placeholder(🧑‍🤝‍🧑 💼 🏠 ✏️ 🗂 👥 ⚙️). 실제 개발 시 단색 라인 아이콘 세트로 교체 권장.
- Result 화면은 스크롤 리포트. 시안에서는 전체가 보이도록 프레임 높이를 확장해 표현.
