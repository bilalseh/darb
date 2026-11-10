import type { LocalizedText } from '@darb/shared';
import { useTranslation } from 'react-i18next';

import { isAppLanguage, type AppLanguage } from '../i18n';

/** Tests come in both languages. Stored before that, a text may still be a plain string, which
is shown as it is in either language. */
export type Localizable = LocalizedText | string;

export function inLanguage(text: Localizable, language: AppLanguage): string {
  return typeof text === 'string' ? text : text[language];
}

/** The app's language, re-rendering the caller when it changes. */
export function useAppLanguage(): AppLanguage {
  const { i18n } = useTranslation();
  return isAppLanguage(i18n.language) ? i18n.language : 'en';
}

export function useLocalized(): (text: Localizable) => string {
  const language = useAppLanguage();
  return (text) => inLanguage(text, language);
}
