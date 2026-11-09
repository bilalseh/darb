import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { UserMenu } from '../../features/auth/UserMenu';
import { useAuthUser } from '../../features/auth/useAuthUser';

const NAV_ITEMS = [
  { to: '/today', labelKey: 'nav.today' },
  { to: '/plan', labelKey: 'nav.plan' },
  { to: '/review', labelKey: 'nav.review' },
  { to: '/progress', labelKey: 'nav.progress' },
] as const;

export function SiteHeader() {
  const { t } = useTranslation();
  const user = useAuthUser();

  return (
    <header className="border-b border-stone-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link
          to="/"
          className="flex items-baseline gap-2 rounded-md text-xl font-bold text-brand-700"
        >
          <span>Darb</span>
          <span lang="ar" dir="rtl" className="text-base font-semibold text-brand-600">
            درب
          </span>
        </Link>
        {user && (
          <nav aria-label={t('nav.label')} className="order-last w-full sm:order-none sm:w-auto">
            <ul className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    activeProps={{ className: 'bg-brand-50 text-brand-800' }}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <UserMenu />
      </div>
    </header>
  );
}
