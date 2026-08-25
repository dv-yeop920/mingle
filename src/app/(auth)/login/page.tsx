import { LoginView } from '@/views/login';

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const { redirect } = await searchParams;
  const redirectTo = redirect === '/result' ? redirect : undefined;

  return <LoginView redirectTo={redirectTo} />;
};

export default LoginPage;
