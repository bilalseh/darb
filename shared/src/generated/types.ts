/* Generated from the Pydantic models in api/. Do not edit; run `pnpm gen:schemas`. */

/**
 * Liveness payload returned by GET /api/health.
 */
export interface HealthResponse {
  status: 'ok';
  version: string;
}

export type LearningStyle = 'reading' | 'video' | 'practice' | 'mixed';

/**
 * What the onboarding wizard collects about a new skill.
 *
 * Only rules JSON Schema can express live here, so the generated frontend form enforces
 * the same ones. Rules that need the clock live in darb_api.domain.onboarding.
 */
export interface OnboardingAnswers {
  skill: string;
  reason: SkillReason;
  level: SelfRatedLevel;
  hoursPerWeek: number;
  /**
   * @minItems 1
   * @maxItems 7
   */
  preferredDays: [Weekday, ...Weekday[]];
  learningStyle: LearningStyle;
  targetDate?: string | null;
}

/**
 * The signed-in user's profile, stored at users/{uid}.
 */
export interface Profile {
  uid: string;
  displayName: string | null;
  email: string | null;
  isDemo: boolean;
  createdAt: string;
}

export type SelfRatedLevel = 'none' | 'beginner' | 'elementary' | 'intermediate' | 'advanced';

/**
 * One skill the user is learning, stored at users/{uid}/skills/{id}.
 */
export interface Skill {
  id: string;
  answers: OnboardingAnswers;
  status: SkillStatus;
  createdAt: string;
}

export type SkillReason = 'career' | 'hobby' | 'travel' | 'exam' | 'school' | 'personal';

export type SkillStatus = 'onboarded';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
