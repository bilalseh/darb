import { useTranslation } from 'react-i18next';

import type { Translated } from './translationApi';

/** Says when shown texts are still being translated, or could not be. */
export function TranslationStatus({ translation }: { translation: Translated }) {
  const { t } = useTranslation();
  if (translation.translating) {
    return (
      <p role="status" className="text-sm text-stone-600">
        {t('translation.pending')}
      </p>
    );
  }
  if (!translation.failed) return null;
  return (
    <p role="status" className="text-sm text-amber-900">
      {t('translation.failed')}{' '}
      <button type="button" onClick={translation.retry} className="font-semibold underline">
        {t('translation.retry')}
      </button>
    </p>
  );
}
