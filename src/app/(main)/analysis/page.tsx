import type { Metadata } from 'next';

import {
  ANALYSIS_SEO_DESCRIPTION,
  ANALYSIS_SEO_TITLE,
  SITE_NAME,
} from '@/shared/config/seo';

import { AnalysisView } from '@/views/analysis';

export const metadata: Metadata = {
  title: { absolute: ANALYSIS_SEO_TITLE },
  description: ANALYSIS_SEO_DESCRIPTION,
  alternates: {
    canonical: '/analysis',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/analysis',
    siteName: SITE_NAME,
    title: ANALYSIS_SEO_TITLE,
    description: ANALYSIS_SEO_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: ANALYSIS_SEO_TITLE,
    description: ANALYSIS_SEO_DESCRIPTION,
  },
};

const AnalysisPage = () => {
  return <AnalysisView />;
};

export default AnalysisPage;
