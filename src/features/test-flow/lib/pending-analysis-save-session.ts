import { pendingAnalysisSaveSessionSchema } from '../model/schemas';
import type { PendingAnalysisSave } from '../model/schemas';

const PENDING_ANALYSIS_SAVE_STORAGE_KEY = 'mingle:pending-analysis-save:v1';

const deletePendingAnalysisSave = (storage: Storage): void => {
  try {
    storage.removeItem(PENDING_ANALYSIS_SAVE_STORAGE_KEY);
  } catch {
    // 저장소 접근이 제한되어도 현재 결과 화면은 계속 사용할 수 있다.
  }
};

const fetchPendingAnalysisSave = (
  storage: Storage,
): PendingAnalysisSave | null => {
  try {
    const serializedValue = storage.getItem(PENDING_ANALYSIS_SAVE_STORAGE_KEY);
    if (!serializedValue) return null;

    const parsedValue: unknown = JSON.parse(serializedValue);
    const result = pendingAnalysisSaveSessionSchema.safeParse(parsedValue);

    if (result.success) {
      return {
        title: result.data.title,
        saveOperationId: result.data.saveOperationId,
      };
    }

    deletePendingAnalysisSave(storage);
    return null;
  } catch {
    deletePendingAnalysisSave(storage);
    return null;
  }
};

const putPendingAnalysisSave = (
  pendingSave: PendingAnalysisSave,
  storage: Storage,
): boolean => {
  const result = pendingAnalysisSaveSessionSchema.safeParse({
    schemaVersion: 1,
    ...pendingSave,
  });
  if (!result.success) return false;

  try {
    storage.setItem(
      PENDING_ANALYSIS_SAVE_STORAGE_KEY,
      JSON.stringify(result.data),
    );
    return true;
  } catch {
    return false;
  }
};

export {
  PENDING_ANALYSIS_SAVE_STORAGE_KEY,
  deletePendingAnalysisSave,
  fetchPendingAnalysisSave,
  putPendingAnalysisSave,
};
