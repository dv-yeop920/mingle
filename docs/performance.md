# 성능 최적화 기록

## 1. 폰트 woff2 변환

### 문제

Gothic A1 한글 폰트를 TTF 포맷(weight당 2.2MB × 5 = **11MB**)으로 제공하고 있었음.
Nunito 폰트도 TTF(124KB × 3 = 372KB).

- TTF는 압축되지 않은 포맷이라 네트워크 전송량이 큼
- 한글 폰트는 글리프 수가 많아 파일 크기가 특히 큼
- LCP(Largest Contentful Paint)에 직접 영향 — 이미지 없는 텍스트 기반 UI에서 폰트가 LCP 결정 요소

### 과정

1. `fonttools` + `brotli`를 사용하여 TTF → woff2 변환
2. 한글 유니코드 범위(AC00-D7AF, 1100-11FF, 3130-318F 등) + 라틴 기본 범위로 서브셋 적용
3. `layout.tsx`에서 `.ttf` → `.woff2` 참조로 변경
4. 기존 TTF 파일 삭제

### 결과

| 항목 | 변환 전 (TTF) | 변환 후 (woff2) | 감소율 |
|------|---------------|-----------------|--------|
| Gothic A1 (5 weights) | 11MB | 1.2MB | **89%** |
| Nunito (3 weights) | 372KB | 48KB | **87%** |
| **합계** | **11.4MB** | **1.25MB** | **89%** |

### 영향 지표

- **LCP**: 폰트 로드 시간 단축 → 텍스트 렌더링 빨라짐
- **FCP**: `display: swap` 유지 — 시스템 폰트로 즉시 렌더 후 woff2 스왑
- **TTI**: JS 번들과 무관하나, 네트워크 대역폭 경쟁 감소로 간접 개선

---

## 2. 현재 성능 상태 (배포 전 로컬 빌드 기준)

### 양호한 항목

| 지표 | 상태 | 근거 |
|------|------|------|
| FCP | 양호 | `display: swap` + route별 `loading.tsx` 존재 |
| INP | 양호 | React Compiler 활성, 이벤트 핸들러 경량 |
| JS 번들 | 양호 | 최대 청크 236KB, 전체 ~1.3MB (gzip 전) |
| 렌더링 | 양호 | PPR(Partial Prerender) 활성, Server Component 기본 |

### 배포 후 추가 검토 항목

- [ ] Lighthouse 실측 후 LCP 수치 확인
- [ ] 폰트 weight 축소 가능성 (500 weight 실사용 여부)
- [ ] result 뷰 계열 `next/dynamic` lazy loading 검토
- [ ] 이미지 자산 추가 시 `next/image` + WebP/AVIF 적용
