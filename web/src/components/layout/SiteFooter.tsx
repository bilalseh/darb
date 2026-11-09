import { useTranslation } from 'react-i18next';

import { ApiStatus } from '../../features/health/ApiStatus';

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 text-sm text-stone-600">
        <p>{t('layout.footer', { year: new Date().getFullYear() })}</p>
        <ApiStatus />
      </div>
    </footer>
  );
}
