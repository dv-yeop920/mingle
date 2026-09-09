import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'zod',
      'zustand',
    ],
  },
  headers: async () => [
    {
      source: '/fonts/v1/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};

export default nextConfig;
