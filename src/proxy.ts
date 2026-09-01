import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SEO_METADATA_ROUTES } from '@/shared/config/seo';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/group-type',
  '/members',
  '/analyzing',
  '/api/analyze',
  ...SEO_METADATA_ROUTES,
];

const PUBLIC_PREFIXES = ['/result'];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.includes(pathname) ||
  PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const createSupabaseProxy = (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  return { supabase, response };
};

const updateSession = async (request: NextRequest) => {
  const { supabase, response } = createSupabaseProxy(request);
  await supabase.auth.getClaims();
  return response;
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return updateSession(request);
  }

  const { supabase, response } = createSupabaseProxy(request);

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
};

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
