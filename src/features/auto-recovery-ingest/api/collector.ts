import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

import type { DrainEnqueue } from './drain';

const createCollectorEnqueue = (): DrainEnqueue => {
  return async (batch) => {
    const supabase = createAdminClient();
    const { error } = await supabase.from('auto_recovery_events').upsert(
      {
        batch_id: batch.batchId,
        project_id: batch.events[0].projectId,
        events: batch.events as unknown as Json,
      },
      { onConflict: 'batch_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  };
};

export { createCollectorEnqueue };
