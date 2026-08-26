import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MbtiSetupPromptSheet } from './mbti-setup-prompt-sheet';

describe('MbtiSetupPromptSheet', () => {
  it('첫 로그인 사용자에게 필요한 MBTI 설정을 안내한다', async () => {
    render(<MbtiSetupPromptSheet isOpen onConfirm={vi.fn()} />);

    expect(
      await screen.findByRole('dialog', { name: '프로필 설정이 필요해요' }),
    ).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByText('MBTI를 설정하고 이용해 주세요'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'MBTI 설정하기' }),
    ).toBeInTheDocument();
  });

  it('MBTI 설정하기를 누르면 설정 진행을 요청한다', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<MbtiSetupPromptSheet isOpen onConfirm={onConfirm} />);

    await user.click(
      await screen.findByRole('button', { name: 'MBTI 설정하기' }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('Escape나 배경 선택으로 필수 안내가 닫히지 않는다', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MbtiSetupPromptSheet isOpen onConfirm={vi.fn()} />,
    );
    const dialog = await screen.findByRole('dialog', {
      name: '프로필 설정이 필요해요',
    });

    await user.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);

    expect(dialog).toBeInTheDocument();
  });
});
