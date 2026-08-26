import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

const HomePage = () => {
  redirect('/');
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default HomePage;
