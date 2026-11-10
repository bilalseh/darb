import type { Plan, WeekAdjustment } from '@darb/shared';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { addDaysIso, formatLocalDate } from '../../lib/dates';
import type { Translate } from '../translation/translationApi';

interface RoadmapProps {
  plan: Plan;
  today: string;
  pendingWeek: number | null;
  onRegenerate: (weekIndex: number, adjust: WeekAdjustment) => void;
  /** Shows plan texts in the app's language; as written when left out. */
  tr?: Translate;
}

const ADJUSTMENTS: readonly WeekAdjustment[] = ['same', 'easier', 'harder'];
const asWritten: Translate = (text) => text;

export function Roadmap({ plan, today, pendingWeek, onRegenerate, tr = asWritten }: RoadmapProps) {
  const { t, i18n } = useTranslation();

  return (
    <ol className="space-y-4">
      {plan.modules.map((module, moduleIndex) => {
        const weeks = plan.weeks.filter((week) => week.moduleIndex === moduleIndex);
        const current = weeks.some(
          (week) => week.startDate <= today && today <= addDaysIso(week.startDate, 6),
        );
        return (
          <li key={moduleIndex} className="rounded-lg border border-stone-200 bg-white">
            <details open={current || moduleIndex === 0}>
              <summary className="cursor-pointer px-4 py-3">
                <span className="font-semibold">
                  <bdi>{tr(module.title)}</bdi>
                </span>
                <span className="block text-sm text-stone-600">
                  <bdi>{tr(module.summary)}</bdi>
                </span>
              </summary>
              <ol className="divide-y divide-stone-100 border-t border-stone-100">
                {weeks.map((week) => {
                  const weekEnd = addDaysIso(week.startDate, 6);
                  const isPast = weekEnd < today;
                  const done = week.lessons.filter((lesson) => lesson.status === 'done').length;
                  return (
                    <li key={week.index} className="px-4 py-3">
                      <h3 className="font-medium">
                        {t('plan.weekNumber', { number: week.index + 1 })}
                        <span className="ms-2 text-sm font-normal text-stone-600">
                          <bdi>{formatLocalDate(week.startDate, i18n.language)}</bdi> ·{' '}
                          <bdi>{t('plan.progress', { done, total: week.lessons.length })}</bdi>
                        </span>
                      </h3>
                      <p className="mt-1 text-sm text-stone-700">
                        <bdi>{tr(week.goal)}</bdi>
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {week.lessons.map((lesson) => (
                          <li key={lesson.id} className="flex flex-wrap gap-x-2">
                            <span aria-hidden="true">{lesson.status === 'done' ? '✓' : '○'}</span>
                            <span className="sr-only">
                              {lesson.status === 'done' ? t('plan.doneLabel') : t('plan.todoLabel')}
                            </span>
                            <bdi className="font-medium">{tr(lesson.title)}</bdi>
                            <span className="text-stone-600">
                              {t(`plan.kinds.${lesson.kind}`)} ·{' '}
                              {t('plan.minutes', { count: lesson.minutes })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {!isPast && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ADJUSTMENTS.map((adjust) => (
                            <button
                              key={adjust}
                              type="button"
                              disabled={pendingWeek !== null}
                              onClick={() => {
                                onRegenerate(week.index, adjust);
                              }}
                              className="rounded-md border border-stone-300 px-3 py-1 text-sm font-medium hover:bg-stone-50 disabled:opacity-60"
                            >
                              {pendingWeek === week.index && adjust === 'same'
                                ? t('plan.regenerating')
                                : t(`plan.adjust.${adjust}`, { number: week.index + 1 })}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
              <div className="border-t border-stone-100 px-4 py-3">
                <Link
                  to="/skills/$skillId/modules/$moduleIndex/quiz"
                  params={{ skillId: plan.skillId, moduleIndex: String(moduleIndex) }}
                  className="text-sm font-semibold text-brand-700 hover:underline"
                >
                  {t('quiz.take')}
                </Link>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
