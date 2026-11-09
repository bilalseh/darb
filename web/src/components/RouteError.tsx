import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function RouteError({ reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();

  function retry() {
    reset();
    void router.invalidate();
  }

  return (
    <section role="alert" aria-labelledby="route-error-title" className="max-w-xl">
      <h1 id="route-error-title" className="text-3xl font-bold tracking-tight">
        {t('error.title')}
      </h1>
      <p className="mt-3 text-stone-600">{t('error.body')}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
      >
        {t('error.retry')}
      </button>
    </section>
  );
}
