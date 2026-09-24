import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import {
  BRAND_BACKGROUND_COLOR,
  BRAND_DEEP_COLOR,
  BRAND_FOREGROUND_COLOR,
  BRAND_SURFACE_COLOR,
  BRAND_THEME_COLOR,
} from '@/shared/config/seo';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const SIZE = { width: 1200, height: 630 };

type MemberRole = {
  nickname: string;
  mbti: string;
  title: string;
};

const fontPromise = readFile(
  join(process.cwd(), 'src/app/fonts/gothic-a1-800.ttf'),
);

const fontConfig = (data: Buffer) => [
  { name: 'Gothic A1', data, style: 'normal' as const, weight: 800 as const },
];

const genericImage = (fontData: Buffer) =>
  new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: BRAND_BACKGROUND_COLOR,
          color: BRAND_FOREGROUND_COLOR,
          display: 'flex',
          fontFamily: 'Gothic A1',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'flex-start',
            background: BRAND_SURFACE_COLOR,
            border: `4px solid ${BRAND_THEME_COLOR}`,
            borderRadius: '48px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            padding: '68px 76px',
            width: '100%',
          }}
        >
          <div
            style={{
              color: BRAND_DEEP_COLOR,
              display: 'flex',
              fontSize: '36px',
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            MIXTI
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '70px',
              fontWeight: 800,
              lineHeight: 1.18,
              marginTop: '26px',
            }}
          >
            MBTI로 알아보는
            <br />
            우리 그룹 케미
          </div>
        </div>
      </div>
    ),
    { ...SIZE, fonts: fontConfig(fontData) },
  );

export const GET = async (request: Request) => {
  const fontData = await fontPromise;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return genericImage(fontData);
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('analyses')
    .select('tagline, chemistry_score, member_roles')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();

  if (!data) {
    return genericImage(fontData);
  }

  const roles = (data.member_roles ?? []) as MemberRole[];
  const highlight = roles[0];

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: BRAND_BACKGROUND_COLOR,
          color: BRAND_FOREGROUND_COLOR,
          display: 'flex',
          fontFamily: 'Gothic A1',
          height: '100%',
          justifyContent: 'center',
          padding: '56px',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: BRAND_SURFACE_COLOR,
            border: `4px solid ${BRAND_THEME_COLOR}`,
            borderRadius: '48px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            padding: '48px 64px',
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            style={{
              color: BRAND_DEEP_COLOR,
              display: 'flex',
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            MIXTI
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              fontWeight: 800,
              lineHeight: 1.2,
              marginTop: '24px',
              textAlign: 'center',
            }}
          >
            {data.tagline ?? '우리 그룹 케미'}
          </div>

          <div
            style={{
              alignItems: 'baseline',
              color: BRAND_DEEP_COLOR,
              display: 'flex',
              gap: '8px',
              marginTop: '28px',
            }}
          >
            <span style={{ fontSize: '80px', fontWeight: 800 }}>
              {data.chemistry_score}
            </span>
            <span style={{ fontSize: '32px', fontWeight: 800 }}>/ 100</span>
          </div>

          {highlight && (
            <div
              style={{
                background: BRAND_BACKGROUND_COLOR,
                borderRadius: '20px',
                display: 'flex',
                gap: '16px',
                marginTop: '28px',
                padding: '16px 32px',
              }}
            >
              <span
                style={{
                  color: BRAND_DEEP_COLOR,
                  fontSize: '26px',
                  fontWeight: 800,
                }}
              >
                {highlight.nickname}
              </span>
              <span style={{ fontSize: '26px', fontWeight: 800, opacity: 0.5 }}>
                {highlight.mbti}
              </span>
              <span style={{ fontSize: '26px', fontWeight: 800 }}>
                {highlight.title}
              </span>
            </div>
          )}

          <div
            style={{
              background: BRAND_THEME_COLOR,
              borderRadius: '999px',
              bottom: '40px',
              display: 'flex',
              height: '20px',
              position: 'absolute',
              right: '48px',
              width: '140px',
            }}
          />
        </div>
      </div>
    ),
    { ...SIZE, fonts: fontConfig(fontData) },
  );
};
