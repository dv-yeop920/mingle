import { compatibilityResultSessionSchema } from '../model/schemas';
import type { PersistedCompatibilityResult } from '../model/schemas';

const COMPATIBILITY_RESULT_STORAGE_KEY = 'mingle:compatibility-result:v1';

const deleteCompatibilityResult = (storage: Storage): void => {
  try {
    storage.removeItem(COMPATIBILITY_RESULT_STORAGE_KEY);
  } catch {
    // no-op
  }
};

const fetchCompatibilityResult = (
  storage: Storage,
): PersistedCompatibilityResult | null => {
  try {
    const serialized = storage.getItem(COMPATIBILITY_RESULT_STORAGE_KEY);
    if (!serialized) return null;

    const parsed: unknown = JSON.parse(serialized);
    const result = compatibilityResultSessionSchema.safeParse(parsed);

    if (result.success) return result.data.result;

    storage.removeItem(COMPATIBILITY_RESULT_STORAGE_KEY);
    return null;
  } catch {
    deleteCompatibilityResult(storage);
    return null;
  }
};

const putCompatibilityResult = (
  result: PersistedCompatibilityResult,
  storage: Storage,
): boolean => {
  try {
    storage.setItem(
      COMPATIBILITY_RESULT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, result }),
    );
    return true;
  } catch {
    return false;
  }
};

export {
  COMPATIBILITY_RESULT_STORAGE_KEY,
  deleteCompatibilityResult,
  fetchCompatibilityResult,
  putCompatibilityResult,
};
