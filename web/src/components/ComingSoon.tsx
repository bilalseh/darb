import { useTranslation } from 'react-i18next';

interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title" className="text-3xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 text-stone-600">{t('comingSoon.body')}</p>
    </section>
  );
}
