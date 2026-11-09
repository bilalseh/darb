import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuthUser } from '../../features/auth/useAuthUser';
import { profileQueryOptions } from '../../features/auth/profileQuery';
import { syncLanguage } from '../../features/settings/preferences';
import { currentLanguage } from '../../i18n';

/** Switches between English and Arabic; signed-in learners' AI content follows the choice. */
export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const user = useAuthUser();
  const queryClient = useQueryClient();
  const next = currentLanguage() === 'ar' ? 'en' : 'ar';

  async function handleClick() {
    await i18n.changeLanguage(next);
    if (!user) return;
    const profile = queryClient.getQueryData(profileQueryOptions(user.uid).queryKey);
    if (profile) await syncLanguage(queryClient, user.uid, profile, next).catch(() => undefined);
  }

  return (
    <button
      type="button"
      lang={next}
      onClick={() => void handleClick()}
      className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
    >
      {t('language.toggle')}
    </button>
  );
}
