import type { PlacementResult } from '@darb/shared';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SubskillRadar } from './SubskillRadar';

export function PlacementResultView({ result }: { result: PlacementResult }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="placement-title" className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
          {t('assessment.resultEyebrow')}
        </p>
        <h2 id="placement-title" className="mt-1 text-3xl font-bold tracking-tight">
          {t(`assessment.levels.${result.level}`)}
        </h2>
        <p className="mt-3 text-stone-700">{result.summary}</p>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="font-semibold">{t('assessment.radarTitle')}</h3>
        <SubskillRadar scores={result.subskills} />
      </div>
      <Link
        to="/today"
        className="inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {t('assessment.backToToday')}
      </Link>
    </section>
  );
}
