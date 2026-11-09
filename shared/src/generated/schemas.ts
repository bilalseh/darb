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
  })
  .strict();
