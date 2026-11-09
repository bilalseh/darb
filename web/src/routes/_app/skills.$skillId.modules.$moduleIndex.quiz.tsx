import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { aiProblem } from '../../features/assessment/assessmentApi';
import {
  dueReviewsQueryKey,
  startModuleQuiz,
  submitModuleQuiz,
} from '../../features/review/reviewApi';

export const Route = createFileRoute('/_app/skills/$skillId/modules/$moduleIndex/quiz')({
  component: ModuleQuizPage,
});

function ModuleQuizPage() {
  const { t } = useTranslation();
  const { skillId, moduleIndex } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const module = Number(moduleIndex);
  const quiz = useQuery({
    queryKey: ['moduleQuiz', skillId, module],
    queryFn: () => startModuleQuiz(skillId, module),
    staleTime: Infinity,
    retry: false,
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const submit = useMutation({
    mutationFn: (chosen: number[]) => submitModuleQuiz(skillId, module, chosen),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dueReviewsQueryKey(user.uid) }),
  });

  const questions = quiz.data?.questions ?? [];
  const complete = questions.length > 0 && questions.every((q) => q.id in answers);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (complete) submit.mutate(questions.map((q) => answers[q.id] ?? 0));
  }

  return (
    <section aria-labelledby="quiz-title" className="max-w-2xl space-y-6">
      <div>
        <Link
          to="/plan"
          search={{ skill: skillId }}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          {t('quiz.backToPlan')}
        </Link>
        <h1 id="quiz-title" className="mt-2 text-3xl font-bold tracking-tight">
          <Trans
            i18nKey="quiz.title"
            values={{ module: quiz.data?.title ?? '' }}
            components={{ bdi: <bdi /> }}
          />
        </h1>
      </div>
      {quiz.isPending && <p role="status">{t('quiz.preparing')}</p>}
      {quiz.isError && (
        <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-amber-900">
          {t(`assessment.problems.${aiProblem(quiz.error)}`)}
        </p>
      )}

      {submit.data ? (
        <div className="space-y-4">
          <p role="status" className="text-2xl font-bold">
            {t('quiz.score', { score: submit.data.score })}
          </p>
          <p className="text-stone-700">
            {t('quiz.addedToReview', { count: submit.data.addedToReview })}
          </p>
          <ol className="space-y-3">
            {submit.data.results.map((result) => (
              <li key={result.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="font-medium">
                  <bdi>{result.prompt}</bdi>
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${result.correct ? 'text-emerald-800' : 'text-red-800'}`}
                >
                  {result.correct ? (
                    t('review.right')
                  ) : (
                    <Trans
                      i18nKey="quiz.yourAnswer"
                      values={{ answer: result.options[result.chosen] ?? '' }}
                      components={{ bdi: <bdi /> }}
                    />
                  )}
                </p>
                {!result.correct && (
                  <p className="text-sm">
                    <Trans
                      i18nKey="quiz.correctWas"
                      values={{ answer: result.options[result.correctOption] ?? '' }}
                      components={{ bdi: <bdi /> }}
                    />
                  </p>
                )}
                <p dir="auto" className="mt-1 text-sm text-stone-600">
                  {result.explanation}
                </p>
              </li>
            ))}
          </ol>
          <Link
            to="/review"
            className="inline-flex rounded-md bg-brand-700 px-4 py-2 font-semibold text-white"
          >
            {t('quiz.goToReview')}
          </Link>
        </div>
      ) : (
        quiz.data && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map((question, number) => (
              <fieldset
                key={question.id}
                className="rounded-lg border border-stone-200 bg-white p-4"
              >
                <legend className="px-1 font-medium">
                  {number + 1}. <bdi>{question.prompt}</bdi>
                </legend>
                <div className="mt-2 grid gap-2">
                  {question.options.map((option, index) => (
                    <label key={option} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === index}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: index }));
                        }}
                        className="size-4 accent-brand-700"
                      />
                      <bdi>{option}</bdi>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="submit"
              disabled={!complete || submit.isPending}
              className="rounded-md bg-brand-700 px-5 py-2 font-semibold text-white disabled:opacity-60"
            >
              {submit.isPending ? t('assessment.saving') : t('quiz.submit')}
            </button>
          </form>
        )
      )}
    </section>
  );
}
