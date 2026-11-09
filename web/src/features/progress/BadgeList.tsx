import type { Badge } from '@darb/shared';
import { useTranslation } from 'react-i18next';

const ALL_BADGES: readonly Badge[] = [
  'first_lesson',
  'first_week',
  'first_quiz',
  'streak_7',
  'streak_30',
];

/** Earned and locked badges; each says its state in words, never by color alone. */
export function BadgeList({ earned }: { earned: readonly Badge[] }) {
  const { t } = useTranslation();

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ALL_BADGES.map((badge) => {
        const has = earned.includes(badge);
        return (
          <li
            key={badge}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              has ? 'border-brand-100 bg-brand-50' : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <span aria-hidden="true" className="text-2xl">
              {has ? '🏅' : '🔒'}
            </span>
            <span>
              <span className="block font-semibold text-stone-900">
                {t(`progress.badges.${badge}.title`)}
              </span>
              <span className="block text-sm">{t(`progress.badges.${badge}.hint`)}</span>
              <span className="block text-xs font-medium">
                {has ? t('progress.earned') : t('progress.locked')}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
