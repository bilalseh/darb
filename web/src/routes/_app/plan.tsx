import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../../components/ComingSoon';

export const Route = createFileRoute('/_app/plan')({
  component: PlanPage,
});

function PlanPage() {
  const { t } = useTranslation();
  return <ComingSoon title={t('nav.plan')} />;
}
