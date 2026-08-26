import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { BRAND_BACKGROUND_COLOR, BRAND_DEEP_COLOR } from '@/shared/config/seo';

const size = { width: 512, height: 512 };
const contentType = 'image/png';

const Icon = async () => {
  const fontData = await readFile(
    join(process.cwd(), 'src/app/fonts/gothic-a1-800.ttf'),
  );

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: BRAND_BACKGROUND_COLOR,
          borderRadius: '108px',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <span
          style={{
            color: BRAND_DEEP_COLOR,
            fontFamily: 'Gothic A1',
            fontSize: '280px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          M
        </span>
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

export { contentType, size };
export default Icon;
