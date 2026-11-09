import type { Skill } from '@darb/shared';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { formatLocalDate } from '../../lib/dates';

export function SkillCard({ skill }: { skill: Skill }) {
  const { t, i18n } = useTranslation();
  const { answers, placement } = skill;

  return (
    <article className="flex flex-col rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{answers.skill}</h3>
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
      <Link
        to="/skills/$skillId/assessment"
        params={{ skillId: skill.id }}
        className="mt-4 self-start text-sm font-semibold text-brand-700 hover:underline"
      >
        {placement
          ? t('today.seePlacement', { skill: answers.skill })
          : t('today.takePlacement', { skill: answers.skill })}
      </Link>
    </article>
  );
}
