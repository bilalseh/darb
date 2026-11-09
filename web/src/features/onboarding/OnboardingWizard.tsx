import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { FormProvider, useForm, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

import { ApiError } from '../../lib/apiClient';

import {
  onboardingFormSchema,
  type OnboardingField,
  type OnboardingFormInput,
  type OnboardingFormOutput,
} from './formSchema';
import { useOnboardingStore } from './onboardingStore';
import { ReviewStep } from './ReviewStep';
import { StepFields } from './StepFields';
import { STEPS, type StepId } from './steps';

interface OnboardingWizardProps {
  onComplete: (answers: OnboardingFormOutput) => Promise<void>;
}

const LAST_STEP = STEPS.length - 1;
const FIELDS: readonly string[] = STEPS.flatMap((step) => step.fields);

function isField(name: string | undefined): name is OnboardingField {
  return name !== undefined && FIELDS.includes(name);
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const storedStep = useOnboardingStore((state) => state.stepIndex);
  const setStepIndex = useOnboardingStore((state) => state.setStepIndex);
  const saveValues = useOnboardingStore((state) => state.saveValues);
  const [initialDraft] = useState(() => useOnboardingStore.getState().values);
  const [submitFailed, setSubmitFailed] = useState<false | 'error' | 'skillLimit'>(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigated = useRef(false);

  const form = useForm<OnboardingFormInput, unknown, OnboardingFormOutput>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: { preferredDays: [], targetDate: null, ...initialDraft },
    mode: 'onTouched',
  });

  // Saves the draft on every change without re-rendering the wizard. A field that is showing an
  // error is re-checked as the user fixes it, so the message clears while typing instead of on
  // blur (which would shift the layout under the next click).
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values, name }) => {
          saveValues(values);
          if (isField(name) && form.getFieldState(name).invalid) {
            void form.trigger(name);
          }
        },
      }),
    [form, saveValues],
  );

  const stepIndex = Math.min(Math.max(storedStep, 0), LAST_STEP);
  const step = STEPS[stepIndex] ?? STEPS[0];
  const titleId = `step-${step.id}-title`;

  // Move focus to the new question so keyboard and screen reader users start there.
  useEffect(() => {
    if (navigated.current) headingRef.current?.focus();
  }, [stepIndex]);

  function goTo(index: number) {
    navigated.current = true;
    setStepIndex(index);
  }

  function goToStep(id: StepId) {
    goTo(STEPS.findIndex((candidate) => candidate.id === id));
  }

  async function next() {
    const fields = [...step.fields];
    if (await form.trigger(fields)) {
      goTo(stepIndex + 1);
      return;
    }
    const firstInvalid = fields.find((field) => form.getFieldState(field).invalid);
    if (firstInvalid) form.setFocus(firstInvalid);
  }

  function showFirstInvalidStep(errors: FieldErrors<OnboardingFormInput>) {
    const index = STEPS.findIndex((candidate) => candidate.fields.some((field) => field in errors));
    if (index >= 0) goTo(index);
  }

  async function save(answers: OnboardingFormOutput) {
    setSubmitFailed(false);
    try {
      await onComplete(answers);
    } catch (error) {
      // 402: the plan has no room for another skill, which an upgrade fixes.
      setSubmitFailed(error instanceof ApiError && error.status === 402 ? 'skillLimit' : 'error');
    }
  }

  // Enter and the primary button both land here: Next on a question, save on the review.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.id === 'review') {
      void form.handleSubmit(save, showFirstInvalidStep)();
    } else {
      void next();
    }
  }

  const { isSubmitting } = form.formState;

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} noValidate className="max-w-2xl">
        <p id="onboarding-progress" className="text-sm font-medium text-stone-600">
          {t('onboarding.progress', { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <div
          role="progressbar"
          aria-labelledby="onboarding-progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
        >
          <div
            className="h-full rounded-full bg-brand-700 transition-[width] duration-300"
            style={{ width: `${String(((stepIndex + 1) / STEPS.length) * 100)}%` }}
          />
        </div>

        <h2
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="mt-8 text-2xl font-bold tracking-tight focus:outline-none"
        >
          {t(`onboarding.steps.${step.id}.title`)}
        </h2>
        {step.id === 'skill' && (
          <p className="mt-1 text-stone-600">{t('onboarding.steps.skill.hint')}</p>
        )}

        <div className="mt-6">
          {step.id === 'review' ? (
            <ReviewStep onEdit={goToStep} />
          ) : (
            <StepFields step={step.id} titleId={titleId} />
          )}
        </div>

        {submitFailed === 'error' && (
          <p role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('onboarding.submitError')}
          </p>
        )}
        {submitFailed === 'skillLimit' && (
          <div role="alert" className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-amber-900">
            <p className="font-semibold">{t('pricing.skillLimitTitle')}</p>
            <p className="mt-1 text-sm">{t('pricing.skillLimitBody')}</p>
            <Link to="/pricing" className="mt-2 inline-flex text-sm font-semibold underline">
              {t('pricing.seePlans')}
            </Link>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              goTo(stepIndex - 1);
            }}
            disabled={stepIndex === 0 || isSubmitting}
            className="rounded-md px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 disabled:invisible"
          >
            {t('onboarding.back')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand-700 px-5 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {step.id !== 'review'
              ? t('onboarding.next')
              : isSubmitting
                ? t('onboarding.submitting')
                : t('onboarding.submit')}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
