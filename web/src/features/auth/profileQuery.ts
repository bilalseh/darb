import type { Profile } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiPost } from '../../lib/apiClient';
import { todayLocalIso } from '../../lib/dates';

/** POST /api/me is idempotent: it returns the profile, creating (and demo-seeding) it once. */
export function profileQueryOptions(uid: string) {
  return queryOptions({
    queryKey: ['profile', uid],
    // The local date lines a new demo account's history up with the learner's own day.
    queryFn: () => apiPost<Profile>('/me', { today: todayLocalIso() }),
    staleTime: Infinity,
  });
}
