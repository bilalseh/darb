import type { Plan, PlanLesson } from '@darb/shared';
import { useTranslation } from 'react-i18next';

import { addDaysIso, formatDayLabel, formatLocalDate, mondayOfIso } from '../../lib/dates';
import { allLessons } from './planApi';

const WEEKS_SHOWN = 4;

interface PlanCalendarProps {
  plan: Plan;
  today: string;
  onMove: (lessonId: string, scheduledDate: string) => void;
}

function LessonChip({
  lesson,
  moveDays,
  onMove,
}: {
  lesson: PlanLesson;
  moveDays: string[];
  onMove: PlanCalendarProps['onMove'];
}) {
  const { t, i18n } = useTranslation();
  const done = lesson.status === 'done';
  const selectId = `move-${lesson.id}`;

  return (
    <li
      draggable={!done}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', lesson.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      className={`rounded-md border px-2 py-1.5 text-sm ${
        done
          ? 'border-stone-200 bg-stone-50 text-stone-500'
          : 'cursor-grab border-brand-100 bg-brand-50 text-stone-900'
      }`}
    >
      <p className="font-medium">
        {done && <span className="sr-only">{t('plan.doneLabel')} </span>}
        {done && <span aria-hidden="true">✓ </span>}
        {lesson.title}
      </p>
      <p className="text-xs text-stone-600">{t('plan.minutes', { count: lesson.minutes })}</p>
      {!done && (
        <div className="mt-1">
          <label htmlFor={selectId} className="sr-only">
            {t('plan.moveLabel', { title: lesson.title })}
          </label>
          <select
            id={selectId}
            value={lesson.scheduledDate}
            onChange={(event) => {
              onMove(lesson.id, event.target.value);
            }}
            className="w-full rounded border border-stone-300 bg-white px-1 py-0.5 text-xs"
          >
            {[lesson.scheduledDate, ...moveDays.filter((day) => day !== lesson.scheduledDate)]
              .sort()
              .map((day) => (
                <option key={day} value={day}>
                  {formatLocalDate(day, i18n.language)}
                </option>
              ))}
          </select>
        </div>
      )}
    </li>
  );
}

/** The next four weeks. Drag a lesson to another day, or use its "Move to" list (keyboard, touch). */
export function PlanCalendar({ plan, today, onMove }: PlanCalendarProps) {
  const { t, i18n } = useTranslation();
  const lastPlanDay = addDaysIso(plan.weeks.at(-1)?.startDate ?? today, 6);
  const firstShown = mondayOfIso(today);
  const lastShown = addDaysIso(firstShown, WEEKS_SHOWN * 7 - 1);
  const lastMoveDay = lastPlanDay < lastShown ? lastPlanDay : lastShown;
  const moveDays: string[] = [];
  for (let day = today; day <= lastMoveDay; day = addDaysIso(day, 1)) moveDays.push(day);

  const byDay = new Map<string, PlanLesson[]>();
  for (const lesson of allLessons(plan)) {
    byDay.set(lesson.scheduledDate, [...(byDay.get(lesson.scheduledDate) ?? []), lesson]);
  }

  return (
    <div className="space-y-6">
      {Array.from({ length: WEEKS_SHOWN }, (_, week) => {
        const weekStart = addDaysIso(firstShown, week * 7);
        if (weekStart > lastPlanDay) return null;
        return (
          <section
            key={weekStart}
            aria-label={t('plan.weekOf', { date: formatLocalDate(weekStart, i18n.language) })}
          >
            <h3 className="mb-2 text-sm font-semibold text-stone-700">
              {t('plan.weekOf', { date: formatLocalDate(weekStart, i18n.language) })}
            </h3>
            <ol className="grid gap-2 sm:grid-cols-7">
              {Array.from({ length: 7 }, (_, offset) => {
                const day = addDaysIso(weekStart, offset);
                const lessons = byDay.get(day) ?? [];
                const canDrop = day >= today && day <= lastPlanDay;
                return (
                  <li
                    key={day}
                    onDragOver={(event) => {
                      if (canDrop) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const lessonId = event.dataTransfer.getData('text/plain');
                      if (canDrop && lessonId) onMove(lessonId, day);
                    }}
                    className={`min-h-20 rounded-lg border p-2 ${
                      day === today
                        ? 'border-brand-600 bg-white'
                        : day < today
                          ? 'border-stone-200 bg-stone-50'
                          : 'border-stone-200 bg-white'
                    } ${lessons.length === 0 ? 'hidden sm:block' : ''}`}
                  >
                    <p className="mb-1 text-xs font-semibold text-stone-600">
                      {formatDayLabel(day, i18n.language)}
                      {day === today && ` · ${t('plan.today')}`}
                    </p>
                    <ul className="space-y-1.5">
                      {lessons.map((lesson) => (
                        <LessonChip
                          key={lesson.id}
                          lesson={lesson}
                          moveDays={moveDays}
                          onMove={onMove}
                        />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
