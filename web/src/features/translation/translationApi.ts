import type { LessonContent, Plan, Translation } from '@darb/shared';
import { useQueries } from '@tanstack/react-query';

import type { AppLanguage } from '../../i18n';
import { apiPost } from '../../lib/apiClient';
import { useAppLanguage } from '../../lib/localized';

/** Shows a text in the app's language: its translation when there is one, else as written. */
export type Translate = (text: string) => string;

export interface Translated {
  tr: Translate;
  translating: boolean;
  failed: boolean;
  retry: () => void;
}

function unique(texts: string[]): string[] {
  return [...new Set(texts.filter((text) => text.trim()))];
}

/** The plan's texts written in another language; mirrors the API's plan_texts. Plans stored
before languages were tagged count as English. */
export function planTextsToTranslate(plan: Plan, language: AppLanguage): string[] {
  const texts: string[] = [];
  if ((plan.language ?? 'en') !== language) {
    for (const module of plan.modules) texts.push(module.title, module.summary);
  }
  for (const week of plan.weeks) {
    if ((week.language ?? 'en') !== language) texts.push(week.goal);
    for (const lesson of week.lessons) {
      if ((lesson.language ?? 'en') !== language) texts.push(lesson.title, lesson.objective);
    }
  }
  return unique(texts);
}

/** Mirrors the API's lesson_texts: content and tutor replies, never the learner's messages. */
export function lessonTextsToTranslate(content: LessonContent, language: AppLanguage): string[] {
  const texts: string[] = [];
  if ((content.language ?? 'en') !== language) {
    texts.push(content.explanation, content.exercise, ...content.resources.map((r) => r.title));
  }
  for (const message of content.tutor) {
    if (message.role === 'tutor' && (message.language ?? 'en') !== language) {
      texts.push(message.text);
    }
  }
  return unique(texts);
}

interface Source {
  path: `/${string}`;
  texts: string[];
}

function useTranslations(sources: Source[], language: AppLanguage): Translated {
  const results = useQueries({
    queries: sources.map((source) => ({
      // The texts are part of the key, so a rewritten week asks again for just its new texts.
      queryKey: ['translation', source.path, language, source.texts] as const,
      queryFn: () => apiPost<Translation>(source.path, { language }),
      enabled: source.texts.length > 0,
      staleTime: Infinity,
      retry: false,
    })),
  });
  const texts = new Map<string, string>();
  for (const result of results) {
    for (const [source, text] of Object.entries(result.data?.texts ?? {})) {
      if (text !== undefined) texts.set(source, text);
    }
  }
  return {
    tr: (text) => texts.get(text) ?? text,
    translating: results.some((result) => result.isFetching),
    failed: results.some((result) => result.isError),
    retry: () => {
      for (const result of results) if (result.isError) void result.refetch();
    },
  };
}

const skillPath = (skillId: string) => `/skills/${encodeURIComponent(skillId)}` as const;

/** Plan texts (module, week and lesson names) in the app's language, for one or more plans. */
export function usePlanTranslations(plans: { skillId: string; plan: Plan | null | undefined }[]) {
  const language = useAppLanguage();
  return useTranslations(
    plans.map(({ skillId, plan }) => ({
      path: `${skillPath(skillId)}/plan/translation`,
      texts: plan ? planTextsToTranslate(plan, language) : [],
    })),
    language,
  );
}

export function useLessonTranslation(
  skillId: string,
  lessonId: string,
  content: LessonContent | undefined,
) {
  const language = useAppLanguage();
  return useTranslations(
    [
      {
        path: `${skillPath(skillId)}/lessons/${encodeURIComponent(lessonId)}/translation`,
        texts: content ? lessonTextsToTranslate(content, language) : [],
      },
    ],
    language,
  );
}
