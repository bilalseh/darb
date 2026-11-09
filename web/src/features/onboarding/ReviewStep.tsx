import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { formatLocalDate } from '../../lib/dates';
import type { OnboardingFormInput } from './formSchema';
import type { StepId } from './steps';

export function ReviewStep({ onEdit }: { onEdit: (step: StepId) => void }) {
  const { t, i18n } = useTranslation();
  const { control } = useFormContext<OnboardingFormInput>();
  const values = useWatch({ control });
  const days = values.preferredDays ?? [];

  const rows: { step: StepId; label: string; value: string }[] = [
    { step: 'skill', label: t('onboarding.fields.skill'), value: values.skill ?? '' },
    {
      step: 'reason',
      label: t('onboarding.fields.reason'),
      value: values.reason ? t(`onboarding.reasons.${values.reason}.label`) : '',
    },
    {
      step: 'level',
      label: t('onboarding.fields.level'),
      value: values.level ? t(`onboarding.levels.${values.level}.label`) : '',
    },
    {
      step: 'schedule',
      label: t('onboarding.fields.hoursPerWeek'),
      value: t('today.hoursPerWeek', { count: values.hoursPerWeek ?? 0 }),
    },
    {
      step: 'schedule',
      label: t('onboarding.fields.preferredDays'),
      value: days.map((day) => t(`onboarding.days.${day}`)).join(', '),
    },
    {
      step: 'style',
      label: t('onboarding.fields.learningStyle'),
      value: values.learningStyle ? t(`onboarding.styles.${values.learningStyle}.label`) : '',
    },
    {
      step: 'deadline',
      label: t('onboarding.fields.targetDate'),
      value: values.targetDate
        ? formatLocalDate(values.targetDate, i18n.language)
        : t('onboarding.steps.review.noDate'),
    },
  ];

  return (
    <dl className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
          <div>
            <dt className="text-sm text-stone-600">{row.label}</dt>
            <dd className="font-medium">
              <bdi>{row.value}</bdi>
            </dd>
          </div>
          <button
            type="button"
            onClick={() => {
              onEdit(row.step);
            }}
            aria-label={t('onboarding.steps.review.editField', { field: row.label })}
            className="rounded-md px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {t('onboarding.steps.review.edit')}
          </button>
        </div>
      ))}
    </dl>
  );
}
