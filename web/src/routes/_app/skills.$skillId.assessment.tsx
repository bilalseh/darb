import type { AssessmentProgress } from '@darb/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  aiProblem,
  assessmentQueryKey,
  completeAssessment,
  startAssessment,
  submitAnswer,
} from '../../features/assessment/assessmentApi';
import { PlacementResultView } from '../../features/assessment/PlacementResultView';
import { QuestionCard } from '../../features/assessment/QuestionCard';
import { skillsQueryKey, skillsQueryOptions } from '../../features/skills/skillsQuery';

export const Route = createFileRoute('/_app/skills/$skillId/assessment')({
  component: AssessmentPage,
});

function ProblemMessage({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="max-w-xl rounded-md bg-amber-50 px-4 py-3 text-amber-900">
      <p>{t(`assessment.problems.${aiProblem(error)}`)}</p>
      <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
        {t('today.retry')}
      </button>
    </div>
  );
}

function AssessmentPage() {
  const { t } = useTranslation();
  const { skillId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const skills = useQuery(skillsQueryOptions(user.uid));
  const skill = skills.data?.find((candidate) => candidate.id === skillId);
  const placement = skill?.placement ?? null;

  const progress = useQuery({
    queryKey: assessmentQueryKey(skillId),
    queryFn: () => startAssessment(skillId),
    enabled: skills.isSuccess && skill !== undefined && placement === null,
    staleTime: Infinity,
    retry: false,
  });

  const answer = useMutation({
    mutationFn: (body: Parameters<typeof submitAnswer>[1]) => submitAnswer(skillId, body),
    onSuccess: (next: AssessmentProgress) => {
      queryClient.setQueryData(assessmentQueryKey(skillId), next);
    },
  });

  const complete = useMutation({
    mutationFn: () => completeAssessment(skillId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillsQueryKey(user.uid) }),
  });

  const finished = progress.data?.finished === true;
  const { mutate: runCompletion, isIdle: completionIdle } = complete;
  useEffect(() => {
    if (finished && completionIdle) runCompletion();
  }, [finished, completionIdle, runCompletion]);

  const result = complete.data ?? placement;

  return (
    <section aria-labelledby="assessment-title" className="space-y-6">
      <div>
        <Link to="/today" className="text-sm font-medium text-brand-700 hover:underline">
          {t('assessment.backToToday')}
        </Link>
        <h1 id="assessment-title" className="mt-2 text-3xl font-bold tracking-tight">
          {t('assessment.title', { skill: skill?.answers.skill ?? '' })}
        </h1>
      </div>

      {skills.isSuccess && !skill && <p>{t('assessment.notFound')}</p>}

      {result && <PlacementResultView result={result} />}

      {!result && progress.isPending && skill && (
        <p role="status" className="text-stone-600">
          {t('assessment.preparing')}
        </p>
      )}
      {!result && progress.isError && (
        <ProblemMessage error={progress.error} onRetry={() => void progress.refetch()} />
      )}

      {!result && progress.data && !finished && progress.data.question && (
        <>
          <p className="text-sm text-stone-600">
            {t('assessment.progress', {
              answered: progress.data.answered,
              total: progress.data.maxQuestions,
            })}
          </p>
          <QuestionCard
            key={progress.data.question.id}
            question={progress.data.question}
            number={progress.data.answered + 1}
            pending={answer.isPending}
            focusOnMount={progress.data.answered > 0}
            onAnswer={(body) => {
              answer.mutate(body);
            }}
          />
          {answer.isError && (
            <p role="alert" className="text-sm text-red-700">
              {t('assessment.answerFailed')}
            </p>
          )}
        </>
      )}

      {!result && finished && complete.isPending && (
        <p role="status" className="text-stone-600">
          {t('assessment.grading')}
        </p>
      )}
      {!result && complete.isError && (
        <ProblemMessage
          error={complete.error}
          onRetry={() => {
            complete.reset();
          }}
        />
      )}
    </section>
  );
}
