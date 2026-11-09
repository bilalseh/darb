import type { DeepPartial } from 'react-hook-form';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { OnboardingFormInput } from './formSchema';

export type OnboardingDraft = DeepPartial<OnboardingFormInput>;

interface OnboardingState {
  values: OnboardingDraft;
  stepIndex: number;
  saveValues: (values: OnboardingDraft) => void;
  setStepIndex: (stepIndex: number) => void;
  reset: () => void;
}

/** The wizard's draft survives a page refresh (sessionStorage), but not closing the tab. */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      values: {},
      stepIndex: 0,
      saveValues: (values) => {
        set({ values });
      },
      setStepIndex: (stepIndex) => {
        set({ stepIndex });
      },
      reset: () => {
        set({ values: {}, stepIndex: 0 });
      },
    }),
    {
      name: 'darb.onboarding-draft',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ values, stepIndex }) => ({ values, stepIndex }),
    },
  ),
);
