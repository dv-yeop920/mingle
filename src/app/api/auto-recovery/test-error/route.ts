import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const GET = async () => {
  const headerList = await headers();
  const ua = headerList.get('user-agent') ?? 'unknown';

  const config = JSON.parse('{"key":"value"}') as { key: string; missing: { label: string } };
  const label = config.missing.label;

  return NextResponse.json({ status: 'ok', label, ua });
};
