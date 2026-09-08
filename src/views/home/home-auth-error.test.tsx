import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HomeAuthError } from './home-auth-error';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('HomeAuthError', () => {
  it('인증 오류에서 다시 시도하면 서버 인증을 새로 요청한다', async () => {
    render(<HomeAuthError area="header" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '로그인 상태를 확인하지 못했어요.',
    );
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
