# Drain 수신 기반 설정

현재 구현은 `POST /api/auto-recovery/drain`에서 서명을 검증하고 정제된 메타데이터를 Supabase `auto_recovery_events` 테이블에 직접 저장한다. **운영 자동 복구는 활성화되지 않았다.**

## 서버 환경변수

| 이름 | 용도 |
| --- | --- |
| `AUTO_RECOVERY_INGEST_ENABLED` | 정확히 `true`일 때만 수신 활성화 |
| `AUTO_RECOVERY_DRAIN_SECRET` | Vercel Drain 서명 비밀 값 |
| `AUTO_RECOVERY_PROJECT_IDS` | 허용 프로젝트 ID의 쉼표 구분 목록 |

모두 서버 전용이며 `NEXT_PUBLIC_`을 붙이지 않는다. 이 문서에 실제 값을 쓰지 않는다. 설정 누락 또는 비활성 상태는 503이다. 수집기는 내부 모듈(Supabase 직접 저장)이므로 별도 URL·토큰 설정이 필요 없다.

## 입력과 전달 계약

Vercel은 원본 요청 본문에 대한 HMAC-SHA1을 `x-vercel-signature`로 전달한다. 구현은 원본 바이트를 검증하고 일정 시간 비교를 사용한다. [공식 Drain 보안 문서](https://vercel.com/docs/drains/security)

JSON 배열 또는 NDJSON을 받는다. 최대 1 MiB, 최대 500개 이벤트이며 초과·잘못된 이벤트·미허용 프로젝트가 하나라도 있으면 배치 전체를 거부한다. 이벤트 ID, 프로젝트·배포 ID, 시간, source, level을 검증하고 선택적인 statusCode도 검증한다. 필드 기준은 [공식 로그 참조](https://vercel.com/docs/drains/reference/logs)를 따른다.

모든 level과 상태 코드를 전달한다. 500만 필터링하지 않으며 info도 요청 지표 등에 활용할 수 있도록 유지한다. 로그 이벤트 수가 실제 요청 수와 같다는 뜻은 아니므로 요청 기반 운영 관찰은 별도로 연결해야 한다.

수집기로 보내는 JSON은 `{ batchId, events }`이다. 각 이벤트에는 `id`, `projectId`, `deploymentId`, `timestamp`, `source`, `level`, 선택적인 `statusCode`만 있다. ID는 공급자가 생성한 불투명 식별자라는 계약 아래 제한된 문자와 길이로 검증한다. 이 형식 검증이 임의 문자열의 개인정보 제거를 보장하지는 않으므로 사용자 값으로 ID를 채우지 않는다.

원본 message, stack, URL, path, query, headers, 요청·응답 본문은 전달하지 않는다. **초기 메타데이터만으로 스택 기반 원인 분석은 할 수 없다.** 추후 신뢰된 원본 로그 조회와 소스맵 연동에 별도 접근 통제·정제 절차가 필요하다.

`batchId`는 원본 배치의 SHA-256이며 `Idempotency-Key` 헤더에도 전달한다. 이는 재전송 식별용이며 개인정보 정제 방식이 아니다. 수집기는 각 `projectId + id`를 기준으로도 영속 중복 제거해야 한다. 같은 이벤트가 다른 배치로 재전송될 수 있다.

수집기는 배치 **전체를 영속 저장한 뒤에만 2xx를 반환**해야 한다. 이 계약이 충족되어야 수신 endpoint의 202가 영속 수락을 뜻한다. 부분 수락이나 저장 전 성공 응답을 보내는 수집기는 연결하면 안 된다. 10초 타임아웃, 네트워크 오류, 리다이렉트, 비-2xx 응답에는 503을 반환한다. 메모리 큐나 200 응답 후 백그라운드 작업은 사용하지 않는다. 재전송·보관 정책과 공급자의 재시도 한도도 운영 설정에서 확인해야 한다.

## 배포 전 확인

- 공급자 delivery 검증은 아직 수행하지 않았다. 새 Drains의 실제 `schemas`·`delivery` 설정으로 검증 요청을 보내 수신 계약을 확인한 뒤 활성화해야 한다. 기존 Log Drain의 `x-vercel-verify` 방식이 새 Drains에도 그대로 적용된다고 가정하지 않는다. 검증을 위해 일반 unsigned 로그 요청을 성공 처리하지 않는다. [현재 Drains 안내](https://vercel.com/docs/drains) · [Delivery 검증 API](https://vercel.com/docs/rest-api/reference/endpoints/drains/validate-drain-delivery-configuration)
- 수집기의 인증, 영속 저장·중복 제거, 입력 계약과 실패 응답을 구현·검증한다.
- Vercel에서 지정한 프로젝트만 전달하도록 설정하고 실제 서명된 JSON/NDJSON 수신을 확인한다.
- 정확히 `/api/auto-recovery/drain`만 로그인 proxy 검사에서 제외된다. 사용자 세션 대신 Drain 서명이 인증을 담당한다.
- 브라우저·배포 이벤트·기능 점검 어댑터와 에이전트, 병합, 모니터링, 롤백은 이 endpoint에 포함되지 않는다.

## SPOF 완화 결정

이 endpoint는 같은 Vercel 앱에 있으므로 앱 배포·실행 장애가 수집까지 막을 수 있다.

**결정: 초기에는 같은 앱에 유지하고, 단일 장애 시나리오별로 대응한다.**

근거: MIXTI는 소규모 팀이 운영하는 소비자 웹앱이다. 별도 프로젝트 분리는 인프라 복잡도와 비용을 크게 늘린다. 자동 복구 시스템 자체가 SPOF가 아니라 부가 안전망이므로, 앱 장애 시 수동 대응이라는 기존 경로가 여전히 유효하다.

대응:
- 배포 중 수집 불능: Vercel은 배포 전환이 원자적이므로 수신 불능 구간은 매우 짧다. Drain 공급자의 재전송 정책이 짧은 불능을 보완한다.
- 런타임 장애: 앱 전체가 장애면 수집기도 의미가 없다 (오류 자체가 수집 대상이 아니라 앱이 아예 응답 불능). 부분 장애는 Drain 경로가 독립 함수로 실행되므로 영향이 제한적이다.
- 향후 분리: `DrainEnqueue` 추상화가 HTTP 전달 경로를 유지하므로 필요 시 별도 Vercel 프로젝트로 분리 가능.

## 무한 루프 완화 결정

Drain endpoint의 접근 로그 자체가 새 Drain 요청을 만들어 무한 전달을 일으킬 수 있다.

**결정: Vercel Drain 설정에서 `/api/auto-recovery/drain` 경로를 필터링 제외한다.**

근거: 내부 코드 필터링이나 console 출력 생략만으로는 Vercel 플랫폼이 생성하는 접근 로그의 재유입을 막지 못한다. 공급자(Vercel) 수준에서 제외해야 한다.

구현:
- Vercel Drain 설정 시 path filter로 `/api/auto-recovery/*` 경로를 제외
- 만약 Vercel Drain이 경로 필터를 지원하지 않으면: Drain 대상 프로젝트와 수신 endpoint 프로젝트를 분리 (이 경우 SPOF 완화도 함께 해결)
- **이 조건을 실제 Vercel Drain 설정에서 검증하기 전에는 활성화하지 않는다**
