import type { Profile } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiPost } from '../../lib/apiClient';

/** POST /api/me is idempotent: it returns the profile, creating (and demo-seeding) it once. */
export function profileQueryOptions(uid: string) {
  return queryOptions({
    queryKey: ['profile', uid],
    queryFn: () => apiPost<Profile>('/me'),
    staleTime: Infinity,
  });
}
