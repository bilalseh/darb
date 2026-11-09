import { useTranslation } from 'react-i18next';

import type { OnboardingField } from '../formSchema';

interface FieldErrorProps {
  id: string;
  field: OnboardingField;
  show: boolean;
}

/** One friendly message per field, whatever rule failed, so every message can be translated. */
export function FieldError({ id, field, show }: FieldErrorProps) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-red-700">
      {t(`onboarding.errors.${field}`)}
    </p>
  );
}
