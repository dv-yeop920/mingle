import { getHomeAuth } from './get-home-auth';
import { HomeAuthError } from './home-auth-error';
import { HomeHeader } from './home-header';

const HomeHeaderContainer = async () => {
  const { userId, isError } = await getHomeAuth();

  if (isError) return <HomeAuthError area="header" />;

  return <HomeHeader userId={userId} />;
};

export { HomeHeaderContainer };
