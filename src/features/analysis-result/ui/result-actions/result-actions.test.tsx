import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResultActions } from './result-actions';

describe('ResultActions', () => {
  it('현재 지원하지 않는 멤버 추가 분석을 비활성 상태로 안내한다', () => {
    render(<ResultActions />);

    const addMembersButton = screen.getByRole('button', {
      name: '멤버 추가 분석',
    });

    expect(addMembersButton).toBeDisabled();
  });

  it('다시 테스트하기를 누르면 기존 콜백을 실행한다', async () => {
    const user = userEvent.setup();
    const onRetest = vi.fn();
    render(<ResultActions onRetest={onRetest} />);

    await user.click(screen.getByRole('button', { name: '다시 테스트하기' }));

    expect(onRetest).toHaveBeenCalledOnce();
  });
});
