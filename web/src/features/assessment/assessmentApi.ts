import type { AnswerSubmission, AssessmentProgress, PlacementResult } from '@darb/shared';

import { ApiError, apiDelete, apiPost } from '../../lib/apiClient';

export const assessmentQueryKey = (skillId: string) => ['assessment', skillId] as const;

/** Starts the assessment, or resumes the one in progress (no new AI call). */
export function startAssessment(skillId: string) {
  return apiPost<AssessmentProgress>(`/skills/${encodeURIComponent(skillId)}/assessment`);
}

/** Discards the test in progress; the next start writes a new one in the app's language. */
export function restartAssessment(skillId: string) {
  return apiDelete(`/skills/${encodeURIComponent(skillId)}/assessment`);
}

export function submitAnswer(skillId: string, answer: AnswerSubmission) {
  return apiPost<AssessmentProgress>(
    `/skills/${encodeURIComponent(skillId)}/assessment/answers`,
    answer,
  );
}

export function completeAssessment(skillId: string) {
  return apiPost<PlacementResult>(`/skills/${encodeURIComponent(skillId)}/assessment/complete`);
}

export type AiProblem = 'unavailable' | 'limit' | 'other';

/** Maps the API's AI errors (503 ai_unavailable, 429 ai_limit_reached) to what the UI says. */
export function aiProblem(error: unknown): AiProblem {
  if (!(error instanceof ApiError)) return 'other';
  const detail = (error.body as { detail?: { code?: unknown } } | null)?.detail;
  if (detail?.code === 'ai_unavailable') return 'unavailable';
  if (detail?.code === 'ai_limit_reached') return 'limit';
  return 'other';
}
