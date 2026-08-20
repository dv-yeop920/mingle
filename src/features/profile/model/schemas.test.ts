import { describe, expect, it } from 'vitest';

import { nicknameSchema, passwordSchema } from './schemas';

describe('nicknameSchema', () => {
  it('유효한 닉네임을 통과시킨다', () => {
    const result = nicknameSchema.safeParse({ nickname: '테스트' });
    expect(result.success).toBe(true);
  });

  it('1글자 닉네임을 통과시킨다', () => {
    const result = nicknameSchema.safeParse({ nickname: '민' });
    expect(result.success).toBe(true);
  });

  it('8글자 닉네임을 통과시킨다', () => {
    const result = nicknameSchema.safeParse({ nickname: '여덟글자닉네임' });
    expect(result.success).toBe(true);
  });

  it('빈 닉네임을 거부한다', () => {
    const result = nicknameSchema.safeParse({ nickname: '' });
    expect(result.success).toBe(false);
  });

  it('8글자 초과 닉네임을 거부한다', () => {
    const result = nicknameSchema.safeParse({ nickname: '아홉글자닉네임입니다' });
    expect(result.success).toBe(false);
  });
});

describe('passwordSchema', () => {
  const validInput = {
    currentPassword: 'old123!',
    newPassword: 'abc123!',
    confirmPassword: 'abc123!',
  };

  it('유효한 입력값을 통과시킨다', () => {
    const result = passwordSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('빈 현재 비밀번호를 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      currentPassword: '',
    });
    expect(result.success).toBe(false);
  });

  it('6자 미만 새 비밀번호를 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      newPassword: 'ab1!',
      confirmPassword: 'ab1!',
    });
    expect(result.success).toBe(false);
  });

  it('영문자 없는 새 비밀번호를 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      newPassword: '123456!',
      confirmPassword: '123456!',
    });
    expect(result.success).toBe(false);
  });

  it('숫자 없는 새 비밀번호를 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      newPassword: 'abcdef!',
      confirmPassword: 'abcdef!',
    });
    expect(result.success).toBe(false);
  });

  it('특수문자 없는 새 비밀번호를 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      newPassword: 'abc123',
      confirmPassword: 'abc123',
    });
    expect(result.success).toBe(false);
  });

  it('비밀번호 불일치를 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      confirmPassword: 'different!',
    });
    expect(result.success).toBe(false);
  });

  it('빈 비밀번호 확인을 거부한다', () => {
    const result = passwordSchema.safeParse({
      ...validInput,
      confirmPassword: '',
    });
    expect(result.success).toBe(false);
  });
});
