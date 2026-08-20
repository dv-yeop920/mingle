import { describe, expect, it } from 'vitest';

import { loginSchema, signupSchema } from './schemas';

describe('loginSchema', () => {
  it('유효한 입력값을 통과시킨다', () => {
    const result = loginSchema.safeParse({
      username: 'testuser',
      password: 'password123!',
    });
    expect(result.success).toBe(true);
  });

  it('빈 아이디를 거부한다', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'password123!',
    });
    expect(result.success).toBe(false);
  });

  it('빈 비밀번호를 거부한다', () => {
    const result = loginSchema.safeParse({
      username: 'testuser',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('영숫자가 아닌 아이디를 거부한다', () => {
    const result = loginSchema.safeParse({
      username: 'test user!',
      password: 'password123!',
    });
    expect(result.success).toBe(false);
  });
});

describe('signupSchema', () => {
  const validInput = {
    nickname: '테스트',
    username: 'testuser',
    password: 'abc123!',
    confirmPassword: 'abc123!',
  };

  it('유효한 입력값을 통과시킨다', () => {
    const result = signupSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('8글자 초과 닉네임을 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      nickname: '아홉글자닉네임입니다',
    });
    expect(result.success).toBe(false);
  });

  it('6자 미만 비밀번호를 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      password: 'ab1!',
      confirmPassword: 'ab1!',
    });
    expect(result.success).toBe(false);
  });

  it('특수문자 없는 비밀번호를 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      password: 'abc123',
      confirmPassword: 'abc123',
    });
    expect(result.success).toBe(false);
  });

  it('숫자 없는 비밀번호를 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      password: 'abcdef!',
      confirmPassword: 'abcdef!',
    });
    expect(result.success).toBe(false);
  });

  it('영문자 없는 비밀번호를 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      password: '123456!',
      confirmPassword: '123456!',
    });
    expect(result.success).toBe(false);
  });

  it('비밀번호 불일치를 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      confirmPassword: 'different!',
    });
    expect(result.success).toBe(false);
  });

  it('영숫자가 아닌 아이디를 거부한다', () => {
    const result = signupSchema.safeParse({
      ...validInput,
      username: 'test@user',
    });
    expect(result.success).toBe(false);
  });
});
