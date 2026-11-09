import type { Progress } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiGet } from '../../lib/apiClient';
import { todayLocalIso } from '../../lib/dates';

export function progressQueryOptions(uid: string) {
  return queryOptions({
    queryKey: ['progress', uid],
    queryFn: () => apiGet<Progress>(`/progress?today=${todayLocalIso()}`),
  });
}

export function formatDuration(minutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
