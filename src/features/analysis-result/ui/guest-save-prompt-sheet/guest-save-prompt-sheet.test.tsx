import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GuestSavePromptSheet } from './guest-save-prompt-sheet';

describe('GuestSavePromptSheet', () => {
  it('비회원에게 기록 저장을 위한 회원가입 안내를 보여준다', async () => {
    render(
      <GuestSavePromptSheet
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('dialog', { name: '기록을 저장하려면' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('회원가입을 하면 기록을 저장할 수 있어요'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '회원가입하기' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('회원가입하기를 누르면 회원가입 진행을 요청한다', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <GuestSavePromptSheet
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(
      await screen.findByRole('button', { name: '회원가입하기' }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('취소를 누르면 안내를 닫고 회원가입을 진행하지 않는다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <GuestSavePromptSheet
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(await screen.findByRole('button', { name: '취소' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
