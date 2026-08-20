import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteAnalysis, saveAnalysis } from './actions';

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockDelete = vi.fn();
const mockDeleteEq = vi.fn();

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'analyses') {
        return {
          insert: (data: unknown) => {
            mockInsert(data);
            return {
              select: (col: string) => {
                mockSelect(col);
                return { single: mockSingle };
              },
            };
          },
          delete: () => {
            mockDelete();
            return { eq: mockDeleteEq };
          },
        };
      }
      return {};
    },
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockAuthUser = {
  data: { user: { id: 'user-1' } },
};
const mockNoUser = { data: { user: null } };

const mockAnalysisParams = {
  groupId: 'group-1',
  chemistryScore: 85,
  metrics: { harmony: 90 },
  groupAtmosphere: { positive: ['좋은 분위기'] },
  memberRoles: [{ role: '리더' }],
  pairChemistry: [{ score: 80 }],
  summary: '좋은 그룹입니다',
};

describe('saveAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 데이터로 분석 결과를 저장한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockSingle.mockResolvedValue({
      data: { id: 'analysis-1' },
      error: null,
    });

    const result = await saveAnalysis(mockAnalysisParams);

    expect(result).toEqual({ data: { id: 'analysis-1' } });
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      group_id: 'group-1',
      chemistry_score: 85,
      metrics: { harmony: 90 },
      group_atmosphere: { positive: ['좋은 분위기'] },
      member_roles: [{ role: '리더' }],
      pair_chemistry: [{ score: 80 }],
      summary: '좋은 그룹입니다',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/history');
  });

  it('미인증 사용자면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockNoUser);

    const result = await saveAnalysis(mockAnalysisParams);
    expect(result).toEqual({ error: '인증이 필요합니다' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('저장 실패 시 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    });

    const result = await saveAnalysis(mockAnalysisParams);
    expect(result).toEqual({ error: '분석 결과 저장에 실패했습니다' });
  });
});

describe('deleteAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('분석 결과를 삭제한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockDeleteEq.mockResolvedValue({ error: null });

    const result = await deleteAnalysis('analysis-1');

    expect(result).toEqual({ data: { success: true } });
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'analysis-1');
    expect(revalidatePath).toHaveBeenCalledWith('/history');
  });

  it('미인증 사용자면 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockNoUser);

    const result = await deleteAnalysis('analysis-1');
    expect(result).toEqual({ error: '인증이 필요합니다' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('삭제 실패 시 에러를 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockDeleteEq.mockResolvedValue({
      error: { message: 'delete failed' },
    });

    const result = await deleteAnalysis('analysis-1');
    expect(result).toEqual({ error: '분석 결과 삭제에 실패했습니다' });
  });
});
