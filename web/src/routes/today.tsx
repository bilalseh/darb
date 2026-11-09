import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ComingSoon } from '../components/ComingSoon';

export const Route = createFileRoute('/today')({
  component: TodayPage,
});

function TodayPage() {
  const { t } = useTranslation();
  return <ComingSoon title={t('nav.today')} />;
}
