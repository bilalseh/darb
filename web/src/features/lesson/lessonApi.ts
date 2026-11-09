import type { LessonContent, Plan, Stats } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiGet, apiPost } from '../../lib/apiClient';
import { todayLocalIso } from '../../lib/dates';

const base = (skillId: string, lessonId: string) =>
  `/skills/${encodeURIComponent(skillId)}/lessons/${encodeURIComponent(lessonId)}` as const;

export function lessonContentQueryOptions(skillId: string, lessonId: string) {
  return queryOptions({
    queryKey: ['lesson', skillId, lessonId],
    // Idempotent: written by the AI on first open, then returned from storage.
    queryFn: () => apiPost<LessonContent>(`${base(skillId, lessonId)}/content`),
    staleTime: Infinity,
    retry: false,
  });
}

export function completeLesson(skillId: string, lessonId: string) {
  return apiPost<Plan>(`${base(skillId, lessonId)}/complete`, { completedOn: todayLocalIso() });
}

export function askTutor(skillId: string, lessonId: string, message: string) {
  return apiPost<LessonContent>(`${base(skillId, lessonId)}/tutor`, { message });
}

export const statsQueryKey = (uid: string) => ['stats', uid] as const;

export function statsQueryOptions(uid: string) {
  return queryOptions({
    queryKey: statsQueryKey(uid),
    queryFn: () => apiGet<Stats>(`/stats?today=${todayLocalIso()}`),
  });
}
