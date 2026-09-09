import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

  describe('IME composition 처리', () => {
    it('조합 중에도 외부 onChange를 호출한다', () => {
      const handleChange = vi.fn();
      render(<TextField label="닉네임" value="" onChange={handleChange} />);
      const input = screen.getByLabelText('닉네임');

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'ㅈ' } });
      fireEvent.change(input, { target: { value: '주' } });
      fireEvent.change(input, { target: { value: '준' } });

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('조합 완료 후에도 onChange를 호출한다', () => {
      const handleChange = vi.fn();
      render(<TextField label="닉네임" value="" onChange={handleChange} />);
      const input = screen.getByLabelText('닉네임');

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'ㅈ' } });
      fireEvent.change(input, { target: { value: '준' } });
      fireEvent.compositionEnd(input, { target: input });

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('조합 중 입력값을 화면에 표시한다', () => {
      render(<TextField label="닉네임" value="" onChange={vi.fn()} />);
      const input = screen.getByLabelText<HTMLInputElement>('닉네임');

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'ㅈ' } });

      expect(input.value).toBe('ㅈ');
    });

    it('비조합 입력(영문)은 onChange를 즉시 호출한다', async () => {
      const handleChange = vi.fn();
      render(<TextField label="닉네임" value="" onChange={handleChange} />);
      const input = screen.getByLabelText('닉네임');

      const user = userEvent.setup();
      await user.type(input, 'a');

      expect(handleChange).toHaveBeenCalled();
    });

    it('uncontrolled 모드에서는 조합 여부와 관계없이 onChange를 호출한다', () => {
      const handleChange = vi.fn();
      render(<TextField label="닉네임" onChange={handleChange} />);
      const input = screen.getByLabelText('닉네임');

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'ㅈ' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });
});
