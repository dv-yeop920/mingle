import { analysisResultSessionSchema } from '../model/schemas';
import type { PersistedAnalysisResult } from '../model/schemas';

const ANALYSIS_RESULT_STORAGE_KEY = 'mingle:analysis-result:v1';

const deleteAnalysisResult = (storage: Storage): void => {
  try {
    storage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
  } catch {
    // 저장소 접근이 제한되어도 현재 메모리의 결과는 계속 보여준다.
  }
};

const fetchAnalysisResult = (
  storage: Storage,
): PersistedAnalysisResult | null => {
  try {
    const serializedResult = storage.getItem(ANALYSIS_RESULT_STORAGE_KEY);
    if (!serializedResult) return null;

    const parsedResult: unknown = JSON.parse(serializedResult);
    const result = analysisResultSessionSchema.safeParse(parsedResult);

    if (result.success) return result.data.result;

    storage.removeItem(ANALYSIS_RESULT_STORAGE_KEY);
    return null;
  } catch {
    deleteAnalysisResult(storage);
    return null;
  }
};

const putAnalysisResult = (
  result: PersistedAnalysisResult,
  storage: Storage,
): boolean => {
  try {
    storage.setItem(
      ANALYSIS_RESULT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, result }),
    );
    return true;
  } catch {
    return false;
  }
};

export {
  ANALYSIS_RESULT_STORAGE_KEY,
  deleteAnalysisResult,
  fetchAnalysisResult,
  putAnalysisResult,
};
