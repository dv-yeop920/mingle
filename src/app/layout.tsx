import { GoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import {
  BRAND_THEME_COLOR,
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/seo';

import './globals.css';
import { Providers } from './providers';

const gothicA1 = localFont({
  src: [
    { path: './fonts/gothic-a1-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/gothic-a1-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/gothic-a1-800.woff2', weight: '800', style: 'normal' },
    { path: './fonts/gothic-a1-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-gothic-a1',
  display: 'swap',
});

const nunito = localFont({
  src: [
    { path: './fonts/nunito-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/nunito-800.woff2', weight: '800', style: 'normal' },
    { path: './fonts/nunito-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-nunito',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_THEME_COLOR,
  colorScheme: 'light',
};

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: SEO_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SEO_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SEO_KEYWORDS,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'lifestyle',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: SITE_NAME,
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.webmanifest',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html lang="ko" className={`${gothicA1.variable} ${nunito.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
    </html>
  );
};

export default RootLayout;
