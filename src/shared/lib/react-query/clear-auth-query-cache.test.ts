import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/shared/config/query-keys';

import { clearAuthQueryCache } from './clear-auth-query-cache';

describe('clearAuthQueryCache', () => {
  let client: QueryClient;

  afterEach(() => client.clear());

  it('인증 사용자의 모든 query를 제거한다', async () => {
    client = new QueryClient();
    client.setQueryData(queryKeys.profile.detail('user-a'), { nickname: 'A' });
    client.setQueryData(queryKeys.analyses.list('user-a'), []);
    client.setQueryData(queryKeys.profile.detail('user-b'), { nickname: 'B' });

    await clearAuthQueryCache(client);

    expect(client.getQueryData(queryKeys.profile.detail('user-a'))).toBeUndefined();
    expect(client.getQueryData(queryKeys.analyses.list('user-a'))).toBeUndefined();
    expect(client.getQueryData(queryKeys.profile.detail('user-b'))).toBeUndefined();
  });

  it('auth 외부의 query는 유지한다', async () => {
    client = new QueryClient();
    client.setQueryData(queryKeys.profile.detail('user-a'), { nickname: 'A' });
    client.setQueryData(['public', 'seo'], { title: 'MIXTI' });

    await clearAuthQueryCache(client);

    expect(client.getQueryData(queryKeys.profile.detail('user-a'))).toBeUndefined();
    expect(client.getQueryData(['public', 'seo'])).toEqual({ title: 'MIXTI' });
  });
});
