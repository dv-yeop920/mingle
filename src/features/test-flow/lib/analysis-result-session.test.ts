import { beforeEach, describe, expect, it } from 'vitest';

import { createAnalysisResultFixture } from '../testing/analysis-result-fixture';

import {
  ANALYSIS_RESULT_STORAGE_KEY,
  deleteAnalysisResult,
  fetchAnalysisResult,
  putAnalysisResult,
} from './analysis-result-session';

describe('analysis result session', () => {
  beforeEach(() => sessionStorage.clear());

  it('유효한 분석 결과를 저장하고 복원한다', () => {
    const result = createAnalysisResultFixture();

    expect(putAnalysisResult(result, sessionStorage)).toBe(true);
    expect(fetchAnalysisResult(sessionStorage)).toEqual(result);
  });

  it('손상된 결과를 복원하지 않고 삭제한다', () => {
    sessionStorage.setItem(
      ANALYSIS_RESULT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, result: { chemistryScore: 200 } }),
    );

    expect(fetchAnalysisResult(sessionStorage)).toBeNull();
    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).toBeNull();
  });

  it('저장된 분석 결과를 삭제한다', () => {
    putAnalysisResult(createAnalysisResultFixture(), sessionStorage);

    deleteAnalysisResult(sessionStorage);

    expect(sessionStorage.getItem(ANALYSIS_RESULT_STORAGE_KEY)).toBeNull();
  });
});
