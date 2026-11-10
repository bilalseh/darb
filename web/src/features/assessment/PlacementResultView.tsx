import type { PlacementResult } from '@darb/shared';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useLocalized } from '../../lib/localized';
import { SubskillRadar } from './SubskillRadar';

interface PlacementResultViewProps {
  result: PlacementResult;
  skillId: string;
}

export function PlacementResultView({ result, skillId }: PlacementResultViewProps) {
  const { t } = useTranslation();
  const local = useLocalized();

  return (
    <section aria-labelledby="placement-title" className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
          {t('assessment.resultEyebrow')}
        </p>
        <h2 id="placement-title" className="mt-1 text-3xl font-bold tracking-tight">
          {t(`assessment.levels.${result.level}`)}
        </h2>
        <p dir="auto" className="mt-3 text-stone-700">
          {local(result.summary)}
        </p>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="font-semibold">{t('assessment.radarTitle')}</h3>
        <SubskillRadar scores={result.subskills} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/plan"
          search={{ skill: skillId }}
          className="inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          {t('assessment.buildPlan')}
        </Link>
        <Link to="/today" className="text-sm font-semibold text-brand-700 hover:underline">
          {t('assessment.backToToday')}
        </Link>
      </div>
    </section>
  );
}
