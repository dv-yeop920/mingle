import { describe, expect, it } from 'vitest';

import { convertMembersToNicknameErrors, memberNicknameSchema } from './schemas';

describe('memberNicknameSchema', () => {
  it('한글/영문 닉네임을 허용한다', () => {
    expect(memberNicknameSchema.safeParse('준').success).toBe(true);
    expect(memberNicknameSchema.safeParse('june').success).toBe(true);
  });

  it('특수문자는 거부한다', () => {
    const result = memberNicknameSchema.safeParse('준!');

    expect(result.success).toBe(false);
  });
});

describe('convertMembersToNicknameErrors', () => {
  it('중복 닉네임에 필드별 에러를 반환한다', () => {
    const errors = convertMembersToNicknameErrors([
      { id: 'a', nickname: '준' },
      { id: 'b', nickname: '준' },
      { id: 'c', nickname: '지연' },
    ]);

    expect(errors.a).toBe('같은 닉네임은 쓸 수 없어요');
    expect(errors.b).toBe('같은 닉네임은 쓸 수 없어요');
    expect(errors.c).toBeUndefined();
  });

  it('빈 닉네임 에러를 반환한다', () => {
    const errors = convertMembersToNicknameErrors([
      { id: 'a', nickname: '' },
      { id: 'b', nickname: '지연' },
    ]);

    expect(errors.a).toBe('닉네임을 입력해주세요');
    expect(errors.b).toBeUndefined();
  });
});
