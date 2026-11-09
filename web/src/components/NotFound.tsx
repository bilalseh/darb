import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="not-found-title" className="max-w-xl">
      <h1 id="not-found-title" className="text-3xl font-bold tracking-tight">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-stone-600">{t('notFound.body')}</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {t('notFound.home')}
      </Link>
    </section>
  );
}
