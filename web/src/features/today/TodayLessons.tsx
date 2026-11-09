import type { PlanLesson, Skill } from '@darb/shared';
import { useQueries } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { formatLocalDate, todayLocalIso } from '../../lib/dates';
import { allLessons, planQueryOptions } from '../plan/planApi';
import { TodayNotices } from './TodayNotices';

interface DueLesson {
  skill: Skill;
  lesson: PlanLesson;
}

function LessonRow({ item, showDate }: { item: DueLesson; showDate: boolean }) {
  const { t, i18n } = useTranslation();
  return (
    <li>
      <Link
        to="/skills/$skillId/lessons/$lessonId"
        params={{ skillId: item.skill.id, lessonId: item.lesson.id }}
        className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 hover:border-brand-600"
      >
        <span>
          <span className="block font-medium">{item.lesson.title}</span>
          <span className="block text-sm text-stone-600">
            {item.skill.answers.skill} · {t(`plan.kinds.${item.lesson.kind}`)}
            {showDate && ` · ${formatLocalDate(item.lesson.scheduledDate, i18n.language)}`}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-stone-700">
          {t('plan.minutes', { count: item.lesson.minutes })}
        </span>
      </Link>
    </li>
  );
}

/** Today's lessons across all skills, plus missed ones to catch up on. */
export function TodayLessons({ uid, skills }: { uid: string; skills: Skill[] }) {
  const { t } = useTranslation();
  const today = todayLocalIso();
  const withPlans = skills.filter((skill) => skill.placement);
  const plans = useQueries({
    queries: withPlans.map((skill) => planQueryOptions(uid, skill.id)),
  });

  if (plans.some((plan) => plan.isPending)) {
    return <p role="status">{t('plan.loading')}</p>;
  }
  const due: DueLesson[] = [];
  const missed: DueLesson[] = [];
  plans.forEach((plan, index) => {
    const skill = withPlans[index];
    if (!plan.data || !skill) return;
    for (const lesson of allLessons(plan.data)) {
      if (lesson.status === 'done') continue;
      if (lesson.scheduledDate === today) due.push({ skill, lesson });
      else if (lesson.scheduledDate < today) missed.push({ skill, lesson });
    }
  });
  const totalMinutes = due.reduce((sum, item) => sum + item.lesson.minutes, 0);
  const withPlanData = plans.flatMap((plan, index) => {
    const skill = withPlans[index];
    return plan.data && skill ? [{ skill, plan: plan.data }] : [];
  });

  return (
    <div className="space-y-6">
      <TodayNotices uid={uid} plans={withPlanData} />
      <section aria-labelledby="due-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="due-title" className="text-xl font-semibold">
            {t('today.dueTitle')}
          </h2>
          {due.length > 0 && (
            <p className="text-sm text-stone-600">{t('today.estimate', { count: totalMinutes })}</p>
          )}
        </div>
        {due.length === 0 ? (
          <p className="mt-2 text-stone-600">{t('today.nothingDue')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {due.map((item) => (
              <LessonRow key={`${item.skill.id}-${item.lesson.id}`} item={item} showDate={false} />
            ))}
          </ul>
        )}
      </section>
      {missed.length > 0 && (
        <section aria-labelledby="missed-title">
          <h2 id="missed-title" className="text-xl font-semibold">
            {t('today.catchUpTitle')}
          </h2>
          <p className="text-sm text-stone-600">{t('today.catchUpBody')}</p>
          <ul className="mt-3 space-y-2">
            {missed.map((item) => (
              <LessonRow key={`${item.skill.id}-${item.lesson.id}`} item={item} showDate />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
