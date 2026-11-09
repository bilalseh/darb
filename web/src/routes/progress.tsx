import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/ComingSoon';

export const Route = createFileRoute('/progress')({
  component: ProgressPage,
});

function ProgressPage() {
  const { t } = useTranslation();
  return <ComingSoon title={t('nav.progress')} />;
}
