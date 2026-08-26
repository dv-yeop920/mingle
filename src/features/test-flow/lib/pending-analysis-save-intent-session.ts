const PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY =
  'mingle:pending-analysis-save-intent:v1';

const deletePendingAnalysisSaveIntent = (storage: Storage): void => {
  try {
    storage.removeItem(PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY);
  } catch {
    // 저장소 접근이 제한되어도 현재 결과 화면은 계속 사용할 수 있다.
  }
};

const fetchPendingAnalysisSaveIntent = (storage: Storage): boolean => {
  try {
    const value = storage.getItem(PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY);
    if (value === '1') return true;

    if (value !== null) deletePendingAnalysisSaveIntent(storage);
    return false;
  } catch {
    return false;
  }
};

const putPendingAnalysisSaveIntent = (storage: Storage): boolean => {
  try {
    storage.setItem(PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY, '1');
    return true;
  } catch {
    return false;
  }
};

export {
  PENDING_ANALYSIS_SAVE_INTENT_STORAGE_KEY,
  deletePendingAnalysisSaveIntent,
  fetchPendingAnalysisSaveIntent,
  putPendingAnalysisSaveIntent,
};
