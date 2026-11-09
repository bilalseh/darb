import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enAssessment from './locales/en/assessment.json';
import enCheckin from './locales/en/checkin.json';
import enCommon from './locales/en/common.json';
import enLesson from './locales/en/lesson.json';
import enOnboarding from './locales/en/onboarding.json';
import enPlan from './locales/en/plan.json';
import enPractice from './locales/en/practice.json';

// One file per feature keeps each small; they merge into a single namespace.
const en = {
  ...enCommon,
  onboarding: enOnboarding,
  assessment: enAssessment,
  plan: enPlan,
  lesson: enLesson,
  ...enPractice,
  checkin: enCheckin,
};

export const defaultNS = 'translation';
export const resources = { en: { translation: en } } as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false },
});

function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
}

applyDocumentLanguage(i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
