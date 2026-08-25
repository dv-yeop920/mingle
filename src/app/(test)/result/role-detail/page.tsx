import { RoleDetailView } from '@/views/result';

const RoleDetailPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; role?: string }>;
}) => {
  const { id, role } = await searchParams;
  const roleIndex = role ? Number(role) : undefined;
  return <RoleDetailView analysisId={id} roleIndex={roleIndex} />;
};

export const instant = false;
export default RoleDetailPage;
