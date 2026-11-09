import type { Skill } from '@darb/shared';
import { useTranslation } from 'react-i18next';

import { formatLocalDate } from '../../lib/dates';

export function SkillCard({ skill }: { skill: Skill }) {
  const { t, i18n } = useTranslation();
  const { answers } = skill;

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{answers.skill}</h3>
      <p className="mt-1 text-sm text-stone-600">
        {t(`onboarding.levels.${answers.level}.label`)} ·{' '}
        {t('today.hoursPerWeek', { count: answers.hoursPerWeek })}
      </p>
      {answers.targetDate && (
        <p className="mt-1 text-sm text-stone-600">
          {t('today.goalDate', { date: formatLocalDate(answers.targetDate, i18n.language) })}
        </p>
      )}
    </article>
  );
}
