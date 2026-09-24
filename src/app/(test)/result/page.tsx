import type { Metadata } from 'next';

import { SITE_URL } from '@/shared/config/seo';
import { createAdminClient } from '@/shared/lib/supabase/admin';

import { ResultView } from '@/views/result';

const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<Metadata> => {
  const { id } = await searchParams;

  if (!id) {
    return { title: 'MBTI 그룹 케미 결과' };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('analyses')
    .select('tagline')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();

  const tagline = data?.tagline ?? '우리 그룹 케미';
  const ogImageUrl = `${SITE_URL.origin}/result/og?id=${id}`;

  return {
    title: `${tagline} | MIXTI 케미 결과`,
    openGraph: {
      title: `${tagline} | MIXTI`,
      description: '친구, 가족, 팀의 MBTI 케미를 AI가 분석했어요! 나도 해보기',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'MIXTI 그룹 케미 분석 결과' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tagline} | MIXTI`,
      description: '친구, 가족, 팀의 MBTI 케미를 AI가 분석했어요! 나도 해보기',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'MIXTI 그룹 케미 분석 결과' }],
    },
  };
};

const ResultPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) => {
  const { id } = await searchParams;

  return <ResultView analysisId={id} />;
};

export { generateMetadata };
export default ResultPage;
