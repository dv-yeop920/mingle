import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './bottom-sheet';

describe('BottomSheet', () => {
  it('제목이 연결된 modal dialog로 렌더링한다', async () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()} title="MBTI 선택">
        <button type="button">확인</button>
      </BottomSheet>,
    );

    expect(
      await screen.findByRole('dialog', { name: 'MBTI 선택' }),
    ).toHaveAttribute('aria-modal', 'true');
  });

  it('열리면 첫 조작 요소로 포커스를 이동하고 Escape로 닫는다', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="선택">
        <button type="button">첫 번째</button>
        <button type="button">두 번째</button>
      </BottomSheet>,
    );

    const firstButton = screen.getByRole('button', { name: '첫 번째' });
    await waitFor(() => expect(firstButton).toHaveFocus());

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Tab 포커스를 대화상자 안에 순환시킨다', async () => {
    const user = userEvent.setup();
    render(
      <BottomSheet isOpen onClose={vi.fn()} title="선택">
        <button type="button">첫 번째</button>
        <button type="button">두 번째</button>
      </BottomSheet>,
    );

    const firstButton = screen.getByRole('button', { name: '첫 번째' });
    const lastButton = screen.getByRole('button', { name: '두 번째' });
    await waitFor(() => expect(firstButton).toHaveFocus());

    lastButton.focus();
    await user.tab();
    expect(firstButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastButton).toHaveFocus();
  });

  it('닫히면 열기 전 포커스로 복귀한다', async () => {
    const { rerender } = render(
      <>
        <button type="button">열기</button>
        <BottomSheet isOpen={false} onClose={vi.fn()} title="선택">
          <button type="button">확인</button>
        </BottomSheet>
      </>,
    );
    const trigger = screen.getByRole('button', { name: '열기' });
    trigger.focus();

    rerender(
      <>
        <button type="button">열기</button>
        <BottomSheet isOpen onClose={vi.fn()} title="선택">
          <button type="button">확인</button>
        </BottomSheet>
      </>,
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '확인' })).toHaveFocus(),
    );

    rerender(
      <>
        <button type="button">열기</button>
        <BottomSheet isOpen={false} onClose={vi.fn()} title="선택">
          <button type="button">확인</button>
        </BottomSheet>
      </>,
    );

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
