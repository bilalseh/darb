import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { signOut } from '../../lib/session';
import { useOnboardingStore } from '../onboarding/onboardingStore';
import { useAuthUser } from './useAuthUser';

export function UserMenu() {
  const { t } = useTranslation();
  const user = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link
        to="/sign-in"
        className="rounded-md px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
      >
        {t('auth.signIn')}
      </Link>
    );
  }

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    useOnboardingStore.getState().reset();
    await navigate({ to: '/' });
  }

  return (
    <div className="flex items-center gap-1 text-sm sm:gap-3">
      <span className="hidden font-medium text-stone-700 sm:inline">
        {user.isAnonymous ? t('auth.demoName') : (user.displayName ?? user.email)}
      </span>
      {user.isAnonymous && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
          {t('auth.demoBadge')}
        </span>
      )}
      <Link
        to="/settings"
        className="rounded-md px-3 py-2 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      >
        {t('settings.title')}
      </Link>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="rounded-md px-3 py-2 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      >
        {t('auth.signOut')}
      </button>
    </div>
  );
}
