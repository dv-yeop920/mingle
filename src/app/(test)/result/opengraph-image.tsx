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

const alt = 'MIXTI 그룹 케미 분석 결과';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

const fontPromise = readFile(
  join(process.cwd(), 'src/app/fonts/gothic-a1-800.ttf'),
);

const OpenGraphImage = async () => {
  const fontData = await fontPromise;

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
    {
      ...size,
      fonts: [
        {
          name: 'Gothic A1',
          data: fontData,
          style: 'normal' as const,
          weight: 800 as const,
        },
      ],
    },
  );
};

export { alt, contentType, size };
export default OpenGraphImage;
