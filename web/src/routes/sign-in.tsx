import {
  createFileRoute,
  redirect,
  useNavigate,
  type SearchSchemaInput,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SignInPanel } from '../features/auth/SignInPanel';
import { safeRedirect } from '../lib/safeRedirect';
import { waitForAuth } from '../lib/session';

export const Route = createFileRoute('/sign-in')({
  // `redirect` is optional in links; anything unsafe or missing becomes /today.
  validateSearch: (search: { redirect?: unknown } & SearchSchemaInput) => ({
    redirect: safeRedirect(search.redirect),
  }),
  beforeLoad: async ({ search }) => {
    if (await waitForAuth()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router's redirect API
      throw redirect({ href: search.redirect });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  const { t } = useTranslation();
  const { redirect: target } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <section aria-labelledby="sign-in-title" className="max-w-xl">
      <h1 id="sign-in-title" className="text-3xl font-bold tracking-tight">
        {t('auth.signInTitle')}
      </h1>
      <p className="mt-3 text-stone-600">{t('auth.signInBody')}</p>
      <div className="mt-8">
        <SignInPanel onSignedIn={() => void navigate({ href: target })} />
      </div>
    </section>
  );
}
