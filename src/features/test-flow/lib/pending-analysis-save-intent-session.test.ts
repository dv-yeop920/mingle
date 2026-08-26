import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY,
  deletePendingAnalysisSaveIntent,
  fetchPendingAnalysisSaveIntent,
  putPendingAnalysisSaveIntent,
} from './pending-analysis-save-intent-session';

describe('pending analysis save intent session', () => {
  beforeEach(() => sessionStorage.clear());

  it('회원가입 후 저장을 이어갈 의도를 보관하고 읽는다', () => {
    expect(putPendingAnalysisSaveIntent(sessionStorage)).toBe(true);
    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(true);
  });

  it('허용되지 않은 값은 삭제하고 false를 반환한다', () => {
    sessionStorage.setItem(PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY, 'invalid');

    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(false);
    expect(
      sessionStorage.getItem(PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY),
    ).toBeNull();
  });

  it('저장 의도를 삭제한다', () => {
    putPendingAnalysisSaveIntent(sessionStorage);

    deletePendingAnalysisSaveIntent(sessionStorage);

    expect(fetchPendingAnalysisSaveIntent(sessionStorage)).toBe(false);
  });

  it('저장소 접근이 제한되면 false를 반환한다', () => {
    const blockedStorage = {
      setItem: vi.fn(() => {
        throw new Error('storage disabled');
      }),
    } as unknown as Storage;

    expect(putPendingAnalysisSaveIntent(blockedStorage)).toBe(false);
  });
});
