import { beforeEach, describe, expect, it } from 'vitest';

import {
  PENDING_ANALYSIS_SAVE_STORAGE_KEY,
  deletePendingAnalysisSave,
  fetchPendingAnalysisSave,
  putPendingAnalysisSave,
} from './pending-analysis-save-session';

const SAVE_OPERATION_ID = '7dbefb4f-8c4a-4dde-975d-4756047a4706';

describe('pending analysis save session', () => {
  beforeEach(() => sessionStorage.clear());

  it('정리한 제목을 버전과 함께 저장하고 복원한다', () => {
    expect(
      putPendingAnalysisSave(
        {
          title: '  여름 여행 멤버  ',
          saveOperationId: SAVE_OPERATION_ID,
        },
        sessionStorage,
      ),
    ).toBe(true);
    expect(fetchPendingAnalysisSave(sessionStorage)).toEqual({
      title: '여름 여행 멤버',
      saveOperationId: SAVE_OPERATION_ID,
    });
    expect(
      JSON.parse(
        sessionStorage.getItem(PENDING_ANALYSIS_SAVE_STORAGE_KEY) ?? '{}',
      ).schemaVersion,
    ).toBe(1);
  });

  it('손상된 저장값은 삭제한다', () => {
    sessionStorage.setItem(PENDING_ANALYSIS_SAVE_STORAGE_KEY, '{broken');

    expect(fetchPendingAnalysisSave(sessionStorage)).toBeNull();
    expect(
      sessionStorage.getItem(PENDING_ANALYSIS_SAVE_STORAGE_KEY),
    ).toBeNull();
  });

  it('저장 완료 시 제목을 삭제할 수 있다', () => {
    putPendingAnalysisSave(
      { title: '우리 팀', saveOperationId: SAVE_OPERATION_ID },
      sessionStorage,
    );

    deletePendingAnalysisSave(sessionStorage);

    expect(fetchPendingAnalysisSave(sessionStorage)).toBeNull();
  });
});
