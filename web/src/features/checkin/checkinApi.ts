import type { Checkin, CheckinRequest, SyncResult } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiPost } from '../../lib/apiClient';
import { todayLocalIso } from '../../lib/dates';

/** Once per session and day: the API moves missed lessons and says which check-ins are due. */
export function syncQueryOptions(uid: string) {
  const today = todayLocalIso();
  return queryOptions({
    queryKey: ['sync', uid, today],
    queryFn: () => apiPost<SyncResult>('/plans/sync', { today }),
    staleTime: Infinity,
  });
}

export function submitCheckin(skillId: string, body: Omit<CheckinRequest, 'today'>) {
  return apiPost<Checkin>(`/skills/${encodeURIComponent(skillId)}/checkin`, {
    ...body,
    today: todayLocalIso(),
  });
}
