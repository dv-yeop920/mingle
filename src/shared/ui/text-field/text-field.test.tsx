import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextField } from './text-field';

describe('TextField', () => {
  it('오류 메시지를 입력 필드의 설명으로 연결한다', () => {
    render(<TextField label="닉네임" error="닉네임을 입력해주세요" />);

    const input = screen.getByLabelText('닉네임');
    const error = screen.getByText('닉네임을 입력해주세요');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('기존 aria-describedby와 오류 메시지를 함께 연결한다', () => {
    render(
      <>
        <p id="password-hint">6자 이상</p>
        <TextField
          label="비밀번호"
          aria-describedby="password-hint"
          error="비밀번호를 확인해주세요"
        />
      </>,
    );

    const input = screen.getByLabelText('비밀번호');
    const error = screen.getByText('비밀번호를 확인해주세요');

    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual([
      'password-hint',
      error.id,
    ]);
  });
});
