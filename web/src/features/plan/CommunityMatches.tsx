import type { CommunityMatch } from '@darb/shared';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiGet } from '../../lib/apiClient';

export function CommunityMatches({ skillId }: { skillId: string }) {
  const { t } = useTranslation();
  const matches = useQuery({
    queryKey: ['matches', skillId],
    queryFn: () => apiGet<CommunityMatch[]>(`/skills/${encodeURIComponent(skillId)}/matches`),
    staleTime: Infinity,
  });
  if (!matches.data || matches.data.length === 0) return null;

  return (
    <section aria-labelledby="matches-title" className="mt-8">
      <h2 id="matches-title" className="mb-1 text-xl font-semibold">
        {t('plan.matchesTitle')}
      </h2>
      <p className="mb-3 text-sm text-stone-600">{t('plan.matchesHint')}</p>
      <ul className="space-y-2">
        {matches.data.map((match) => (
          <li key={match.url} className="rounded-lg border border-stone-200 bg-white p-3">
            <a
              href={match.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline"
            >
              <bdi>{match.name}</bdi>
            </a>{' '}
            <span className="text-xs text-stone-600">({t(`plan.matchKinds.${match.kind}`)})</span>
            <p className="mt-1 text-sm text-stone-700">
              <bdi>{match.reason}</bdi>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
