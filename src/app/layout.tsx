import { GoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';

import {
  BRAND_THEME_COLOR,
  HOME_OPEN_GRAPH_IMAGE_ALT,
  HOME_OPEN_GRAPH_IMAGE_PATH,
  HOME_SEO_DESCRIPTION,
  HOME_SEO_TITLE,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/seo';

import './globals.css';
import { Providers } from './providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_THEME_COLOR,
  colorScheme: 'light',
};

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: HOME_SEO_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: HOME_SEO_DESCRIPTION,
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
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    images: [
      {
        url: HOME_OPEN_GRAPH_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: HOME_OPEN_GRAPH_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    images: [
      {
        url: HOME_OPEN_GRAPH_IMAGE_PATH,
        alt: HOME_OPEN_GRAPH_IMAGE_ALT,
      },
    ],
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
    <html lang="ko">
      <head>
        <link
          rel="preload"
          href="/fonts/v3/gothic-a1-critical-700.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/v3/gothic-a1-critical-800.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/v3/gothic-a1-critical-900.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
    </html>
  );
};

export default RootLayout;
