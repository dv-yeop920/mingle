import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/query-keys';

const clearAuthQueryCache = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.auth.all });
  queryClient.removeQueries({ queryKey: queryKeys.auth.all });
};

export { clearAuthQueryCache };
