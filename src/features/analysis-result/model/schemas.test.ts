import { describe, expect, it } from 'vitest';

import { analysisTitleSchema } from './schemas';

describe('analysisTitleSchema', () => {
  it('제목 앞뒤 공백을 제거한다', () => {
    const result = analysisTitleSchema.parse({ title: '  여름 여행 멤버  ' });

    expect(result.title).toBe('여름 여행 멤버');
  });

  it('공백만 입력한 제목을 거부한다', () => {
    const result = analysisTitleSchema.safeParse({ title: '   ' });

    expect(result.success).toBe(false);
  });

  it('30자를 초과한 제목을 거부한다', () => {
    const result = analysisTitleSchema.safeParse({ title: '가'.repeat(31) });

    expect(result.success).toBe(false);
  });
});
