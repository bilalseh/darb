import type { Plan, PlanLesson, WeekAdjustment } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

import { apiPatch, apiPost } from '../../lib/apiClient';
import { db } from '../../lib/firestore';

export const planQueryKey = (uid: string, skillId: string) => ['plan', uid, skillId] as const;

/** Read straight from Firestore (docs/adr/0002); the API stores plans as plain JSON. */
export async function fetchPlan(uid: string, skillId: string): Promise<Plan | null> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'plans', skillId));
  // Only the API writes plans (rules deny client writes), so the shape is trusted.
  return snapshot.exists() ? (snapshot.data() as Plan) : null;
}

export function planQueryOptions(uid: string, skillId: string) {
  return queryOptions({
    queryKey: planQueryKey(uid, skillId),
    queryFn: () => fetchPlan(uid, skillId),
  });
}

const base = (skillId: string) => `/skills/${encodeURIComponent(skillId)}/plan` as const;

export function createPlan(skillId: string) {
  return apiPost<Plan>(base(skillId));
}

export function regenerateWeek(skillId: string, weekIndex: number, adjust: WeekAdjustment) {
  return apiPost<Plan>(`${base(skillId)}/weeks/${String(weekIndex)}/regenerate`, { adjust });
}

export function moveLesson(skillId: string, lessonId: string, scheduledDate: string) {
  return apiPatch<Plan>(`${base(skillId)}/lessons/${encodeURIComponent(lessonId)}`, {
    scheduledDate,
  });
}

/** The same change the API makes, applied locally first so a drag feels instant. */
export function withLessonMoved(plan: Plan, lessonId: string, scheduledDate: string): Plan {
  return {
    ...plan,
    weeks: plan.weeks.map((week) => ({
      ...week,
      lessons: week.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, scheduledDate } : lesson,
      ),
    })),
  };
}

export function allLessons(plan: Plan): PlanLesson[] {
  return plan.weeks.flatMap((week) => week.lessons);
}
