import { getHomeAuth } from './get-home-auth';
import { HomeAuthError } from './home-auth-error';
import { RecentTestsSection } from './recent-tests-section';

const RecentTestsContainer = async () => {
  const { userId, isError } = await getHomeAuth();

  if (isError) return <HomeAuthError area="recent-tests" />;
  if (!userId) return null;

  return <RecentTestsSection userId={userId} />;
};

export { RecentTestsContainer };
