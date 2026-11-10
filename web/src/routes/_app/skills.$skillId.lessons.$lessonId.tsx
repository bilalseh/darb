import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { aiProblem } from '../../features/assessment/assessmentApi';
import {
  completeLesson,
  lessonContentQueryOptions,
  statsQueryKey,
} from '../../features/lesson/lessonApi';
import { TutorChat } from '../../features/lesson/TutorChat';
import { allLessons, planQueryKey, planQueryOptions } from '../../features/plan/planApi';
import {
  useLessonTranslation,
  usePlanTranslations,
} from '../../features/translation/translationApi';
import { TranslationStatus } from '../../features/translation/TranslationStatus';

export const Route = createFileRoute('/_app/skills/$skillId/lessons/$lessonId')({
  component: LessonPage,
});

function LessonPage() {
  const { t } = useTranslation();
  const { skillId, lessonId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const plan = useQuery(planQueryOptions(user.uid, skillId));
  const lesson = plan.data ? allLessons(plan.data).find((l) => l.id === lessonId) : undefined;
  const content = useQuery({ ...lessonContentQueryOptions(skillId, lessonId), enabled: !!lesson });
  const planText = usePlanTranslations([{ skillId, plan: plan.data }]);
  const lessonText = useLessonTranslation(skillId, lessonId, content.data);
  const translation = {
    tr: lessonText.tr,
    translating: planText.translating || lessonText.translating,
    failed: planText.failed || lessonText.failed,
    retry: () => {
      planText.retry();
      lessonText.retry();
    },
  };
  const tr = lessonText.tr;

  const complete = useMutation({
    mutationFn: () => completeLesson(skillId, lessonId),
    onSuccess: async (updated) => {
      queryClient.setQueryData(planQueryKey(user.uid, skillId), updated);
      await queryClient.invalidateQueries({ queryKey: statsQueryKey(user.uid) });
    },
  });

  if (plan.isPending) return <p role="status">{t('plan.loading')}</p>;
  if (!lesson) return <p>{t('lesson.notFound')}</p>;
  const done = lesson.status === 'done';

  return (
    <article aria-labelledby="lesson-title" className="max-w-3xl space-y-6">
      <div>
        <Link to="/today" className="text-sm font-medium text-brand-700 hover:underline">
          {t('assessment.backToToday')}
        </Link>
        <p className="mt-2 text-sm text-stone-600">
          {t(`plan.kinds.${lesson.kind}`)} · {t('plan.minutes', { count: lesson.minutes })}
        </p>
        <h1 id="lesson-title" className="text-3xl font-bold tracking-tight">
          <bdi>{planText.tr(lesson.title)}</bdi>
        </h1>
        <p className="mt-2 text-lg text-stone-700">
          <bdi>{planText.tr(lesson.objective)}</bdi>
        </p>
      </div>
      <TranslationStatus translation={translation} />

      {content.isPending && <p role="status">{t('lesson.writing')}</p>}
      {content.isError && (
        <div role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-amber-900">
          <p>{t(`assessment.problems.${aiProblem(content.error)}`)}</p>
          <button
            type="button"
            onClick={() => void content.refetch()}
            className="mt-2 font-semibold underline"
          >
            {t('today.retry')}
          </button>
        </div>
      )}

      {content.data && (
        <>
          <section aria-labelledby="explanation-title" className="space-y-3">
            <h2 id="explanation-title" className="text-xl font-semibold">
              {t('lesson.explanation')}
            </h2>
            {/* Plain paragraphs only: AI text is never rendered as HTML. */}
            {tr(content.data.explanation)
              .split(/\n\s*\n/)
              .map((paragraph, index) => (
                <p key={index} dir="auto" className="leading-relaxed text-stone-800">
                  {paragraph}
                </p>
              ))}
          </section>
          <section
            aria-labelledby="exercise-title"
            className="rounded-lg border border-brand-100 bg-brand-50 p-4"
          >
            <h2 id="exercise-title" className="font-semibold">
              {t('lesson.exercise')}
            </h2>
            <p dir="auto" className="mt-1 text-stone-800">
              {tr(content.data.exercise)}
            </p>
          </section>
          <section aria-labelledby="resources-title">
            <h2 id="resources-title" className="text-xl font-semibold">
              {t('lesson.resources')}
            </h2>
            <ul className="mt-2 space-y-1">
              {content.data.resources.map((resource) => (
                <li key={resource.url}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-700 underline"
                  >
                    <bdi>{tr(resource.title)}</bdi>
                  </a>{' '}
                  <span className="text-sm text-stone-600">
                    ({t(`lesson.resourceKinds.${resource.kind}`)})
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <TutorChat skillId={skillId} lessonId={lessonId} messages={content.data.tutor} tr={tr} />
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={done || complete.isPending}
          onClick={() => {
            complete.mutate();
          }}
          className="rounded-md bg-brand-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {done
            ? t('lesson.done')
            : complete.isPending
              ? t('assessment.saving')
              : t('lesson.markDone')}
        </button>
        {complete.isError && (
          <p role="alert" className="text-sm text-red-700">
            {t('lesson.completeFailed')}
          </p>
        )}
      </div>
    </article>
  );
}
