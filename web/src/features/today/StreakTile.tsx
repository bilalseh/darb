import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { statsQueryOptions } from '../lesson/lessonApi';

/** A hero number, not a chart: one figure with a plain-language label. */
export function StreakTile({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const stats = useQuery(statsQueryOptions(uid));
  if (!stats.data) return null;
  const { streak, activeToday } = stats.data;

  return (
    <section
      aria-labelledby="streak-title"
      className="flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-4"
    >
      <p className="text-4xl font-bold text-brand-700 tabular-nums" aria-hidden="true">
        {streak}
      </p>
      <div>
        <h2 id="streak-title" className="font-semibold">
          {t('today.streak', { count: streak })}
        </h2>
        <p className="text-sm text-stone-600">
          {activeToday ? t('today.activeToday') : t('today.keepStreak')}
        </p>
      </div>
    </section>
  );
}
