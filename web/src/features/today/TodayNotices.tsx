import type { Plan, Skill } from '@darb/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { formatLocalDate, todayLocalIso } from '../../lib/dates';
import { syncQueryOptions } from '../checkin/checkinApi';

interface TodayNoticesProps {
  uid: string;
  plans: { skill: Skill; plan: Plan }[];
}

/** Explains automatic changes (moved lessons) and offers due weekly check-ins. */
export function TodayNotices({ uid, plans }: TodayNoticesProps) {
  const { t, i18n } = useTranslation();
  const today = todayLocalIso();
  const sync = useQuery(syncQueryOptions(uid));
  const due = sync.data?.checkinsDue ?? [];

  return (
    <>
      {plans.map(({ skill, plan }) => {
        const notice = plan.lastReschedule;
        if (notice?.on !== today || notice.moves.length === 0) return null;
        return (
          <section
            key={`moved-${skill.id}`}
            role="status"
            className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-950"
          >
            <h2 className="font-semibold">
              {t('checkin.rescheduledTitle', { count: notice.moves.length })}
            </h2>
            <p className="text-sm">{t('checkin.rescheduledBody')}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {notice.moves.map((move) => (
                <li key={move.lessonId}>
                  <Link
                    to="/skills/$skillId/lessons/$lessonId"
                    params={{ skillId: skill.id, lessonId: move.lessonId }}
                    className="underline"
                  >
                    {t('checkin.moved', {
                      title: move.title,
                      date: formatLocalDate(move.toDate, i18n.language),
                    })}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {due.map((item) => {
        const skill = plans.find((entry) => entry.skill.id === item.skillId)?.skill;
        if (!skill) return null;
        return (
          <section
            key={`checkin-${item.skillId}`}
            aria-labelledby={`checkin-${item.skillId}`}
            className="rounded-lg border border-brand-100 bg-brand-50 p-4"
          >
            <h2 id={`checkin-${item.skillId}`} className="font-semibold">
              {t('checkin.dueTitle')}
            </h2>
            <p className="text-sm text-stone-700">
              {t('checkin.dueBody', { skill: skill.answers.skill })}
            </p>
            <Link
              to="/skills/$skillId/checkin"
              params={{ skillId: skill.id }}
              className="mt-2 inline-flex text-sm font-semibold text-brand-700 underline"
            >
              {t('checkin.dueCta')}
            </Link>
          </section>
        );
      })}
    </>
  );
}
