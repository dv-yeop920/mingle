import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SaveAnalysisSheet } from './save-analysis-sheet';

describe('SaveAnalysisSheet', () => {
  it('공백 제목은 제출하지 않고 한국어 오류를 보여준다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SaveAnalysisSheet isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('테스트 제목'), '   ');
    await user.click(screen.getByRole('button', { name: '완료' }));

    expect(
      await screen.findByText('테스트 제목을 입력해 주세요.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('제목의 앞뒤 공백을 제거한 뒤 제출한다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SaveAnalysisSheet isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('테스트 제목'), '  여름 여행 멤버  ');
    await user.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('여름 여행 멤버');
    });
  });

  it('저장 중에는 완료 버튼을 비활성화하고 로딩 문구를 표시한다', () => {
    render(
      <SaveAnalysisSheet
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting
      />,
    );

    expect(screen.getByRole('button', { name: '저장 중...' })).toBeDisabled();
  });

  it('서버 저장 오류를 접근 가능한 알림으로 표시한다', () => {
    render(
      <SaveAnalysisSheet
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        submitError="저장에 실패했어요."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('저장에 실패했어요.');
  });
});
