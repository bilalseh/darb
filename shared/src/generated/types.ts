/* Generated from the Pydantic models in api/. Do not edit; run `pnpm gen:schemas`. */

/**
 * The learner's answer to one question; set the field that matches the question kind.
 */
export interface AnswerSubmission {
  questionId: string;
  choice?: number | null;
  text?: string | null;
  confidence?: number | null;
}

/**
 * Where the learner is in the placement assessment.
 */
export interface AssessmentProgress {
  answered: number;
  maxQuestions: number;
  question: AssessmentQuestion | null;
  finished: boolean;
}

/**
 * A question as the learner sees it: never includes the answer.
 */
export interface AssessmentQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  subskill: string;
  options: string[];
}

/**
 * Liveness payload returned by GET /api/health.
 */
export interface HealthResponse {
  status: 'ok';
  version: string;
}

export type LearningStyle = 'reading' | 'video' | 'practice' | 'mixed';

export type LessonKind = 'learn' | 'practice' | 'review' | 'project';

export type LessonStatus = 'todo' | 'done';

/**
 * Move a lesson to another day, from today to the end of the plan.
 */
export interface MoveLessonRequest {
  scheduledDate: string;
}

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

export type PlacementLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

/**
 * The outcome of the placement assessment, stored on the skill.
 */
export interface PlacementResult {
  level: PlacementLevel;
  summary: string;
  subskills: SubskillScore[];
  completedAt: string;
}

/**
 * A skill's study plan: modules, then weeks with dated lessons.
 */
export interface Plan {
  skillId: string;
  modules: PlanModule[];
  weeks: PlanWeek[];
  difficulty: number;
  generatedAt: string;
}

export interface PlanLesson {
  id: string;
  title: string;
  objective: string;
  minutes: number;
  kind: LessonKind;
  scheduledDate: string;
  status: LessonStatus;
}

export interface PlanModule {
  title: string;
  summary: string;
}

export interface PlanWeek {
  index: number;
  startDate: string;
  moduleIndex: number;
  goal: string;
  lessons: PlanLesson[];
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

export type QuestionKind = 'multiple_choice' | 'short_answer' | 'confidence';

/**
 * Replace a week's unfinished lessons; "easier" and "harder" shift the plan's difficulty.
 */
export interface RegenerateWeekRequest {
  adjust?: WeekAdjustment;
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
  placement?: PlacementResult | null;
}

export type SkillReason = 'career' | 'hobby' | 'travel' | 'exam' | 'school' | 'personal';

export type SkillStatus = 'onboarded' | 'assessed';

export interface SubskillScore {
  name: string;
  score: number;
}

export type WeekAdjustment = 'same' | 'easier' | 'harder';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
