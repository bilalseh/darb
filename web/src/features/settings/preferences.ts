import type { Preferences, Profile } from '@darb/shared';
import type { QueryClient } from '@tanstack/react-query';

import { currentLanguage, type AppLanguage } from '../../i18n';
import { apiPut } from '../../lib/apiClient';
import { profileQueryOptions } from '../auth/profileQuery';

export type FullPreferences = Required<Preferences>;

/** Defaults match the API's, for profiles stored before preferences existed. */
export function preferencesOf(profile: Profile): FullPreferences {
  return {
    language: profile.preferences?.language ?? 'en',
    checkinReminders: profile.preferences?.checkinReminders ?? true,
    reviewReminders: profile.preferences?.reviewReminders ?? true,
  };
}

/** Saves the preferences and updates the cached profile with the API's answer. */
export async function savePreferences(
  queryClient: QueryClient,
  uid: string,
  preferences: FullPreferences,
): Promise<Profile> {
  const profile = await apiPut<Profile>('/me/preferences', preferences);
  queryClient.setQueryData(profileQueryOptions(uid).queryKey, profile);
  return profile;
}

/** The AI writes in the language the learner uses the app in, so the profile follows the UI. */
export async function syncLanguage(
  queryClient: QueryClient,
  uid: string,
  profile: Profile,
  language: AppLanguage = currentLanguage(),
): Promise<void> {
  const preferences = preferencesOf(profile);
  if (preferences.language === language) return;
  await savePreferences(queryClient, uid, { ...preferences, language });
}
