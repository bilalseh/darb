import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SubskillRadar } from '../../features/assessment/SubskillRadar';
import { BadgeList } from '../../features/progress/BadgeList';
import { formatDuration, progressQueryOptions } from '../../features/progress/progressApi';
import { QuizScoreChart } from '../../features/progress/QuizScoreChart';

export const Route = createFileRoute('/_app/progress')({
  component: ProgressPage,
});

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-3xl font-bold text-brand-700 tabular-nums">{value}</p>
      <p className="text-sm text-stone-600">{label}</p>
    </div>
  );
}

function ProgressPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const progress = useQuery(progressQueryOptions(user.uid));

  if (progress.isPending) return <p role="status">{t('progress.loading')}</p>;
  if (progress.isError) return <p role="alert">{t('progress.loadError')}</p>;
  const { stats, badges, quizzes, skills } = progress.data;
  const studied = formatDuration(stats.minutesStudied);

  return (
    <section aria-labelledby="progress-title" className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="progress-title" className="text-3xl font-bold tracking-tight">
          {t('nav.progress')}
        </h1>
        <Link
          to="/progress/summary"
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
        >
          {t('progress.exportSummary')}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Tile value={String(stats.streak)} label={t('progress.currentStreak')} />
        <Tile value={String(stats.longestStreak)} label={t('progress.longestStreak')} />
        <Tile value={t('progress.duration', studied)} label={t('progress.timeStudied')} />
        <Tile value={String(stats.lessonsDone)} label={t('progress.lessonsDone')} />
      </div>

      <section aria-labelledby="badges-title">
        <h2 id="badges-title" className="mb-3 text-xl font-semibold">
          {t('progress.badgesTitle')}
        </h2>
        <BadgeList earned={badges} />
      </section>

      <section aria-labelledby="quizzes-title">
        <h2 id="quizzes-title" className="mb-3 text-xl font-semibold">
          {t('progress.quizzesTitle')}
        </h2>
        {quizzes.length === 0 ? (
          <p className="text-stone-600">{t('progress.noQuizzes')}</p>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <QuizScoreChart points={quizzes} />
          </div>
        )}
      </section>

      {skills.map((skill) => {
        const percent = skill.lessonsTotal
          ? Math.round((100 * skill.lessonsDone) / skill.lessonsTotal)
          : 0;
        return (
          <section
            key={skill.skillId}
            aria-labelledby={`skill-${skill.skillId}`}
            className="rounded-lg border border-stone-200 bg-white p-4"
          >
            <h2 id={`skill-${skill.skillId}`} className="text-xl font-semibold">
              <bdi>{skill.skill}</bdi>
              {skill.level && (
                <span className="ms-2 text-sm font-medium text-brand-800">
                  {t(`assessment.levels.${skill.level}`)}
                </span>
              )}
            </h2>
            <p id={`skill-${skill.skillId}-progress`} className="mt-2 text-sm text-stone-600">
              {t('progress.lessonsOf', { done: skill.lessonsDone, total: skill.lessonsTotal })}
            </p>
            <div
              role="progressbar"
              aria-labelledby={`skill-${skill.skillId}-progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200"
            >
              <div
                className="h-full rounded-full bg-brand-700"
                style={{ width: `${String(percent)}%` }}
              />
            </div>
            {skill.startingSubskills.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">{t('progress.startingPoint')}</h3>
                <SubskillRadar scores={skill.startingSubskills} />
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
