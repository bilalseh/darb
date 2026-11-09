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

export type Badge = 'first_lesson' | 'first_week' | 'first_quiz' | 'streak_7' | 'streak_30';

/**
 * A completed check-in and the change it made, at users/{uid}/checkins/{id}.
 */
export interface Checkin {
  id: string;
  skillId: string;
  weekIndex: number;
  adjustedWeekIndex: number;
  wentWell: string;
  hard: string;
  feeling: CheckinFeeling;
  explanation: string;
  difficulty: number;
  createdOn: string;
}

export interface CheckinDue {
  skillId: string;
  weekIndex: number;
}

export type CheckinFeeling = 'too_easy' | 'just_right' | 'too_hard';

/**
 * The weekly check-in; `today` is the learner's own calendar date.
 */
export interface CheckinRequest {
  wentWell: string;
  hard: string;
  feeling: CheckinFeeling;
  today: string;
}

/**
 * A free community or practice format suggested for a skill, with why it fits.
 */
export interface CommunityMatch {
  name: string;
  url: string;
  kind: MatchKind;
  reason: string;
}

/**
 * Mark a lesson done; `completedOn` is the learner's own calendar date.
 */
export interface CompleteLessonRequest {
  completedOn: string;
}

/**
 * Liveness payload returned by GET /api/health.
 */
export interface HealthResponse {
  status: 'ok';
  version: string;
}

export type LearningStyle = 'reading' | 'video' | 'practice' | 'mixed';

/**
 * A lesson's written content plus its tutor conversation, at users/{uid}/lessons/{id}.
 */
export interface LessonContent {
  skillId: string;
  lessonId: string;
  explanation: string;
  exercise: string;
  resources: ResourceLink[];
  tutor: TutorMessage[];
  generatedAt: string;
}

export type LessonKind = 'learn' | 'practice' | 'review' | 'project';

export type LessonStatus = 'todo' | 'done';

export type MatchKind = 'community' | 'forum' | 'chat' | 'practice';

/**
 * A module quiz as the learner sees it: no answers until it is submitted.
 */
export interface ModuleQuiz {
  skillId: string;
  moduleIndex: number;
  title: string;
  questions: QuizQuestion[];
}

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
  lastReschedule?: RescheduleNotice | null;
  checkedInWeeks?: number[];
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

/**
 * Everything the dashboard shows, computed from the learner's own data.
 */
export interface Progress {
  stats: Stats;
  badges: Badge[];
  quizzes: QuizScorePoint[];
  skills: SkillProgress[];
}

export type QuestionKind = 'multiple_choice' | 'short_answer' | 'confidence';

export interface QuestionResult {
  id: string;
  prompt: string;
  options: string[];
  chosen: number;
  correctOption: number;
  correct: boolean;
  explanation: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
}

/**
 * A graded module quiz, stored at users/{uid}/quizResults/{skillId}__{module}.
 */
export interface QuizResult {
  skillId: string;
  moduleIndex: number;
  title: string;
  score: number;
  results: QuestionResult[];
  addedToReview: number;
  completedAt: string;
}

export interface QuizScorePoint {
  skillId: string;
  skill: string;
  title: string;
  score: number;
  completedAt: string;
}

/**
 * One chosen option index per question, in question order.
 */
export interface QuizSubmission {
  /**
   * @minItems 1
   * @maxItems 6
   */
  answers: [number, ...number[]];
}

/**
 * Replace a week's unfinished lessons; "easier" and "harder" shift the plan's difficulty.
 */
export interface RegenerateWeekRequest {
  adjust?: WeekAdjustment;
}

export interface RescheduleMove {
  lessonId: string;
  title: string;
  fromDate: string;
  toDate: string;
}

/**
 * Missed lessons the app moved, shown to the learner on the day it happened.
 */
export interface RescheduleNotice {
  on: string;
  moves: RescheduleMove[];
}

export type ResourceKind = 'article' | 'video' | 'exercise' | 'reference';

export interface ResourceLink {
  title: string;
  url: string;
  kind: ResourceKind;
}

/**
 * The learner's answer to a review card; `answeredOn` is their own calendar date.
 */
export interface ReviewAnswer {
  choice: number;
  answeredOn: string;
}

/**
 * A spaced-repetition card from a missed quiz question, at users/{uid}/reviews/{id}.
 */
export interface ReviewItem {
  id: string;
  skillId: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
  box: number;
  dueOn: string;
  lastReviewedOn: string | null;
}

export interface ReviewOutcome {
  item: ReviewItem;
  correct: boolean;
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

export interface SkillProgress {
  skillId: string;
  skill: string;
  level: PlacementLevel | null;
  startingSubskills: SubskillScore[];
  lessonsDone: number;
  lessonsTotal: number;
}

export type SkillReason = 'career' | 'hobby' | 'travel' | 'exam' | 'school' | 'personal';

export type SkillStatus = 'onboarded' | 'assessed';

/**
 * Progress figures computed from the learner's activity.
 */
export interface Stats {
  streak: number;
  longestStreak: number;
  activeToday: boolean;
  lessonsDone: number;
  minutesStudied: number;
}

export interface SubskillScore {
  name: string;
  score: number;
}

/**
 * Sent when the app opens, so missed lessons can be rescheduled against the learner's date.
 */
export interface SyncRequest {
  today: string;
}

export interface SyncResult {
  rescheduledLessons: number;
  checkinsDue: CheckinDue[];
}

export interface TutorMessage {
  role: TutorRole;
  text: string;
  at: string;
}

export interface TutorRequest {
  message: string;
}

export type TutorRole = 'learner' | 'tutor';

export type WeekAdjustment = 'same' | 'easier' | 'harder';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
