import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/ui/toast';

import { SettingsForm } from './settings-form';

const { mockUpdateMbti, mockUpdateNickname, mockUpdatePassword } = vi.hoisted(
  () => ({
    mockUpdateMbti: vi.fn(),
    mockUpdateNickname: vi.fn(),
    mockUpdatePassword: vi.fn(),
  }),
);

vi.mock('@/features/profile/api/actions', () => ({
  updateMbti: mockUpdateMbti,
  updateNickname: mockUpdateNickname,
  updatePassword: mockUpdatePassword,
}));

const renderSettingsForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SettingsForm nickname="기존닉" mbti="ENFP" />
      </ToastProvider>
    </QueryClientProvider>,
  );
};

describe('SettingsForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('닉네임 변경 성공 시 toast를 표시한다', async () => {
    const user = userEvent.setup();
    mockUpdateNickname.mockResolvedValue({ data: { nickname: '새닉네임' } });
    renderSettingsForm();

    await user.clear(screen.getByLabelText('닉네임'));
    await user.type(screen.getByLabelText('닉네임'), '새닉네임');
    await user.click(screen.getByRole('button', { name: '닉네임 변경' }));

    await waitFor(() => {
      expect(mockUpdateNickname).toHaveBeenCalledWith({
        nickname: '새닉네임',
      });
    });
    expect(screen.getByText('닉네임이 변경되었습니다')).toBeInTheDocument();
  });

  it('비밀번호 변경 실패 시 error toast를 표시한다', async () => {
    const user = userEvent.setup();
    mockUpdatePassword.mockResolvedValue({
      error: '현재 비밀번호가 올바르지 않습니다',
    });
    renderSettingsForm();

    await user.type(screen.getByLabelText('현재 비밀번호'), 'old123!');
    await user.type(screen.getByLabelText('새 비밀번호'), 'new456!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'new456!');
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    const alert = await screen.findByRole('alert');

    expect(
      within(alert).getByText('현재 비밀번호가 올바르지 않습니다'),
    ).toBeInTheDocument();
  });

  it('MBTI 선택 시 즉시 저장하고 성공 toast를 표시한다', async () => {
    const user = userEvent.setup();
    mockUpdateMbti.mockResolvedValue({ data: { mbti: 'INTJ' } });
    renderSettingsForm();

    await user.click(screen.getByRole('button', { name: 'MBTI 변경' }));
    await user.click(screen.getByRole('button', { name: 'INTJ' }));

    await waitFor(() => {
      expect(mockUpdateMbti).toHaveBeenCalledWith('INTJ');
    });
    expect(screen.getByText('MBTI가 변경되었습니다')).toBeInTheDocument();
  });

  it('MBTI 저장 실패 시 error toast를 표시한다', async () => {
    const user = userEvent.setup();
    mockUpdateMbti.mockResolvedValue({ error: 'MBTI 변경에 실패했습니다' });
    renderSettingsForm();

    await user.click(screen.getByRole('button', { name: 'MBTI 변경' }));
    await user.click(screen.getByRole('button', { name: 'INTJ' }));

    const alert = await screen.findByRole('alert');

    expect(within(alert).getByText('MBTI 변경에 실패했습니다')).toBeInTheDocument();
  });
});
