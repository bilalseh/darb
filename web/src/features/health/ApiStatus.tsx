import { useTranslation } from 'react-i18next';

import { useApiHealth } from './useApiHealth';

type ApiState = 'checking' | 'online' | 'offline';

const DOT_CLASS: Record<ApiState, string> = {
  checking: 'bg-stone-400 motion-safe:animate-pulse',
  online: 'bg-emerald-500',
  offline: 'bg-red-500',
};

export function ApiStatus() {
  const { t } = useTranslation();
  const health = useApiHealth();

  let state: ApiState;
  let label: string;
  switch (health.status) {
    case 'pending':
      state = 'checking';
      label = t('apiStatus.checking');
      break;
    case 'error':
      state = 'offline';
      label = t('apiStatus.offline');
      break;
    case 'success':
      state = 'online';
      label = t('apiStatus.online', { version: health.data.version });
      break;
  }

  return (
    <p role="status" className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT_CLASS[state]}`} />
      <span>{label}</span>
    </p>
  );
}
