/* Generated from the Pydantic models in api/. Do not edit; run `pnpm gen:schemas`. */

import { z } from 'zod';

export const OnboardingAnswersSchema = z
  .object({
    skill: z.string().min(2).max(80),
    reason: z.enum(['career', 'hobby', 'travel', 'exam', 'school', 'personal']),
    level: z.enum(['none', 'beginner', 'elementary', 'intermediate', 'advanced']),
    hoursPerWeek: z.number().int().gte(1).lte(40),
    preferredDays: z
      .array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
      .min(1)
      .max(7),
    learningStyle: z.enum(['reading', 'video', 'practice', 'mixed']),
    targetDate: z.union([z.string().date(), z.null()]).default(null),
  })
  .strict();

export const AnswerSubmissionSchema = z
  .object({
    questionId: z.string().min(1).max(10),
    choice: z.union([z.number().int().gte(0).lte(4), z.null()]).default(null),
    text: z.union([z.string().max(1000), z.null()]).default(null),
    confidence: z.union([z.number().int().gte(1).lte(5), z.null()]).default(null),
    dontKnow: z.boolean().default(false),
  })
  .strict();

export const RegenerateWeekRequestSchema = z
  .object({ adjust: z.enum(['same', 'easier', 'harder']).optional() })
  .strict();

export const MoveLessonRequestSchema = z.object({ scheduledDate: z.string().date() }).strict();

export const CompleteLessonRequestSchema = z.object({ completedOn: z.string().date() }).strict();

export const TutorRequestSchema = z.object({ message: z.string().min(1).max(800) }).strict();

export const QuizSubmissionSchema = z
  .object({ answers: z.array(z.number().int()).min(1).max(6) })
  .strict();

export const ReviewAnswerSchema = z
  .object({ choice: z.number().int().gte(0).lte(3), answeredOn: z.string().date() })
  .strict();

export const CheckinRequestSchema = z
  .object({
    wentWell: z.string().max(500),
    hard: z.string().max(500),
    feeling: z.enum(['too_easy', 'just_right', 'too_hard']),
    today: z.string().date(),
  })
  .strict();

export const SyncRequestSchema = z.object({ today: z.string().date() }).strict();

export const PreferencesSchema = z
  .object({
    language: z.enum(['en', 'ar']).optional(),
    checkinReminders: z.boolean().default(true),
    reviewReminders: z.boolean().default(true),
  })
  .strict();

export const ConfirmCheckoutRequestSchema = z
  .object({ sessionId: z.string().regex(new RegExp('^cs_test_[A-Za-z0-9_]+$')).min(10).max(255) })
  .strict();

export const EnsureProfileRequestSchema = z
  .object({ today: z.union([z.string().date(), z.null()]).default(null) })
  .strict();

export const TranslationRequestSchema = z.object({ language: z.enum(['en', 'ar']) }).strict();
