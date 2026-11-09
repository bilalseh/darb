import type { Skill } from '@darb/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';

import { formatLocalDate } from '../../lib/dates';
import { planQueryOptions } from '../plan/planApi';

export function SkillCard({ uid, skill }: { uid: string; skill: Skill }) {
  const { t, i18n } = useTranslation();
  const { answers, placement } = skill;
  // Same query as Today's lessons, so this reads from the cache.
  const plan = useQuery({ ...planQueryOptions(uid, skill.id), enabled: Boolean(placement) });
  const needsPlan = Boolean(placement) && plan.isSuccess && plan.data === null;

  return (
    <article className="flex flex-col rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">
          <bdi>{answers.skill}</bdi>
        </h3>
        {placement && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
            {t(`assessment.levels.${placement.level}`)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {t('today.hoursPerWeek', { count: answers.hoursPerWeek })}
      </p>
      {answers.targetDate && (
        <p className="mt-1 text-sm text-stone-600">
          {t('today.goalDate', { date: formatLocalDate(answers.targetDate, i18n.language) })}
        </p>
      )}
      {needsPlan && (
        <Link
          to="/plan"
          search={{ skill: skill.id }}
          className="mt-4 self-start rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          {t('today.createPlan')}
        </Link>
      )}
      <Link
        to="/skills/$skillId/assessment"
        params={{ skillId: skill.id }}
        className="mt-4 self-start text-sm font-semibold text-brand-700 hover:underline"
      >
        <Trans
          i18nKey={placement ? 'today.seePlacement' : 'today.takePlacement'}
          values={{ skill: answers.skill }}
          components={{ bdi: <bdi /> }}
        />
      </Link>
    </article>
  );
}
