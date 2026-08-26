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

const alt = 'MINGLE MBTI 그룹 궁합과 케미 테스트';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

const OpenGraphImage = async () => {
  const fontData = await readFile(
    join(process.cwd(), 'src/app/fonts/gothic-a1-800.ttf'),
  );

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
            position: 'relative',
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
            MINGLE
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
          <div
            style={{
              color: BRAND_DEEP_COLOR,
              display: 'flex',
              fontSize: '30px',
              fontWeight: 700,
              marginTop: '30px',
            }}
          >
            친구 · 가족 · 팀의 궁합을 한 번에 분석해요
          </div>
          <div
            style={{
              background: BRAND_THEME_COLOR,
              borderRadius: '999px',
              bottom: '58px',
              display: 'flex',
              height: '26px',
              position: 'absolute',
              right: '64px',
              width: '190px',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Gothic A1',
          data: fontData,
          style: 'normal',
          weight: 800,
        },
      ],
    },
  );
};

export { alt, contentType, size };
export default OpenGraphImage;
