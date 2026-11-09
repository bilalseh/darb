import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import arAssessment from './locales/ar/assessment.json';
import arCheckin from './locales/ar/checkin.json';
import arCommon from './locales/ar/common.json';
import arLesson from './locales/ar/lesson.json';
import arOnboarding from './locales/ar/onboarding.json';
import arPlan from './locales/ar/plan.json';
import arPractice from './locales/ar/practice.json';
import arPricing from './locales/ar/pricing.json';
import arProgress from './locales/ar/progress.json';
import arSettings from './locales/ar/settings.json';
import enAssessment from './locales/en/assessment.json';
import enCheckin from './locales/en/checkin.json';
import enCommon from './locales/en/common.json';
import enLesson from './locales/en/lesson.json';
import enOnboarding from './locales/en/onboarding.json';
import enPlan from './locales/en/plan.json';
import enPractice from './locales/en/practice.json';
import enPricing from './locales/en/pricing.json';
import enProgress from './locales/en/progress.json';
import enSettings from './locales/en/settings.json';

// One file per feature keeps each small; they merge into a single namespace.
const en = {
  ...enCommon,
  onboarding: enOnboarding,
  assessment: enAssessment,
  plan: enPlan,
  lesson: enLesson,
  ...enPractice,
  checkin: enCheckin,
  progress: enProgress,
  settings: enSettings,
  pricing: enPricing,
};

const ar = {
  ...arCommon,
  onboarding: arOnboarding,
  assessment: arAssessment,
  plan: arPlan,
  lesson: arLesson,
  ...arPractice,
  checkin: arCheckin,
  progress: arProgress,
  settings: arSettings,
  pricing: arPricing,
};

export const LANGUAGES = ['en', 'ar'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export const defaultNS = 'translation';
export const resources = { en: { translation: en }, ar: { translation: ar } } as const;

const STORAGE_KEY = 'darb.language';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return LANGUAGES.includes(value as AppLanguage);
}

/** The last language picked on this device, else the browser's, else English. */
function initialLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isAppLanguage(stored)) return stored;
  } catch {
    // Storage can be blocked; the browser language still works.
  }
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false },
});

function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not remembered on this device; nothing else depends on it.
  }
}

applyDocumentLanguage(i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export function currentLanguage(): AppLanguage {
  return isAppLanguage(i18n.language) ? i18n.language : 'en';
}

export default i18n;
