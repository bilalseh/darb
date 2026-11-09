import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { addYearsIso, todayLocalIso } from '../../lib/dates';
import { ChoiceField } from './fields/ChoiceField';
import { FieldError } from './fields/FieldError';
import type { OnboardingField, OnboardingFormInput } from './formSchema';
import { LEVELS, POPULAR_SKILLS, REASONS, STYLES, WEEKDAYS, type StepId } from './steps';

const inputClass =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base aria-invalid:border-red-600';

function useFieldState(field: OnboardingField) {
  const { formState } = useFormContext<OnboardingFormInput>();
  const invalid = Boolean(formState.errors[field]);
  const errorId = `${field}-error`;
  return { invalid, errorId, describedBy: invalid ? errorId : undefined };
}

function SkillStep({ titleId }: { titleId: string }) {
  const { t } = useTranslation();
  const { register, setValue } = useFormContext<OnboardingFormInput>();
  const { invalid, errorId, describedBy } = useFieldState('skill');
  const suggestions = POPULAR_SKILLS.map((key) => t(`onboarding.suggestions.${key}`));

  return (
    <div>
      <input
        type="text"
        list="popular-skills"
        autoComplete="off"
        placeholder={t('onboarding.steps.skill.placeholder')}
        aria-labelledby={titleId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={inputClass}
        {...register('skill', { setValueAs: (value: string) => value.trim() })}
      />
      <datalist id="popular-skills">
        {suggestions.map((skill) => (
          <option key={skill} value={skill} />
        ))}
      </datalist>
      <FieldError id={errorId} field="skill" show={invalid} />
      <p className="mt-6 text-sm font-medium text-stone-700">
        {t('onboarding.steps.skill.popular')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => {
              setValue('skill', skill, { shouldValidate: true, shouldDirty: true });
            }}
            className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm hover:border-brand-600"
          >
            {skill}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleStep() {
  const { t } = useTranslation();
  const { register, control } = useFormContext<OnboardingFormInput>();
  const hours = useFieldState('hoursPerWeek');
  const days = useFieldState('preferredDays');
  const [hoursPerWeek, preferredDays] = useWatch({
    control,
    name: ['hoursPerWeek', 'preferredDays'],
  });
  const dayCount = preferredDays.length;
  const minutesPerDay =
    typeof hoursPerWeek === 'number' && hoursPerWeek > 0 && dayCount > 0
      ? Math.round((hoursPerWeek * 60) / dayCount)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="hoursPerWeek" className="block font-medium">
          {t('onboarding.steps.schedule.hoursLabel')}
        </label>
        <p className="text-sm text-stone-600">{t('onboarding.steps.schedule.hoursHint')}</p>
        <input
          id="hoursPerWeek"
          type="number"
          inputMode="numeric"
          min={1}
          max={40}
          aria-invalid={hours.invalid}
          aria-describedby={hours.describedBy}
          className={`${inputClass} mt-2 max-w-32`}
          {...register('hoursPerWeek', { valueAsNumber: true })}
        />
        <FieldError id={hours.errorId} field="hoursPerWeek" show={hours.invalid} />
      </div>
      <fieldset aria-describedby={days.describedBy}>
        <legend className="font-medium">{t('onboarding.steps.schedule.daysLabel')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <label
              key={day}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 has-checked:border-brand-700 has-checked:bg-brand-50"
            >
              <input
                type="checkbox"
                value={day}
                className="size-4 accent-brand-700"
                {...register('preferredDays')}
              />
              <span aria-hidden="true">{t(`onboarding.daysShort.${day}`)}</span>
              <span className="sr-only">{t(`onboarding.days.${day}`)}</span>
            </label>
          ))}
        </div>
        <FieldError id={days.errorId} field="preferredDays" show={days.invalid} />
      </fieldset>
      {minutesPerDay !== null && (
        <p className="text-sm text-stone-700">
          {t('onboarding.steps.schedule.perDay', { minutes: minutesPerDay })}
        </p>
      )}
    </div>
  );
}

function DeadlineStep() {
  const { t } = useTranslation();
  const { register } = useFormContext<OnboardingFormInput>();
  const { invalid, errorId, describedBy } = useFieldState('targetDate');
  const today = todayLocalIso();

  return (
    <div>
      <label htmlFor="targetDate" className="block font-medium">
        {t('onboarding.steps.deadline.label')}
      </label>
      <p className="text-sm text-stone-600">{t('onboarding.steps.deadline.hint')}</p>
      <input
        id="targetDate"
        type="date"
        min={today}
        max={addYearsIso(today, 5)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`${inputClass} mt-2 max-w-56`}
        {...register('targetDate', {
          setValueAs: (value: string) => (value === '' ? null : value),
        })}
      />
      <FieldError id={errorId} field="targetDate" show={invalid} />
    </div>
  );
}

interface ChoiceStepProps {
  field: 'reason' | 'level' | 'learningStyle';
  choices: readonly { value: string; label: string; hint: string }[];
}

function ChoiceStep({ field, choices }: ChoiceStepProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<OnboardingFormInput>();
  const { invalid, errorId } = useFieldState(field);

  return (
    <>
      <ChoiceField
        legend={t(`onboarding.fields.${field}`)}
        choices={choices}
        registration={register(field)}
        errorId={errorId}
        invalid={invalid}
      />
      <FieldError id={errorId} field={field} show={invalid} />
    </>
  );
}

interface StepFieldsProps {
  step: Exclude<StepId, 'review'>;
  titleId: string;
}

export function StepFields({ step, titleId }: StepFieldsProps) {
  const { t } = useTranslation();

  switch (step) {
    case 'skill':
      return <SkillStep titleId={titleId} />;
    case 'reason': {
      const choices = REASONS.map((value) => ({
        value,
        label: t(`onboarding.reasons.${value}.label`),
        hint: t(`onboarding.reasons.${value}.hint`),
      }));
      return <ChoiceStep field="reason" choices={choices} />;
    }
    case 'level': {
      const choices = LEVELS.map((value) => ({
        value,
        label: t(`onboarding.levels.${value}.label`),
        hint: t(`onboarding.levels.${value}.hint`),
      }));
      return <ChoiceStep field="level" choices={choices} />;
    }
    case 'schedule':
      return <ScheduleStep />;
    case 'style': {
      const choices = STYLES.map((value) => ({
        value,
        label: t(`onboarding.styles.${value}.label`),
        hint: t(`onboarding.styles.${value}.hint`),
      }));
      return <ChoiceStep field="learningStyle" choices={choices} />;
    }
    case 'deadline':
      return <DeadlineStep />;
  }
}
