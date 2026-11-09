import type { ModuleQuiz, QuizResult, ReviewItem, ReviewOutcome } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { apiPost } from '../../lib/apiClient';
import { todayLocalIso } from '../../lib/dates';
import { db } from '../../lib/firestore';

export const dueReviewsQueryKey = (uid: string) => ['reviews', uid, 'due'] as const;

/** Cards due today or earlier, read straight from Firestore (ISO dates sort as text). */
export async function fetchDueReviews(uid: string, today: string): Promise<ReviewItem[]> {
  const snapshot = await getDocs(
    query(collection(db, 'users', uid, 'reviews'), where('dueOn', '<=', today), orderBy('dueOn')),
  );
  // Only the API writes review cards, so the shape is trusted.
  return snapshot.docs.map((doc) => doc.data() as ReviewItem);
}

export function dueReviewsQueryOptions(uid: string) {
  return queryOptions({
    queryKey: dueReviewsQueryKey(uid),
    queryFn: () => fetchDueReviews(uid, todayLocalIso()),
  });
}

export function answerReview(reviewId: string, choice: number) {
  return apiPost<ReviewOutcome>(`/reviews/${encodeURIComponent(reviewId)}/answer`, {
    choice,
    answeredOn: todayLocalIso(),
  });
}

const quizBase = (skillId: string, moduleIndex: number) =>
  `/skills/${encodeURIComponent(skillId)}/modules/${String(moduleIndex)}/quiz` as const;

export function startModuleQuiz(skillId: string, moduleIndex: number) {
  return apiPost<ModuleQuiz>(quizBase(skillId, moduleIndex));
}

export function submitModuleQuiz(skillId: string, moduleIndex: number, answers: number[]) {
  return apiPost<QuizResult>(`${quizBase(skillId, moduleIndex)}/submit`, { answers });
}
