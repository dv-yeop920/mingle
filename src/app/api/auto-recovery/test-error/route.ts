import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const GET = async () => {
  const headerList = await headers();
  const ua = headerList.get('user-agent') ?? 'unknown';

  const items: string[] = [];
  const first = items[0]!;
  const len = first.length;

  return NextResponse.json({ status: 'ok', len, ua });
};
