import type { PendingAnalysisSave } from '../../model/schemas';

type PendingAnalysisSaveResumerProps = {
  onResume: (pendingSave: PendingAnalysisSave) => Promise<void> | void;
};

export type { PendingAnalysisSaveResumerProps };
