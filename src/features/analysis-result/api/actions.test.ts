import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { convertGroupTypeForStorage } from '../lib/convert-group-type-for-storage';

import { deleteAnalysis, saveAnalysis, saveGuestAnalysis } from './actions';

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockDelete = vi.fn();
const mockDeleteEq = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
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
  title: '주말 여행 멤버',
  groupId: 'group-1',
  chemistryScore: 85,
  metrics: { harmony: 90 },
  groupAtmosphere: { positive: ['좋은 분위기'] },
  memberRoles: [{ role: '리더' }],
  pairChemistry: [{ score: 80 }],
  summary: '좋은 그룹입니다',
};

const mockGuestAnalysisParams = {
  title: '  우리 팀 케미  ',
  saveOperationId: '7dbefb4f-8c4a-4dde-975d-4756047a4706',
  groupType: 'company',
  customName: null,
  members: [
    {
      nickname: '민지',
      mbti: 'ENFP',
      gender: 'female' as const,
      is_self: true,
    },
    {
      nickname: '하니',
      mbti: 'ISTJ',
      gender: 'male' as const,
      is_self: false,
    },
  ],
  chemistryScore: 85,
  tagline: '차분하고 활기찬 팀',
  metrics: { conversation: 80 },
  groupAtmosphere: {
    groupAtmosphere: {
      title: '균형 잡힌 팀',
      description: '따뜻한 설명이에요.',
    },
  },
  memberRoles: [{ nickname: '민지', role: '아이디어 메이커' }],
  pairChemistry: [{ memberA: '민지', memberB: '하니', score: 82 }],
  summary: '서로의 장점을 자연스럽게 살려주는 조합이에요.',
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
      title: '주말 여행 멤버',
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

  it('공백뿐인 제목은 저장하지 않는다', async () => {
    mockGetUser.mockResolvedValue(mockAuthUser);

    const result = await saveAnalysis({
      ...mockAnalysisParams,
      title: '   ',
    });

    expect(result).toEqual({ error: '테스트 제목을 입력해 주세요.' });
    expect(mockInsert).not.toHaveBeenCalled();
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

describe('saveGuestAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(mockAuthUser);
    mockRpc.mockResolvedValue({ data: 'analysis-2', error: null });
  });

  it('회사/팀 타입을 변환하고 전체 결과를 단일 RPC로 저장한다', async () => {
    const result = await saveGuestAnalysis(mockGuestAnalysisParams);

    expect(result).toEqual({ data: { id: 'analysis-2' } });
    expect(mockRpc).toHaveBeenCalledWith('save_guest_analysis', {
      p_title: '우리 팀 케미',
      p_group_type: 'work',
      p_custom_name: null,
      p_members: mockGuestAnalysisParams.members,
      p_chemistry_score: 85,
      p_tagline: '차분하고 활기찬 팀',
      p_metrics: mockGuestAnalysisParams.metrics,
      p_group_atmosphere: mockGuestAnalysisParams.groupAtmosphere,
      p_member_roles: mockGuestAnalysisParams.memberRoles,
      p_pair_chemistry: mockGuestAnalysisParams.pairChemistry,
      p_summary: mockGuestAnalysisParams.summary,
      p_save_operation_id: '7dbefb4f-8c4a-4dde-975d-4756047a4706',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/history');
  });

  it('제목이 30자를 넘으면 그룹을 만들기 전에 저장을 중단한다', async () => {
    const result = await saveGuestAnalysis({
      ...mockGuestAnalysisParams,
      title: '가'.repeat(31),
    });

    expect(result).toEqual({
      error: '테스트 제목은 30자 이하로 입력해 주세요.',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('operation ID가 UUID가 아니면 RPC를 호출하지 않는다', async () => {
    const result = await saveGuestAnalysis({
      ...mockGuestAnalysisParams,
      saveOperationId: 'not-a-uuid',
    });

    expect(result).toEqual({
      error: '저장 요청 정보가 올바르지 않아요.',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('트랜잭션 실패 시 저장 에러를 반환한다', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'transaction failed' },
    });

    const result = await saveGuestAnalysis(mockGuestAnalysisParams);

    expect(result).toEqual({
      error: '분석 결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
    });
  });
});

describe('convertGroupTypeForStorage', () => {
  it('company만 DB 제약에 맞는 work로 바꾼다', () => {
    expect(convertGroupTypeForStorage('company')).toBe('work');
    expect(convertGroupTypeForStorage('friends')).toBe('friends');
    expect(convertGroupTypeForStorage('family')).toBe('family');
  });
});
