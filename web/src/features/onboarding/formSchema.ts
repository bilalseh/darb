import { OnboardingAnswersSchema } from '@darb/shared';
import type { z } from 'zod';

import { addYearsIso, todayLocalIso } from '../../lib/dates';

/**
 * The generated schema carries every rule the API's Pydantic model has. The goal date rule
 * needs "today", which JSON Schema cannot express, so it is added here (the API checks it too).
 */
export const onboardingFormSchema = OnboardingAnswersSchema.superRefine((answers, context) => {
  if (!answers.targetDate) return;
  const today = todayLocalIso();
  if (answers.targetDate < today || answers.targetDate > addYearsIso(today, 5)) {
    context.addIssue({ code: 'custom', path: ['targetDate'], message: 'out of range' });
  }
});

export type OnboardingFormInput = z.input<typeof onboardingFormSchema>;
export type OnboardingFormOutput = z.output<typeof onboardingFormSchema>;
export type OnboardingField = keyof OnboardingFormInput;
