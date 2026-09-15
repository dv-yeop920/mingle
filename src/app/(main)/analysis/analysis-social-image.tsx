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

const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

const createAnalysisSocialImage = async () => {
  const fontData = await readFile(
    join(process.cwd(), 'src/app/fonts/gothic-a1-800.ttf'),
  );
  const categories = ['그룹 케미', '1:1 궁합', '성격 분석', '캐릭터 매칭'];

  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: BRAND_BACKGROUND_COLOR,
        color: BRAND_FOREGROUND_COLOR,
        display: 'flex',
        fontFamily: 'Gothic A1',
        height: '100%',
        justifyContent: 'center',
        padding: '64px',
        width: '100%',
      }}
    >
      <div
        style={{
          background: BRAND_SURFACE_COLOR,
          border: `4px solid ${BRAND_THEME_COLOR}`,
          borderRadius: '48px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          padding: '64px 72px',
          width: '100%',
        }}
      >
        <div
          style={{
            color: BRAND_DEEP_COLOR,
            display: 'flex',
            fontSize: '34px',
            fontWeight: 800,
            letterSpacing: '0.08em',
          }}
        >
          MIXTI
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '68px',
            fontWeight: 800,
            lineHeight: 1.18,
            marginTop: '22px',
          }}
        >
          나에게 맞는
          <br />
          MBTI 분석 찾기
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '34px' }}>
          {categories.map((category) => (
            <div
              key={category}
              style={{
                background: BRAND_THEME_COLOR,
                borderRadius: '999px',
                color: BRAND_DEEP_COLOR,
                display: 'flex',
                fontSize: '22px',
                fontWeight: 800,
                padding: '12px 22px',
              }}
            >
              {category}
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts: [
        { name: 'Gothic A1', data: fontData, style: 'normal', weight: 800 },
      ],
    },
  );
};

export { createAnalysisSocialImage };
