import type { HealthResponse } from '@darb/shared';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '../../lib/apiClient';

export const healthQueryKey = ['health'] as const;

export function useApiHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => apiGet<HealthResponse>('/health', { signal }),
  });
}
