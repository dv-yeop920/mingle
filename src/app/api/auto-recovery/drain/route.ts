import { handleDrainRequest } from '@/features/auto-recovery-ingest';
import { createCollectorEnqueue } from '@/features/auto-recovery-ingest/api/collector';

const POST = async (request: Request) => {
  const signatureSecret = process.env.AUTO_RECOVERY_DRAIN_SECRET;
  const projectIds = process.env.AUTO_RECOVERY_PROJECT_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const isEnabled =
    process.env.AUTO_RECOVERY_INGEST_ENABLED === 'true' &&
    signatureSecret &&
    projectIds?.length;
  return handleDrainRequest(
    request,
    isEnabled ? { signatureSecret, projectIds } : null,
    createCollectorEnqueue(),
  );
};

export { POST };
