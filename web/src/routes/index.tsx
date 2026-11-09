import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SignInPanel } from '../features/auth/SignInPanel';
import { useAuthUser } from '../features/auth/useAuthUser';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const user = useAuthUser();
  const navigate = useNavigate();

  return (
    <section aria-labelledby="home-title" className="max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
        {t('home.eyebrow')}
      </p>
      <h1
        id="home-title"
        className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl"
      >
        {t('home.title')}
      </h1>
      <p className="mt-4 text-lg text-stone-600">{t('home.subtitle')}</p>
      <div className="mt-8">
        {user ? (
          <Link
            to="/today"
            className="inline-flex rounded-md bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800"
          >
            {t('home.goToToday')}
          </Link>
        ) : (
          <SignInPanel onSignedIn={() => void navigate({ to: '/today' })} />
        )}
      </div>
      <p className="mt-10 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t('home.previewNotice')}
      </p>
    </section>
  );
}
