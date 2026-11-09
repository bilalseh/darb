import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { formatDuration, progressQueryOptions } from '../../features/progress/progressApi';
import { formatLocalDate, todayLocalIso } from '../../lib/dates';

export const Route = createFileRoute('/_app/progress_/summary')({
  component: ProgressSummaryPage,
});

/** A certificate-style page for "Save as PDF" in the browser's print dialog. */
function ProgressSummaryPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = Route.useRouteContext();
  const progress = useQuery(progressQueryOptions(user.uid));

  if (!progress.data) return <p role="status">{t('progress.loading')}</p>;
  const { stats, badges, skills } = progress.data;
  const name = profile.isDemo ? t('auth.demoName') : (profile.displayName ?? profile.email ?? '');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link to="/progress" className="text-sm font-medium text-brand-700 hover:underline">
          {t('progress.backToProgress')}
        </Link>
        <button
          type="button"
          onClick={() => {
            window.print();
          }}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
        >
          {t('progress.print')}
        </button>
      </div>

      <article
        aria-labelledby="summary-title"
        className="mx-auto max-w-2xl rounded-xl border-4 border-double border-brand-700 bg-white p-8 text-center print:border-brand-700"
      >
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Darb · درب</p>
        <h1 id="summary-title" className="mt-4 text-3xl font-bold">
          {t('progress.summaryTitle')}
        </h1>
        <p className="mt-6 text-lg">{t('progress.summaryFor')}</p>
        <p className="text-2xl font-semibold">
          <bdi>{name}</bdi>
        </p>
        <ul className="mt-6 space-y-1">
          {skills.map((skill) => (
            <li key={skill.skillId}>
              <bdi>{skill.skill}</bdi>
              {skill.level && ` · ${t(`assessment.levels.${skill.level}`)}`} ·{' '}
              {t('progress.lessonsOf', { done: skill.lessonsDone, total: skill.lessonsTotal })}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          {t('progress.summaryStats', {
            time: t('progress.duration', formatDuration(stats.minutesStudied)),
            streak: stats.longestStreak,
            badges: badges.length,
          })}
        </p>
        <p className="mt-6 text-sm text-stone-600">
          {t('progress.issuedOn', { date: formatLocalDate(todayLocalIso(), i18n.language) })}
        </p>
        <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {t('progress.selfIssued')}
        </p>
      </article>
    </div>
  );
}
