import { describe, expect, it } from 'vitest';

import { FILTER_OPTIONS } from './constants';

describe('FILTER_OPTIONS', () => {
  it('회사·팀 필터가 실제 DB 저장 타입인 work를 사용한다', () => {
    expect(FILTER_OPTIONS).toContainEqual({
      label: '회사·팀',
      value: 'work',
    });
  });
});
