import type { OnboardingField } from './formSchema';

export const STEPS = [
  { id: 'skill', fields: ['skill'] },
  { id: 'reason', fields: ['reason'] },
  { id: 'level', fields: ['level'] },
  { id: 'schedule', fields: ['hoursPerWeek', 'preferredDays'] },
  { id: 'style', fields: ['learningStyle'] },
  { id: 'deadline', fields: ['targetDate'] },
  { id: 'review', fields: [] },
] as const satisfies readonly { id: string; fields: readonly OnboardingField[] }[];

export type StepId = (typeof STEPS)[number]['id'];

export const REASONS = ['career', 'hobby', 'travel', 'exam', 'school', 'personal'] as const;
export const LEVELS = ['none', 'beginner', 'elementary', 'intermediate', 'advanced'] as const;
export const STYLES = ['reading', 'video', 'practice', 'mixed'] as const;
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const POPULAR_SKILLS = [
  'spanish',
  'python',
  'guitar',
  'publicSpeaking',
  'excel',
  'photography',
  'cooking',
  'piano',
] as const;
