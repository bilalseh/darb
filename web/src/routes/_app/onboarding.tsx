import type { Skill } from '@darb/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { OnboardingFormOutput } from '../../features/onboarding/formSchema';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
import { OnboardingWizard } from '../../features/onboarding/OnboardingWizard';
import { skillsQueryKey } from '../../features/skills/skillsQuery';
import { apiPost } from '../../lib/apiClient';

export const Route = createFileRoute('/_app/onboarding')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function createSkill(answers: OnboardingFormOutput) {
    await apiPost<Skill>('/skills', answers);
    await queryClient.invalidateQueries({ queryKey: skillsQueryKey(user.uid) });
    useOnboardingStore.getState().reset();
    await navigate({ to: '/today' });
  }

  return (
    <section aria-labelledby="onboarding-title">
      <h1 id="onboarding-title" className="mb-6 text-3xl font-bold tracking-tight">
        {t('onboarding.title')}
      </h1>
      <OnboardingWizard onComplete={createSkill} />
    </section>
  );
}
