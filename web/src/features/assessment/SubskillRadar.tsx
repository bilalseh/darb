import type { SubskillScore } from '@darb/shared';
import { useTranslation } from 'react-i18next';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// brand-600: passes the palette checks (lightness, chroma, 3:1 contrast) on the light surface.
const SERIES_COLOR = '#0d9488';
const GRID_COLOR = '#e7e5e4'; // stone-200: recessive
const LABEL_COLOR = '#44403c'; // stone-700: text ink, never the series color

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** One series, so no legend: the heading names it, and the list below gives every value. */
export function SubskillRadar({ scores }: { scores: readonly SubskillScore[] }) {
  const { t } = useTranslation();

  return (
    <figure>
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer>
          <RadarChart data={[...scores]} outerRadius="72%">
            <PolarGrid stroke={GRID_COLOR} />
            <PolarAngleAxis dataKey="name" tick={{ fill: LABEL_COLOR, fontSize: 13 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="score"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              fill={SERIES_COLOR}
              fillOpacity={0.18}
              dot={{ r: 4, fill: SERIES_COLOR, strokeWidth: 0 }}
              isAnimationActive={!prefersReducedMotion()}
            />
            <Tooltip
              formatter={(value) => [t('assessment.scoreValue', { score: String(value) }), '']}
              separator=""
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {scores.map((item) => (
            <div
              key={item.name}
              className="flex justify-between gap-4 border-b border-stone-100 py-1"
            >
              <dt className="text-stone-700">{item.name}</dt>
              <dd className="font-semibold tabular-nums">
                {t('assessment.scoreValue', { score: String(item.score) })}
              </dd>
            </div>
          ))}
        </dl>
      </figcaption>
    </figure>
  );
}
